import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { ContributionPlan, ModelProvider } from "@/types";
import { getModel } from "@/lib/models";

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
const TIMEOUT_MS = 25_000; // 25 s — under Vercel Hobby's 30 s function limit

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
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join("\n");
  if (v && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "");
}

function isAuthError(err: unknown): boolean {
  if (err instanceof Anthropic.AuthenticationError) return true;
  if (err instanceof Anthropic.APIError && err.status === 401) return true;
  if (err instanceof OpenAI.AuthenticationError) return true;
  if (err instanceof OpenAI.APIError && err.status === 401) return true;
  if (err instanceof Error && "status" in err) {
    const s = (err as Error & { status: number }).status;
    if (s === 401 || s === 403) return true;
  }
  return false;
}

// ── Shared prompt pieces ───────────────────────────────────────────────────
const SYSTEM_PROMPT =
  "You are a senior open-source contributor helping a junior developer make their first contribution. " +
  "Always respond with a single valid JSON object — no markdown fences, no extra keys. " +
  'The object must have exactly two string keys: "files" and "plan".';

// Caps to keep the prompt well within model context limits.
const MAX_TREE_PATHS = 400;
const MAX_COMMENTS = 8;
const MAX_COMMENT_CHARS = 400;

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
    `Description: ${issueBody.slice(0, 1500)}\n\n` +
    commentsSection +
    treeSection +
    `Return JSON with:\n` +
    `- "files": bullet list (•) of 4-6 relevant files/dirs, each with a one-line reason\n` +
    `- "plan": numbered 5-step implementation guide written for a junior developer`
  );
}

// ── Provider callers (each with timeout + low temperature) ─────────────────
async function callClaude(
  apiKey: string,
  model: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create(
    {
      model,
      max_tokens: 700,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    },
    { signal }
  );
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create(
    {
      model,
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    },
    { signal }
  );
  return completion.choices[0]?.message.content ?? "";
}

async function callGemini(
  apiKey: string,
  model: string,
  userPrompt: string,
  _signal: AbortSignal // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 700,
      responseMimeType: "application/json",
    },
  });
  const result = await geminiModel.generateContent(
    { contents: [{ role: "user", parts: [{ text: userPrompt }] }] }
  );
  return result.response.text();
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error("[/api/analyze] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handlePost(req: Request): Promise<NextResponse> {
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

  // Timeout wrapper
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let rawText: string;
  try {
    if (provider === "claude") {
      rawText = await callClaude(xApiKey, modelOption.model, userPrompt, controller.signal);
    } else if (provider === "openai") {
      rawText = await callOpenAI(xApiKey, modelOption.model, userPrompt, controller.signal);
    } else {
      rawText = await callGemini(xApiKey, modelOption.model, userPrompt, controller.signal);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out. Please try again." }, { status: 504 });
    }
    if (isAuthError(err)) {
      return NextResponse.json({ error: "Invalid API key for selected provider." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Provider API error";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  try {
    const parsed = JSON.parse(stripFences(rawText)) as Record<string, unknown>;
    const result: ContributionPlan = {
      files: toStr(parsed.files),
      plan: toStr(parsed.plan),
    };
    cacheSet(cacheKey, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ files: rawText, plan: "" });
  }
}
