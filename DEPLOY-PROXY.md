# Deploy the AI proxy (so friends & family don't need a key)

Your app calls Anthropic directly from the browser, which means a key placed in
the page is **public** the moment GitHub Pages serves it. This proxy fixes that:
the key lives as a **secret** on a tiny serverless function, the browser calls
the function, and the function adds the key before forwarding to Anthropic.

You only do this once. Two options — Cloudflare Workers (recommended, simplest)
or Vercel. Either is free for this kind of low volume.

---

## Before you start (do this regardless)

Set a **monthly spend cap** on the key in the Anthropic console
(**Settings → Billing → spend limit**). This is your hard backstop no matter what.

It's also wise to use a **dedicated key** for this proxy (create a fresh one named
`wc2026-proxy`) so you can revoke just this one if you ever need to.

---

## Option A — Cloudflare Workers (recommended)

### 1. Create the Worker
1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Give it a name like `wc2026-proxy`. Click **Deploy** (the starter code is fine for now).
3. Click **Edit code**, delete the starter code, and paste the entire contents of **`worker.js`**. Click **Deploy**.

### 2. Add your key as a secret
1. Open the Worker → **Settings → Variables and Secrets**.
2. **Add variable**, type **Secret**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-…` key
3. **Add variable**, type **Plaintext**:
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://troykeur-creator.github.io`
     *(comma-separate if you have more than one origin, e.g. add `http://localhost:8000` for local testing)*
4. **Save and deploy**.

### 3. Grab the URL
Your Worker URL looks like `https://wc2026-proxy.YOURNAME.workers.dev`.

### 4. Point the app at it
In `index.html`, search for the line that begins with `const PROXY =`. It may be
empty, or — if you forked this repo — already contain the original author's Worker URL:

```js
const PROXY = "https://wc2026.troykeur.workers.dev"; // replace with YOUR Worker
```

Set it to **your own** Worker URL:

```js
const PROXY = "https://wc2026-proxy.YOURNAME.workers.dev";
```

> **Forking this repo?** The proxy is origin-locked, so the original author's Worker will
> reject requests from your site. You **must** point `PROXY` at your own Worker — or set it
> to `""` to let each person use their own key.

Commit, push, hard-refresh. Done — AI features now work for everyone, no key needed,
and your key is never in the page.

---

## Option B — Vercel (alternative)

1. Create a new project/repo with a folder `api/` containing **`api/claude.js`**:

```js
export default async function handler(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || "https://troykeur-creator.github.io")
    .split(",").map(s => s.trim());
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (origin && !allowed.includes(origin)) return res.status(403).json({ error: "origin not allowed" });

  const body = req.body || {};
  if (body.model !== "claude-sonnet-4-6") body.model = "claude-sonnet-4-6";
  if (typeof body.max_tokens !== "number" || body.max_tokens > 2000) body.max_tokens = 1500;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  res.status(r.status).setHeader("Content-Type", "application/json").send(text);
}
```

2. In Vercel → **Project → Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your `sk-ant-…` key
   - `ALLOWED_ORIGINS` = `https://troykeur-creator.github.io`
3. Deploy. Your endpoint is `https://YOUR-PROJECT.vercel.app/api/claude`.
4. In `index.html`, set `const PROXY = "https://YOUR-PROJECT.vercel.app/api/claude";`

---

## How it stays safe

- **Key never reaches the browser.** It lives only as a server secret.
- **Origin lock.** The proxy only answers requests from your site's origin, so random
  websites can't borrow it. (Not bulletproof against a determined person spoofing the
  header server-side — which is exactly why the spend cap matters.)
- **Model + token caps.** Even if someone hits the endpoint, they can only run the one
  small model with a capped response size.
- **Spend cap.** Your monthly limit in the Anthropic console is the absolute ceiling.

## Want stricter limits?
Cloudflare → your Worker → **Settings → Rate limiting** lets you cap requests per IP
(e.g. 20/min) in a couple of clicks, with no code. Good for keeping a chatty relative
(or a scraper) from burning through credits.

## Going back to "everyone brings their own key"
Just set `const PROXY = "";` again and redeploy — the app falls back to using the key
each person pastes in **⚙ Settings**.
