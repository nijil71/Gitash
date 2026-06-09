"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileCode2, ListChecks, Bot } from "lucide-react";
import type {
  ContributionPlan as ContributionPlanData,
  GitHubIssue,
  ModelOption,
} from "@/types";
import LoadingSkeleton from "./LoadingSkeleton";
import CopyButton from "./CopyButton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  issue: GitHubIssue;
  apiKey: string;
  owner: string;
  repo: string;
  selectedModel: ModelOption;
}

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

export default function ContributionPlan({
  issue,
  apiKey,
  owner,
  repo,
  selectedModel,
}: Props) {
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
        provider: selectedModel.id,
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

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.number, owner, repo, apiKey, selectedModel.id]);

  const markdownText = plan
    ? `## Issue #${issue.number}: ${issue.title}\n\n### Relevant Files\n${plan.files}\n\n### Implementation Plan\n${plan.plan}`
    : "";

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
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

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          {loading && <LoadingSkeleton />}

          {error && (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {plan && !loading && (
            <div className="space-y-6 animate-fade-in">
              {/* Relevant Files */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Relevant Files
                  </h3>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 divide-y divide-border overflow-hidden">
                  {plan.files
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => (
                      <p
                        key={i}
                        className="px-3 py-2 text-sm font-mono text-foreground/90 leading-relaxed"
                      >
                        {line}
                      </p>
                    ))}
                </div>
              </section>

              <Separator />

              {/* Step-by-step Plan */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step-by-step Plan
                  </h3>
                </div>
                <div className="space-y-2">
                  {plan.plan
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => {
                      const isNumbered = /^\d+[\.\)]/.test(line.trim());
                      return (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm leading-relaxed text-foreground/90",
                            isNumbered
                              ? "bg-secondary/30 border border-border"
                              : "text-muted-foreground pl-5"
                          )}
                        >
                          {line}
                        </div>
                      );
                    })}
                </div>
              </section>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
