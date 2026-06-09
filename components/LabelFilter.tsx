"use client";

import type { GitHubLabel } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  labels: GitHubLabel[];
  activeLabel: string;
  onChange: (label: string) => void;
}

export default function LabelFilter({ labels, activeLabel, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange("")}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer",
          activeLabel === ""
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
        )}
      >
        All
      </button>

      {labels.map((label) => {
        const isActive = activeLabel === label.name;
        const hexColor = `#${label.color}`;

        return (
          <button
            key={label.id}
            onClick={() => onChange(label.name)}
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
            <span
              className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: isActive ? hexColor : `${hexColor}cc` }}
            />
            {label.name}
          </button>
        );
      })}
    </div>
  );
}
