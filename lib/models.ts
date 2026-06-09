import type { ModelOption, ModelProvider } from "@/types";

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "claude",
    name: "Claude Sonnet",
    model: "claude-sonnet-4-6",
    description: "Anthropic",
    color: "#D97706",
  },
  {
    id: "openai",
    name: "GPT-5.5",
    model: "gpt-5.5",
    description: "OpenAI",
    color: "#10A37F",
  },
  {
    id: "gemini",
    name: "Gemini 3.5 Flash",
    model: "gemini-3.5-flash",
    description: "Google",
    color: "#4285F4",
  },
];

export function getModel(id: ModelProvider): ModelOption {
  const found = MODEL_OPTIONS.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown model provider: ${id}`);
  return found;
}
