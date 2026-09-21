/* NextGen Portfolio Builder — the sync layer.
 *
 * Two modes, one interface. Everything above this file calls submit() and
 * results() and never needs to know which mode is live.
 *
 *   remote — CONFIG.BACKEND_URL is set. Votes POST to the worker and the
 *            presenter polls for the real room tally.
 *   demo   — no backend. The guest's own vote is kept in localStorage and
 *            blended into a seeded synthetic audience, so results screens
 *            are fully populated from the first scan.
 */
window.STORE = (function () {
  var cfg = window.CONFIG;
  var MODE = cfg.BACKEND_URL ? "remote" : "demo";
  var LS_MINE = "nextgen:mine:" + cfg.SESSION_ID;
  var LS_LOCAL_ROOM = "nextgen:room:" + cfg.SESSION_ID;
  var LS_GUEST = "nextgen:guest:" + cfg.SESSION_ID;

  /* ---- deterministic PRNG so every rehearsal sees the same baseline ---- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Real rooms cluster around a few investor types — a flat random draw
   * would make every distribution look like noise on the projector. */
  var PERSONAS = [
    { weight: 0.22,
      centres: { horizon: 1.0, maxLoss: 0.8, credit: 0.9, duration: 1.0, rank: 0.9,
                 snReturn: 1.0, snProtection: 0.8, maxPosition: 0.8, liquidity: 0.7 },
      picks: { sector: ["consumer", "healthcare", "financials"], region: ["global", "us"],
               options: ["none", "protection"], fxLong: ["usd", "chf"], fxConcern: ["brl", "eur"],
               themes: ["infra", "health", "consumer"], exclusions: ["tobacco", "defence", "illiquid"] } },
    { weight: 0.42,
      centres: { horizon: 1.8, maxLoss: 1.4, credit: 1.4, duration: 1.7, rank: 1.3,
                 snReturn: 1.4, snProtection: 1.3, maxPosition: 1.2, liquidity: 1.1 },
      picks: { sector: ["tech", "financials", "industrials"], region: ["global", "us", "europe"],
               options: ["none", "income"], fxLong: ["usd", "eur"], fxConcern: ["brl", "jpy"],
               themes: ["ai", "infra", "fintech", "health"], exclusions: ["tobacco", "fossil"] } },
    { weight: 0.24,
      centres: { horizon: 2.7, maxLoss: 2.2, credit: 2.0, duration: 2.1, rank: 1.8,
                 snReturn: 2.2, snProtection: 2.0, maxPosition: 2.0, liquidity: 1.8 },
      picks: { sector: ["tech", "healthcare", "energy"], region: ["us", "asia", "latam"],
               options: ["income", "leverage"], fxLong: ["usd", "brl"], fxConcern: ["eur", "gbp"],
               themes: ["ai", "energy", "fintech"], exclusions: ["fossil"] } },
    { weight: 0.12,
      centres: { horizon: 3.0, maxLoss: 3.0, credit: 2.7, duration: 2.6, rank: 2.6,
                 snReturn: 2.9, snProtection: 2.8, maxPosition: 2.9, liquidity: 2.4 },
      picks: { sector: ["tech", "energy"], region: ["us", "latam", "asia"],
               options: ["leverage"], fxLong: ["usd", "brl"], fxConcern: ["chf", "jpy"],
               themes: ["ai", "fintech", "energy"], exclusions: [] } }
  ];

  function pickPersona(rand) {
    var r = rand(), acc = 0;
    for (var i = 0; i < PERSONAS.length; i++) {
      acc += PERSONAS[i].weight;
      if (r <= acc) return PERSONAS[i];
    }
    return PERSONAS[PERSONAS.length - 1];
  }

  function jitter(rand, centre) {
    /* two draws ~ a soft bell, then clamp back onto the 0..3 grid */
    var noise = (rand() + rand() - 1) * 1.1;
    return Math.max(0, Math.min(3, Math.round(centre + noise)));
  }

  function syntheticRoom(size) {
    var rand = mulberry32(hashString(cfg.SESSION_ID));
    var out = [];
    for (var i = 0; i < size; i++) {
      var p = pickPersona(rand);
      var answers = {};
      window.AXES.forEach(function (axis) {
        var pool = p.picks[axis.id] || axis.options.map(function (o) { return o.v; });

        if (axis.kind === "scale") {
          answers[axis.id] = jitter(rand, p.centres[axis.id] || 1.5);
          return;
        }

        if (axis.kind === "multi") {
          /* Most people pick one or two, a few pick the cap — and on an
             opt-out axis a good share rule nothing out at all. */
          var cap = axis.max || 3;
          var want = axis.min === 0
            ? Math.floor(rand() * (Math.min(cap, pool.length) + 1))
            : 1 + Math.floor(rand() * Math.min(cap, pool.length));
          var bag = pool.slice();
          var out = [];
          while (out.length < want && bag.length) {
            out.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
          }
          answers[axis.id] = out;
          return;
        }

        answers[axis.id] = pool[Math.floor(rand() * pool.length)];
      });
      out.push({ id: "demo-" + i, answers: answers, synthetic: true });
    }
    return out;
  }

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---- local persistence ---- */
  function readJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function myResponse() { return readJSON(LS_MINE, null); }

  /* The last identity used on this device — so a guest who reloads mid-flow
   * is not asked for their name again. */
  function savedGuest() { return readJSON(LS_GUEST, null); }

  /* ---- the interface ---- */

  /* Record this guest's answers. Resolves to the submitted response.
   *
   * `guest` is { name, token, group }. A token (from a personal QR link)
   * becomes the response id, so re-scanning the same personal code updates
   * that guest's row rather than creating a second one. Without a token
   * the id is per-device. */
  function submit(answers, guest) {
    guest = guest || {};
    var prior = myResponse();
    var id = guest.token
      ? "t-" + String(guest.token).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40)
      : (prior ? prior.id : "g-" + Math.random().toString(36).slice(2, 10));

    var response = {
      id: id,
      name:  (guest.name  || "").trim().slice(0, 80),
      group: (guest.group || "").trim().slice(0, 40),
      token: (guest.token || "").slice(0, 40),
      answers: answers,
      at: Date.now()
    };
    writeJSON(LS_MINE, response);
    writeJSON(LS_GUEST, { name: response.name, group: response.group, token: response.token, fromLink: !!response.token });

    if (MODE === "demo") {
      /* Keep every vote cast on this device, so one laptop passed around
       * the room still builds a real tally. */
      var local = readJSON(LS_LOCAL_ROOM, []);
      var idx = local.findIndex(function (r) { return r.id === response.id; });
      if (idx >= 0) local[idx] = response; else local.push(response);
      writeJSON(LS_LOCAL_ROOM, local);
      return Promise.resolve(response);
    }

    return fetch(cfg.BACKEND_URL + "/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: cfg.SESSION_ID, response: response })
    }).then(function (r) {
      if (!r.ok) throw new Error("vote failed: " + r.status);
      return response;
    });
  }

  /* Every response the room has cast. Resolves to
   * { responses, real, synthetic, mode }. */
  function results() {
    if (MODE === "demo") {
      var local = readJSON(LS_LOCAL_ROOM, []);
      var synth = syntheticRoom(cfg.DEMO_ROOM_SIZE);
      return Promise.resolve({
        responses: local.concat(synth),
        real: local.length,
        synthetic: synth.length,
        mode: "demo"
      });
    }
    return fetch(cfg.BACKEND_URL + "/api/results?session=" + encodeURIComponent(cfg.SESSION_ID))
      .then(function (r) {
        if (!r.ok) throw new Error("results failed: " + r.status);
        return r.json();
      })
      .then(function (data) {
        var responses = data.responses || [];
        return { responses: responses, real: responses.length, synthetic: 0, mode: "remote" };
      });
  }

  /* Clear the tally — presenter control, between rehearsal and the real run.
   *
   * Against a live backend this needs the ADMIN_KEY set on the worker. The
   * key is never stored in config.js (that file ships to every guest): the
   * presenter is prompted once and it is held in sessionStorage for the
   * rest of the session only. */
  function reset(adminKey) {
    writeJSON(LS_LOCAL_ROOM, []);
    try { localStorage.removeItem(LS_MINE); } catch (e) {}
    if (MODE !== "remote") return Promise.resolve();

    return fetch(cfg.BACKEND_URL + "/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: cfg.SESSION_ID, key: adminKey || "" })
    }).then(function (r) {
      if (r.status === 401) throw new Error("The admin key was not accepted.");
      if (!r.ok) throw new Error("Reset failed: " + r.status);
    });
  }

  /* Every response with its identity attached, newest first — what the
   * admin board and the CSV export read. Synthetic demo rows are excluded:
   * they are scenery for the projector, never real guest data. */
  function roster() {
    return results().then(function (res) {
      return res.responses
        .filter(function (r) { return !r.synthetic; })
        .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    });
  }

  return {
    mode: MODE,
    submit: submit,
    results: results,
    roster: roster,
    reset: reset,
    myResponse: myResponse,
    savedGuest: savedGuest
  };
})();
