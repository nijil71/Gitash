"use client";

import type { GitHubIssue } from "@/types";

interface Props {
  issue: GitHubIssue;
  selected: boolean;
  onClick: () => void;
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function IssueCard({ issue, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50 ${
        selected
          ? "border-blue-500 bg-blue-50 hover:bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span>#{issue.number}</span>
          </div>
          <p
            className={`text-sm font-medium leading-snug ${
              selected ? "text-blue-900" : "text-gray-800"
            }`}
          >
            {issue.title}
          </p>

          {issue.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}22`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}44`,
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
          className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-gray-600"
          aria-label="Open issue on GitHub"
        >
          <ExternalLinkIcon />
        </a>
      </div>
    </div>
  );
}
