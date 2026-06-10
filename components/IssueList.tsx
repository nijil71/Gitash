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
  /** True when the empty list is the result of a client-side search/saved filter. */
  filtered?: boolean;
  /** True when label filters are applied (an empty result came from the server). */
  hasActiveLabels?: boolean;
  onClearFilters?: () => void;
  bookmarkedNumbers?: Set<number>;
  onToggleBookmark?: (issue: GitHubIssue) => void;
}

export default function IssueList({
  issues,
  selectedIssue,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
  filtered,
  hasActiveLabels,
  onClearFilters,
  bookmarkedNumbers,
  onToggleBookmark,
}: Props) {
  if (issues.length === 0) {
    // Three distinct cases: client-side filter, label filter, or a genuinely
    // empty issue tracker.
    const isFilterEmpty = filtered || hasActiveLabels;
    const title = filtered
      ? "No issues match your filters"
      : hasActiveLabels
        ? "No issues for the selected labels"
        : "No open issues";
    const detail = filtered
      ? "Try a different search term, or clear the filter."
      : hasActiveLabels
        ? "No open issues carry all the selected labels."
        : "This repository has no open issues right now.";

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-secondary p-3">
          {isFilterEmpty ? (
            <SearchX className="h-5 w-5 text-muted-foreground" />
          ) : (
            <GitPullRequest className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        {isFilterEmpty && onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="h-8 text-xs">
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px] pr-2">
      <div className="flex flex-col gap-2 pb-4">
        {issues.map((issue, i) => (
          // Staggered entrance: each card fades in slightly after the previous
          // one (capped so long lists don't feel slow). `backwards` keeps cards
          // hidden until their delay elapses.
          <div
            key={issue.number}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(i, 12) * 35}ms`, animationFillMode: "backwards" }}
          >
            <IssueCard
              issue={issue}
              selected={selectedIssue?.number === issue.number}
              onClick={() => onSelect(issue)}
              bookmarked={bookmarkedNumbers?.has(issue.number) ?? false}
              onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(issue) : undefined}
            />
          </div>
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
