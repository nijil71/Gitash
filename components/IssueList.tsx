"use client";

import { useEffect, useRef, useState } from "react";
import { GitPullRequest, Loader2, SearchX } from "lucide-react";
import type { GitHubIssue } from "@/types";
import IssueCard from "./IssueCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  // Scroll-edge fades: instead of hard-clipping cards mid-label, a soft
  // gradient signals "the list continues" — each fade shows only when there
  // is content in that direction.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  const updateEdges = (el: HTMLElement) => {
    setAtTop(el.scrollTop <= 4);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  };

  // Measure on mount and whenever the list content changes (load more,
  // filters); Radix exposes the scrollable viewport via a data attribute.
  useEffect(() => {
    const viewport = wrapRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]"
    );
    if (viewport) updateEdges(viewport);
  }, [issues.length, loadingMore]);

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
    <div ref={wrapRef} className="relative h-full">
      <ScrollArea
        className="h-full pr-2"
        onScrollCapture={(e) => updateEdges(e.target as HTMLElement)}
      >
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

      {/* Edge fades (right inset leaves the scrollbar gutter undimmed) */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 right-2.5 top-0 h-8 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
          atTop ? "opacity-0" : "opacity-100"
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-2.5 h-8 bg-gradient-to-t from-background to-transparent transition-opacity duration-200",
          atBottom ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}
