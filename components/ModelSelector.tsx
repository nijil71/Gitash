"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { ModelOption, ModelProvider } from "@/types";
import { MODEL_OPTIONS } from "@/lib/models";
import { cn } from "@/lib/utils";

interface Props {
  selected: ModelProvider;
  onChange: (provider: ModelProvider) => void;
}

function ProviderLogo({ option, size }: { option: ModelOption; size: number }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white grayscale"
        style={{ width: size, height: size, backgroundColor: option.color }}
      >
        {option.name[0]}
      </div>
    );
  }

  return (
    <img
      src={`/logos/${option.id}.svg`}
      alt={option.description}
      width={size}
      height={size}
      className="flex-shrink-0 object-contain grayscale"
      onError={() => setError(true)}
    />
  );
}

export default function ModelSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedOption = MODEL_OPTIONS.find((m) => m.id === selected)!;

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2",
          "text-xs font-medium text-foreground transition-colors",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ProviderLogo option={selectedOption} size={15} />
        <span className="hidden sm:inline">{selectedOption.name}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden",
            "rounded-xl border border-border bg-popover shadow-xl shadow-black/20",
            "animate-fade-in"
          )}
          role="listbox"
        >
          <div className="p-1">
            {MODEL_OPTIONS.map((option) => {
              const isActive = option.id === selected;
              return (
                <button
                  key={option.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                    "hover:bg-secondary",
                    isActive && "bg-secondary"
                  )}
                >
                  <ProviderLogo option={option} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{option.name}</p>
                    <p className="text-[11px] text-muted-foreground">{option.description}</p>
                  </div>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
