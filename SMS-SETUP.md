# SMS Match Alerts — Setup Guide

Get a text when a team you follow **kicks off, scores, reaches half-time, or finishes** — even when the dashboard isn't open on anyone's phone.

> **Why this needs a server.** A static web app can't send texts and can't run in the background to watch games. So a small **Cloudflare Worker** runs on a one-minute **cron**, polls ESPN, figures out what happened to your followed teams, and sends the texts through a lightweight SMS gateway. The app only stores your phone numbers + choices in that Worker.

**This build uses [TextBelt](https://textbelt.com)** instead of Twilio — one API key, **no phone-number rental, no carrier/brand registration**, pay-as-you-go credits. It's also open-source, so you can self-host it for no ongoing per-text fee. The gateway is a single function in `sms-worker.js` (`sendSMS`), so swapping it later is trivial.

**Honest expectations**

- **Timing:** the cron runs once a minute and ESPN's free feed trails live TV by ~30-90s, so a text typically lands **1-2 minutes after** the moment. Great for "they scored!" — not a substitute for watching.
- **Cost:** TextBelt is roughly **$3 for ~50 texts** (cheaper in bulk) with **no monthly fee and no number to rent**. A handful of texts per match. Or **self-host** TextBelt to remove the per-text fee.
- **Consent:** only add numbers of people who want the texts; standard carrier rates apply to recipients.

---

## What you'll end up with

```
[ index.html ]  --(Save & subscribe)-->  [ sms-worker.js ]  --(cron, 1/min)-->  ESPN
   the app           stores numbers          Cloudflare Worker        |
                      + choices in KV                                  v
                                                            [ TextBelt ] --> your phone
```

---

## Step 1 — Get a TextBelt key

1. Go to **textbelt.com** and buy a small batch of credits — you'll get an **API key**.
2. That's it. No number to buy, no account SID/token, no A2P registration.

*(For testing only, the key `textbelt` sends 1 free text per day per IP — fine to prove the pipe, not for real use.)*

*(Optional, $0 ongoing: TextBelt is open-source. You can run your own server and set `TEXTBELT_URL` to it — see "Self-hosting" below.)*

## Step 2 — Create the Worker

Use the Cloudflare dashboard (Workers -> Create) or the CLI (`wrangler`). Paste the contents of **`sms-worker.js`** as the Worker code.

A minimal **`wrangler.toml`**:

```toml
name = "wc2026-sms"
main = "sms-worker.js"
compatibility_date = "2024-11-01"

# Background poller — runs every minute
[triggers]
crons = ["* * * * *"]

# Storage for subscriptions + per-match state
[[kv_namespaces]]
binding = "SUBS"
id = "PASTE_YOUR_KV_NAMESPACE_ID"

# Plaintext var (the key is set as a secret, below)
[vars]
ALLOWED_ORIGINS = "https://troykeur-creator.github.io"
```

## Step 3 — Create the KV namespace

```bash
npx wrangler kv namespace create SUBS
# copy the returned id into wrangler.toml under [[kv_namespaces]]
```

(Or in the dashboard: Workers & Pages -> KV -> Create namespace, then bind it to the Worker as **`SUBS`**.)

## Step 4 — Set the secret

```bash
npx wrangler secret put TEXTBELT_KEY        # paste your TextBelt key
# optional, only if self-hosting TextBelt:
# npx wrangler secret put TEXTBELT_URL       # e.g. https://sms.yourdomain.com/text
```

`ALLOWED_ORIGINS` is set as a plain var in `wrangler.toml` (above) so random sites can't subscribe numbers on your dime.

## Step 5 — Deploy

```bash
npx wrangler deploy
```

Copy the deployed URL, e.g. `https://wc2026-sms.YOURNAME.workers.dev`.

## Step 6 — Point the app at it

In **`index.html`**, set the constant near the top:

```js
const SMS_PROXY = "https://wc2026-sms.YOURNAME.workers.dev";
```

Commit/redeploy the page (bump `BUILD`).

## Step 7 — Subscribe from the app

1. Follow a team (tap the **star** on a team page).
2. Tap the **mobile** button in the header.
3. Add one or more phone numbers (with country code, e.g. `+1 555 123 4567`).
4. Pick which alerts you want — **Kickoff / Goals / Half-time / Full-time / Red cards**.
5. **Send test** to confirm the pipe works, then **Save & subscribe**.

You can add several numbers (family members); each save updates that number's teams to whatever you currently follow.

---

## How it decides what to send

The Worker stores one record per phone (`sub:<number>` -> its teams + alert choices) and a short-lived state per match (`st:<id>`). Each minute it:

1. loads every subscription and the set of followed teams,
2. polls the ESPN scoreboard,
3. for each match involving a followed team, compares to the stored state and emits **kickoff / new-goal / half-time / full-time / red-card** events (deduped so you never get the same goal twice),
4. fans each event out to the subscribers who follow one of the two teams **and** enabled that alert type,
5. sends via TextBelt and saves the new state (state auto-expires ~2 days after the match).

## Endpoints (the app uses these)

| Method & path | Body | Purpose |
|---|---|---|
| `POST /subscribe` | `{ numbers:[...], teams:[...], alerts:{...} }` | Create/replace subscriptions |
| `POST /unsubscribe` | `{ numbers:[...] }` | Remove numbers |
| `POST /test` | `{ numbers:[...] }` | Send a one-off confirmation text |

All are origin-locked to `ALLOWED_ORIGINS`.

## Self-hosting TextBelt (optional, removes per-text fees)

TextBelt's server is open-source (`github.com/typpo/textbelt`). Run it on a small VPS with an SMS backend you control, then set the Worker secret `TEXTBELT_URL` to your server's `/text` endpoint and use whatever key your server expects. Everything else stays the same.

## Safety & cost notes

- Keep an eye on your TextBelt **credit balance**; the origin lock stops casual abuse, and low credits are a natural ceiling on runaway cost.
- Numbers live only in your Worker's KV and are used solely to text alerts — no analytics, no sharing.
- To stop alerts for a number, remove it in the panel (it calls `/unsubscribe`), or delete the `sub:<number>` key in KV.

## Troubleshooting

- **Test text never arrives** -> check the `TEXTBELT_KEY` secret is set and has credit. The TextBelt API returns `{ success:false, error:"..." }` (e.g. "Out of quota") which the Worker logs surface.
- **"Couldn't reach the SMS service"** in the app -> `SMS_PROXY` is wrong/empty, or `ALLOWED_ORIGINS` doesn't match your page's origin.
- **No live alerts but tests work** -> confirm the **cron trigger** is set (`crons = ["* * * * *"]`) and the **KV** is bound as `SUBS`. Check the Worker's logs during a live match.
