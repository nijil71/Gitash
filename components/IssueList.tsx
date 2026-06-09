"use client";

import { GitPullRequest } from "lucide-react";
import type { GitHubIssue } from "@/types";
import IssueCard from "./IssueCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  issues: GitHubIssue[];
  selectedIssue: GitHubIssue | null;
  onSelect: (issue: GitHubIssue) => void;
}

export default function IssueList({ issues, selectedIssue, onSelect }: Props) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-secondary p-3">
          <GitPullRequest className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No open issues found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different label filter or check the repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px] pr-2">
      <div className="flex flex-col gap-2 pb-4">
        {issues.map((issue) => (
          <IssueCard
            key={issue.number}
            issue={issue}
            selected={selectedIssue?.number === issue.number}
            onClick={() => onSelect(issue)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
