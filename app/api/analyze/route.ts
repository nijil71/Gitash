import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ContributionPlan } from "@/types";

interface AnalyzeRequestBody {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  labels: string;
}

const REQUIRED_FIELDS: (keyof AnalyzeRequestBody)[] = [
  "owner",
  "repo",
  "issueNumber",
  "issueTitle",
  "issueBody",
  "labels",
];

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
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

  const { owner, repo, issueNumber, issueTitle, issueBody, labels } =
    body as AnalyzeRequestBody;

  const prompt = `You are helping a junior developer contribute to the GitHub repo ${owner}/${repo}.
Issue #${issueNumber}: ${issueTitle}
Labels: ${labels}
Description: ${issueBody.slice(0, 600)}

Respond ONLY with a JSON object with two keys:
- files: a bullet list (•) of 4-6 likely relevant files/directories with one-line reasons
- plan: a numbered 5-step implementation plan written for a junior developer, specific to this issue`;

  let anthropic: Anthropic;
  try {
    anthropic = new Anthropic({ apiKey });
  } catch {
    return NextResponse.json(
      { error: "Failed to initialise Anthropic client" },
      { status: 401 }
    );
  }

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response type from model" },
        { status: 502 }
      );
    }
    rawText = block.text;
  } catch (err: unknown) {
    const isAuthError =
      err instanceof Anthropic.AuthenticationError ||
      (err instanceof Anthropic.APIError && err.status === 401);

    if (isAuthError) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Anthropic API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(stripFences(rawText)) as ContributionPlan;
    return NextResponse.json(parsed);
  } catch {
    // Return raw text under a known key so callers can still render it
    return NextResponse.json({ files: "", plan: rawText });
  }
}
