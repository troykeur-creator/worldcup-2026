/**
 * World Cup 2026 Dashboard — SMS Alerts Worker
 * -------------------------------------------------------------
 * Sends SMS for followed teams (kickoff / goal / half-time / full-time / red card)
 * EVEN WHEN THE APP IS CLOSED, via a scheduled (cron) trigger that polls ESPN and
 * sends texts through a lightweight SMS gateway (TextBelt by default; self-hostable).
 *
 * This Worker has TWO jobs:
 *   1. fetch()      — HTTP API the app calls to subscribe / unsubscribe / test.
 *   2. scheduled()  — cron (every minute) that polls ESPN, detects events for any
 *                     subscribed team, and sends the texts. Deduped via KV.
 *
 * ── REQUIRED BINDINGS (wrangler.toml) ──────────────────────────────────────────
 *   [[kv_namespaces]]
 *   binding = "SUBS"            # create a KV namespace and bind it as SUBS
 *
 *   [triggers]
 *   crons = ["* * * * *"]       # every minute
 *
 * ── REQUIRED SECRETS (wrangler secret put …) ──────────────────────────────────
 *   TEXTBELT_KEY       your TextBelt API key — buy credits at textbelt.com, or run
 *                      your own TextBelt server for $0 ongoing (see SMS-SETUP.md)
 *   ALLOWED_ORIGINS    e.g. https://troykeur-creator.github.io   (plaintext var is fine)
 *   TEXTBELT_URL       (optional) override endpoint when self-hosting TextBelt
 *
 * See SMS-SETUP.md for the full step-by-step.
 */

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

/* ───────────────────────── HTTP API (the app calls this) ───────────────────── */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!originAllowed(origin, env)) return json({ error: "origin not allowed" }, 403, cors);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    try {
      if (request.method === "POST" && path.endsWith("/subscribe")) {
        const body = await request.json();
        const numbers = cleanNumbers(body.numbers);
        const teams = (body.teams || []).filter(Boolean).map(String);
        const alerts = sanitizeAlerts(body.alerts);
        if (!numbers.length) return json({ error: "no valid numbers" }, 400, cors);
        if (!teams.length) return json({ error: "no teams" }, 400, cors);
        // One record per phone number; latest save wins.
        await Promise.all(numbers.map(n =>
          env.SUBS.put("sub:" + n, JSON.stringify({ phone: n, teams, alerts, ts: Date.now() }))
        ));
        return json({ ok: true, subscribed: numbers.length, teams: teams.length }, 200, cors);
      }

      if (request.method === "POST" && path.endsWith("/unsubscribe")) {
        const body = await request.json();
        const numbers = cleanNumbers(body.numbers);
        await Promise.all(numbers.map(n => env.SUBS.delete("sub:" + n)));
        return json({ ok: true, removed: numbers.length }, 200, cors);
      }

      if (request.method === "POST" && path.endsWith("/test")) {
        const body = await request.json();
        const numbers = cleanNumbers(body.numbers);
        if (!numbers.length) return json({ error: "no valid numbers" }, 400, cors);
        const results = await Promise.all(numbers.map(n =>
          sendSMS(env, n, "✅ World Cup 2026 alerts are set up. You'll get a text when your teams kick off, score, or finish.")
        ));
        return json({ ok: results.every(Boolean), sent: results.filter(Boolean).length }, 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500, cors);
    }
  },

  /* ─────────────────────── CRON: poll ESPN + send alerts ───────────────────── */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAlerts(env));
  },
};

