import { fetchLinkedPRs, type LinkedPR } from "./github";

// Session-level cache, deduping in-flight requests too: the pre-generation
// gate in page.tsx and any other consumer share a single timeline call per
// issue. Failures resolve to [] (fail open — never block plan generation on
// a rate limit) and are not cached, so a later selection can retry.
const cache = new Map<string, Promise<LinkedPR[]>>();

export function getLinkedPRs(
  owner: string,
  repo: string,
  issueNumber: number,
  githubToken?: string
): Promise<LinkedPR[]> {
  const key = `${owner}/${repo}#${issueNumber}`;
  let promise = cache.get(key);
  if (!promise) {
    promise = fetchLinkedPRs(owner, repo, issueNumber, githubToken).catch(() => {
      cache.delete(key);
      return [];
    });
    cache.set(key, promise);
  }
  return promise;
}
