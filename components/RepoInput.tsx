"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { parseRepo } from "@/lib/parseRepo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  onAnalyze: (owner: string, repo: string) => void;
  loading: boolean;
}

export default function RepoInput({ onAnalyze, loading }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const parsed = parseRepo(value);
    if (!parsed) {
      setError("Enter a valid GitHub URL or owner/repo — e.g. vercel/next.js");
      return;
    }
    setError(null);
    onAnalyze(parsed.owner, parsed.repo);
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
            placeholder="github.com/owner/repo or owner/repo"
            className={cn(
              "pl-9 h-10 bg-secondary/50 border-border placeholder:text-muted-foreground/60",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={loading}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="h-10 min-w-[110px] font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Analyze
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive pl-1 animate-fade-in">{error}</p>
      )}
    </div>
  );
}
