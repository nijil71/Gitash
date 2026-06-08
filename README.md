# OSS Contributor Agent

> Find good first issues in any GitHub repository and get an AI-powered contribution plan tailored for junior developers.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/oss-contributor-agent)

---

## What it does

- **Browse any public GitHub repository** — paste a URL or `owner/repo` shorthand
- **Filter issues by label** — automatically highlights `good first issue` and similar beginner-friendly labels
- **AI-powered contribution plan** — select an issue and Claude generates a step-by-step implementation plan with relevant files
- **Copy-ready output** — export the full plan as formatted Markdown in one click
- **Privacy-first** — your Anthropic API key lives only in your browser and goes directly to Anthropic, never through any server of ours

---

## How it works

```
GitHub REST API
  └─ fetch repo meta, labels, open issues
        └─ label filter (auto-selects "good first issue")
              └─ user selects an issue
                    └─ POST /api/analyze  (key sent in x-api-key header)
                          └─ Claude  (claude-sonnet-4-20250514)
                                └─ { files, plan }  rendered in UI
```

The route handler at `app/api/analyze/route.ts` receives the issue context and your Anthropic key in the `x-api-key` request header, builds a structured prompt, and returns a JSON object with two fields: `files` (relevant paths with one-line reasons) and `plan` (a 5-step numbered implementation guide written for a junior developer).

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/oss-contributor-agent
cd oss-contributor-agent

# 2. Install dependencies
npm install

# 3. (Optional) copy env example — no server-side env vars are required for basic use
cp .env.example .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Key Setup

This app uses the [Anthropic API](https://console.anthropic.com/) to generate contribution plans via Claude.

1. Create an account at [console.anthropic.com](https://console.anthropic.com/)
2. Generate an API key (it starts with `sk-ant-`)
3. Click **"Set API Key"** in the top-right corner of the app
4. Paste your key and click **Save**

**Privacy note:** your key is stored in `localStorage` under the key `anthropic_api_key`. It is never transmitted to this application's server — it is sent only in the `x-api-key` header of requests that go directly from your browser to Anthropic's API.

---

## OG Image

An `public/og.png` (1200 × 630 px) is recommended for link preview cards. Generate one for free at [og-image.vercel.app](https://og-image.vercel.app), save it as `public/og.png`, then add the following to the `metadata` object in `app/layout.tsx`:

```ts
openGraph: {
  images: [{ url: '/og.png', width: 1200, height: 630 }],
},
```

---

## Deploy to Vercel

Click the button below to deploy your own instance in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/oss-contributor-agent)

No environment variables are required — users bring their own Anthropic API key via the in-app modal.

---

## Contributing

Found a bug or want a new feature? Open an issue — and then use **this very tool** to generate your own contribution plan for it.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes and open a pull request

Please keep PRs focused. One feature or fix per PR makes reviews faster.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| AI | [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) · `claude-sonnet-4-20250514` |
| Data | GitHub REST API v3 (unauthenticated, 60 req/hr) |
| Fonts | Geist Sans / Geist Mono (local, via `next/font`) |
| Deployment | Vercel (recommended) |

---

## License

MIT
