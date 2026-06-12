"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** One trackable section of the plan, shown as a progress chip. */
export interface PlanSectionStatus {
  key: string;
  label: string;
  done: boolean;
}

interface Props {
  /** Display name of the model writing the plan, e.g. "Claude Sonnet". */
  modelName: string;
  /** Live per-section progress; chips light up as sections stream in. */
  sections: PlanSectionStatus[];
  /** When set, replaces the cycling status messages (e.g. while reading code). */
  statusMessage?: string;
  className?: string;
}

const MESSAGES = [
  "Reading the issue thread…",
  "Scanning the repository structure…",
  "Identifying relevant files…",
  "Drafting the implementation steps…",
  "Thinking through edge cases…",
  "Writing testing guidance…",
  "Polishing the final plan…",
];

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * Row of section-progress chips. The first unfinished section pulses as the
 * one currently being written; finished sections get a check mark.
 */
export function SectionChips({
  sections,
  className,
}: {
  sections: PlanSectionStatus[];
  className?: string;
}) {
  const activeIndex = sections.findIndex((s) => !s.done);
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {sections.map((s, i) => {
        const isActive = i === activeIndex;
        return (
          <span
            key={s.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all duration-300",
              s.done
                ? "border-foreground/30 bg-foreground/10 text-foreground"
                : isActive
                  ? "border-border bg-secondary text-foreground"
                  : "border-border/60 bg-transparent text-muted-foreground/50"
            )}
          >
            {s.done ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isActive ? "animate-pulse bg-foreground" : "bg-muted-foreground/40"
                )}
              />
            )}
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Animated "the AI is thinking" state for the contribution plan panel:
 * an orbiting monochrome core, cycling status messages, an elapsed timer,
 * live section-progress chips, and shimmering ghost lines where the plan
 * content will appear.
 */
export default function AIThinking({ modelName, sections, statusMessage, className }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2400);
    const secTimer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(msgTimer);
      clearInterval(secTimer);
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-6 py-8 animate-fade-in", className)}>
      {/* ── Orbiting core ── */}
      <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
        {/* Sonar pulse rings */}
        <span className="absolute inset-0 rounded-full border border-foreground/20 animate-pulse-ring" />
        <span className="absolute inset-0 rounded-full border border-foreground/15 animate-pulse-ring [animation-delay:700ms]" />

        {/* Dashed rotating ring */}
        <svg className="absolute inset-1 animate-spin-slow text-foreground/25" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 9" strokeLinecap="round" />
        </svg>

        {/* Orbiting satellites */}
        <span className="absolute inset-2 animate-orbit">
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-foreground" />
        </span>
        <span className="absolute inset-5 animate-orbit-reverse">
          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/70" />
        </span>
        <span className="absolute inset-7 animate-orbit [animation-duration:2.6s]">
          <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-foreground/40" />
        </span>

        {/* Center */}
        <span className="relative flex h-12 w-12 animate-breathe items-center justify-center rounded-full bg-secondary ring-1 ring-border shadow-sm">
          <Sparkles className="h-5 w-5 text-foreground" />
        </span>
      </div>

      {/* ── Cycling status line ── */}
      <div className="flex flex-col items-center gap-1.5 text-center" aria-live="polite">
        <p
          key={statusMessage ?? msgIndex}
          className="animate-fade-in text-sm font-medium text-foreground"
        >
          {statusMessage ?? MESSAGES[msgIndex]}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{modelName} is writing your plan</span>
          <span className="inline-flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span className="tabular-nums text-muted-foreground/60">· {formatElapsed(elapsed)}</span>
        </p>
      </div>

      {/* ── Live section progress ── */}
      <SectionChips sections={sections} className="justify-center" />

      {/* ── Ghost content lines ── */}
      <div className="w-full max-w-sm space-y-2" aria-hidden="true">
        {["w-full", "w-11/12", "w-4/5", "w-5/6", "w-2/3"].map((w, i) => (
          <div
            key={i}
            className={cn("h-2.5 rounded shimmer-line", w)}
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
