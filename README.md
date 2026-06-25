# World Cup 2026 — Live Dashboard ⚽🇺🇸

A single‑file, real‑time dashboard for the 2026 FIFA World Cup — live scores and an animated match tracker, group standings, the full knockout bracket, the Golden Boot race, news, AI match predictions, and a "Fun" reel — all in **one `index.html`** with no build step, no server, and no database.

![single file](https://img.shields.io/badge/single--file-app-0B1B40)
![build none](https://img.shields.io/badge/build-none-2E8B57)
![React 18](https://img.shields.io/badge/React-18-5B8DEF)
![PWA](https://img.shields.io/badge/PWA-installable-E7B53C)
![GitHub Pages](https://img.shields.io/badge/hosted-GitHub%20Pages-222222)
![AI proxy](https://img.shields.io/badge/AI-key--free%20via%20proxy-7C3AED)
![data ESPN](https://img.shields.io/badge/data-ESPN%20public%20feed-C8102E)

> **Live:** https://troykeur-creator.github.io/worldcup-2026/ &nbsp;·&nbsp; **Stack:** React (UMD) + Babel‑standalone on GitHub Pages &nbsp;·&nbsp; **Data:** ESPN public feed (free) + Claude AI via a serverless proxy

---

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [AI features and the proxy](#ai-features-and-the-proxy)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [Data sources](#data-sources)
- [Honest limitations](#honest-limitations)
- [Project structure](#project-structure)
- [Privacy and keys](#privacy-and-keys)
- [Disclaimer](#disclaimer)

---

## Screenshots

> Drop your PNGs into a `screenshots/` folder at the repo root (filenames below) and they'll render here.

| Live Tracker | Golden Boot |
|:---:|:---:|
| <img src="screenshots/live-tracker.png" alt="Live match tracker with animated pitch, clock and win probability" width="320"> | <img src="screenshots/golden-boot.png" alt="Golden Boot player profile with goals and in-app clips" width="320"> |
| **Fun Tab** | **Bracket** |
| <img src="screenshots/fun-tab.png" alt="Fun tab reel with category filters" width="320"> | <img src="screenshots/bracket.png" alt="Knockout bracket" width="320"> |

---

## Features

- **Live match tracker** — ticking match clock, animated pitch with a ball that follows the flow of play, live win‑probability, momentum graph, ball‑by‑ball commentary, lineups, a goal celebration (confetti + optional goal horn), and live stat tiles.
- **Favorite team theming** — pick any nation and the whole app re‑skins to its colors, follows the team, and shows a live countdown to its next kickoff.
- **Standings** — live group tables (points, W‑D‑L, goal difference) computed from results as they happen.
- **Bracket** — the full Round‑of‑32‑to‑Final tree; projected qualifiers during the group stage, locking to real teams as each group is decided.
- **Golden Boot** — top scorers, with each player's goals listed and an **auto‑loaded comprehensive profile** (club, age, position, foot, height, caps, honours, playing style, World Cup role).
- **Goal highlights** — official goal clips embedded in‑app, cued and trimmed, with a clean "Watch on YouTube" fallback when a rights holder blocks embedding. Resolved clips are cached for instant replay.
- **AI predictions** — win/draw/win projections, predicted scorelines, and key factors for any matchup.
- **Fun tab** — a good‑natured reel of "first time in America" reactions, flamboyant travelling fans (Scotland's Tartan Army, Aussies, …), and Georgia/Atlanta visits, with filters (All · World Cup · Food · Fans · Georgia · Shorts), a shuffle, and an AI "find fresh picks" refresh. Clips open in an expanded player with a "tap for sound" option.
- **Installable PWA** — add to your home screen; original USA‑themed app icon; safe‑area aware; honors `prefers-reduced-motion`.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | **React 18** (UMD) + ReactDOM, hooks throughout |
| Transpile | **Babel‑standalone** compiles the JSX in the browser at load |
| Styling | Hand‑written CSS with CSS custom properties for theming (fonts: Anton + Inter) |
| Build | **None** — edit the file, reload. No bundler, no toolchain. |
| Hosting | **GitHub Pages** (the file must be named `index.html` at the repo root) |
| Live data | ESPN public soccer API (no key, CORS‑open) |
| AI | Anthropic `claude-sonnet-4-6`, reached through a serverless proxy (or a per‑user key) |

---

## Getting started

It's one static file. To run locally:

```bash
# clone, then either just open the file…
open index.html            # macOS
# …or serve it (recommended, avoids any file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Scores, the live tracker, standings, the bracket, the Golden Boot, news and commentary all work with **no setup**. The AI features need either the proxy below or a personal key.

---

## AI features and the proxy

The AI features — match predictions, comprehensive player bios, the news fallback, goal‑clip resolution, and the Fun tab's "find fresh picks" — call Claude. There are two ways to power them:

**A) Shared proxy (this deployment).** A tiny serverless **Cloudflare Worker** holds the Anthropic key as a server‑side secret. The page calls the Worker, the Worker adds the key and forwards to Anthropic. Visitors — friends and family — get every feature with **no key and no sign‑in**, and the key is never exposed in the page. The app is pointed at the Worker via one line near the top of `index.html`:

```js
const PROXY = "https://wc2026.troykeur.workers.dev";
```

When `PROXY` is set, the in‑app key/Settings button is hidden automatically. Full step‑by‑step setup is in **[`QUICKSTART.md`](QUICKSTART.md)** and **[`DEPLOY-PROXY.md`](DEPLOY-PROXY.md)** (the Worker code is **[`worker.js`](worker.js)**).

> 🔒 Always set a **monthly spend cap** on the key in the Anthropic console. The Worker also locks the model and caps response size, and only answers requests from this site's origin.

**B) Bring your own key.** Set `const PROXY = "";` and each person pastes their own `sk-ant-…` key into **⚙ Settings** (stored only in their browser). Good for solo use or contributors.

---

## Deploy to GitHub Pages

1. Put `index.html` at the **repo root**.
2. **Settings → Pages** → set the source to your main branch.
3. Your site serves at `https://troykeur-creator.github.io/worldcup-2026/`.
4. After each push, **hard‑refresh** (or, if installed to your home screen, remove and re‑add the icon) — Pages and PWAs cache aggressively.

---

## Data sources

All high‑frequency data comes from ESPN's free public soccer API (slug `fifa.world`):

```text
GET /scoreboard?dates=YYYYMMDD-YYYYMMDD   # all fixtures, scores, events, team stats
GET /summary?event={id}                   # ball-by-ball commentary + lineups
GET /news                                 # headlines
```

Everything else — standings, top scorers, a player's goals, the knockout tree, win probability, momentum, team colors — is **derived on the client** from the scoreboard.

---

## Honest limitations

This project is deliberately upfront about what a free, client‑first app can and can't do:

- **Feed latency** — ESPN's public feed runs roughly **30–90 seconds behind live TV**. The tracker says so; a paid low‑latency feed is the only way around it.
- **No real ball tracking** — the moving ball on the pitch is an **approximation** driven by live commentary and possession, not optical tracking coordinates (which aren't in any free feed).
- **Goal clips** — these are official YouTube highlights, cued and trimmed; some are **embed‑blocked by the rights holder (e.g. FIFA)** and open on YouTube instead. No app can force a video to embed when its owner disabled embedding.
- **Models, not oracles** — win probability and predictions are heuristic/AI estimates, clearly labeled, and not betting advice.
- **Mobile notifications** — background goal alerts are limited on phones (no service worker/push); in‑app foreground alerts work.
- **Proxy is "safe enough," not Fort Knox** — origin‑locked and model/token‑capped, but a determined person who finds the Worker URL could spoof the origin. The **spend cap** is the real backstop; Cloudflare per‑IP rate limiting is an easy add.

---

## Project structure

```text
index.html          # the entire application (HTML + CSS + React/JSX in one file)
worker.js           # Cloudflare Worker — the AI proxy
QUICKSTART.md       # simple end-to-end setup checklist
DEPLOY-PROXY.md     # detailed proxy deploy guide (Cloudflare + Vercel)
screenshots/        # optional images used by this README
README.md
```

Inside `index.html`, the app is the JSX in the `<script type="text/babel">` block. Common edits:

| Want to… | Where |
|---|---|
| Point at your proxy | `const PROXY = "…"` near the top |
| Change the AI model | `const MODEL = "claude-sonnet-4-6"` (also allow it in `worker.js`) |
| Adjust polling speed | the `setInterval` values (20000 / 120000 / 12000 / 10000) |
| Re‑tune the live pitch ball | `inferTarget` + the flow interval in `PitchView` |
| Change the win‑probability model | the `winProb` function |
| Restyle | the `<style>` block / CSS variables at `:root` |
| Reset persisted state | bump the `wc2026_…` localStorage namespace |

---

## Privacy and keys

- No analytics, no trackers, no ads.
- With the proxy, the Anthropic key lives **only as a server secret** on Cloudflare — never in the page or the repo.
- Personal preferences live in **your browser's local storage** only.
- Nothing is sent anywhere except ESPN (public data) and Anthropic (only when an AI feature is triggered).

---

## Disclaimer

Built for personal, non‑commercial use. Not affiliated with, endorsed by, or sponsored by **FIFA**, **ESPN**, **YouTube**, or **Anthropic**. Team names, flags, and tournament data belong to their respective owners; the app's visual theme and icon are original and use no trademarked marks. Highlight and Fun‑tab videos are embedded from YouTube and remain the property of their uploaders.

---

*Made for the love of the game — and for following every match without a cable subscription.* ⚽
