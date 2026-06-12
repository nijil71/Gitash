"use client";

import { GitPullRequest, ExternalLink, Sparkles } from "lucide-react";
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

// The fetch lives in lib/linkedPRs.ts (owned by page.tsx, which gates plan
// generation on the result); everything here is presentational.

const MAX_SHOWN = 3;

interface PRListProps {
  openPRs: LinkedPR[];
  owner: string;
  repo: string;
  className?: string;
}

function PRList({ openPRs, owner, repo, className }: PRListProps) {
  return (
    <ul className={cn("space-y-1", className)}>
      {openPRs.slice(0, MAX_SHOWN).map((pr) => (
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
            {pr.draft && (
              <span className="flex-shrink-0 rounded-full border border-border bg-secondary px-1.5 py-px text-[10px] font-medium">
                draft
              </span>
            )}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </li>
      ))}
      {openPRs.length > MAX_SHOWN && (
        <li className="text-[11px] text-muted-foreground/70">+{openPRs.length - MAX_SHOWN} more</li>
      )}
    </ul>
  );
}

function prCountLabel(count: number): string {
  return count === 1
    ? "An open PR already references this issue"
    : `${count} open PRs already reference this issue`;
}

// ── Banner ─────────────────────────────────────────────────────────────────
// Compact notice above the plan panel, shown once the user has a plan (or no
// API key) so the heads-up stays visible after the gate is passed.

interface NoticeProps {
  openPRs: LinkedPR[];
  owner: string;
  repo: string;
}

export default function LinkedPRNotice({ openPRs, owner, repo }: NoticeProps) {
  if (openPRs.length === 0) return null;
  return (
    <div className="mb-3 flex-shrink-0 animate-fade-in rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <GitPullRequest className="h-3.5 w-3.5" />
        {prCountLabel(openPRs.length)}
      </div>
      <PRList openPRs={openPRs} owner={owner} repo={repo} className="mt-1.5" />
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
        Check whether it covers the fix before starting — duplicating in-flight work is the
        fastest way to a closed PR.
      </p>
    </div>
  );
}

// ── Pre-generation dialog ──────────────────────────────────────────────────
// Pops when a selected issue has open PRs and a plan would otherwise be
// generated: review the PR for free, or spend the tokens anyway.

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openPRs: LinkedPR[];
  owner: string;
  repo: string;
  onGenerate: () => void;
}

export function LinkedPRDialog({ open, onOpenChange, openPRs, owner, repo, onGenerate }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitPullRequest className="h-4 w-4" />
            Someone may already be on it
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {prCountLabel(openPRs.length)}. Plan generation is paused so you can review the
            existing work before spending tokens on a fix that might already be written.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5">
          <PRList openPRs={openPRs} owner={owner} repo={repo} />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
            <a href={openPRs[0]?.html_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Review the PR
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
  openPRs: LinkedPR[];
  owner: string;
  repo: string;
  onGenerate: () => void;
}

export function LinkedPRGateCard({ openPRs, owner, repo, onGenerate }: GateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-10 text-center animate-fade-in">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
        <GitPullRequest className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{prCountLabel(openPRs.length)}</p>
        <p className="text-xs text-muted-foreground">
          Plan generation is paused — review the existing work first, or generate anyway.
        </p>
      </div>
      <div className="w-full max-w-xs rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5 text-left">
        <PRList openPRs={openPRs} owner={owner} repo={repo} />
      </div>
      <Button variant="outline" size="sm" onClick={onGenerate} className="h-8 gap-1.5 text-xs">
        <Sparkles className="h-3.5 w-3.5" />
        Generate plan anyway
      </Button>
    </div>
  );
}
