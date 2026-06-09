"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound } from "lucide-react";
import type { ModelOption, ModelProvider } from "@/types";
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
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  selectedModel: ModelOption;
}

const PROVIDER_LINKS: Record<ModelProvider, { label: string; url: string; placeholder: string }> = {
  claude: {
    label: "Get a key at console.anthropic.com",
    url: "https://console.anthropic.com/",
    placeholder: "sk-ant-api03-...",
  },
  openai: {
    label: "Get a key at platform.openai.com",
    url: "https://platform.openai.com/api-keys",
    placeholder: "sk-proj-...",
  },
  gemini: {
    label: "Get a key at aistudio.google.com",
    url: "https://aistudio.google.com/app/apikey",
    placeholder: "AIzaSy...",
  },
};

export function getStoredKey(provider: ModelProvider): string | null {
  if (typeof window === "undefined") return null;
  const key = localStorage.getItem(`api_key_${provider}`);
  if (!key && provider === "claude") {
    const legacy = localStorage.getItem("anthropic_api_key");
    if (legacy) {
      localStorage.setItem("api_key_claude", legacy);
      return legacy;
    }
  }
  return key;
}

export default function ApiKeyModal({ isOpen, onClose, onSave, selectedModel }: Props) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const info = PROVIDER_LINKS[selectedModel.id];

  useEffect(() => {
    if (!isOpen) return;
    setShowKey(false);
    const saved = getStoredKey(selectedModel.id);
    setKey(saved ?? "");
  }, [isOpen, selectedModel.id]);

  const handleSave = () => {
    const trimmed = key.trim();
    localStorage.setItem(`api_key_${selectedModel.id}`, trimmed);
    localStorage.setItem("last_provider", selectedModel.id);
    onSave(trimmed);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md grayscale">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${selectedModel.color}22` }}
            >
              <img
                src={`/logos/${selectedModel.id}.svg`}
                alt={selectedModel.name}
                width={20}
                height={20}
                className="flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <DialogTitle className="text-base">
                {selectedModel.name} API Key
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Required to generate contribution plans via {selectedModel.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="api-key-input" className="text-xs text-muted-foreground">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="api-key-input"
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && key.trim() && handleSave()}
                placeholder={info.placeholder}
                autoFocus
                className={cn(
                  "pr-10 font-mono text-sm bg-secondary/50",
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/50 px-3 py-2.5 space-y-1">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <KeyRound className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
              Your key is stored only in your browser and sent directly to{" "}
              {selectedModel.description} — never to our servers.
            </p>
            <a
              href={info.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {info.label}
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
            disabled={!key.trim()}
            style={{ backgroundColor: selectedModel.color, color: "#fff" }}
            className="hover:opacity-90 transition-opacity"
          >
            Save Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
