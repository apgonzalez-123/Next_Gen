/**
 * NextGen Portfolio Builder — vote backend.
 *
 * A single Cloudflare Worker over a D1 database. It owns the
 * `nextgen_responses` table and nothing else — deliberately NOT the
 * `responses` table, which already exists in this database with a
 * different schema and belongs to separate work.
 * D1 (rather than KV) because
 * the room's tally is read back immediately after each write: KV is
 * eventually consistent and votes would lag the projector by several
 * seconds.
 *
 * Routes
 *   POST /api/vote     { session, response }   upsert one guest's answers
 *   GET  /api/summary?session=ID               AGGREGATE ONLY — counts and
 *                                              totals, never an individual
 *                                              response. This is what every
 *                                              guest's browser polls.
 *   GET  /api/state?session=ID                 which sections are open
 *   POST /api/state    { session, key, ... }   open/close a section (admin)
 *   GET  /api/roster?session=ID&key=ADMIN_KEY  full records WITH identities
 *   GET  /api/export?session=ID&key=ADMIN_KEY  the same, as CSV
 *   POST /api/reset    { session, key }        clear a session
 *
 * Deploy: see README.md.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const MAX_SESSION = 64;
const MAX_ANSWERS_BYTES = 4000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      await ensureSchema(env);

      if (url.pathname === "/api/vote" && request.method === "POST") {
        return await vote(request, env);
      }
      if (url.pathname === "/api/summary" && request.method === "GET") {
        return await summary(url, env);
      }
      if (url.pathname === "/api/state" && request.method === "GET") {
        return await getState(url, env);
      }
      if (url.pathname === "/api/state" && request.method === "POST") {
        return await setState(request, env);
      }
      if (url.pathname === "/api/roster" && request.method === "GET") {
        return await roster(url, env);
      }
      if (url.pathname === "/api/export" && request.method === "GET") {
        return await exportCsv(url, env);
      }
      if (url.pathname === "/api/reset" && request.method === "POST") {
        return await reset(request, env);
      }
      if (url.pathname === "/" || url.pathname === "/api") {
        return json({ ok: true, service: "nextgen-votes" });
      }
      return json({ error: "not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "server error", detail: String(err && err.message || err) }, 500);
    }
  },
};

/* Which sections of the quiz are open right now. The admin opens each one
 * as the matching part of the presentation begins. Held server-side so it
 * is the same for every guest in the room, and so a guest cannot unlock a
 * section by editing their own browser state. */
async function getState(url, env) {
  const session = String(url.searchParams.get("session") || "default").slice(0, MAX_SESSION);
  const row = await env.DB.prepare(
    `SELECT sections, updated_at FROM nextgen_state WHERE session = ?1`
  ).bind(session).first();

  return json({
    session,
    sections: row ? safeParse(row.sections) : {},
    updatedAt: row ? row.updated_at : 0,
  });
}

async function setState(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!checkKey(body.key, env)) return json({ error: "unauthorized" }, 401);

  const session = String(body.session || "default").slice(0, MAX_SESSION);
  const sections = body.sections && typeof body.sections === "object" ? body.sections : {};
  const clean = {};
  for (const [k, v] of Object.entries(sections)) {
    if (/^[A-Za-z0-9_-]{1,40}$/.test(k)) clean[k] = v === true || v === "open";
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO nextgen_state (session, sections, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT (session) DO UPDATE SET
       sections = excluded.sections, updated_at = excluded.updated_at`
  ).bind(session, JSON.stringify(clean), now).run();

  return json({ ok: true, session, sections: clean, updatedAt: now });
}

async function ensureSchema(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS nextgen_responses (
       id       TEXT NOT NULL,
       session  TEXT NOT NULL,
       name     TEXT,
       grp      TEXT,
       token    TEXT,
       fields   TEXT,
       matched  TEXT,
       answers  TEXT NOT NULL,
       at       INTEGER NOT NULL,
       PRIMARY KEY (session, id)
     )`
  ).run();

  /* Added after the table shipped, so CREATE TABLE alone will not add it.
     D1 has no "ADD COLUMN IF NOT EXISTS"; a duplicate-column error here is
     the expected steady state and is swallowed. */
  try {
    await env.DB.prepare(`ALTER TABLE nextgen_responses ADD COLUMN matched TEXT`).run();
  } catch (e) { /* already present */ }

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS nextgen_state (
       session    TEXT PRIMARY KEY,
       sections   TEXT NOT NULL DEFAULT '{}',
       updated_at INTEGER NOT NULL
     )`
  ).run();
}

/* Guests re-scanning their personal code should update their row rather
 * than add a second one, so this is an upsert keyed on (session, id). */
async function vote(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.response || typeof body.response !== "object") {
    return json({ error: "expected { session, response }" }, 400);
  }

  const session = String(body.session || "default").slice(0, MAX_SESSION);
  const r = body.response;
  const id = String(r.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  if (!id) return json({ error: "response.id required" }, 400);

  const answers = JSON.stringify(r.answers || {});
  if (answers.length > MAX_ANSWERS_BYTES) return json({ error: "answers too large" }, 413);

  await env.DB.prepare(
    `INSERT INTO nextgen_responses (id, session, name, grp, token, fields, matched, answers, at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT (session, id) DO UPDATE SET
       name = excluded.name, grp = excluded.grp, token = excluded.token,
       fields = excluded.fields, matched = excluded.matched,
       answers = excluded.answers, at = excluded.at`
  ).bind(
    id,
    session,
    String(r.name || "").slice(0, 80),
    String(r.group || "").slice(0, 40),
    String(r.token || "").slice(0, 40),
    JSON.stringify(r.fields || {}).slice(0, 2000),
    JSON.stringify(r.match || null).slice(0, 200),
    answers,
    Number(r.at) || Date.now()
  ).run();

  return json({ ok: true, id });
}

async function readSession(env, session) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, grp, token, fields, matched, answers, at FROM nextgen_responses
      WHERE session = ?1 ORDER BY at ASC`
  ).bind(session).all();

  return (results || []).map((row) => ({
    id: row.id,
    name: row.name || "",
    group: row.grp || "",
    token: row.token || "",
    fields: safeParse(row.fields),
    match: safeParse(row.matched),
    at: row.at,
    answers: safeParse(row.answers),
  }));
}

