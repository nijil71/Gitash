"use client";

import { useEffect, useState } from "react";
import type { ContributionPlan as ContributionPlanData, GitHubIssue } from "@/types";
import LoadingSkeleton from "./LoadingSkeleton";
import CopyButton from "./CopyButton";

interface Props {
  issue: GitHubIssue;
  apiKey: string;
  owner: string;
  repo: string;
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
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

export default function ContributionPlan({ issue, apiKey, owner, repo }: Props) {
  const [plan, setPlan] = useState<ContributionPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlan(null);
    setError(null);

    const labelNames = issue.labels.map((l) => l.name).join(", ") || "none";

    fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        owner,
        repo,
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueBody: issue.body ?? "",
        labels: labelNames,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        return data as ContributionPlanData;
      })
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [issue.number, owner, repo, apiKey]);

  const markdownText = plan
    ? `## Issue #${issue.number}: ${issue.title}\n\n### Relevant Files\n${plan.files}\n\n### Implementation Plan\n${plan.plan}`
    : "";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Contribution Plan
          </h2>
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
            #{issue.number} · {issue.title}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ExternalLinkIcon />
            GitHub
          </a>
          {plan && <CopyButton text={markdownText} label="Copy plan" />}
        </div>
      </div>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {plan && !loading && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Relevant Files
            </h3>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              {plan.files
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <p
                    key={i}
                    className="py-0.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
                  >
                    {line}
                  </p>
                ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Step-by-step Plan
            </h3>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              {plan.plan
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <p
                    key={i}
                    className="py-0.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
                  >
                    {line}
                  </p>
                ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
