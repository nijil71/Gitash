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
    "User-Agent": "oss-contributor-agent/1.0",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
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
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/labels?per_page=50`,
    { headers: buildHeaders(githubToken) }
  );
  assertOk(res, `fetchLabels(${owner}/${repo})`);
  return res.json();
}

export const ISSUES_PER_PAGE = 30;

export type IssueSortField = "created" | "updated" | "comments";
export type SortDirection = "asc" | "desc";

export interface FetchIssuesOptions {
  /** Comma-separated label names; issues must carry ALL of them. */
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

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?${params}`,
    { headers: buildHeaders(token) }
  );
  assertOk(res, `fetchIssues(${owner}/${repo})`);

  const items: Array<GitHubIssue & { pull_request?: unknown }> =
    await res.json();
  // The issues endpoint returns PRs too — drop them.
  return items.filter((item) => !item.pull_request);
}

export async function fetchRepoMeta(
  owner: string,
  repo: string,
  githubToken?: string
): Promise<{ stars: number; language: string; description: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: buildHeaders(githubToken) }
  );
  assertOk(res, `fetchRepoMeta(${owner}/${repo})`);

  const data: {
    stargazers_count: number;
    language: string | null;
    description: string | null;
  } = await res.json();

  return {
    stars: data.stargazers_count,
    language: data.language ?? "",
    description: data.description ?? "",
  };
}
