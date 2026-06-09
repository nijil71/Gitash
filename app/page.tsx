"use client";

import { useEffect, useState } from "react";
import {
  Star,
  KeyRound,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { GitashIcon } from "@/components/GitashIcon";
import ApiKeyModal, { getStoredKey } from "@/components/ApiKeyModal";
import ModelSelector from "@/components/ModelSelector";
import RepoInput from "@/components/RepoInput";
import LabelFilter from "@/components/LabelFilter";
import IssueList from "@/components/IssueList";
import ContributionPlanPanel from "@/components/ContributionPlan";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchLabels, fetchIssues, fetchRepoMeta, GitHubAPIError } from "@/lib/github";
import { MODEL_OPTIONS, getModel } from "@/lib/models";
import type { GitHubIssue, GitHubLabel, ModelOption, ModelProvider } from "@/types";
import { cn } from "@/lib/utils";

interface RepoMeta {
  owner: string;
  repo: string;
  stars: number;
  language: string;
  description: string;
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
        "group relative flex flex-col items-start gap-4 rounded-2xl border border-border",
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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5">
          <GitashIcon size={28} />
          <span className="text-sm font-semibold text-foreground tracking-tight">Gitash</span>
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
  const [skippedSetup, setSkippedSetup] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [activeLabel, setActiveLabel] = useState("");
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        fetchedLabels.find((l) => /good.first.issue|beginner|starter/i.test(l.name))?.name ??
        fetchedLabels[0]?.name ??
        "";
      setActiveLabel(defaultLabel);

      const initialIssues = await fetchIssues(owner, repo, defaultLabel || undefined);
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
      const filtered = await fetchIssues(repoMeta.owner, repoMeta.repo, label || undefined);
      setIssues(filtered);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
      </>
    );
  }

  // Main app
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <GitashIcon size={28} />
            <div>
              <span className="text-sm font-semibold text-foreground tracking-tight">Gitash</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                OSS Contributor Agent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector selected={selectedModel.id} onChange={handleModelChange} />
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
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" />
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
              <LabelFilter labels={labels} activeLabel={activeLabel} onChange={handleLabelChange} />
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Left: Issue list */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Open Issues
                  </h2>
                  {issues.length > 0 && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {issues.length}
                    </span>
                  )}
                </div>
                <div className={cn("transition-opacity duration-150", loading && "pointer-events-none opacity-40")}>
                  <IssueList issues={issues} selectedIssue={selectedIssue} onSelect={setSelectedIssue} />
                </div>
              </div>

              {/* Right: Contribution plan */}
              <div>
                <div className="mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contribution Plan
                  </h2>
                </div>

                {selectedIssue && apiKey ? (
                  <ContributionPlanPanel
                    key={`${repoMeta.owner}/${repoMeta.repo}#${selectedIssue.number}@${selectedModel.id}`}
                    issue={selectedIssue}
                    apiKey={apiKey}
                    owner={repoMeta.owner}
                    repo={repoMeta.repo}
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
                      className="hover:opacity-90 transition-opacity text-white"
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
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
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
        )}
      </main>

      <footer className="border-t border-border px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Powered by {selectedModel.name} · Keys stored locally only
          </p>
        </div>
      </footer>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleApiKeySave}
        selectedModel={selectedModel}
      />
    </div>
  );
}
