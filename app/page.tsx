"use client";

import { useEffect, useRef, useState } from "react";
import {
  Star,
  KeyRound,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  GitBranch,
  Clock3,
  Bookmark,
  Search,
  History,
} from "lucide-react";
import { GitashIcon } from "@/components/GitashIcon";
import ApiKeyModal, { getStoredKey } from "@/components/ApiKeyModal";
import GitHubTokenModal, { getStoredGitHubToken } from "@/components/GitHubTokenModal";
import ThemeToggle from "@/components/ThemeToggle";
import ModelSelector from "@/components/ModelSelector";
import RepoInput from "@/components/RepoInput";
import LabelFilter from "@/components/LabelFilter";
import IssueList from "@/components/IssueList";
import IssueControls, { SORT_OPTIONS } from "@/components/IssueControls";
import ContributionPlanPanel from "@/components/ContributionPlan";
import PlanGateNotice, { PlanGateDialog, PlanGateCard } from "@/components/PlanGate";
import CommandPalette from "@/components/CommandPalette";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  fetchLabels,
  fetchIssues,
  fetchIssue,
  fetchRepoMeta,
  fetchRepoTree,
  GitHubAPIError,
  ISSUES_PER_PAGE,
  type RepoTree,
  type LinkedPR,
} from "@/lib/github";
import { getLinkedPRs } from "@/lib/linkedPRs";
import { MODEL_OPTIONS, getModel } from "@/lib/models";
import { parseRepo } from "@/lib/parseRepo";
import { getPlanHistory, getCachedPlan, planKey, type SavedPlan } from "@/lib/planHistory";
import { getRecentRepos, addRecentRepo, type RecentRepo } from "@/lib/recentRepos";
import {
  getBookmarks,
  toggleBookmark,
  bookmarkKey,
  type SavedIssue,
} from "@/lib/bookmarks";
import type { GitHubIssue, GitHubLabel, ModelOption, ModelProvider } from "@/types";
import { cn } from "@/lib/utils";

