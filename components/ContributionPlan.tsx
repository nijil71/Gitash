"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ExternalLink,
  Bot,
  FileCode2,
  ListChecks,
  GitFork,
  GitPullRequestCreate,
  Code2,
  GitBranch,
} from "lucide-react";
import type {
  ContributionPlan as ContributionPlanData,
  GitHubIssue,
  ModelOption,
} from "@/types";
import { fetchIssueComments } from "@/lib/github";
import LoadingSkeleton from "./LoadingSkeleton";
import CopyButton from "./CopyButton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  issue: GitHubIssue;
  apiKey: string;
  owner: string;
  repo: string;
  /** Filtered repo file paths used to ground the AI's file suggestions. */
  fileTree: string[];
  /** Optional GitHub token, used to fetch issue comments for extra context. */
  githubToken: string;
  /** Repo default branch, used for the web-editor link. */
  defaultBranch: string;
  selectedModel: ModelOption;
  className?: string;
}

// Suggest a conventional branch name from the issue's labels + title.
function suggestBranchName(issue: GitHubIssue): string {
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  let prefix = "fix";
  if (labels.some((l) => /feature|enhancement|feat/.test(l))) prefix = "feat";
  else if (labels.some((l) => /doc/.test(l))) prefix = "docs";
  else if (labels.some((l) => /chore|refactor|maintenance/.test(l))) prefix = "chore";

  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return `${prefix}/${issue.number}${slug ? `-${slug}` : ""}`;
}

// ── Model badge ────────────────────────────────────────────────────────────

function ModelBadge({ model }: { model: ModelOption }) {
  const [imgError, setImgError] = useState(false);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: `${model.color}44`,
        color: model.color,
        backgroundColor: `${model.color}15`,
      }}
    >
      {!imgError && (
        <img
          src={`/logos/${model.id}.svg`}
          alt=""
          width={10}
          height={10}
          className="flex-shrink-0 object-contain"
          onError={() => setImgError(true)}
        />
      )}
      {model.name}
    </span>
  );
}

// ── File helpers ───────────────────────────────────────────────────────────

function getExt(path: string): string {
  const m = path.match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}

function extColor(ext: string): string {
  if ([".ts", ".tsx"].includes(ext)) return "#3b82f6";
  if ([".js", ".jsx", ".mjs"].includes(ext)) return "#f59e0b";
  if ([".css", ".scss", ".sass"].includes(ext)) return "#a855f7";
  if ([".json", ".yaml", ".yml"].includes(ext)) return "#eab308";
  if ([".md", ".mdx"].includes(ext)) return "#6b7280";
  if ([".go"].includes(ext)) return "#06b6d4";
  if ([".rs"].includes(ext)) return "#f97316";
  if ([".py"].includes(ext)) return "#10b981";
  return "#22c55e";
}

function splitPath(path: string): { dir: string; filename: string } {
  const i = path.lastIndexOf("/");
  return i === -1
    ? { dir: "", filename: path }
    : { dir: path.slice(0, i + 1), filename: path.slice(i + 1) };
}

// ── Parsers ────────────────────────────────────────────────────────────────

interface FileEntry { path: string; reason: string }
interface StepEntry { number: string; content: string }

function parseFiles(raw: string): FileEntry[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const stripped = line.replace(/^[•\-\*\d+\.\)]\s*/, "").trim();
      const sep = stripped.match(/ [-–—] | ?: /);
      if (sep && sep.index !== undefined) {
        return {
          path: stripped.slice(0, sep.index).trim(),
          reason: stripped.slice(sep.index + sep[0].length).trim(),
        };
      }
      return { path: stripped, reason: "" };
    })
    .filter((e) => e.path);
}

function parseSteps(raw: string): StepEntry[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  const steps: StepEntry[] = [];
  let current: StepEntry | null = null;
  for (const line of lines) {
    const m = line.trim().match(/^(?:Step\s+)?(\d+)[.\):]?\s+(.+)/i);
    if (m) {
      if (current) steps.push(current);
      current = { number: m[1], content: m[2] };
    } else if (current) {
      current.content += " " + line.trim();
    } else {
      steps.push({ number: String(steps.length + 1), content: line.trim() });
    }
  }
  if (current) steps.push(current);
  return steps;
}

const PATH_RE = /((?:[\w.-]+\/)+[\w.\-]+\.\w+|\b\w+\.(?:ts|tsx|js|jsx|css|scss|go|rs|py|md|json)\b)/g;

function highlightPaths(text: string): ReactNode[] {
  const parts = text.split(PATH_RE);
  return parts.map((part, i) =>
    PATH_RE.test(part) ? (
      <code
        key={i}
        className="rounded px-1 py-0.5 font-mono text-[11px] bg-secondary text-foreground/80 mx-0.5"
      >
        {part}
      </code>
    ) : (
      part
    )
  );
}

// ── Tab views ──────────────────────────────────────────────────────────────

