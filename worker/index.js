/**
 * NextGen Portfolio Builder — vote backend.
 *
 * A single Cloudflare Worker over a D1 database. D1 (rather than KV) because
 * the room's tally is read back immediately after each write: KV is
 * eventually consistent and votes would lag the projector by several
 * seconds.
 *
 * Routes
 *   POST /api/vote     { session, response }  upsert one guest's answers
 *   GET  /api/results?session=ID              every response for a session
 *   GET  /api/export?session=ID&key=ADMIN_KEY CSV of the same
 *   POST /api/reset    { session, key }       clear a session
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
      if (url.pathname === "/api/results" && request.method === "GET") {
        return await results(url, env);
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

async function ensureSchema(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS responses (
       id       TEXT NOT NULL,
       session  TEXT NOT NULL,
       name     TEXT,
       grp      TEXT,
       token    TEXT,
       answers  TEXT NOT NULL,
       at       INTEGER NOT NULL,
       PRIMARY KEY (session, id)
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
    `INSERT INTO responses (id, session, name, grp, token, answers, at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT (session, id) DO UPDATE SET
       name = excluded.name, grp = excluded.grp, token = excluded.token,
       answers = excluded.answers, at = excluded.at`
  ).bind(
    id,
    session,
    String(r.name || "").slice(0, 80),
    String(r.group || "").slice(0, 40),
    String(r.token || "").slice(0, 40),
    answers,
    Number(r.at) || Date.now()
  ).run();

  return json({ ok: true, id });
}

async function readSession(env, session) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, grp, token, answers, at FROM responses
      WHERE session = ?1 ORDER BY at ASC`
  ).bind(session).all();

  return (results || []).map((row) => ({
    id: row.id,
    name: row.name || "",
    group: row.grp || "",
    token: row.token || "",
    at: row.at,
    answers: safeParse(row.answers),
  }));
}

function safeParse(s) {
  try { return JSON.parse(s) || {}; } catch { return {}; }
}

async function results(url, env) {
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
  await env.DB.prepare(`DELETE FROM responses WHERE session = ?1`).bind(session).run();
  return json({ ok: true, session });
}

/* ADMIN_KEY is a wrangler secret. If it is unset the destructive and
 * data-exporting routes stay closed rather than falling open. */
function checkKey(given, env) {
  return !!env.ADMIN_KEY && given === env.ADMIN_KEY;
}
