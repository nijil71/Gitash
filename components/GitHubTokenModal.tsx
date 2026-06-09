"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, GitBranch, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "github_token";

export function getStoredGitHubToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (token: string) => void;
}

export default function GitHubTokenModal({ isOpen, onClose, onSave }: Props) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShowToken(false);
    setToken(getStoredGitHubToken());
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = token.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <GitBranch className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base">GitHub Token</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Optional — raises your rate limit from 60 to 5,000 req/hr and enables private repos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="github-token-input" className="text-xs text-muted-foreground">
              Personal Access Token
            </Label>
            <div className="relative">
              <Input
                id="github-token-input"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="ghp_... or github_pat_..."
                autoFocus
                className="pr-10 font-mono text-sm bg-secondary/50"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/50 px-3 py-2.5 space-y-1">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
              Stored only in your browser and sent directly to GitHub — never to our servers. A
              token with no scopes (read-only public access) is enough.
            </p>
            <a
              href="https://github.com/settings/tokens/new?description=Gitash&scopes=public_repo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Create a token on github.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="hover:opacity-90 transition-opacity"
          >
            {token.trim() ? "Save Token" : "Clear Token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
