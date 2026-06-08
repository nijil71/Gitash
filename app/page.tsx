"use client";

import { useEffect, useState } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";
import RepoInput from "@/components/RepoInput";
import LabelFilter from "@/components/LabelFilter";
import IssueList from "@/components/IssueList";
import ContributionPlanPanel from "@/components/ContributionPlan";
import {
  fetchLabels,
  fetchIssues,
  fetchRepoMeta,
  GitHubAPIError,
} from "@/lib/github";
import type { GitHubIssue, GitHubLabel } from "@/types";

interface RepoMeta {
  owner: string;
  repo: string;
  stars: number;
  language: string;
  description: string;
}

function KeyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function toErrorMessage(err: unknown): string {
  if (
    err instanceof GitHubAPIError &&
    (err.statusCode === 403 || err.statusCode === 429)
  ) {
    return "GitHub rate limit hit (60 req/hr for unauthenticated requests). Wait a minute and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [activeLabel, setActiveLabel] = useState("");
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("anthropic_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const handleAnalyze = async (owner: string, repo: string) => {
    setLoading(true);
    setError(null);
    setRepoMeta(null);
    setLabels([]);
    setIssues([]);
    setSelectedIssue(null);
    setActiveLabel("");

    try {
      const [meta, fetchedLabels] = await Promise.all([
        fetchRepoMeta(owner, repo),
        fetchLabels(owner, repo),
      ]);

      setRepoMeta({ owner, repo, ...meta });
      setLabels(fetchedLabels);

      const defaultLabel =
        fetchedLabels.find((l) =>
          /good.first.issue|beginner|starter/i.test(l.name)
        )?.name ??
        fetchedLabels[0]?.name ??
        "";

      setActiveLabel(defaultLabel);

      const initialIssues = await fetchIssues(
        owner,
        repo,
        defaultLabel || undefined
      );
      setIssues(initialIssues);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLabelChange = async (label: string) => {
    if (!repoMeta) return;
    setActiveLabel(label);
    setSelectedIssue(null);
    setLoading(true);
    setError(null);

    try {
      const filtered = await fetchIssues(
        repoMeta.owner,
        repoMeta.repo,
        label || undefined
      );
      setIssues(filtered);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              OSS Contributor Agent
            </h1>
            <p className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
              Find good first issues · get an AI-powered contribution plan
            </p>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <KeyIcon />
            {apiKey ? "API Key ✓" : "Set API Key"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* No API key banner */}
        {!apiKey && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/40">
            <span className="mt-0.5 flex-shrink-0 text-amber-500">
              <AlertIcon />
            </span>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Set your Anthropic API key to generate contribution plans.{" "}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="font-medium underline hover:no-underline"
              >
                Set it now →
              </button>
            </p>
          </div>
        )}

        {/* Repo input */}
        <div className="mb-6">
          <RepoInput onAnalyze={handleAnalyze} loading={loading} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {repoMeta && (
          <>
            {/* Repo meta bar */}
            <div className="mb-5 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {repoMeta.owner}/{repoMeta.repo}
                </span>
                <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                  <StarIcon />
                  {repoMeta.stars.toLocaleString()}
                </span>
                {repoMeta.language && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {repoMeta.language}
                  </span>
                )}
              </div>
              {repoMeta.description && (
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {repoMeta.description}
                </p>
              )}
            </div>

            {/* Label filter */}
            {labels.length > 0 && (
              <div className="mb-5">
                <LabelFilter
                  labels={labels}
                  activeLabel={activeLabel}
                  onChange={handleLabelChange}
                />
              </div>
            )}

            {/* Two-column content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left: issue list */}
              <div
                className={
                  loading
                    ? "pointer-events-none opacity-50 transition-opacity"
                    : "transition-opacity"
                }
              >
                <IssueList
                  issues={issues}
                  selectedIssue={selectedIssue}
                  onSelect={setSelectedIssue}
                />
              </div>

              {/* Right: contribution plan */}
              <div>
                {selectedIssue && apiKey ? (
                  <ContributionPlanPanel
                    key={`${repoMeta.owner}/${repoMeta.repo}#${selectedIssue.number}`}
                    issue={selectedIssue}
                    apiKey={apiKey}
                    owner={repoMeta.owner}
                    repo={repoMeta.repo}
                  />
                ) : selectedIssue ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => setShowApiKeyModal(true)}
                        className="font-medium text-blue-600 underline hover:no-underline dark:text-blue-400"
                      >
                        Set your API key
                      </button>{" "}
                      to generate a contribution plan.
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Select an issue to generate a plan
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={setApiKey}
      />
    </div>
  );
}
