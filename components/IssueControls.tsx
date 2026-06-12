"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpDown, ChevronDown, Check, X } from "lucide-react";
import type { IssueSortField, SortDirection } from "@/lib/github";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SortOption {
  key: string;
  label: string;
  field: IssueSortField;
  direction: SortDirection;
}

export const SORT_OPTIONS: SortOption[] = [
  { key: "newest", label: "Newest", field: "created", direction: "desc" },
  { key: "oldest", label: "Oldest", field: "created", direction: "asc" },
  { key: "updated", label: "Recently updated", field: "updated", direction: "desc" },
  { key: "most-commented", label: "Most commented", field: "comments", direction: "desc" },
  { key: "least-commented", label: "Least commented", field: "comments", direction: "asc" },
];

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  sortKey: string;
  onSortChange: (key: string) => void;
  disabled?: boolean;
  searchInputRef?: React.Ref<HTMLInputElement>;
}

export default function IssueControls({
  search,
  onSearchChange,
  sortKey,
  onSortChange,
  disabled,
  searchInputRef,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = SORT_OPTIONS.find((o) => o.key === sortKey) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter loaded issues…"
          disabled={disabled}
          className="h-9 pl-9 pr-8 text-xs bg-secondary/50 placeholder:text-muted-foreground/60"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            /
          </kbd>
        )}
      </div>

      <div ref={ref} className="relative flex-shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5",
            "text-xs font-medium text-foreground transition-colors",
            "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">{active.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-popover shadow-xl shadow-black/20 animate-fade-in"
            role="listbox"
          >
            <div className="p-1">
              {SORT_OPTIONS.map((option) => {
                const isActive = option.key === sortKey;
                return (
                  <button
                    key={option.key}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSortChange(option.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer hover:bg-secondary",
                      isActive && "bg-secondary"
                    )}
                  >
                    <span className="text-foreground">{option.label}</span>
                    {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
