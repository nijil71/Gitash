"use client";

import { useState } from "react";
import { parseRepo } from "@/lib/parseRepo";

interface Props {
  onAnalyze: (owner: string, repo: string) => void;
  loading: boolean;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function RepoInput({ onAnalyze, loading }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const parsed = parseRepo(value);
    if (!parsed) {
      setError("Enter a valid GitHub URL or owner/repo (e.g. vercel/next.js)");
      return;
    }
    setError(null);
    onAnalyze(parsed.owner, parsed.repo);
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
          placeholder="https://github.com/owner/repo or owner/repo"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="flex min-w-[96px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner />
              Loading…
            </>
          ) : (
            "Analyze"
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
