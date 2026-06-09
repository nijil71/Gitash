import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { ContributionPlan, ModelProvider } from "@/types";
import { getModel } from "@/lib/models";
import { parsePlan, isEmptyPlan } from "@/lib/planParse";

// ── In-process response cache ──────────────────────────────────────────────
// Keyed by "owner/repo#issueNumber@provider". Survives the dev-server lifetime
// and Vercel warm invocations. Cheap and effective — no external infra needed.
const responseCache = new Map<string, ContributionPlan>();

const CACHE_MAX = 200; // evict oldest when over this limit

function cacheSet(key: string, value: ContributionPlan) {
  if (responseCache.size >= CACHE_MAX) {
    responseCache.delete(responseCache.keys().next().value!);
  }
  responseCache.set(key, value);
}

// ── Request timeout ────────────────────────────────────────────────────────
// We stream, so this bounds total generation time (not time-to-first-byte).
// Kept under the 60 s maxDuration below.
const TIMEOUT_MS = 50_000;

// Headroom for the response. The richer prompt (file tree + comments) yields
// longer file lists and plans; too low a cap truncates the JSON mid-object and
// breaks parsing.
const MAX_OUTPUT_TOKENS = 2000;

// ── Types ──────────────────────────────────────────────────────────────────
interface AnalyzeRequestBody {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  labels: string;
  provider: ModelProvider;
  fileTree?: string[];
  comments?: { author: string; body: string }[];
}

const REQUIRED_FIELDS: (keyof AnalyzeRequestBody)[] = [
  "owner", "repo", "issueNumber", "issueTitle", "issueBody", "labels", "provider",
];

// ── Helpers ────────────────────────────────────────────────────────────────
function isAuthError(err: unknown): boolean {
  if (err instanceof Anthropic.AuthenticationError) return true;
  if (err instanceof Anthropic.APIError && err.status === 401) return true;
  if (err instanceof OpenAI.AuthenticationError) return true;
  if (err instanceof OpenAI.APIError && err.status === 401) return true;
  if (err instanceof Error && "status" in err) {
    const s = (err as Error & { status: number }).status;
    if (s === 401 || s === 403) return true;
  }
  // Gemini surfaces an invalid key as a 400 with this message rather than a
  // typed auth error, so match on the message.
  if (err instanceof Error && /api[_ ]?key[_ ]?(not valid|invalid)|API_KEY_INVALID/i.test(err.message)) {
    return true;
  }
  return false;
}

// ── Shared prompt pieces ───────────────────────────────────────────────────
const SYSTEM_PROMPT =
  "You are a senior open-source contributor helping a junior developer make their first contribution. " +
  "Always respond with a single valid JSON object — no markdown fences, no prose outside the JSON. " +
  "Every value must be a plain string (use • bullets and \\n newlines inside strings; do not use nested arrays or objects). " +
  "Emit the keys in the order given.";

// Caps to keep the prompt well within model context limits.
const MAX_TREE_PATHS = 400;
const MAX_COMMENTS = 8;
const MAX_COMMENT_CHARS = 400;
// Modern models have large context windows; 600 was needlessly conservative.
const MAX_BODY_CHARS = 6000;

function buildUserPrompt(
  owner: string,
  repo: string,
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  labels: string,
  fileTree: string[],
  comments: { author: string; body: string }[]
): string {
  const treeSection =
    fileTree.length > 0
      ? `Repository file tree (filtered to source files):\n` +
        fileTree.slice(0, MAX_TREE_PATHS).join("\n") +
        `\n\nWhen listing files, choose ONLY paths that appear in the tree above — ` +
        `do not invent file names.\n\n`
      : "";

  const commentsSection =
    comments.length > 0
      ? `Issue discussion (most recent maintainers/contributors may have proposed a fix):\n` +
        comments
          .slice(0, MAX_COMMENTS)
          .map((c) => `@${c.author}: ${c.body.slice(0, MAX_COMMENT_CHARS)}`)
          .join("\n---\n") +
        `\n\n`
      : "";

  return (
    `Repo: ${owner}/${repo}\n` +
    `Issue #${issueNumber}: ${issueTitle}\n` +
    `Labels: ${labels}\n` +
    `Description: ${issueBody.slice(0, MAX_BODY_CHARS)}\n\n` +
    commentsSection +
    treeSection +
    `Return a JSON object with these string keys, in this exact order:\n` +
    `- "summary": 1–2 sentence plain-language overview of what the issue asks and your fix approach\n` +
    `- "difficulty": one word — "beginner", "intermediate", or "advanced"\n` +
    `- "effort": rough time estimate for a junior dev, e.g. "1–2 hours"\n` +
    `- "prerequisites": bullet list (•) of knowledge or setup needed before starting\n` +
    `- "files": bullet list (•) of 4–6 relevant files/dirs, each with a one-line reason ` +
    `(choose ONLY paths from the tree above; do not invent file names)\n` +
    `- "plan": numbered 5-step implementation guide written for a junior developer\n` +
    `- "testing": bullet list (•) of how to verify the change — tests to run or add, manual checks\n` +
    `- "gotchas": bullet list (•) of pitfalls, edge cases, or project conventions to respect`
  );
}

