/**
 * World Cup 2026 Dashboard — Anthropic proxy (Cloudflare Worker)
 * --------------------------------------------------------------
 * Keeps your Anthropic API key OFF the public page. The browser calls this
 * Worker; the Worker adds your key (a secret) and forwards to Anthropic.
 *
 * Setup:
 *   1. Paste this whole file into the Worker editor and Deploy.
 *   2. Settings -> Variables and Secrets:
 *        Secret    ANTHROPIC_API_KEY = sk-ant-...      (never hard-code it)
 *        Plaintext ALLOWED_ORIGINS   = https://troykeur-creator.github.io
 *      (host only -- any path/trailing slash is ignored automatically)
 *   3. Put the Worker URL into index.html as  const PROXY = "..."
 *
 * Always set a monthly spend cap on the key in the Anthropic console.
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    // Reflect the caller's origin so the browser can always READ the response
    // (even errors). The allow-list below is what actually gates usage.
    const cors = {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405, cors);

    // Allow-list, compared by HOST ONLY so scheme / path / slash / case never break the match
    const allowed = (env.ALLOWED_ORIGINS || "https://troykeur-creator.github.io")
      .split(",").map(hostOf).filter(Boolean);
    if (origin && allowed.length && !allowed.includes(hostOf(origin))) {
      return json({ error: "origin not allowed: " + origin }, 403, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "server is missing the ANTHROPIC_API_KEY secret" }, 500, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json" }, 400, cors); }

    // Guardrails so a leaked Worker URL can't run up arbitrary bills
    const ALLOWED_MODELS = ["claude-sonnet-4-6"];
    if (!ALLOWED_MODELS.includes(body.model)) body.model = "claude-sonnet-4-6";
    if (typeof body.max_tokens !== "number" || body.max_tokens > 2000) body.max_tokens = 1500;

    let upstream;
    try {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return json({ error: "upstream fetch failed: " + (e && e.message) }, 502, cors);
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};

// Reduce any origin or allow-list entry to just its host (e.g. troykeur-creator.github.io).
// Tolerates missing scheme, extra path, trailing slash, and case.
function hostOf(u) {
  u = (u || "").trim().toLowerCase();
  try { return new URL(u).host; } catch (e) {}
  try { return new URL("https://" + u).host; } catch (e) {}
  return u.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
