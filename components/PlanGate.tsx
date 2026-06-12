"use client";

import { GitPullRequest, ExternalLink, Sparkles, CheckCircle } from "lucide-react";
import type { LinkedPR } from "@/lib/github";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The pre-generation plan gate: pauses AI plan generation when the selected
// issue is already closed or an open PR already references it, so the user
// reviews existing work before spending tokens. The fetch lives in
// lib/linkedPRs.ts (owned by page.tsx); everything here is presentational.

const MAX_SHOWN = 3;

function prStateBadge(pr: LinkedPR): string | null {
  if (pr.state === "merged") return "merged";
  if (pr.state === "closed") return "closed";
  if (pr.draft) return "draft";
  return null;
}

interface PRListProps {
  prs: LinkedPR[];
  owner: string;
  repo: string;
  className?: string;
}

function PRList({ prs, owner, repo, className }: PRListProps) {
  return (
    <ul className={cn("space-y-1", className)}>
      {prs.slice(0, MAX_SHOWN).map((pr) => {
        const badge = prStateBadge(pr);
        return (
          <li key={`${pr.repo}#${pr.number}`}>
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex-shrink-0 font-mono text-[11px]">
                {pr.repo !== `${owner}/${repo}` ? `${pr.repo}#${pr.number}` : `#${pr.number}`}
              </span>
              <span className="min-w-0 truncate">{pr.title}</span>
              {badge && (
                <span className="flex-shrink-0 rounded-full border border-border bg-secondary px-1.5 py-px text-[10px] font-medium">
                  {badge}
                </span>
              )}
              <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </li>
        );
      })}
      {prs.length > MAX_SHOWN && (
        <li className="text-[11px] text-muted-foreground/70">+{prs.length - MAX_SHOWN} more</li>
      )}
    </ul>
  );
}

function headline(issueClosed: boolean, prCount: number): string {
  if (issueClosed) return "This issue is already closed";
  return prCount === 1
    ? "An open PR already references this issue"
    : `${prCount} open PRs already reference this issue`;
}

function GateIcon({ issueClosed, className }: { issueClosed: boolean; className?: string }) {
  return issueClosed ? (
    <CheckCircle className={className} />
  ) : (
    <GitPullRequest className={className} />
  );
}

// ── Banner ─────────────────────────────────────────────────────────────────
// Compact notice above the plan panel, shown once the gate is passed (or when
// no plan will be generated) so the heads-up stays visible.

interface NoticeProps {
  prs: LinkedPR[];
  owner: string;
  repo: string;
  issueClosed: boolean;
}

export default function PlanGateNotice({ prs, owner, repo, issueClosed }: NoticeProps) {
  if (prs.length === 0 && !issueClosed) return null;
  return (
    <div className="mb-3 flex-shrink-0 animate-fade-in rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <GateIcon issueClosed={issueClosed} className="h-3.5 w-3.5" />
        {headline(issueClosed, prs.length)}
      </div>
      {prs.length > 0 && <PRList prs={prs} owner={owner} repo={repo} className="mt-1.5" />}
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
        {issueClosed
          ? "The work was likely already done or declined — double-check the issue thread."
          : "Check whether it covers the fix before starting — duplicating in-flight work is the fastest way to a closed PR."}
      </p>
    </div>
  );
}

// ── Pre-generation dialog ──────────────────────────────────────────────────
// Pops when a plan would otherwise be generated: review the existing work for
// free, or spend the tokens anyway.

interface GateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prs: LinkedPR[];
  owner: string;
  repo: string;
  issueClosed: boolean;
  issueUrl: string;
  onGenerate: () => void;
}

export function PlanGateDialog({
  open,
  onOpenChange,
  prs,
  owner,
  repo,
  issueClosed,
  issueUrl,
  onGenerate,
}: GateDialogProps) {
  const reviewUrl = issueClosed ? issueUrl : prs[0]?.html_url ?? issueUrl;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GateIcon issueClosed={issueClosed} className="h-4 w-4" />
            {issueClosed ? "This issue is already closed" : "Someone may already be on it"}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {issueClosed
              ? "It was likely fixed or declined. Plan generation is paused so you can review the issue thread before spending tokens on finished work."
              : `${headline(false, prs.length)}. Plan generation is paused so you can review the existing work before spending tokens on a fix that might already be written.`}
          </DialogDescription>
        </DialogHeader>

        {prs.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5">
            <PRList prs={prs} owner={owner} repo={repo} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              {issueClosed ? "Review the issue" : "Review the PR"}
            </a>
          </Button>
          <Button size="sm" onClick={onGenerate} className="h-8 gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Generate plan anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Gate card ──────────────────────────────────────────────────────────────
// Replaces the plan panel while generation is held (after the dialog is
// dismissed), so the choice to generate is never more than a click away.

interface GateCardProps {
  prs: LinkedPR[];
  owner: string;
  repo: string;
  issueClosed: boolean;
  issueUrl: string;
  onGenerate: () => void;
}

export function PlanGateCard({ prs, owner, repo, issueClosed, issueUrl, onGenerate }: GateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-10 text-center animate-fade-in">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
        <GateIcon issueClosed={issueClosed} className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{headline(issueClosed, prs.length)}</p>
        <p className="text-xs text-muted-foreground">
          {issueClosed
            ? "Plan generation is paused — review the issue thread first, or generate anyway."
            : "Plan generation is paused — review the existing work first, or generate anyway."}
        </p>
      </div>
      {prs.length > 0 && (
        <div className="w-full max-w-xs rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5 text-left">
          <PRList prs={prs} owner={owner} repo={repo} />
        </div>
      )}
      <div className="flex items-center gap-2">
        {issueClosed && (
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
            <a href={issueUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Review the issue
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onGenerate} className="h-8 gap-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          Generate plan anyway
        </Button>
      </div>
    </div>
  );
}
