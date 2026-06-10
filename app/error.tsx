"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { GitashIcon } from "@/components/GitashIcon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real failure in the console for debugging/reporting.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <GitashIcon size={48} />
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Unexpected error
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground leading-relaxed">
          The app hit an unexpected error. Your saved keys, bookmarks, and plans
          are untouched — they live in your browser.
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}