function FilesTab({ files }: { files: FileEntry[] }) {
  if (files.length === 0)
    return <p className="text-xs text-muted-foreground text-center py-8">No files listed</p>;
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-secondary/10">
      {files.map((entry, i) => {
        const ext = getExt(entry.path);
        const color = extColor(ext);
        const { dir, filename } = splitPath(entry.path);
        return (
          <div
            key={i}
            className={cn("flex items-start gap-3 px-4 py-3", i < files.length - 1 && "border-b border-border/60")}
          >
            <div
              className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {ext || "dir"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs leading-snug">
                {dir && <span className="text-muted-foreground/50">{dir}</span>}
                <span className="text-foreground font-medium">{filename || entry.path}</span>
              </p>
              {entry.reason && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{entry.reason}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepsTab({ steps }: { steps: StepEntry[] }) {
  if (steps.length === 0)
    return <p className="text-xs text-muted-foreground text-center py-8">No steps listed</p>;
  return (
    <div className="space-y-0">
      {steps.map((entry, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30 z-10">
              <span className="text-[11px] font-bold text-primary leading-none">{entry.number}</span>
            </div>
            {i < steps.length - 1 && <div className="mt-1 flex-1 w-px bg-border min-h-[28px]" />}
          </div>
          <div className={cn("flex-1 min-w-0", i < steps.length - 1 ? "pb-5" : "pb-0")}>
            <p className="text-sm text-foreground/90 leading-relaxed pt-0.5">
              {highlightPaths(entry.content)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ContributionPlan({ issue, apiKey, owner, repo, fileTree, githubToken, defaultBranch, selectedModel, className }: Props) {
  const [plan, setPlan] = useState<ContributionPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "steps">("files");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlan(null);
    setError(null);
    setActiveTab("files");

    const labelNames = issue.labels.map((l) => l.name).join(", ") || "none";

    (async () => {
      // Best-effort: pull the issue discussion for extra context. Never block
      // the plan if comments can't be fetched (rate limit, locked issue, etc.).
      let comments: { author: string; body: string }[] = [];
      if (issue.comments > 0) {
        try {
          comments = await fetchIssueComments(
            owner,
            repo,
            issue.number,
            20,
            githubToken || undefined
          );
        } catch {
          comments = [];
        }
      }
      if (cancelled) return;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          owner, repo,
          issueNumber: issue.number,
          issueTitle: issue.title,
          issueBody: issue.body ?? "",
          labels: labelNames,
          provider: selectedModel.id,
          fileTree,
          comments,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json"))
        throw new Error(`Server error (${res.status}) — please try again`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      return data as ContributionPlanData;
    })()
      .then((data) => { if (!cancelled && data) setPlan(data); })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.number, owner, repo, apiKey, selectedModel.id]);

  const branchName = suggestBranchName(issue);
  const forkUrl = `https://github.com/${owner}/${repo}/fork`;
  const editorUrl = `https://github.dev/${owner}/${repo}/tree/${defaultBranch}`;
  const compareUrl = `https://github.com/${owner}/${repo}/compare`;

  const markdownText = plan
    ? `## Issue #${issue.number}: ${issue.title}\n\n` +
      `**Suggested branch:** \`${branchName}\`\n\n` +
      `### Relevant Files\n${plan.files}\n\n` +
      `### Implementation Plan\n${plan.plan}\n\n` +
      `[Open issue](${issue.html_url}) · [Fork repo](${forkUrl}) · [Open a PR](${compareUrl})`
    : "";

  const files = plan ? parseFiles(plan.files) : [];
  const steps = plan ? parseSteps(plan.plan) : [];

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-card overflow-hidden h-full", className)}>

      {/* ── Panel header ── */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground">Contribution Plan</span>
            <ModelBadge model={selectedModel} />
          </div>
          <p className="truncate text-xs text-muted-foreground font-mono">
            #{issue.number} · {issue.title}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
            <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
          </Button>
          {plan && <CopyButton text={markdownText} label="Copy plan" />}
        </div>
      </div>

      {/* ── Tab bar (only when plan is loaded) ── */}
      {plan && !loading && (
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-border flex-shrink-0">
          {(["files", "steps"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === "files" ? files.length : steps.length;
            const Icon = tab === "files" ? FileCode2 : ListChecks;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-xs font-medium transition-colors cursor-pointer",
                  "border-b-2 -mb-px",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{tab}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    isActive ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tab content ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5">
          {loading && <LoadingSkeleton />}

          {error && (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {plan && !loading && (
            <div className="animate-fade-in">
              {activeTab === "files" && <FilesTab files={files} />}
              {activeTab === "steps" && <StepsTab steps={steps} />}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Action footer ── */}
      {plan && !loading && (
        <div className="flex-shrink-0 border-t border-border bg-secondary/20 px-4 py-3 space-y-2.5">
          {/* Suggested branch */}
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <code className="min-w-0 flex-1 truncate rounded bg-secondary px-2 py-1 font-mono text-[11px] text-foreground/80">
              {branchName}
            </code>
            <CopyButton text={branchName} label="Copy" className="h-7" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
              <a href={forkUrl} target="_blank" rel="noopener noreferrer">
                <GitFork className="h-3.5 w-3.5" />
                Fork
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
              <a
                href={editorUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open this repo in the github.dev web editor"
              >
                <Code2 className="h-3.5 w-3.5" />
                Editor
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
              <a href={compareUrl} target="_blank" rel="noopener noreferrer">
                <GitPullRequestCreate className="h-3.5 w-3.5" />
                Open PR
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