interface RepoMeta {
  owner: string;
  repo: string;
  stars: number;
  language: string;
  description: string;
  defaultBranch: string;
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

// Client-side search over the issues already loaded into the list.
function filterIssues(issues: GitHubIssue[], query: string): GitHubIssue[] {
  const q = query.trim().toLowerCase();
  if (!q) return issues;
  return issues.filter((issue) => {
    const haystack = [
      `#${issue.number}`,
      issue.title,
      issue.body ?? "",
      issue.user?.login ?? "",
      ...issue.labels.map((l) => l.name),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

// ── Provider setup screen ──────────────────────────────────────────────────

function ProviderCard({
  option,
  onSelect,
}: {
  option: ModelOption;
  onSelect: (id: ModelProvider) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      onClick={() => onSelect(option.id)}
      className={cn(
        "group relative flex flex-col items-start gap-4 rounded-2xl border border-border grayscale",
        "bg-card p-6 text-left transition-all duration-200 cursor-pointer w-full",
        "hover:border-[var(--accent-color)] hover:shadow-lg hover:shadow-black/20",
        "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      style={{ "--accent-color": option.color } as React.CSSProperties}
    >
      {/* Subtle top glow on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, transparent, ${option.color}88, transparent)` }}
      />

      {/* Logo */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${option.color}18`, border: `1px solid ${option.color}30` }}
      >
        {imgErr ? (
          <span className="text-lg font-bold" style={{ color: option.color }}>
            {option.name[0]}
          </span>
        ) : (
          <img
            src={`/logos/${option.id}.svg`}
            alt={option.name}
            width={28}
            height={28}
            className="object-contain"
            onError={() => setImgErr(true)}
          />
        )}
      </div>

      {/* Text */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{option.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">by {option.description}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono">{option.model}</p>
      </div>

      {/* CTA */}
      <div
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        style={{
          backgroundColor: `${option.color}15`,
          color: option.color,
        }}
      >
        Connect with {option.description}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function SetupScreen({
  onSelectProvider,
  onSkip,
}: {
  onSelectProvider: (id: ModelProvider) => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <GitashIcon size={28} />
            <span className="text-sm font-semibold text-foreground tracking-tight">Gitash</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/nijil71/Gitash"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <svg role="img" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              <span>GitHub</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-3xl animate-fade-in">
          {/* Hero — headline only, no repeated logo */}
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Open Source · AI-Powered
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Your next OSS contribution
              <br />
              <span className="text-muted-foreground font-normal">starts here</span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Browse any GitHub repo&apos;s issues and get a tailored,
              step-by-step plan — powered by the AI you choose.
            </p>
          </div>

          {/* Provider cards */}
          <div className="mb-6">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Choose your AI provider
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MODEL_OPTIONS.map((option) => (
                <ProviderCard
                  key={option.id}
                  option={option}
                  onSelect={onSelectProvider}
                />
              ))}
            </div>
          </div>

          {/* Skip */}
          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline underline-offset-4"
            >
              Skip for now — browse issues without AI plans
            </button>
          </div>

          {/* How it works */}
          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-border pt-10 text-center">
            {[
              { step: "1", label: "Choose a provider", desc: "Connect Claude, GPT-4o, or Gemini" },
              { step: "2", label: "Search a GitHub repo", desc: "Paste any public repository URL" },
              { step: "3", label: "Get a plan", desc: "Click an issue to generate a contribution guide" },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                  {item.step}
                </span>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[0]);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [skippedSetup, setSkippedSetup] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [fileTree, setFileTree] = useState<RepoTree | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0].key);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  const [bookmarks, setBookmarks] = useState<SavedIssue[]>([]);
  const [planHistory, setPlanHistory] = useState<SavedPlan[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  useEffect(() => {
    setRecentRepos(getRecentRepos());
    setBookmarks(getBookmarks());
    setPlanHistory(getPlanHistory());
  }, []);

  // Issue number to auto-select once a repo's issues load (deep links and
  // the past-plans panel both use this).
  const pendingIssueRef = useRef<number | null>(null);

  // ── Plan gate ────────────────────────────────────────────────────────────
  // Before generating a plan, pause when the issue is already closed (deep
  // links and past plans can land on one) or an open PR already references
  // it — reviewing existing work is free; a plan costs tokens. Fail open:
  // a failed PR check never blocks generation.
  const [linkedPRs, setLinkedPRs] = useState<LinkedPR[]>([]);
  const [prCheckPending, setPrCheckPending] = useState(false);
  const [planAnyway, setPlanAnyway] = useState(false);
  const [showGateDialog, setShowGateDialog] = useState(false);

  useEffect(() => {
    setLinkedPRs([]);
    setPlanAnyway(false);
    setShowGateDialog(false);
    if (!selectedIssue || !repoMeta) {
      setPrCheckPending(false);
      return;
    }
    let cancelled = false;
    // Only interrupt when a plan would actually be generated: a key is set
    // and there's no cached plan to serve for free.
    const wouldGenerate =
      Boolean(apiKey) &&
      !getCachedPlan(planKey(repoMeta.owner, repoMeta.repo, selectedIssue.number, selectedModel.id));
    // A closed issue is known synchronously — pop before the PR check returns.
    if (selectedIssue.state === "closed" && wouldGenerate) setShowGateDialog(true);
    setPrCheckPending(true);
    void getLinkedPRs(
      repoMeta.owner,
      repoMeta.repo,
      selectedIssue.number,
      githubToken || undefined
    ).then((prs) => {
      if (cancelled) return;
      setLinkedPRs(prs);
      setPrCheckPending(false);
      if (
        selectedIssue.state !== "closed" &&
        prs.some((pr) => pr.state === "open") &&
        wouldGenerate
      ) {
        setShowGateDialog(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIssue, repoMeta]);

  const handleToggleBookmark = (issue: GitHubIssue) => {
    if (!repoMeta) return;
    setBookmarks(
      toggleBookmark({
        owner: repoMeta.owner,
        repo: repoMeta.repo,
        number: issue.number,
        title: issue.title,
        html_url: issue.html_url,
      })
    );
  };

  // On narrow screens the plan renders below the issue list — scroll to it
  // when an issue is selected so the user isn't left looking at the list.
  const planRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedIssue) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedIssue]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  // Refs hold the latest values so the listener can be mounted once (and stay
  // before the setup-screen early return, satisfying the rules of hooks).
  const searchInputRef = useRef<HTMLInputElement>(null);
  const visibleIssuesRef = useRef<GitHubIssue[]>([]);
  const selectedIssueRef = useRef<GitHubIssue | null>(null);
  const searchValueRef = useRef("");
  const repoLoadedRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

      // Ctrl/Cmd+K toggles the command palette from anywhere.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowPalette((v) => !v);
        return;
      }
      // "/" focuses the issue search.
      if (e.key === "/" && !typing && repoLoadedRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Escape clears, then blurs, the search field.
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        if (searchValueRef.current) setSearch("");
        else searchInputRef.current?.blur();
        return;
      }
      // Arrow keys move the selection through the visible issues.
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !typing) {
        const list = visibleIssuesRef.current;
        if (!list.length) return;
        e.preventDefault();
        const cur = selectedIssueRef.current;
        const idx = cur ? list.findIndex((i) => i.number === cur.number) : -1;
        const nextIdx =
          e.key === "ArrowDown"
            ? idx < 0
              ? 0
              : Math.min(idx + 1, list.length - 1)
            : idx <= 0
              ? 0
              : idx - 1;
        const issue = list[nextIdx];
        if (issue) {
          setSelectedIssue(issue);
          requestAnimationFrame(() => {
            document
              .querySelector(`[data-issue-number="${issue.number}"]`)
              ?.scrollIntoView({ block: "nearest" });
          });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Restore GitHub token (independent of AI provider)
    setGithubToken(getStoredGitHubToken());

    // Restore last provider + key
    const lastProvider = localStorage.getItem("last_provider") as ModelProvider | null;
    if (lastProvider) {
      const model = MODEL_OPTIONS.find((m) => m.id === lastProvider);
      if (model) {
        setSelectedModel(model);
        const saved = getStoredKey(lastProvider);
        if (saved) setApiKey(saved);
        setHydrated(true);
        return;
      }
    }
    // Scan for any saved key
    for (const option of MODEL_OPTIONS) {
      const saved = getStoredKey(option.id);
      if (saved) {
        setSelectedModel(option);
        setApiKey(saved);
        localStorage.setItem("last_provider", option.id);
        setHydrated(true);
        return;
      }
    }
    setHydrated(true);
  }, []);

  // When user picks a provider on the setup screen
  const handleSetupProviderSelect = (id: ModelProvider) => {
    const model = getModel(id);
    setSelectedModel(model);
    setShowApiKeyModal(true);
  };

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
  };

  const handleModelChange = (provider: ModelProvider) => {
    const newModel = getModel(provider);
    setSelectedModel(newModel);
    setSelectedIssue(null);
    localStorage.setItem("last_provider", provider);
    const stored = getStoredKey(provider);
    if (stored) {
      setApiKey(stored);
    } else {
      setApiKey("");
      setShowApiKeyModal(true);
    }
  };

  // Single source of truth for fetching a page of issues with the current
  // label/sort selection. Callers own the loading/error UI.
  const fetchIssuePage = (
    owner: string,
    repo: string,
    labelList: string[],
    key: string,
    pageNum: number
  ): Promise<GitHubIssue[]> => {
    const opt = SORT_OPTIONS.find((o) => o.key === key) ?? SORT_OPTIONS[0];
    return fetchIssues(owner, repo, {
      labels: labelList.length ? labelList.join(",") : undefined,
      sort: opt.field,
      direction: opt.direction,
      page: pageNum,
      perPage: ISSUES_PER_PAGE,
      token: githubToken || undefined,
    });
  };

  const handleAnalyze = async (owner: string, repo: string) => {
    setLoading(true);
    setError(null);
    setRepoMeta(null);
    setLabels([]);
    setIssues([]);
    setFileTree(null);
    setSelectedIssue(null);
    setActiveLabels([]);
    setSearch("");
    setPage(1);
    setHasMore(false);

    try {
      const [meta, fetchedLabels] = await Promise.all([
        fetchRepoMeta(owner, repo, githubToken || undefined),
        fetchLabels(owner, repo, githubToken || undefined),
      ]);
      setRepoMeta({ owner, repo, ...meta });
      setLabels(fetchedLabels);

      // Best-effort: ground future AI plans in the repo's actual file tree.
      // A failure here (e.g. empty repo, rate limit) must not block browsing.
      fetchRepoTree(owner, repo, meta.defaultBranch, 400, githubToken || undefined)
        .then(setFileTree)
        .catch(() => setFileTree(null));

      const defaultLabel = fetchedLabels.find((l) =>
        /good.first.issue|beginner|starter/i.test(l.name)
      )?.name;
      const initialLabels = defaultLabel ? [defaultLabel] : [];
      setActiveLabels(initialLabels);

      const initialIssues = await fetchIssuePage(owner, repo, initialLabels, sortKey, 1);
      setIssues(initialIssues);
      setHasMore(initialIssues.length === ISSUES_PER_PAGE);
      setRecentRepos(addRecentRepo(owner, repo));

      // Deep link / past plan: select the requested issue once the list is in.
      const pending = pendingIssueRef.current;
      if (pending) {
        pendingIssueRef.current = null;
        const found = initialIssues.find((i) => i.number === pending);
        if (found) {
          setSelectedIssue(found);
        } else {
          // Not on page 1 (filtered out, deeper page, or closed) — fetch it
          // directly and surface it at the top of the list.
          try {
            const single = await fetchIssue(owner, repo, pending, githubToken || undefined);
            if (single) {
              setIssues((prev) =>
                prev.some((i) => i.number === single.number) ? prev : [single, ...prev]
              );
              setSelectedIssue(single);
            }
          } catch {
            /* deep-linked issue unavailable — leave the list as is */
          }
        }
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Reload page 1 of issues for a given label/sort selection.
  const reloadIssues = async (labelList: string[], key: string) => {
    if (!repoMeta) return;
    setSelectedIssue(null);
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const fetched = await fetchIssuePage(repoMeta.owner, repoMeta.repo, labelList, key, 1);
      setIssues(fetched);
      setHasMore(fetched.length === ISSUES_PER_PAGE);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Toggle a label on/off. Passing "" clears all (the "All" pill).
  const handleLabelToggle = (label: string) => {
    const next =
      label === ""
        ? []
        : activeLabels.includes(label)
          ? activeLabels.filter((l) => l !== label)
          : [...activeLabels, label];
    setActiveLabels(next);
    void reloadIssues(next, sortKey);
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) return;
    setSortKey(key);
    void reloadIssues(activeLabels, key);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSavedOnly(false);
    if (activeLabels.length > 0) {
      setActiveLabels([]);
      void reloadIssues([], sortKey);
    }
  };

  const handleLoadMore = async () => {
    if (!repoMeta || loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const more = await fetchIssuePage(repoMeta.owner, repoMeta.repo, activeLabels, sortKey, nextPage);
      setIssues((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(more.length === ISSUES_PER_PAGE);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Deep links ───────────────────────────────────────────────────────────
  // On first load, honor ?repo=owner/repo&issue=N so shared links and
  // refreshes restore the session. Runs once, after localStorage hydration
  // (so the GitHub token is already available to the fetches).
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (!hydrated || deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const parsed = parseRepo(params.get("repo") ?? "");
    if (!parsed) return;
    const issueNum = Number(params.get("issue"));
    if (Number.isInteger(issueNum) && issueNum > 0) pendingIssueRef.current = issueNum;
    setSkippedSetup(true); // a shared link shouldn't dead-end on the setup screen
    void handleAnalyze(parsed.owner, parsed.repo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Keep the URL in sync with the current repo/issue so any view is shareable
  // and survives a refresh. replaceState avoids polluting browser history.
  useEffect(() => {
    if (!deepLinkHandledRef.current) return; // don't clobber params before they're read
    const params = new URLSearchParams();
    if (repoMeta) {
      params.set("repo", `${repoMeta.owner}/${repoMeta.repo}`);
      if (selectedIssue) params.set("issue", String(selectedIssue.number));
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [repoMeta, selectedIssue]);

  // Command-palette helpers — opening a repo also leaves the setup screen.
  const openRepoFromPalette = (owner: string, repo: string) => {
    setSkippedSetup(true);
    void handleAnalyze(owner, repo);
  };

  // Back to the home screen (recents, saved issues, past plans). Re-reads
  // localStorage so anything saved during the session shows up immediately.
  const goHome = () => {
    setRepoMeta(null);
    setLabels([]);
    setActiveLabels([]);
    setIssues([]);
    setFileTree(null);
    setSelectedIssue(null);
    setError(null);
    setSearch("");
    setSavedOnly(false);
    setPage(1);
    setHasMore(false);
    setRecentRepos(getRecentRepos());
    setBookmarks(getBookmarks());
    setPlanHistory(getPlanHistory());
  };

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore storage errors */
    }
  };

  const palette = (
    <CommandPalette
      open={showPalette}
      onClose={() => setShowPalette(false)}
      recentRepos={recentRepos}
      bookmarks={bookmarks}
      activeProvider={selectedModel.id}
      onAnalyze={openRepoFromPalette}
      onSwitchProvider={handleModelChange}
      onOpenApiKey={() => setShowApiKeyModal(true)}
      onOpenGitHubToken={() => setShowTokenModal(true)}
      onToggleTheme={toggleTheme}
      onGoHome={goHome}
    />
  );

  // Show setup screen for first-time visitors (no API key, not skipped)
  if (hydrated && !apiKey && !skippedSetup) {
    return (
      <>
        <SetupScreen
          onSelectProvider={handleSetupProviderSelect}
          onSkip={() => setSkippedSetup(true)}
        />
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleApiKeySave}
          selectedModel={selectedModel}
        />
        <GitHubTokenModal
          isOpen={showTokenModal}
          onClose={() => setShowTokenModal(false)}
          onSave={setGithubToken}
        />
        {palette}
      </>
    );
  }

  const bookmarkedNumbers = new Set(
    repoMeta
      ? bookmarks
          .filter((b) => b.owner === repoMeta.owner && b.repo === repoMeta.repo)
          .map((b) => b.number)
      : []
  );

  const searched = filterIssues(issues, search);
  const visibleIssues = savedOnly
    ? searched.filter((i) => bookmarkedNumbers.has(i.number))
    : searched;

  // Plan gating: hold generation while the linked-PR check runs, and pause it
  // when the issue is closed or open PRs exist. A cached plan costs nothing,
  // so it's never gated. For a closed issue every linked PR matters (a merged
  // one explains the closure); for an open issue only open PRs do.
  const issueClosed = selectedIssue?.state === "closed";
  const openPRs = linkedPRs.filter((pr) => pr.state === "open");
  const gatePRs = issueClosed ? linkedPRs : openPRs;
  const cachedPlanExists =
    selectedIssue && repoMeta
      ? Boolean(
          getCachedPlan(planKey(repoMeta.owner, repoMeta.repo, selectedIssue.number, selectedModel.id))
        )
      : false;
  const planHolding = Boolean(apiKey) && prCheckPending && !cachedPlanExists && !issueClosed;
  const planGated =
    Boolean(apiKey) &&
    !planAnyway &&
    !cachedPlanExists &&
    (issueClosed || openPRs.length > 0);

  // Keep the keyboard-nav refs in sync with the latest render.
  visibleIssuesRef.current = visibleIssues;
  selectedIssueRef.current = selectedIssue;
  searchValueRef.current = search;
  repoLoadedRef.current = !!repoMeta;

  // Main app
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            onClick={goHome}
            title="Back to home — recents, saved issues, past plans"
            aria-label="Go to home screen"
            className="flex items-center gap-2.5 cursor-pointer rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GitashIcon size={28} />
            <div className="text-left">
              <span className="text-sm font-semibold text-foreground tracking-tight">Gitash</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                OSS Contributor Agent
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPalette(true)}
              title="Command palette (Ctrl+K)"
              className="inline-flex h-8 gap-1.5 text-xs text-muted-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="hidden md:block rounded border border-border bg-secondary px-1 font-mono text-[10px]">
                Ctrl K
              </kbd>
            </Button>
            <ModelSelector selected={selectedModel.id} onChange={handleModelChange} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTokenModal(true)}
              title={githubToken ? "GitHub token saved (5,000 req/hr)" : "Add a GitHub token to raise the rate limit"}
              className={cn(
                "h-8 gap-1.5 text-xs",
                githubToken && "text-primary border-primary/40 bg-primary/5"
              )}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{githubToken ? "Token saved" : "GitHub token"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKeyModal(true)}
              className={cn(
                "h-8 gap-1.5 text-xs",
                apiKey && "text-primary border-primary/40 bg-primary/5"
              )}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{apiKey ? "Key saved" : "Set API key"}</span>
            </Button>
            <a
              href="https://github.com/nijil71/Gitash"
              target="_blank"
              rel="noopener noreferrer"
              title="View source on GitHub"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <svg role="img" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {/* Repo search */}
        <div className="mb-5">
          <RepoInput onAnalyze={handleAnalyze} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-5 animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Repo meta + content */}
        {repoMeta && (
          <div className="animate-fade-in space-y-5">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <a
                  href={`https://github.com/${repoMeta.owner}/${repoMeta.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  {repoMeta.owner}/{repoMeta.repo}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-muted-foreground" />
                  {repoMeta.stars.toLocaleString()}
                </div>
                {repoMeta.language && (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {repoMeta.language}
                  </span>
                )}
              </div>
              {repoMeta.description && (
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {repoMeta.description}
                </p>
              )}
            </div>

            {labels.length > 0 && (
              <LabelFilter labels={labels} activeLabels={activeLabels} onToggle={handleLabelToggle} />
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Left: Issue list */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Open Issues
                  </h2>
                  <div className="flex items-center gap-2">
                    {bookmarkedNumbers.size > 0 && (
                      <button
                        onClick={() => setSavedOnly((v) => !v)}
                        aria-pressed={savedOnly}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                          savedOnly
                            ? "bg-foreground/10 text-foreground ring-1 ring-border"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Bookmark className={cn("h-3 w-3", savedOnly && "fill-foreground")} />
                        Saved {bookmarkedNumbers.size}
                      </button>
                    )}
                    {issues.length > 0 && (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {search || savedOnly ? `${visibleIssues.length}/${issues.length}` : issues.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-3">
                  <IssueControls
                    search={search}
                    onSearchChange={setSearch}
                    sortKey={sortKey}
                    onSortChange={handleSortChange}
                    disabled={loading}
                    searchInputRef={searchInputRef}
                  />
                </div>
                <div className={cn("transition-opacity duration-150", loading && "pointer-events-none opacity-40")}>
                  <IssueList
                    issues={visibleIssues}
                    selectedIssue={selectedIssue}
                    onSelect={setSelectedIssue}
                    hasMore={hasMore && !search && !savedOnly}
                    loadingMore={loadingMore}
                    onLoadMore={handleLoadMore}
                    filtered={(Boolean(search) || savedOnly) && issues.length > 0}
                    hasActiveLabels={activeLabels.length > 0}
                    onClearFilters={handleClearFilters}
                    bookmarkedNumbers={bookmarkedNumbers}
                    onToggleBookmark={handleToggleBookmark}
                  />
                </div>
              </div>

              {/* Right: Contribution plan — sticky on desktop, fixed-height on mobile */}
              <div
                ref={planRef}
                className="flex flex-col scroll-mt-20 lg:sticky lg:top-[61px] lg:h-[calc(100vh-80px)]"
              >
                <div className="mb-3 flex-shrink-0">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contribution Plan
                  </h2>
                </div>

                {/* The banner stays visible once the gate is passed (or when
                    no plan will be generated); while gated, the gate card
                    itself carries the details. */}
                {selectedIssue && !planGated && !planHolding && (
                  <PlanGateNotice
                    prs={gatePRs}
                    owner={repoMeta.owner}
                    repo={repoMeta.repo}
                    issueClosed={issueClosed}
                  />
                )}

                {selectedIssue && apiKey && planHolding ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
                    <GitBranch className="h-5 w-5 animate-pulse text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Checking for PRs already linked to this issue…
                    </p>
                  </div>
                ) : selectedIssue && apiKey && planGated ? (
                  <PlanGateCard
                    prs={gatePRs}
                    owner={repoMeta.owner}
                    repo={repoMeta.repo}
                    issueClosed={issueClosed}
                    issueUrl={selectedIssue.html_url}
                    onGenerate={() => setPlanAnyway(true)}
                  />
                ) : selectedIssue && apiKey ? (
                  <ContributionPlanPanel
                    className="flex-1 min-h-0 h-[80vh] lg:h-auto"
                    key={`${repoMeta.owner}/${repoMeta.repo}#${selectedIssue.number}@${selectedModel.id}`}
                    issue={selectedIssue}
                    apiKey={apiKey}
                    owner={repoMeta.owner}
                    repo={repoMeta.repo}
                    fileTree={fileTree?.paths ?? []}
                    githubToken={githubToken}
                    defaultBranch={repoMeta.defaultBranch}
                    selectedModel={selectedModel}
                  />
                ) : selectedIssue && !apiKey ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                      <KeyRound className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">API key required</p>
                      <p className="text-xs text-muted-foreground">
                        Set your {selectedModel.description} key to generate a plan
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowApiKeyModal(true)}
                      style={{ backgroundColor: selectedModel.color }}
                      className="hover:opacity-90 transition-opacity text-white grayscale"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Set API Key
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/50 p-10 text-center min-h-[300px]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Select an issue</p>
                      <p className="text-xs text-muted-foreground">
                        Pick an issue from the left to generate an AI contribution plan
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no repo loaded */}
        {!repoMeta && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-fade-in">
            <GitashIcon size={48} />
            <div className="space-y-1.5 max-w-xs">
              <h2 className="text-sm font-semibold text-foreground">Search a repository</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste a GitHub URL above to browse open issues and generate contribution plans.
              </p>
            </div>

            {recentRepos.length > 0 && (
              <div className="w-full max-w-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Recent
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {recentRepos.map(({ owner, repo }) => (
                    <button
                      key={`${owner}/${repo}`}
                      onClick={() => handleAnalyze(owner, repo)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs text-foreground/80 hover:bg-primary/10 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Clock3 className="h-3 w-3 text-primary/70" />
                      {owner}/{repo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bookmarks.length > 0 && (
              <div className="w-full max-w-sm">
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <Bookmark className="h-3 w-3 fill-foreground text-foreground" />
                  Saved issues
                </p>
                <div className="flex flex-col gap-1.5">
                  {bookmarks.slice(0, 6).map((b) => (
                    <button
                      key={bookmarkKey(b.owner, b.repo, b.number)}
                      onClick={() => handleAnalyze(b.owner, b.repo)}
                      title={`Open ${b.owner}/${b.repo}`}
                      className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary/40 cursor-pointer"
                    >
                      <Bookmark className="h-3 w-3 flex-shrink-0 fill-foreground text-foreground" />
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">
                        {b.title}
                      </span>
                      <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">
                        {b.owner}/{b.repo}#{b.number}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {planHistory.length > 0 && (
              <div className="w-full max-w-sm">
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <History className="h-3 w-3" />
                  Past plans
                </p>
                <div className="flex flex-col gap-1.5">
                  {planHistory.slice(0, 6).map((p) => (
                    <button
                      key={p.key}
                      onClick={() => {
                        pendingIssueRef.current = p.number;
                        void handleAnalyze(p.owner, p.repo);
                      }}
                      title={`Reopen the saved plan for ${p.owner}/${p.repo}#${p.number}`}
                      className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary/40 cursor-pointer"
                    >
                      <History className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">
                        {p.title}
                      </span>
                      <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">
                        {p.owner}/{p.repo}#{p.number}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full max-w-sm">
              {(recentRepos.length > 0 || bookmarks.length > 0 || planHistory.length > 0) && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Try an example
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["vercel/next.js", "shadcn-ui/ui", "facebook/react"].map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      const [owner, repo] = example.split("/");
                      handleAnalyze(owner, repo);
                    }}
                    className="rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleApiKeySave}
        selectedModel={selectedModel}
      />

      <GitHubTokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSave={setGithubToken}
      />

      {repoMeta && selectedIssue && (
        <PlanGateDialog
          open={showGateDialog}
          onOpenChange={setShowGateDialog}
          prs={gatePRs}
          owner={repoMeta.owner}
          repo={repoMeta.repo}
          issueClosed={issueClosed}
          issueUrl={selectedIssue.html_url}
          onGenerate={() => {
            setPlanAnyway(true);
            setShowGateDialog(false);
          }}
        />
      )}

      {palette}
    </div>
  );
}
