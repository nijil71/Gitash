export interface SavedIssue {
  owner: string;
  repo: string;
  number: number;
  title: string;
  html_url: string;
}

const KEY = "saved_issues";
const MAX = 100;

export function bookmarkKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}#${number}`;
}

export function getBookmarks(): SavedIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (b): b is SavedIssue =>
        b &&
        typeof b.owner === "string" &&
        typeof b.repo === "string" &&
        typeof b.number === "number"
    );
  } catch {
    return [];
  }
}

/** Add or remove a bookmark and return the updated list (most-recent-first). */
export function toggleBookmark(issue: SavedIssue): SavedIssue[] {
  const k = bookmarkKey(issue.owner, issue.repo, issue.number);
  const existing = getBookmarks();
  const without = existing.filter(
    (b) => bookmarkKey(b.owner, b.repo, b.number) !== k
  );
  const next =
    without.length === existing.length ? [issue, ...without].slice(0, MAX) : without;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
  return next;
}
