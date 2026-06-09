"use client";

import { Check } from "lucide-react";
import type { GitHubLabel } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  labels: GitHubLabel[];
  activeLabels: string[];
  onToggle: (label: string) => void;
}

export default function LabelFilter({ labels, activeLabels, onToggle }: Props) {
  const noneActive = activeLabels.length === 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onToggle("")}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer",
          noneActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
        )}
      >
        All
      </button>

      {labels.map((label) => {
        const isActive = activeLabels.includes(label.name);
        const hexColor = `#${label.color}`;

        return (
          <button
            key={label.id}
            onClick={() => onToggle(label.name)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer border",
              isActive
                ? "shadow-sm"
                : "bg-secondary/60 border-transparent text-secondary-foreground hover:bg-secondary"
            )}
            style={
              isActive
                ? {
                    backgroundColor: `${hexColor}22`,
                    borderColor: `${hexColor}66`,
                    color: hexColor,
                  }
                : undefined
            }
          >
            {isActive ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: `${hexColor}cc` }}
              />
            )}
            {label.name}
          </button>
        );
      })}
    </div>
  );
}
