"use client";

import { type FormEvent, type ReactNode } from "react";
import { MessageSquare, Send, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Presentational pieces of the plan follow-up chat. State and streaming live
// in ContributionPlan.tsx (which owns the panel, the API key, and the abort
// patterns); these components just render.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Answers are plain text with `backtick` spans (the system prompt asks for
// exactly that) — render those as inline code, keep newlines.
function renderChatText(text: string): ReactNode[] {
  return text.split(/(`[^`\n]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code
        key={i}
        className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px] text-foreground/80"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  );
}

// ── Thread ─────────────────────────────────────────────────────────────────

export function ChatThread({
  messages,
  streaming,
  className,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  className?: string;
}) {
  if (messages.length === 0) return null;
  return (
    <div className={cn("border-t border-border pt-4", className)}>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        Follow-up
      </div>
      <div className="space-y-3">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg rounded-br-sm bg-secondary px-3 py-2 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            );
          }
          // Assistant turn still empty while the first tokens arrive.
          if (!msg.content && streaming && isLast) {
            return (
              <div key={i} className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Thinking…
              </div>
            );
          }
          return (
            <div key={i} className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {renderChatText(msg.content)}
              {streaming && isLast && (
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-baseline" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  error,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  error: string | null;
  className?: string;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSend();
  };
  return (
    <div className={cn("flex-shrink-0 border-t border-border px-4 py-2.5", className)}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Ask a follow-up — e.g. "explain step 2"'
          disabled={streaming}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-secondary/50 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        {streaming ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStop}
            aria-label="Stop answering"
            title="Stop answering (keeps what has streamed in)"
            className="h-8 w-8 flex-shrink-0 p-0"
          >
            <Square className="h-3 w-3 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!value.trim()}
            aria-label="Send question"
            className="h-8 w-8 flex-shrink-0 p-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </form>
      {streaming && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          Answering with the issue, plan, and code as context…
        </p>
      )}
      {error && !streaming && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
