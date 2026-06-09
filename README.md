# Gitash

> Browse any public GitHub repository, filter open issues, and get a step-by-step AI contribution plan — powered by Claude, GPT-4o, or Gemini.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black?logo=shadcnui&logoColor=white)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nijil71/Gitash)

---

## What it does

- **Browse any public GitHub repo** — paste a full URL or `owner/repo` shorthand
- **Filter by label** — auto-selects `good first issue` and similar beginner-friendly labels
- **Pick your AI** — choose between Claude (Anthropic), GPT-4o (OpenAI), or Gemini 2.0 Flash (Google)
- **Contribution plan** — click an issue and get a tailored plan: relevant files + a numbered step-by-step guide
- **Copy-ready Markdown** — export the full plan in one click
- **Privacy-first** — API keys live only in your browser (`localStorage`), sent directly to the provider, never through our server

---

## How it works

```
1. User picks an AI provider and saves their API key (stored in localStorage)
2. Paste a GitHub repo URL → fetches repo meta + labels via GitHub REST API
3. Select a label filter → fetches matching open issues
4. Click an issue → POST /api/analyze
        ├── x-api-key header  (your key, direct to provider)
        ├── provider: "claude" | "openai" | "gemini"
        └── issue context (title, body, labels, repo)
                └── AI returns { files, plan } as JSON
                        └── Rendered in the contribution panel
```

The route handler at [`app/api/analyze/route.ts`](app/api/analyze/route.ts) dispatches to the selected provider using your key from the request header. Nothing is logged or stored server-side.

---

## Getting started

```bash
# 1. Clone
git clone https://github.com/nijil71/Gitash
cd Gitash/oss-contributor-agent

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be greeted by the provider selection screen.

---

## API key setup

On first visit, Gitash shows a setup screen with three provider cards. Click the one you want, paste your key, and you're in. Keys are stored per-provider in `localStorage` and the last-used provider is remembered across sessions.

| Provider | Where to get a key | Key format |
|---|---|---|
| **Claude** (Anthropic) | [console.anthropic.com](https://console.anthropic.com/) | `sk-ant-...` |
| **GPT-4o** (OpenAI) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `sk-proj-...` |
| **Gemini 2.0** (Google) | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | `AIzaSy...` |

You can switch providers at any time from the header — each provider's key is stored independently.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Icons | [Lucide React](https://lucide.dev) |
| AI — Claude | [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) · `claude-sonnet-4-6` |
| AI — OpenAI | [OpenAI SDK](https://github.com/openai/openai-node) · `gpt-5.5` |
| AI — Gemini | [Google Generative AI SDK](https://github.com/google/generative-ai-js) · `gemini-3.5-flash` |
| Data | GitHub REST API v3 (unauthenticated, 60 req/hr) |
| Fonts | Geist Sans / Geist Mono (local, via `next/font`) |
| Deployment | [Vercel](https://vercel.com) (recommended) |

---

## Project structure

```
oss-contributor-agent/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   # AI provider dispatch
│   │   └── favicon/route.ts   # SVG favicon route
│   ├── globals.css            # Tailwind + shadcn CSS variables
│   ├── layout.tsx
│   └── page.tsx               # Main app + setup screen
├── components/
│   ├── ui/                    # shadcn primitives
│   ├── ApiKeyModal.tsx
│   ├── ContributionPlan.tsx
│   ├── CopyButton.tsx
│   ├── GitashIcon.tsx         # Custom SVG logo component
│   ├── IssueCard.tsx
│   ├── IssueList.tsx
│   ├── LabelFilter.tsx
│   ├── LoadingSkeleton.tsx
│   ├── ModelSelector.tsx
│   └── RepoInput.tsx
├── lib/
│   ├── github.ts              # GitHub API client
│   ├── models.ts              # Provider config
│   ├── parseRepo.ts           # URL parser
│   └── utils.ts               # cn() helper
├── public/logos/              # Provider SVG logos
└── types/index.ts
```

---

## Deploying to Vercel

No environment variables required — users supply their own API keys in-app.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nijil71/Gitash)

---

## GitHub API rate limits

Unauthenticated GitHub API requests are limited to **60 per hour** per IP. To raise the limit to **5,000/hr** (and access private repos), click **GitHub token** in the header and paste a [personal access token](https://github.com/settings/tokens/new?description=Gitash&scopes=public_repo). Like your AI key, it's stored only in your browser (`localStorage`) and sent directly to GitHub — never to our server.

---

## Contributing

Found a bug or want a new feature? Open an issue — then use **this very tool** to generate a contribution plan for it.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes and open a pull request

Please keep PRs focused — one feature or fix per PR.

---

