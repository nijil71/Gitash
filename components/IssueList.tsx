"use client";

import type { GitHubIssue } from "@/types";
import IssueCard from "./IssueCard";

interface Props {
  issues: GitHubIssue[];
  selectedIssue: GitHubIssue | null;
  onSelect: (issue: GitHubIssue) => void;
}

export default function IssueList({ issues, selectedIssue, onSelect }: Props) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-gray-500">No open issues found</p>
        <p className="mt-1 text-xs text-gray-400">
          Try a different label filter or check the repository.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {issues.map((issue) => (
        <IssueCard
          key={issue.number}
          issue={issue}
          selected={selectedIssue?.number === issue.number}
          onClick={() => onSelect(issue)}
        />
      ))}
    </div>
  );
}
