"use client";

import { ExternalLink, MessageSquare, Bookmark, UserCheck, Smile } from "lucide-react";
import type { GitHubIssue } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  issue: GitHubIssue;
  selected: boolean;
  onClick: () => void;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let value = secs;
  for (let i = 0; i < units.length; i++) {
    const [size, label] = units[i];
    if (value < size) return `${Math.floor(value)}${label} ago`;
    value /= size;
  }
  return "";
}

export default function IssueCard({ issue, selected, onClick, bookmarked, onToggleBookmark }: Props) {
  return (
    <div
      onClick={onClick}
      data-issue-number={issue.number}
      className={cn(
        "group relative cursor-pointer rounded-lg border p-4 transition-all duration-150",
        "hover:border-border/80 hover:shadow-sm",
        selected
          ? "border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border bg-card hover:bg-secondary/30"
      )}
    >
      {selected && (
        <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pl-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="font-mono">#{issue.number}</span>
            {issue.user && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{issue.user.login}</span>
              </>
            )}
            {issue.created_at && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{timeAgo(issue.created_at)}</span>
              </>
            )}
            {issue.assignees && issue.assignees.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-amber-500"
                title={`Assigned to ${issue.assignees.map((a) => a.login).join(", ")} — someone may already be working on this`}
              >
                <UserCheck className="h-3 w-3" />
                {issue.assignees.length > 1 ? `assigned ${issue.assignees.length}` : "assigned"}
              </span>
            )}
            <span className="ml-auto flex items-center gap-2 text-muted-foreground/80">
              {issue.reactions && issue.reactions.total_count > 0 && (
                <span className="inline-flex items-center gap-1" title="Reactions">
                  <Smile className="h-3 w-3" />
                  {issue.reactions.total_count}
                </span>
              )}
              {issue.comments > 0 && (
                <span className="inline-flex items-center gap-1" title="Comments">
                  <MessageSquare className="h-3 w-3" />
                  {issue.comments}
                </span>
              )}
            </span>
          </div>

          <p
            className={cn(
              "text-sm font-medium leading-snug line-clamp-2",
              selected ? "text-primary" : "text-foreground"
            )}
          >
            {issue.title}
          </p>

          {issue.labels.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `#${label.color}1a`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-0.5 flex flex-shrink-0 items-center gap-1.5">
          {onToggleBookmark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark();
              }}
              className={cn(
                "transition-colors cursor-pointer",
                bookmarked
                  ? "text-amber-500"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark issue"}
              aria-pressed={bookmarked}
              title={bookmarked ? "Remove bookmark" : "Bookmark issue"}
            >
              <Bookmark className={cn("h-3.5 w-3.5", bookmarked && "fill-amber-500")} />
            </button>
          )}
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
            aria-label="Open issue on GitHub"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
