import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { ContributionPlan, ModelProvider } from "@/types";
import { getModel } from "@/lib/models";

interface AnalyzeRequestBody {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  labels: string;
  provider: ModelProvider;
}

const REQUIRED_FIELDS: (keyof AnalyzeRequestBody)[] = [
  "owner",
  "repo",
  "issueNumber",
  "issueTitle",
  "issueBody",
  "labels",
  "provider",
];

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
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

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0]?.message.content ?? "";
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: Request): Promise<NextResponse> {
  const xApiKey = req.headers.get("x-api-key");
  if (!xApiKey) {
    return NextResponse.json(
      { error: "Missing x-api-key header" },
      { status: 401 }
    );
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

  const { owner, repo, issueNumber, issueTitle, issueBody, labels, provider } =
    body as AnalyzeRequestBody;

  let modelOption;
  try {
    modelOption = getModel(provider);
  } catch {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 }
    );
  }

  const prompt = `You are helping a junior developer contribute to the GitHub repo ${owner}/${repo}.
Issue #${issueNumber}: ${issueTitle}
Labels: ${labels}
Description: ${issueBody.slice(0, 600)}

Respond ONLY with valid JSON (no markdown fences) with exactly two keys:
- files: bullet list (•) of 4-6 relevant files/dirs with one-line reasons each
- plan: numbered 5-step plan written clearly for a junior developer`;

  let rawText: string;
  try {
    if (provider === "claude") {
      rawText = await callClaude(xApiKey, modelOption.model, prompt);
    } else if (provider === "openai") {
      rawText = await callOpenAI(xApiKey, modelOption.model, prompt);
    } else {
      rawText = await callGemini(xApiKey, modelOption.model, prompt);
    }
  } catch (err) {
    if (isAuthError(err)) {
      return NextResponse.json(
        { error: "Invalid API key for selected provider." },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "Provider API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(stripFences(rawText)) as ContributionPlan;
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ files: rawText, plan: "" });
  }
}
