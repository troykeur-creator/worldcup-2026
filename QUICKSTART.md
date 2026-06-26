# Quick Start — get it live for family

Follow top to bottom. ~15 minutes total. You only do this once.

---

## Part 1 — Put the app online (GitHub Pages)

1. Create a new GitHub repo (or open your existing one).
2. Upload **`index.html`** to the repo root. (Optional: also add `README.md`, `screenshots/`.)
3. In the repo: **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch** → branch **main** → folder **/(root)** → **Save**.
5. Wait ~1 minute. Your site is live at `https://troykeur-creator.github.io/<repo>/`.
6. Open it on your phone to confirm scores load. (AI features come in Part 3–4.)

✅ At this point everything except AI works for anyone.

---

## Part 2 — Get your Anthropic key + set a spend cap

1. Go to **console.anthropic.com** and sign in.
2. **Settings → Billing** → add a payment method and a little prepaid credit.
3. Still in Billing, set a **monthly spend limit** (e.g. $5). ← this is your safety net.
4. **API Keys → Create Key**, name it `wc2026-proxy`, and **copy** the `sk-ant-…` key now (shown once).

✅ Keep that key handy for Part 3. Don't paste it into the app or the code.

---

## Part 3 — Deploy the proxy (Cloudflare, free)

This hides your key so family never needs one.

1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it `wc2026-proxy` → **Deploy**.
3. Click **Edit code**, delete what's there, paste **all of `worker.js`**, click **Deploy**.
4. Open the Worker → **Settings → Variables and Secrets**:
   - Add **Secret**: name `ANTHROPIC_API_KEY`, value = your `sk-ant-…` key.
   - Add **Plaintext**: name `ALLOWED_ORIGINS`, value = `https://troykeur-creator.github.io`
   - **Save and deploy**.
5. Copy your Worker URL — it looks like `https://wc2026-proxy.YOURNAME.workers.dev`.

✅ Your key now lives only on Cloudflare, never in the page.

---

## Part 4 — Connect the proxy to the app

1. Open **`index.html`** and search for the line that begins with `const PROXY =`. It may
   be empty (`""`) or — if you forked this repo — already hold the original author's Worker URL.
2. Set it to **your own** Worker URL:
   ```js
   const PROXY = "https://wc2026-proxy.YOURNAME.workers.dev";
   ```
   *(The proxy is origin-locked, so you can't reuse someone else's Worker — it must be yours. Set `""` to fall back to per-user keys.)*
3. Save, then re-upload/commit `index.html` to GitHub.

✅ AI features (predictions, player bios, goal clips, Fun "fresh picks") now work for everyone — no key needed by them.

---

## Part 5 — Test it

1. On your phone, open the site.
2. **Hard-refresh** (pull down to reload). If it still looks old, close the tab and reopen the URL. If you added it to your home screen, remove and re-add the icon.
3. Tap a player in **Golden Boot** → the profile should fill in automatically.
4. Open **Predict**, pick two teams → you should get an AI prediction.

If those work, you're done.

---

## Part 6 — Share with family

Just send them the link: `https://troykeur-creator.github.io/<repo>/`
Tell them to tap **Add to Home Screen** for an app-like icon. That's it — nothing to install, no key, no sign-in.

---

## Handy to know

- **Switch back to "everyone brings their own key":** set `const PROXY = "";` again and re-upload. The app then uses whatever key each person pastes in ⚙ Settings.
- **Limit a chatty relative:** Cloudflare → your Worker → **Settings → Rate limiting** → cap requests per IP (e.g. 20/min). No code needed.
- **If AI ever stops working:** check your Anthropic **Billing** (out of credit?) and that the spend cap isn't already hit.
- **After any code change:** re-upload `index.html`, then hard-refresh on the phone (Pages caches hard).