async function runAlerts(env) {
  // 1) Load all subscriptions.
  const subs = [];
  let cursor;
  do {
    const list = await env.SUBS.list({ prefix: "sub:", cursor });
    for (const k of list.keys) {
      const v = await env.SUBS.get(k.name, "json");
      if (v && v.phone && Array.isArray(v.teams)) subs.push(v);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  if (!subs.length) return;

  const followed = new Set();
  subs.forEach(s => s.teams.forEach(t => followed.add(t)));

  // 2) Poll ESPN scoreboard.
  let board;
  try {
    const r = await fetch(ESPN + "/scoreboard?limit=320");
    if (!r.ok) return;
    const j = await r.json();
    board = (j.events || []).map(parseEvent).filter(Boolean);
  } catch (_) { return; }

  // 3) For each match involving a followed team, detect new events vs stored state.
  for (const m of board) {
    if (!followed.has(m.home) && !followed.has(m.away)) continue;
    if (m.status === "upcoming" && !isImminent(m)) {
      // nothing to do until it kicks off (state created lazily on first 'in')
    }
    const skey = "st:" + m.id;
    const prev = (await env.SUBS.get(skey, "json")) || { start: false, half: false, full: false, goals: [], reds: [] };
    const out = []; // {type, text, teamsInvolved:[home,away]}

    // Kickoff
    if (m.status === "in" && !prev.start) {
      prev.start = true;
      out.push({ type: "start", text: `⚽ Kickoff: ${m.home} vs ${m.away}${m.group ? " — " + m.group : ""}.` });
    }
    // Goals (each scoring play, deduped by a stable key)
    const goalKeys = prev.goals || [];
    for (const g of m.goals) {
      const key = g.id || (g.team + "|" + g.minute + "|" + g.scorer + "|" + m.homeScore + "-" + m.awayScore);
      if (goalKeys.includes(key)) continue;
      goalKeys.push(key);
      const sc = g.scorer ? ` — ${g.scorer}${g.minute ? " " + g.minute : ""}${g.pen ? " (pen)" : g.og ? " (OG)" : ""}` : "";
      out.push({ type: "goal", text: `⚽ GOAL! ${m.home} ${m.homeScore}-${m.awayScore} ${m.away}${sc}` });
    }
    prev.goals = goalKeys.slice(-14);
    // Red cards
    const redKeys = prev.reds || [];
    for (const rc of m.reds) {
      const key = rc.id || (rc.team + "|" + rc.minute + "|" + rc.player);
      if (redKeys.includes(key)) continue;
      redKeys.push(key);
      out.push({ type: "red", text: `🟥 Red card — ${rc.player || rc.team} (${m.home} ${m.homeScore}-${m.awayScore} ${m.away}).` });
    }
    prev.reds = redKeys.slice(-8);
    // Half-time
    if (/halftime|end_period/i.test(m.statusName) && !prev.half) {
      prev.half = true;
      out.push({ type: "half", text: `Half-time: ${m.home} ${m.homeScore}-${m.awayScore} ${m.away}.` });
    }
    // Full-time
    if (m.status === "ft" && !prev.full) {
      prev.full = true;
      out.push({ type: "full", text: `Full-time: ${m.home} ${m.homeScore}-${m.awayScore} ${m.away}.` });
    }

    if (out.length) {
      // Fan out to subscribers who follow either team and enabled that alert type.
      for (const note of out) {
        for (const s of subs) {
          const followsThis = s.teams.includes(m.home) || s.teams.includes(m.away);
          if (!followsThis) continue;
          if (s.alerts && s.alerts[note.type] === false) continue; // off
          await sendSMS(env, s.phone, note.text);
        }
      }
    }
    // Persist state (2-day TTL so it self-cleans after the match).
    await env.SUBS.put(skey, JSON.stringify(prev), { expirationTtl: 172800 });
  }
}

/* ───────────────────────────── ESPN parsing ──────────────────────────────── */
function parseEvent(ev) {
  try {
    const comp = ev.competitions[0]; const t = comp.status.type;
    const status = t.state === "in" ? "in" : t.state === "post" ? "ft" : "upcoming";
    const home = comp.competitors.find(c => c.homeAway === "home") || comp.competitors[0];
    const away = comp.competitors.find(c => c.homeAway === "away") || comp.competitors[1];
    const note = (comp.altGameNote || "").replace("FIFA World Cup,", "").trim();
    const details = comp.details || [];
    const goals = details.filter(d => d.scoringPlay).map(d => {
      const a = d.athletesInvolved && d.athletesInvolved[0];
      const tn = (d.team && String(d.team.id) === String(home.team.id)) ? home.team.displayName : away.team.displayName;
      return { id: d.id, team: tn, scorer: a ? a.displayName : "", minute: d.clock && d.clock.displayValue, pen: !!d.penaltyKick, og: !!d.ownGoal };
    });
    const reds = details.filter(d => d.redCard).map(d => {
      const a = d.athletesInvolved && d.athletesInvolved[0];
      const tn = (d.team && String(d.team.id) === String(home.team.id)) ? home.team.displayName : away.team.displayName;
      return { id: d.id, team: tn, player: a ? a.displayName : "", minute: d.clock && d.clock.displayValue };
    });
    return {
      id: ev.id, date: ev.date, status, statusName: (t.name || t.state || ""), group: note,
      home: home.team.displayName, away: away.team.displayName,
      homeScore: status !== "upcoming" && home.score != null ? Number(home.score) : 0,
      awayScore: status !== "upcoming" && away.score != null ? Number(away.score) : 0,
      goals, reds,
    };
  } catch (_) { return null; }
}
function isImminent(m) { try { return (new Date(m.date).getTime() - Date.now()) < 6 * 60000; } catch (_) { return false; } }

/* ───────────────────────────── SMS sender (TextBelt) ─────────────────────────
 * TextBelt is a minimal SMS API: one key, no phone-number rental, no carrier
 * registration. Buy credits at textbelt.com, or self-host the open-source server
 * and point TEXTBELT_URL at it for zero ongoing cost. Swap this one function if
 * you ever want a different gateway. */
async function sendSMS(env, to, body) {
  const key = env.TEXTBELT_KEY;
  if (!key) return false;
  const endpoint = env.TEXTBELT_URL || "https://textbelt.com/text";
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: to, message: body, key }),
    });
    const data = await r.json().catch(() => ({}));
    return !!(r.ok && data && data.success);
  } catch (_) { return false; }
}

/* ───────────────────────────── helpers ───────────────────────────────────── */
function cleanNumbers(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map(n => String(n || "").replace(/[^\d+]/g, ""))
    .filter(n => n.replace(/\D/g, "").length >= 10)
    .map(n => n.startsWith("+") ? n : ("+1" + n.replace(/\D/g, ""))) // default to +1 (US) if no country code
    .filter((n, i, a) => a.indexOf(n) === i);
}
function sanitizeAlerts(a) {
  a = a || {};
  const keys = ["start", "goal", "half", "full", "red"];
  const out = {};
  keys.forEach(k => { out[k] = a[k] !== false; }); // default on, except those explicitly false
  if (a.red === undefined) out.red = false;        // red cards default OFF
  return out;
}
function originHost(o) { try { return new URL(o).host.toLowerCase(); } catch (_) { return (o || "").toLowerCase(); } }
function originAllowed(origin, env) {
  const allow = (env.ALLOWED_ORIGINS || "").split(",").map(s => originHost(s.trim())).filter(Boolean);
  if (!allow.length) return true; // if unset, allow (tighten in production)
  return allow.includes(originHost(origin));
}
function corsHeaders(origin, env) {
  return {
    "Access-Control-Allow-Origin": originAllowed(origin, env) && origin ? origin : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json", ...cors } });
}
