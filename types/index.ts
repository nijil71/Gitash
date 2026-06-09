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
}

export interface ContributionPlan {
  files: string;
  plan: string;
}

export type ModelProvider = "claude" | "openai" | "gemini";

export interface ModelOption {
  id: ModelProvider;
  name: string;
  model: string;
  description: string;
  color: string;
}
