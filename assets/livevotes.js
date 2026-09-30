/* The room voting, live.
 *
 * Replaces an abstract flow diagram that looked impressive and told nobody
 * anything: with a handful of votes in the room it was a still picture of
 * some curves. What a room actually wants to watch is itself deciding — the
 * counter climbing, a question filling in, the split moving as the last few
 * people answer.
 *
 * So this draws the ten questions as they are answered, live, and the book
 * those answers currently build. Every number is the real aggregate.
 *
 * Painting is diff-based, like the rest of the presenter: the DOM is built
 * once and only widths, numbers and classes change afterwards. Rewriting
 * innerHTML on a three-second poll would restart every transition and flicker
 * the whole board on a projector.
 */
window.LIVEVOTES = (function () {
  "use strict";

  var host = null, built = false;
  var els = { count: null, complete: null, pending: null, rows: {}, alloc: null, bars: {} };
  var prev = { count: -1, bars: {} };

  var SECTION_OF = {
    riskProfile: "Profile", marketView: "Profile", horizon: "Profile",
    leverage: "Positioning", country: "Positioning",
    sector: "Equities", usd: "FX",
    capitalIncome: "Fixed income", duration: "Fixed income", credit: "Fixed income"
  };

  var SHORT = {
    riskProfile: "Risk appetite", marketView: "Market view", horizon: "Horizon",
    leverage: "Leverage", country: "Region", sector: "Sectors",
    usd: "Dollar share", capitalIncome: "Capital / income",
    duration: "Duration", credit: "Credit"
  };

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* A range answer has no options to tally, so it is bucketed into bands the
     room can read off a projector rather than shown as thirty columns. */
  function bands(axis) {
    var lo = axis.min, hi = axis.max, n = 5;
    var step = (hi - lo) / n, out = [];
    for (var i = 0; i < n; i++) {
      var a = lo + step * i, b = i === n - 1 ? hi : lo + step * (i + 1);
      out.push({
        key: "b" + i, lo: a, hi: b,
        label: Math.round(a) + (i === n - 1 ? "+" : "–" + Math.round(b)) +
               (axis.unit || "")
      });
    }
    return out;
  }

  /* The questionnaire's own wording is written for a phone held at arm's
     length; a few of them do not survive a narrow column on a projector. */
  var TIGHT = {
    "Energy & Materials": "Energy",
    "Investment grade": "IG",
    "High yield": "HY",
    "Capital growth": "Capital"
  };

  function buckets(axis) {
    if (axis.options && axis.options.length) {
      return axis.options.map(function (o) {
        return { key: String(o.v), label: TIGHT[o.label] || o.label };
      });
    }
    return bands(axis);
  }

  /* ---- build once ---- */

  function build() {
    var axes = window.AXES || [];
    var groups = {};
    axes.forEach(function (a) {
      var g = SECTION_OF[a.id] || "Other";
      (groups[g] = groups[g] || []).push(a);
    });

    var html =
      '<div class="lv-top">' +
        '<div class="lv-stat lv-stat-lead"><b id="lvCount">0</b><span>responses</span></div>' +
        '<div class="lv-stat"><b id="lvComplete">0</b><span>finished</span></div>' +
        '<div class="lv-stat"><b id="lvPending">0</b><span>still answering</span></div>' +
        '<div class="lv-live"><i></i>live</div>' +
      "</div>" +
      '<div class="lv-grid">';

    Object.keys(groups).forEach(function (g) {
      html += '<div class="lv-col"><div class="lv-col-head">' + esc(g) + "</div>";
      groups[g].forEach(function (a) {
        var bs = buckets(a);
        html += '<div class="lv-q" data-axis="' + esc(a.id) + '">' +
          '<div class="lv-q-top"><span>' + esc(SHORT[a.id] || a.id) + "</span>" +
          '<i data-n="' + esc(a.id) + '">0</i></div>' +
          '<div class="lv-bars">' +
            bs.map(function (b) {
              return '<div class="lv-bar" data-k="' + esc(a.id + ":" + b.key) + '">' +
                '<span class="lv-bar-l">' + esc(b.label) + "</span>" +
                '<span class="lv-bar-t"><i style="width:0"></i></span>' +
                '<b class="lv-bar-v">0</b></div>';
            }).join("") +
          "</div></div>";
      });
      html += "</div>";
    });

    html += "</div>" +
      '<div class="lv-book"><div class="lv-book-head">The book these answers build</div>' +
      '<div class="lv-alloc" id="lvAlloc"></div></div>';

    host.innerHTML = html;

    els.count = document.getElementById("lvCount");
    els.complete = document.getElementById("lvComplete");
    els.pending = document.getElementById("lvPending");
    els.alloc = document.getElementById("lvAlloc");

    host.querySelectorAll(".lv-bar").forEach(function (el) {
      els.bars[el.getAttribute("data-k")] = {
        root: el,
        fill: el.querySelector("i"),
        val: el.querySelector(".lv-bar-v")
      };
    });
    host.querySelectorAll("[data-n]").forEach(function (el) {
      els.rows[el.getAttribute("data-n")] = el;
    });

    built = true;
  }

  /* ---- tally ---- */

  function tally(agg, axis) {
    var a = agg.axes && agg.axes[axis.id];
    var out = {}, total = 0;
    if (!a) return { counts: out, total: 0, respondents: 0 };

    if (axis.options && axis.options.length) {
      Object.keys(a.counts).forEach(function (k) {
        out[k] = a.counts[k]; total += a.counts[k];
      });
    } else {
      var bs = bands(axis);
      bs.forEach(function (b) { out[b.key] = 0; });
      Object.keys(a.counts).forEach(function (k) {
        var v = Number(k);
        if (!isFinite(v)) return;
        for (var i = 0; i < bs.length; i++) {
          if (v <= bs[i].hi || i === bs.length - 1) { out[bs[i].key] += a.counts[k]; break; }
        }
        total += a.counts[k];
      });
    }
    return { counts: out, total: total, respondents: a.respondents || 0 };
  }

  /* ---- paint ---- */

  function update(agg, sim) {
    if (!host) return;
    if (!built) build();

    var count = agg ? agg.count || 0 : 0;
    var complete = agg ? agg.complete || 0 : 0;
    var landed = count > prev.count && prev.count >= 0;

    els.count.textContent = count;
    els.complete.textContent = complete;
    els.pending.textContent = Math.max(0, count - complete);
    if (landed) flash(els.count.parentNode);
    prev.count = count;

    (window.AXES || []).forEach(function (axis) {
      var t = tally(agg, axis);
      var n = els.rows[axis.id];
      if (n) n.textContent = t.respondents;

      var max = 0;
      Object.keys(t.counts).forEach(function (k) { max = Math.max(max, t.counts[k]); });

      buckets(axis).forEach(function (b) {
        var key = axis.id + ":" + b.key;
        var el = els.bars[key];
        if (!el) return;
        var v = t.counts[b.key] || 0;
        /* Scaled within the question, so the shape of the room's answer is
           legible even when only a few people have voted. */
        var pct = max > 0 ? (v / max) * 100 : 0;
        el.fill.style.width = pct + "%";
        el.val.textContent = v;
        el.root.classList.toggle("lead", v > 0 && v === max);
        if (prev.bars[key] !== undefined && v > prev.bars[key]) flash(el.root);
        prev.bars[key] = v;
      });
    });

    paintAlloc(sim);
  }

  function paintAlloc(sim) {
    if (!els.alloc) return;
    if (!sim || !sim.buckets || !sim.buckets.length) {
      els.alloc.innerHTML = '<p class="lv-wait">The book appears once the room starts answering.</p>';
      return;
    }
    var colours = {
      equities: "var(--series-equities)", fixedIncome: "var(--series-fixedincome)",
      notes: "var(--series-notes)", fx: "var(--series-cash)",
      options: "var(--series-options)"
    };
    /* Rebuilt rather than diffed: a sleeve can appear or vanish between
       polls, and at five items a repaint is cheap. */
    els.alloc.innerHTML =
      '<div class="lv-alloc-bar">' +
        sim.buckets.map(function (b) {
          return '<i style="flex:' + (b.weight || 0) + ' 0 0;background:' +
                 (colours[b.key] || "#8a94a6") + '"></i>';
        }).join("") +
      "</div>" +
      '<div class="lv-alloc-key">' +
        sim.buckets.map(function (b) {
          return "<span><s style=\"background:" + (colours[b.key] || "#8a94a6") +
                 '"></s>' + esc(b.label) + "<b>" + (b.weight || 0) + "%</b></span>";
        }).join("") +
      "</div>";
  }

  var FLASH = "lv-hit";
  function flash(el) {
    if (!el) return;
    el.classList.remove(FLASH);
    /* force a reflow so the class can be re-applied and re-animate */
    void el.offsetWidth;
    el.classList.add(FLASH);
  }

  function mount(el) {
    host = el;
    if (!host) return false;
    return true;
  }

  return { mount: mount, update: update };
})();
