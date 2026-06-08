export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: GitHubLabel[];
  html_url: string;
  state: string;
}

export interface ContributionPlan {
  files: string;
  plan: string;
}
