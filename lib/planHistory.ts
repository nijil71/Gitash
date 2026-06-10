import type { ContributionPlan, ModelProvider } from "@/types";
import { isEmptyPlan } from "@/lib/planParse";

// Client-side plan cache. The server's in-memory cache is per-instance (it
// evaporates between serverless invocations), so finished plans are also
// persisted to localStorage: revisiting an issue is instant and costs zero
// provider tokens, and the saved entries double as a "past plans" history.

export interface SavedPlan {
  key: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  provider: ModelProvider;
  plan: ContributionPlan;
  savedAt: number;
}

const KEY = "gitash_plan_history";
const MAX = 50;

export function planKey(
  owner: string,
  repo: string,
  number: number,
  provider: ModelProvider
): string {
  return `${owner}/${repo}#${number}@${provider}`;
}

export function getPlanHistory(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (p): p is SavedPlan =>
        p &&
        typeof p.key === "string" &&
        typeof p.owner === "string" &&
        typeof p.repo === "string" &&
        typeof p.number === "number" &&
        p.plan &&
        typeof p.plan === "object"
    );
  } catch {
    return [];
  }
}

export function getCachedPlan(key: string): SavedPlan | null {
  return getPlanHistory().find((p) => p.key === key) ?? null;
}

/**
 * Persist a finished plan (most-recent-first, capped). Empty/unparseable
 * plans are ignored so a failed generation never shadows a good cached one.
 */
export function savePlan(entry: Omit<SavedPlan, "savedAt">): SavedPlan[] {
  if (isEmptyPlan(entry.plan)) return getPlanHistory();
  const next = [
    { ...entry, savedAt: Date.now() },
    ...getPlanHistory().filter((p) => p.key !== entry.key),
  ].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore storage errors (quota, private mode) */
  }
  return next;
}
