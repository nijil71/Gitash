export interface RecentRepo {
  owner: string;
  repo: string;
}

const KEY = "recent_repos";
const MAX = 6;

export function getRecentRepos(): RecentRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (r): r is RecentRepo =>
        r && typeof r.owner === "string" && typeof r.repo === "string"
    );
  } catch {
    return [];
  }
}

/** Add (or move to front) a repo and return the updated, deduped list. */
export function addRecentRepo(owner: string, repo: string): RecentRepo[] {
  const rest = getRecentRepos().filter(
    (r) => !(r.owner === owner && r.repo === repo)
  );
  const next = [{ owner, repo }, ...rest].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
  return next;
}
