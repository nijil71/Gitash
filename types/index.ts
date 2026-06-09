export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: GitHubLabel[];
  html_url: string;
  state: string;
  comments: number;
  created_at: string;
  updated_at: string;
  user: GitHubUser | null;
  assignees: GitHubUser[];
  reactions?: { total_count: number } | null;
}

export type PlanDifficulty = "beginner" | "intermediate" | "advanced" | "";

export interface ContributionPlan {
  /** 1–2 sentence plain-language overview of the issue and the fix approach. */
  summary: string;
  difficulty: PlanDifficulty;
  /** Rough time estimate for a junior dev, e.g. "1–2 hours". */
  effort: string;
  /** Bullet list of knowledge/setup needed before starting. */
  prerequisites: string;
  /** Bullet list of relevant files, each with a one-line reason. */
  files: string;
  /** Numbered step-by-step implementation guide. */
  plan: string;
  /** Bullet list of how to verify the change. */
  testing: string;
  /** Bullet list of pitfalls, edge cases, or conventions to respect. */
  gotchas: string;
}

export type ModelProvider = "claude" | "openai" | "gemini";

export interface ModelOption {
  id: ModelProvider;
  name: string;
  model: string;
  description: string;
  color: string;
}
