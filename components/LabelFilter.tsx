"use client";

import type { GitHubLabel } from "@/types";

interface Props {
  labels: GitHubLabel[];
  activeLabel: string;
  onChange: (label: string) => void;
}

export default function LabelFilter({ labels, activeLabel, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("")}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          activeLabel === ""
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>

      {labels.map((label) => {
        const isActive = activeLabel === label.name;
        const dotColor = `#${label.color}`;

        return (
          <button
            key={label.id}
            onClick={() => onChange(label.name)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-gray-100 text-gray-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={
              isActive
                ? { outline: `2px solid ${dotColor}`, outlineOffset: "1px" }
                : undefined
            }
          >
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            {label.name}
          </button>
        );
      })}
    </div>
  );
}
