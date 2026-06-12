"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Clock3,
  Bookmark,
  KeyRound,
  GitBranch,
  SunMoon,
  Bot,
  CornerDownLeft,
  ArrowRight,
  Home,
} from "lucide-react";
import { parseRepo } from "@/lib/parseRepo";
import { MODEL_OPTIONS } from "@/lib/models";
import type { RecentRepo } from "@/lib/recentRepos";
import type { SavedIssue } from "@/lib/bookmarks";
import type { ModelProvider } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  recentRepos: RecentRepo[];
  bookmarks: SavedIssue[];
  activeProvider: ModelProvider;
  onAnalyze: (owner: string, repo: string) => void;
  onSwitchProvider: (id: ModelProvider) => void;
  onOpenApiKey: () => void;
  onOpenGitHubToken: () => void;
  onToggleTheme: () => void;
  onGoHome: () => void;
}

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

const EXAMPLE_REPOS = ["vercel/next.js", "shadcn-ui/ui", "facebook/react"];

/**
 * Ctrl/Cmd+K command palette: jump to any repo (typed, recent, saved, or an
 * example) and run quick actions (switch provider, keys, theme) without
 * leaving the keyboard.
 */
export default function CommandPalette({
  open,
  onClose,
  recentRepos,
  bookmarks,
  activeProvider,
  onAnalyze,
  onSwitchProvider,
  onOpenApiKey,
  onOpenGitHubToken,
  onToggleTheme,
  onGoHome,
}: Props) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state each time the palette opens, then focus the input.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];
    const pick = (owner: string, repo: string) => () => {
      onClose();
      onAnalyze(owner, repo);
    };

    // Direct open: anything that parses as owner/repo or a GitHub URL.
    const parsed = parseRepo(query);
    if (parsed) {
      out.push({
        id: `open:${parsed.owner}/${parsed.repo}`,
        group: "Open",
        label: `${parsed.owner}/${parsed.repo}`,
        hint: "Open repository",
        icon: ArrowRight,
        run: pick(parsed.owner, parsed.repo),
      });
    }

    for (const { owner, repo } of recentRepos) {
      out.push({
        id: `recent:${owner}/${repo}`,
        group: "Recent repos",
        label: `${owner}/${repo}`,
        icon: Clock3,
        run: pick(owner, repo),
      });
    }

    for (const b of bookmarks.slice(0, 8)) {
      out.push({
        id: `saved:${b.owner}/${b.repo}#${b.number}`,
        group: "Saved issues",
        label: b.title,
        hint: `${b.owner}/${b.repo}#${b.number}`,
        icon: Bookmark,
        run: pick(b.owner, b.repo),
      });
    }

    for (const example of EXAMPLE_REPOS) {
      const [owner, repo] = example.split("/");
      out.push({
        id: `example:${example}`,
        group: "Examples",
        label: example,
        icon: Search,
        run: pick(owner, repo),
      });
    }

    out.push({
      id: "action:home",
      group: "Actions",
      label: "Go home",
      hint: "Recents, saved issues, past plans",
      icon: Home,
      run: () => {
        onClose();
        onGoHome();
      },
    });

    for (const option of MODEL_OPTIONS) {
      if (option.id === activeProvider) continue;
      out.push({
        id: `provider:${option.id}`,
        group: "Actions",
        label: `Switch to ${option.name}`,
        hint: option.description,
        icon: Bot,
        run: () => {
          onClose();
          onSwitchProvider(option.id);
        },
      });
    }
    out.push(
      {
        id: "action:api-key",
        group: "Actions",
        label: "Set AI API key",
        icon: KeyRound,
        run: () => {
          onClose();
          onOpenApiKey();
        },
      },
      {
        id: "action:github-token",
        group: "Actions",
        label: "Set GitHub token",
        hint: "Raises rate limit to 5,000 req/hr",
        icon: GitBranch,
        run: () => {
          onClose();
          onOpenGitHubToken();
        },
      },
      {
        id: "action:theme",
        group: "Actions",
        label: "Toggle theme",
        icon: SunMoon,
        run: () => {
          onClose();
          onToggleTheme();
        },
      }
    );

    const q = query.trim().toLowerCase();
    if (!q) return out;
    return out.filter(
      (item) =>
        item.group === "Open" ||
        item.label.toLowerCase().includes(q) ||
        (item.hint ?? "").toLowerCase().includes(q)
    );
  }, [
    query,
    recentRepos,
    bookmarks,
    activeProvider,
    onAnalyze,
    onClose,
    onSwitchProvider,
    onOpenApiKey,
    onOpenGitHubToken,
    onToggleTheme,
    onGoHome,
  ]);

  // Clamp the highlight whenever the filtered list shrinks.
  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(items.length - 1, 0)));
  }, [items.length]);

  const move = (delta: number) => {
    if (!items.length) return;
    setHighlight((h) => {
      const next = (h + delta + items.length) % items.length;
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector(`[data-palette-index="${next}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
      return next;
    });
  };

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 px-4 pt-[14vh] backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/30">
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[highlight]?.run();
              }
            }}
            placeholder="Search repos, saved issues, actions…"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <kbd className="hidden flex-shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          {items.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No matches — try <span className="font-mono">owner/repo</span> to open any repository
            </p>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && (
                  <p className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 first:pt-1">
                    {item.group}
                  </p>
                )}
                <button
                  data-palette-index={i}
                  onClick={item.run}
                  onMouseMove={() => setHighlight(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer",
                    i === highlight
                      ? "bg-secondary text-foreground"
                      : "text-foreground/80 hover:bg-secondary/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">
                      {item.hint}
                    </span>
                  )}
                  {i === highlight && (
                    <CornerDownLeft className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 border-t border-border bg-secondary/20 px-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-secondary px-1 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-secondary px-1 font-mono">↵</kbd>
            select
          </span>
          <span className="ml-auto font-mono">Ctrl K</span>
        </div>
      </div>
    </div>
  );
}
