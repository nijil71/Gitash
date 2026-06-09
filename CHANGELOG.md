# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-09

### Added
- Browse any public GitHub repo and list open issues.
- Multi-provider AI plans (Claude, GPT, Gemini) with your own API key, stored
  only in the browser and sent directly to the provider.
- **Context-grounded plans**: the prompt includes the repo's real file tree and
  the issue discussion, so suggested files actually exist.
- **Streaming, structured plans**: summary, difficulty, effort, prerequisites,
  files, step-by-step guide, testing notes, and gotchas — rendered live.
- **Regenerate** a plan (bypassing the cache).
- Multi-label filtering, client-side search, sorting, and pagination.
- Issue metadata on cards: author, age, comment count, reactions, and an
  "assigned" indicator.
- Optional in-app **GitHub token** to raise the rate limit to 5,000 req/hr and
  reach private repos.
- **Bookmark** issues and revisit **recent repos** (localStorage).
- **Keyboard navigation**: `/` to search, ↑/↓ to move through issues.
- Actionable output: suggested branch name and one-click Fork / web-editor /
  Open-PR links; copy or download the plan as Markdown.
- **Monochrome theme** with a light/dark toggle.

[Unreleased]: https://github.com/nijil71/Gitash/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nijil71/Gitash/releases/tag/v0.1.0
