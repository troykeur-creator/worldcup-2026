# World Cup 2026 — Live Dashboard ⚽🇺🇸

A single‑file, real‑time dashboard for the 2026 FIFA World Cup — live scores and an animated match tracker, a tournament‑wide goal ticker, group standings with **Road to the Round of 32** scenarios, the full knockout bracket with a **Path to the Final**, the Golden Boot race with player photos, rich match previews, team pages, news, AI match predictions, and a "Fun" reel — all in **one `index.html`** with no build step, no server, and no database.

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
- [Resilience and diagnostics](#resilience-and-diagnostics)
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

- **Live match tracker** — ticking match clock, animated pitch with a ball that follows the flow of play, live win‑probability, momentum graph, ball‑by‑ball commentary, lineups, a goal celebration (confetti + optional goal horn), and live stat tiles. **Live highlights sit directly below the pitch** and refresh about every **5 seconds**, with new goals appended as they go in.
- **Live goal ticker** — a tournament‑wide strip beneath the tabs shows every in‑play score and flashes when a goal lands *anywhere* in the World Cup.
- **Favorite team theming** — pick any nation and the whole app re‑skins to its colors, follows the team (a "Following" flag shows in the header), and shows a live countdown to its next kickoff.
- **Standings + Road to the Round of 32** — live group tables (points, W‑D‑L, goal difference) plus a per‑group **scenario engine** that brute‑forces every remaining result to tell each team whether they're *through, safe, alive, or out* — and what they need next.
- **Bracket + Path to the Final** — the full Round‑of‑32‑to‑Final tree, projected during the group stage and locking to real teams as groups decide; for your favorite team it draws a **projected route to the Final**, opponent by opponent, that turns green/red as real results come in.
- **Golden Boot** — top scorers with **player photos**, each player's goals listed, and an **auto‑loaded comprehensive profile** (club, age, position, foot, height, caps, honours, playing style, World Cup role). Profiles for knockout‑bound teams are **pre‑loaded in the background** so taps open instantly.
- **Player photos everywhere** — real headshots (resolved from ESPN's athlete data and cached) in the Golden Boot, player profiles, team‑page star players, and every goal row, with a clean team‑flag fallback.
- **Rich match preview** — before kickoff, each fixture shows both teams' group position, form, goals, key scorer, recent results and head‑to‑head, with an optional AI prediction.
- **Team pages** — a nation's stats, form, **full squad** (assembled from recent line‑ups, each player tappable to a profile), and tappable recent results that open the full match review.
- **Goal highlights** — official goal clips embedded in‑app, cued and trimmed, with a clean "Watch on YouTube" fallback when a rights holder blocks embedding. Resolved clips are cached for instant replay.
- **AI predictions** — win/draw/win projections, predicted scorelines, and key factors for any matchup.
- **Fun tab** — a good‑natured reel of "first time in America" reactions, flamboyant travelling fans (Scotland's Tartan Army, Aussies, …), and Georgia/Atlanta visits, with filters (All · Most Viewed · World Cup · Food · Fans · Georgia · Atlanta · Shorts). **Most Viewed** pulls the hottest, most‑viral World Cup clips worldwide on demand. Clips open in an expanded player with a "tap for sound" option.
- **Resilient by design** — every data derivation is crash‑guarded, external feeds are parsed defensively, and a React error boundary degrades a bad section instead of blanking the app. A hidden diagnostics panel (`?debug=1`, or tap the build tag 5×) surfaces any malformed payloads.
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

The AI features — match predictions, comprehensive player bios, the news fallback, goal‑clip resolution, and the Fun tab's **Most Viewed** / fresh‑picks fetch — call Claude. There are two ways to power them:

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
GET /athletes/{id}                        # player headshot lookup (cached 30 days)
GET /news                                 # headlines
```

Everything else — standings, top scorers, a player's goals, the knockout tree, the **Road to the Round of 32** scenarios, **Path to the Final**, the tournament‑wide live ticker, win probability, momentum, and team colors — is **derived on the client** from the scoreboard. Player bios, squads and headshots are cached in `localStorage` (7‑day bios/squads, 30‑day photos) and pre‑warmed in the background for knockout‑bound teams so taps need no live lookup.

---

## Honest limitations

This project is deliberately upfront about what a free, client‑first app can and can't do:

- **Feed latency** — ESPN's public feed runs roughly **30–90 seconds behind live TV**. The tracker says so; a paid low‑latency feed is the only way around it.
- **No real ball tracking** — the moving ball on the pitch is an **approximation** driven by live commentary and possession, not optical tracking coordinates (which aren't in any free feed).
- **Goal clips** — these are official YouTube highlights, cued and trimmed; some are **embed‑blocked by the rights holder (e.g. FIFA)** and open on YouTube instead. No app can force a video to embed when its owner disabled embedding.
- **Models, not oracles** — win probability and predictions are heuristic/AI estimates, clearly labeled, and not betting advice.
- **Mobile notifications** — background goal alerts are limited on phones (no service worker/push); in‑app foreground alerts work.
- **Proxy is "safe enough," not Fort Knox** — origin‑locked and model/token‑capped, but a determined person who finds the Worker URL could spoof the origin. The **spend cap** is the real backstop; Cloudflare per‑IP rate limiting is an easy add.
- **Player photos depend on ESPN** — where ESPN's athlete data has no headshot on file, the team flag is shown instead (by design, not an error).
- **Qualification scenarios are a projection** — the points maths is exact, but goal‑difference tiebreakers are simplified and the best‑third race spans all groups, so "safe" isn't a mathematical guarantee. **Path to the Final assumes wins** and uses the stronger current seed — a route visual, not a forecast.
- **Pre‑warming has a first‑run cost** — filling the bio cache is hundreds of AI calls; the 7‑day cache makes it roughly a once‑a‑week cost, governed by the spend cap. Lower `PRELOAD_TOPN` or set `PRELOAD_BIOS = false` to trim it.

---

## Resilience and diagnostics

External feeds change shape without warning, so the app is built to degrade rather than crash:

- **Crash‑guarded derivations** — standings, scorers, scenarios and the bracket each run through a `safe()` wrapper; a bad payload turns *that* section into a safe empty state instead of throwing during render.
- **Hardened parsers** — the ESPN scoreboard/summary readers shape‑check their input and skip bad records; every AI response is parsed defensively and tagged by source.
- **Error boundary** — a React boundary wraps the app and each modal, so a render error shows a friendly "reload" card, never a blank screen.
- **Hidden diagnostics panel** — add `?debug=1` to the URL (or tap the footer build tag five times) to reveal a 🩺 panel listing any malformed payloads or render errors, with timestamps and a Copy button. It's invisible to normal users.

---

## Project structure

```text
index.html                          # the entire application (HTML + CSS + React/JSX in one file)
worker.js                           # Cloudflare Worker — the AI proxy
QUICKSTART.md                       # simple end-to-end setup checklist
DEPLOY-PROXY.md                     # detailed proxy deploy guide (Cloudflare + Vercel)
WorldCup2026_Dashboard_Guide.pdf    # 24-page user & developer guide (Edition 1.2)
build_guide.py                      # regenerates the guide PDF (reportlab)
screenshots/                        # optional images used by this README
README.md
```

Inside `index.html`, the app is the JSX in the `<script type="text/babel">` block. Common edits:

| Want to… | Where |
|---|---|
| Point at your proxy | `const PROXY = "…"` near the top |
| Change the AI model | `const MODEL = "claude-sonnet-4-6"` (also allow it in `worker.js`) |
| Tune background pre‑warming | `const PRELOAD_BIOS` (on/off) and `const PRELOAD_TOPN` (teams per group) |
| Confirm what's deployed | `const BUILD = "v40"` renders in the footer; bump it each deploy |
| Adjust polling speed | the `setInterval` values (`12000` / `120000` / `5000` / `1000`) |
| Re‑tune the live pitch ball | `inferTarget` + the flow interval in `PitchView` |
| Change the win‑probability model | the `winProb` function |
| Restyle | the `<style>` block / CSS variables at `:root` |
| Reset persisted state | bump the `wc2026_…` localStorage namespace (`NS`) |
| See what's failing under the hood | open `?debug=1` (or tap the build tag 5×) for the diagnostics panel |

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
