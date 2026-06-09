"use client";

import { ExternalLink } from "lucide-react";
import type { GitHubIssue } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  issue: GitHubIssue;
  selected: boolean;
  onClick: () => void;
}

export default function IssueCard({ issue, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
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
          <div className="mb-1 flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">
              #{issue.number}
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

        <a
          href={issue.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
          aria-label="Open issue on GitHub"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
