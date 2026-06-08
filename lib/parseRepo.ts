export interface RepoIdentifier {
  owner: string;
  repo: string;
}

export function parseRepo(url: string): RepoIdentifier | null {
  const trimmed = url.trim().replace(/\.git$/, "");

  // Full GitHub URL: https://github.com/owner/repo
  const fullUrl = trimmed.match(
    /^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/?$/
  );
  if (fullUrl) {
    return { owner: fullUrl[1], repo: fullUrl[2] };
  }

  // Shorthand: owner/repo
  const shorthand = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2] };
  }

  return null;
}
