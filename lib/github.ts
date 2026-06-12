import type { GitHubIssue, GitHubLabel } from "@/types";

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Rate-limit tracking ────────────────────────────────────────────────────
// GitHub reports the caller's budget on every response. Broadcast it so the
// UI can nudge for a token *before* requests start failing at the wall.

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  /** Unix seconds when the window resets. */
  reset: number;
}

export const RATE_LIMIT_EVENT = "gitash:ratelimit";

function trackRateLimit(res: Response): void {
  if (typeof window === "undefined") return;
  const remaining = Number(res.headers.get("x-ratelimit-remaining"));
  const limit = Number(res.headers.get("x-ratelimit-limit"));
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) return;
  window.dispatchEvent(
    new CustomEvent<RateLimitInfo>(RATE_LIMIT_EVENT, {
      detail: { remaining, limit, reset },
    })
  );
}

// Single fetch path for every GitHub call: builds headers, tracks the rate
// limit. Callers still assertOk() with their own context string.
async function ghFetch(url: string, token?: string, accept?: string): Promise<Response> {
  const headers = buildHeaders(token);
  if (accept) headers.Accept = accept;
  const res = await fetch(url, { headers });
  trackRateLimit(res);
  return res;
}

function assertOk(res: Response, context: string): void {
  if (res.ok) return;
  if (res.status === 404) {
    throw new GitHubAPIError(`${context}: repository not found`, 404);
  }
  if (res.status === 403 || res.status === 429) {
    throw new GitHubAPIError(`${context}: rate limited by GitHub`, res.status);
  }
  throw new GitHubAPIError(
    `${context}: unexpected error (${res.statusText})`,
    res.status
  );
}

export async function fetchLabels(
  owner: string,
  repo: string,
  githubToken?: string
): Promise<GitHubLabel[]> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/labels?per_page=50`,
    githubToken
  );
  assertOk(res, `fetchLabels(${owner}/${repo})`);
  return res.json();
}

export const ISSUES_PER_PAGE = 30;

export type IssueSortField = "created" | "updated" | "comments";
export type SortDirection = "asc" | "desc";

export interface FetchIssuesOptions {
  labels?: string;
  sort?: IssueSortField;
  direction?: SortDirection;
  page?: number;
  perPage?: number;
  token?: string;
}

export async function fetchIssues(
  owner: string,
  repo: string,
  options: FetchIssuesOptions = {}
): Promise<GitHubIssue[]> {
  const {
    labels,
    sort = "created",
    direction = "desc",
    page = 1,
    perPage = ISSUES_PER_PAGE,
    token,
  } = options;

  const params = new URLSearchParams({
    state: "open",
    per_page: String(perPage),
    page: String(page),
    sort,
    direction,
  });
  if (labels) params.set("labels", labels);

  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?${params}`,
    token
  );
  assertOk(res, `fetchIssues(${owner}/${repo})`);

  const items: Array<GitHubIssue & { pull_request?: unknown }> =
    await res.json();
  return items.filter((item) => !item.pull_request);
}

export async function fetchIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  githubToken?: string
): Promise<GitHubIssue | null> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    githubToken
  );
  assertOk(res, `fetchIssue(${owner}/${repo}#${issueNumber})`);
  const item: GitHubIssue & { pull_request?: unknown } = await res.json();
  return item.pull_request ? null : item;
}

export interface IssueComment {
  author: string;
  body: string;
}

export async function fetchIssueComments(
  owner: string,
  repo: string,
  issueNumber: number,
  perPage = 20,
  githubToken?: string
): Promise<IssueComment[]> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=${perPage}`,
    githubToken
  );
  assertOk(res, `fetchIssueComments(${owner}/${repo}#${issueNumber})`);

  const data: Array<{ user: { login: string } | null; body: string | null }> =
    await res.json();
  return data
    .map((c) => ({ author: c.user?.login ?? "unknown", body: (c.body ?? "").trim() }))
    .filter((c) => c.body);
}

export interface LinkedPR {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  /** "owner/repo" the PR lives in — cross-references can come from forks. */
  repo: string;
}

export async function fetchLinkedPRs(
  owner: string,
  repo: string,
  issueNumber: number,
  githubToken?: string
): Promise<LinkedPR[]> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/timeline?per_page=100`,
    githubToken
  );
  assertOk(res, `fetchLinkedPRs(${owner}/${repo}#${issueNumber})`);

  const events: Array<{
    event: string;
    source?: {
      issue?: {
        number: number;
        title: string;
        html_url: string;
        state: string;
        draft?: boolean;
        pull_request?: { merged_at: string | null };
        repository?: { full_name: string };
      };
    };
  }> = await res.json();

  const seen = new Set<string>();
  const prs: LinkedPR[] = [];
  for (const ev of events) {
    if (ev.event !== "cross-referenced") continue;
    const item = ev.source?.issue;
    if (!item?.pull_request) continue;
    const prRepo = item.repository?.full_name ?? `${owner}/${repo}`;
    const key = `${prRepo}#${item.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    prs.push({
      number: item.number,
      title: item.title,
      html_url: item.html_url,
      state: item.pull_request.merged_at
        ? "merged"
        : item.state === "open"
          ? "open"
          : "closed",
      draft: Boolean(item.draft),
      repo: prRepo,
    });
  }
  return prs;
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  githubToken?: string,
  maxChars = 10_000
): Promise<string> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}?ref=${encodeURIComponent(ref)}`,
    githubToken,
    "application/vnd.github.raw+json"
  );
  assertOk(res, `fetchFileContent(${owner}/${repo}:${path})`);
  const text = await res.text();
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}\n… (truncated)`
    : text;
}

export async function fetchRepoMeta(
  owner: string,
  repo: string,
  githubToken?: string
): Promise<{
  stars: number;
  language: string;
  description: string;
  defaultBranch: string;
}> {
  const res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, githubToken);
  assertOk(res, `fetchRepoMeta(${owner}/${repo})`);

  const data: {
    stargazers_count: number;
    language: string | null;
    description: string | null;
    default_branch: string;
  } = await res.json();

  return {
    stars: data.stargazers_count,
    language: data.language ?? "",
    description: data.description ?? "",
    defaultBranch: data.default_branch ?? "main",
  };
}

const IGNORED_PATH =
  /(^|\/)(node_modules|\.git|\.next|\.turbo|dist|build|out|coverage|vendor|target|\.venv|venv|env|__pycache__|\.idea|\.vscode|bin|obj|\.cache)(\/|$)/i;
const IGNORED_FILE =
  /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp|mp4|mov|webm|mp3|wav|woff2?|ttf|eot|otf|map|min\.js|min\.css|snap|pdf|zip|gz|tgz|tar|wasm|lock)$/i;
const LOCKFILE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock)$/i;

export interface RepoTree {
  paths: string[];
  truncated: boolean;
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  maxPaths = 400,
  githubToken?: string
): Promise<RepoTree> {
  const res = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    githubToken
  );
  assertOk(res, `fetchRepoTree(${owner}/${repo})`);

  const data: {
    tree: Array<{ path: string; type: string }>;
    truncated: boolean;
  } = await res.json();

  const paths = data.tree
    .filter((node) => node.type === "blob")
    .map((node) => node.path)
    .filter((p) => !IGNORED_PATH.test(p) && !IGNORED_FILE.test(p) && !LOCKFILE.test(p))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));

  return {
    paths: paths.slice(0, maxPaths),
    truncated: data.truncated || paths.length > maxPaths,
  };
}