// ── Provider streamers ─────────────────────────────────────────────────────
// Each yields incremental text deltas. The signal lets us abort on timeout —
// including Gemini, which previously ignored it.
async function* streamProvider(
  provider: ModelProvider,
  apiKey: string,
  model: string,
  userPrompt: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  if (provider === "claude") {
    const client = new Anthropic({ apiKey });
    const stream = await client.messages.create(
      {
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        stream: true,
      },
      { signal }
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  } else if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create(
      {
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      },
      { signal }
    );
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } else {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
      },
    });
    const result = await geminiModel.generateContentStream(
      { contents: [{ role: "user", parts: [{ text: userPrompt }] }] },
      { signal }
    );
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}

// ── Route handler ──────────────────────────────────────────────────────────
// Allow longer than the default since we hold the connection open to stream.
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error("[/api/analyze] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handlePost(req: Request): Promise<Response> {
  const xApiKey = req.headers.get("x-api-key");
  if (!xApiKey) {
    return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 });
  }

  let body: Partial<AnalyzeRequestBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const missing = REQUIRED_FIELDS.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ""
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const { owner, repo, issueNumber, issueTitle, issueBody, labels, provider, fileTree, comments } =
    body as AnalyzeRequestBody;

  let modelOption;
  try {
    modelOption = getModel(provider);
  } catch {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  }

  // Cache hit — skip the AI call entirely
  const cacheKey = `${owner}/${repo}#${issueNumber}@${provider}`;
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const userPrompt = buildUserPrompt(
    owner,
    repo,
    issueNumber,
    issueTitle,
    issueBody,
    labels,
    Array.isArray(fileTree) ? fileTree : [],
    Array.isArray(comments) ? comments : []
  );

  // Abort the provider call if it runs past the timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Prime the first chunk so initial errors (bad key, network) come back as a
  // clean JSON error before we commit to a streaming response.
  const iterator = streamProvider(provider, xApiKey, modelOption.model, userPrompt, controller.signal);
  let firstChunk: IteratorResult<string>;
  try {
    firstChunk = await iterator.next();
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out. Please try again." }, { status: 504 });
    }
    if (isAuthError(err)) {
      return NextResponse.json({ error: "Invalid API key for selected provider." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Provider API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Stream raw model text to the client, which parses it progressively. We also
  // accumulate the full text here so we can cache the parsed plan at the end.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller2) {
      let full = "";
      try {
        if (!firstChunk.done && firstChunk.value) {
          full += firstChunk.value;
          controller2.enqueue(encoder.encode(firstChunk.value));
        }
        while (true) {
          const { value, done } = await iterator.next();
          if (done) break;
          if (value) {
            full += value;
            controller2.enqueue(encoder.encode(value));
          }
        }
        const parsed = parsePlan(full);
        if (!isEmptyPlan(parsed)) cacheSet(cacheKey, parsed);
      } catch (err) {
        // Stream already open; we can't change the status. End it and let the
        // client salvage whatever arrived.
        console.error("[/api/analyze] stream error:", err);
      } finally {
        clearTimeout(timer);
        controller2.close();
      }
    },
    cancel() {
      controller.abort();
      clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Stream": "1",
    },
  });
}
