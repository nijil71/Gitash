"use client";

import { GitPullRequest, Loader2, SearchX } from "lucide-react";
import type { GitHubIssue } from "@/types";
import IssueCard from "./IssueCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  issues: GitHubIssue[];
  selectedIssue: GitHubIssue | null;
  onSelect: (issue: GitHubIssue) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** True when the empty list is the result of a client-side search filter. */
  filtered?: boolean;
}

export default function IssueList({
  issues,
  selectedIssue,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
  filtered,
}: Props) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-secondary p-3">
          {filtered ? (
            <SearchX className="h-5 w-5 text-muted-foreground" />
          ) : (
            <GitPullRequest className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {filtered ? "No issues match your search" : "No open issues found"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filtered
              ? "Try a different search term or clear the filter."
              : "Try a different label filter or check the repository."}
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

        {hasMore && onLoadMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="mt-1 h-9 w-full text-xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              "Load more issues"
            )}
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}