function safeParse(s) {
  try { return JSON.parse(s) || {}; } catch { return {}; }
}

/* PUBLIC, and the only route a guest's browser ever calls for room data.
 *
 * It returns AGGREGATES: how many people chose each option, the running
 * sum and count behind each scale average, and a tally of matched
 * portfolios. No individual response is ever serialised here — not even
 * anonymised — so one guest cannot read another guest's answers, and a
 * small room cannot be de-anonymised by elimination.
 *
 * Everything the room screens draw is derivable from these counts. */
async function summary(url, env) {
  const session = String(url.searchParams.get("session") || "default").slice(0, MAX_SESSION);
  const full = await readSession(env, session);

  const axes = {};       // axisId -> { counts: {value: n}, sum, n, respondents }
  const matches = {};    // portfolioId -> n
  let complete = 0;

  for (const r of full) {
    if (r.match && r.match.id) {
      matches[r.match.id] = (matches[r.match.id] || 0) + 1;
      complete++;
    }
    for (const [axisId, value] of Object.entries(r.answers || {})) {
      const a = axes[axisId] || (axes[axisId] = { counts: {}, sum: 0, n: 0, respondents: 0 });
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        a.respondents++;
        for (const v of value) a.counts[v] = (a.counts[v] || 0) + 1;
      } else if (typeof value === "number") {
        a.respondents++;
        a.counts[value] = (a.counts[value] || 0) + 1;
        a.sum += value;
        a.n++;
      } else {
        a.respondents++;
        a.counts[value] = (a.counts[value] || 0) + 1;
      }
    }
  }

  return json({ session, count: full.length, complete, axes, matches });
}

/* PRIVATE. Full records including identities. Requires ADMIN_KEY. */
async function roster(url, env) {
  if (!checkKey(url.searchParams.get("key"), env)) {
    return json({ error: "unauthorized" }, 401);
  }
  const session = String(url.searchParams.get("session") || "default").slice(0, MAX_SESSION);
  const responses = await readSession(env, session);
  return json({ session, count: responses.length, responses });
}

/* CSV straight from the backend, so the full room can be exported without
 * opening the admin page on the device that happens to hold the data. */
async function exportCsv(url, env) {
  if (!checkKey(url.searchParams.get("key"), env)) {
    return json({ error: "unauthorized" }, 401);
  }
  const session = String(url.searchParams.get("session") || "default").slice(0, MAX_SESSION);
  const rows = await readSession(env, session);

  const axes = [...new Set(rows.flatMap((r) => Object.keys(r.answers)))];
  const head = ["id", "name", "group", "token", "submitted", ...axes];
  const cell = (v) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;           /* neutralise Excel formulas */
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head, ...rows.map((r) => [
    r.id, r.name, r.group, r.token, new Date(r.at).toISOString(),
    ...axes.map((a) => r.answers[a]),
  ])].map((line) => line.map(cell).join(","));

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="nextgen-${session}.csv"`,
      ...CORS,
    },
  });
}

async function reset(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!checkKey(body.key, env)) return json({ error: "unauthorized" }, 401);
  const session = String(body.session || "default").slice(0, MAX_SESSION);
  await env.DB.prepare(`DELETE FROM nextgen_responses WHERE session = ?1`).bind(session).run();
  /* Section locks survive a vote reset on purpose — clearing rehearsal
     answers should not silently reopen every section. */
  return json({ ok: true, session });
}

/* ADMIN_KEY is a wrangler secret. If it is unset the destructive and
 * data-exporting routes stay closed rather than falling open. */
function checkKey(given, env) {
  return !!env.ADMIN_KEY && given === env.ADMIN_KEY;
}
