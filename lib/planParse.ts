import type { ContributionPlan, PlanDifficulty } from "@/types";

// Shared, dependency-free plan parsing. Used on the server for the final parse
// and on the client to progressively render a streaming response. The same
// salvage logic that recovers truncated output also powers live streaming:
// JSON.parse fails until the object is complete, so we fall back to pulling
// each string field out incrementally.

export function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Pull out the outermost {...} so stray prose/fences don't break JSON.parse.
export function extractJsonObject(text: string): string {
  const stripped = stripFences(text);
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first !== -1 && last > first) return stripped.slice(first, last + 1);
  return stripped;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? `• ${x}` : toStr(x))).join("\n");
  if (v && typeof v === "object") return JSON.stringify(v, null, 2);
  return v == null ? "" : String(v);
}

function normalizeDifficulty(v: unknown): PlanDifficulty {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("begin") || s.includes("easy")) return "beginner";
  if (s.includes("inter") || s.includes("medium") || s.includes("moderate")) return "intermediate";
  if (s.includes("adv") || s.includes("hard") || s.includes("difficult")) return "advanced";
  return "";
}

// Grab a single string field's (possibly partial) value from raw JSON text,
// tolerating an unterminated string at the end of a streaming chunk.
function grabField(text: string, key: string): string {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, "i"));
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

const EMPTY_PLAN: ContributionPlan = {
  summary: "",
  difficulty: "",
  effort: "",
  prerequisites: "",
  files: "",
  plan: "",
  testing: "",
  gotchas: "",
};

/**
 * Parse a (possibly partial or fenced) model response into a ContributionPlan.
 * Prefers a clean JSON.parse; falls back to field-by-field salvage so both
 * truncated output and mid-stream chunks still yield a usable plan.
 */
export function parsePlan(raw: string): ContributionPlan {
  if (!raw.trim()) return { ...EMPTY_PLAN };

  let obj: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(extractJsonObject(raw));
    if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
  } catch {
    obj = null;
  }

  if (obj) {
    return {
      summary: toStr(obj.summary),
      difficulty: normalizeDifficulty(obj.difficulty),
      effort: toStr(obj.effort),
      prerequisites: toStr(obj.prerequisites),
      files: toStr(obj.files),
      plan: toStr(obj.plan),
      testing: toStr(obj.testing),
      gotchas: toStr(obj.gotchas),
    };
  }

  return {
    summary: grabField(raw, "summary"),
    difficulty: normalizeDifficulty(grabField(raw, "difficulty")),
    effort: grabField(raw, "effort"),
    prerequisites: grabField(raw, "prerequisites"),
    files: grabField(raw, "files"),
    plan: grabField(raw, "plan"),
    testing: grabField(raw, "testing"),
    gotchas: grabField(raw, "gotchas"),
  };
}

/** True when a plan has no usable content (used to reject unparseable output). */
export function isEmptyPlan(plan: ContributionPlan): boolean {
  return !plan.summary && !plan.files && !plan.plan && !plan.testing && !plan.gotchas;
}
