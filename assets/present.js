/* NextGen Portfolio Builder — presenter view.
 *
 * Ten slides: join (QR) -> where the room landed -> the room's portfolio ->
 * the positions -> one slide per sleeve, equities through options -> the
 * room voting live. Arrow keys move; the data refreshes on a timer
 * regardless of which slide is up, so the counter keeps climbing on the join
 * screen.
 *
 * Painting is DIFF-BASED on purpose. Rewriting innerHTML on every poll
 * would reset every bar to zero and re-run the grow animation every few
 * seconds — a visible flicker on a projector. Instead the DOM is built
 * once and only widths, numbers and ordering are updated, so bars glide
 * from their old value to the new one as votes land.
 */
(function () {
  var stage   = document.querySelector(".p-stage");
  var slides  = [];
  var dots    = document.getElementById("dots");
  var current = 0;
  var last    = null;

  var built = false;      /* skeletons built? */
  var buildFailed = false;
  var splitRows = {};     /* portfolio id -> { root, fill, val, name } */
  var lastVerdictId = null;

  /* A rounded number, to as many places as asked; an em dash when there is
     nothing to round. Lives beside esc() because every board needs both. */
  function pc(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "\u2014";
    var f = Math.pow(10, d === undefined ? 1 : d);
    return Math.round(x * f) / f;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  /* ---------- QR ---------- */
  /* The guest URL is this page's own origin and path with present.html
     stripped, so the QR is right wherever the site is deployed and there
     is nothing to configure by hand. */
  function guestUrl() {
    /* This page's own address is the DEFAULT, not the fallback.
     *
     * Pointing the QR at a hard-coded domain means the one thing the whole
     * event depends on is a constant that can go stale in a cached copy of
     * this file — which is exactly what happened: the projector kept sending
     * the room to a domain that was down. Serving the guests from wherever
     * the projector itself is being served from cannot go stale, because
     * both come out of the same deployment.
     *
     * CONFIG.GUEST_URL still overrides it, for the case it was written for:
     * a short branded domain the room can also type. Set it only when that
     * domain is known good. */
    var cfg = (window.CONFIG || {}).GUEST_URL;
    if (cfg) return cfg.replace(/\/+$/, "") + "/";
    var u = window.location.href.split("?")[0].split("#")[0];
    return u.replace(/present\.html?$/, "").replace(/\/$/, "") + "/";
  }

  function renderQR() {
    /* The address IS printed now, small, under the code.
     *
     * A stale GUEST_URL in a cached copy of this page sent the room to a
     * domain that was down, and nothing on screen said so — the QR looked
     * fine and failed only in the guests' hands. Printing where it actually
     * points makes that visible from the lectern in one glance. */
    var url = guestUrl();
    console.log("[NextGen] guest URL:", url);
    new QRCode(document.getElementById("qr"), {
      text: url,
      width: 330,
      height: 330,
      colorDark: "#0A1220",
      colorLight: "#ffffff",
      /* High correction: still scans from the back of the room, and
         survives a projector washing out the contrast. */
      correctLevel: QRCode.CorrectLevel.H
    });
    var out = document.getElementById("qrUrl");
    if (out) out.textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  /* ---------- skeletons, built once ---------- */

  function buildSkeletons() {
    /* --- split bars: one stable row per portfolio, reordered by CSS --- */
    var host = document.getElementById("splitBars");
    host.innerHTML = "";
    window.PORTFOLIOS.forEach(function (p) {
      var row = el("div", "p-bar");
      row.innerHTML =
        '<div class="p-bar-name">' + esc(p.name) + "</div>" +
        '<div class="p-bar-track"><i class="p-bar-fill" style="width:0"></i></div>' +
        '<div class="p-bar-val">0%</div>';
      host.appendChild(row);
      splitRows[p.id] = {
        root: row,
        fill: row.querySelector(".p-bar-fill"),
        val:  row.querySelector(".p-bar-val")
      };
    });

    built = true;
  }

  function registerSlides() {
    slides = Array.prototype.slice.call(document.querySelectorAll(".p-slide"));
    dots.innerHTML = "";
    slides.forEach(function (_, i) {
      var d = document.createElement("i");
      d.addEventListener("click", function () { go(i); });
      dots.appendChild(d);
    });
  }

  /* ---------- painting ---------- */

  function paint(res) {
    last = res;
    var agg = res.agg;

    document.getElementById("liveCount").textContent = agg.count;
    var badge = document.getElementById("modeBadge");
    badge.hidden = res.mode !== "demo";
    if (res.mode === "demo") {
      /* Say which of the two demo-mode situations this is: a synthetic
         audience padding the screens, or simply no backend yet. */
      badge.textContent = res.synthetic
        ? "Demo · " + res.real + " live + " + res.synthetic + " simulated"
        : "No backend · this device only";
    }

    /* The live board is the one screen that must be up BEFORE anyone has
       answered: the room needs to see the empty grid so it can watch itself
       fill it in. Every other slide waits for data; this one is the data
       arriving. */
    paintLive(agg);

    if (!agg.count) {
      /* Before the room has answered, these slides are on the projector
         with nothing in them. Say what they are waiting for rather than
         showing a blank screen that reads as a broken deck. */
      showWaiting();
      return;
    }
    clearWaiting();
    if (!built) {
      if (buildFailed) return;   /* do not retry a build that already threw */
      buildSkeletons();
    }

    var roomProfile = window.ENGINE.aggProfile(agg);
    var split = window.ENGINE.aggSplit(agg);
    var topBand = window.ENGINE.rank(roomProfile)[0];
    paintSplit(split, topBand && topBand.portfolio
      ? window.ENGINE.roomConsensus(agg, topBand.portfolio.id) : null);
    var vSim = null;
    if (window.PRODUCTS) {
      try { vSim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS); } catch (e) { vSim = null; }
    }
    paintVerdict(window.ENGINE.rank(roomProfile)[0], agg.count, vSim, agg);
    var alloc = window.ENGINE.roomAllocation(agg);
    /* No "why" on the projector. The presenter is making that case out loud;
       on screen it only competes with the numbers. */
    paintBook(agg);
    /* A throw inside one board used to leave that slide blank with nothing
       said anywhere — the kind of failure you only find by looking at the
       projector. */
    try { paintSleeves(agg, alloc); }
    catch (e) { console.error("present: sleeve boards failed", e); }
  }

  var WAITING = [
    ["splitBars", "Each guest is matched on their own answers. The split appears here as they finish."],
    ["verdict",   "Every answer averaged into one profile, then matched. Waiting on the room."],
    ["book",      "The book the room's answers build. Waiting on the room."],
    ["sleeveEquities",    "Why the equity sleeve is the size it is, and why these funds. Waiting on the room."],
    ["sleeveFixedIncome", "Why the fixed-income sleeve is the size it is, and why these bonds. Waiting on the room."],
    ["sleeveNotes",       "Why the notes sleeve is the size it is, and why these structures. Waiting on the room."],
    ["sleeveFx",          "Why the FX sleeve is the size it is, and why these pairs. Waiting on the room."]
  ];

  function showWaiting() {
    WAITING.forEach(function (w) {
      var host = document.getElementById(w[0]);
      if (host && !host.getAttribute("data-waiting")) {
        host.setAttribute("data-waiting", "1");
        host.innerHTML = '<p class="p-waiting">' + esc(w[1]) + "</p>";
      }
    });
  }

  function clearWaiting() {
    WAITING.forEach(function (w) {
      var host = document.getElementById(w[0]);
      if (host && host.getAttribute("data-waiting")) {
        host.removeAttribute("data-waiting");
        host.innerHTML = "";
      }
    });
  }

  function paintSplit(split, con) {
    var top = 0;
    split.forEach(function (row) { top = Math.max(top, row.count); });

    split.forEach(function (row, i) {
      var r = splitRows[row.portfolio.id];
      if (!r) return;
      /* Risk order, fixed. The rows used to be re-ordered by share, which
         turned the ladder into a leaderboard and hid the shape of a split
         room; see ENGINE.aggSplit(). */
      r.root.style.order = i;
      r.root.classList.toggle("lead", row.count > 0 && row.count === top);
      r.root.classList.toggle("none", row.count === 0);
      r.fill.style.width = row.pct + "%";     /* CSS transition does the rest */
      r.val.innerHTML = row.pct + "%";
    });

    /* The same sentence as the verdict slide, where the split is visible
       rather than inferred: if the room has two poles, name them here. */
    var sub = document.getElementById("splitSub");
    if (sub) {
      sub.innerHTML = con && (con.empty || con.divided)
        ? "Every guest matched on their own answers. <b>The room has two poles</b> &mdash; " +
          con.poles.map(function (x) { return x.pct + "% " + esc(x.name); }).join(" and ") +
          " &mdash; so the average lands between them."
        : "Every guest matched on their own answers.";
    }
  }

  /* The sleeves the book actually has. This listed "cash", which the desk's
     books do not hold, and omitted FX, which they do — so the verdict slide
     printed Cash 0% and silently dropped a 22% FX sleeve out of the bar. */
  function ALLOC_KEYS(alloc) {
    var all = [
      { k: "equities",    label: "Equities",         c: "var(--series-equities)" },
      { k: "fixedIncome", label: "Fixed income",     c: "var(--series-fixedincome)" },
      { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
      { k: "fx",          label: "FX",               c: "var(--series-cash)" },
      { k: "options",     label: "Options",          c: "var(--series-options)" },
      { k: "cash",        label: "Cash",             c: "var(--muted)" }
    ];
    if (!alloc) return all.slice(0, 4);
    return all.filter(function (x) { return (alloc[x.k] || 0) > 0; });
  }

  /* An average is not a member.
   *
   * The room's band is the average of everyone's answers, which is the right
   * way to build ONE portfolio for a room. But a room split between two
   * poles averages into a middle nobody picked, and the projector would then
   * show "Moderate" on this slide and "Moderate 0%" on the one before it
   * with nothing to join them up. Said plainly here, it becomes the most
   * interesting thing on the slide instead of the thing someone catches. */
  function consensusNote(con) {
    if (!con || (!con.empty && !con.divided)) return "";
    var poles = con.poles.map(function (x) {
      return x.pct + "% " + esc(x.name);
    }).join(" and ");

    return '<p class="p-consensus">' +
      (con.empty
        ? "<b>No guest landed here on their own answers.</b> The room splits " +
          poles + " \u2014 this band is the average of those views, not one " +
          "anyone holds."
        : "<b>Only " + con.inWinnerPct + "% of the room landed here individually.</b> " +
          "The rest splits " + poles + "; this band is where their answers average.") +
      "</p>";
  }

  /* The five bands, with the one the room landed on lit up.
   *
   * There is a lot of slide under the band name, and this is the thing worth
   * putting in it: the room does not get a portfolio assembled from scratch,
   * it gets one of five books the desk has written, and the ladder shows
   * both that fact and where this room sits on it. Each rung carries its own
   * funded split, so the shape of the answer is visible without leaving the
   * slide. */
  function bandLadder(selectedId) {
    var bands = (window.BANDS && window.BANDS.bands) || [];
    if (bands.length < 2) return "";

    return '<div class="p-ladder">' + bands.map(function (b) {
      var c = b.capital || {};
      var on = b.id === selectedId;
      var parts = [
        ["equities", c.equities], ["fixedIncome", c.fixedIncome], ["notes", c.notes]
      ].filter(function (x) { return x[1]; });

      return '<div class="p-rung' + (on ? " on" : "") + '">' +
        '<span class="p-rung-n">' + esc(b.name) + "</span>" +
        '<span class="p-rung-bar">' +
          parts.map(function (x) {
            return '<i style="width:' + pc(x[1], 1) + "%;background:" +
              BUCKET_COLOUR[x[0]] + '"></i>';
          }).join("") +
        "</span>" +
        '<span class="p-rung-g">' + pc(b.grossExposure, 0) + "%</span>" +
      "</div>";
    }).join("") +
    '<p class="p-ladder-note">Five books, written by the desk. The bars are the ' +
    'funded split of each; the figure on the right is its gross exposure once the ' +
    'options and the FX overlay are counted.</p></div>';
  }

  function paintVerdict(top, n, sim, agg) {
    var p = top.portfolio;
    var host = document.getElementById("verdict");
    var keys = ALLOC_KEYS();

    /* The allocation the room actually gets, which is the book's, not the
       band's target. These were different numbers on two slides of the same
       deck: this one read the band's headline split while the sleeve slides
       read the desk's book. */
    var alloc = (sim && sim.alloc) || p.alloc;
    var lev = sim ? window.ENGINE.leverageDisclosure(sim.alloc) : null;
    keys = ALLOC_KEYS(alloc);
    var con = agg ? window.ENGINE.roomConsensus(agg, p.id) : null;

    /* Only rebuild when the winning portfolio actually changes — otherwise
       just refresh the numbers that move. */
    /* The note depends on the room, not just on the book, so it joins the
       cache key \u2014 otherwise it would freeze at whatever the first paint saw. */
    var key = p.id + ":" + JSON.stringify(alloc) + ":" +
              (con ? con.inWinner + "/" + con.total : "");
    if (lastVerdictId !== key) {
      lastVerdictId = key;
      host.innerHTML =
        "<div>" +
          "<h1>" + esc(p.name) + "</h1>" +
          '<p class="tagline">' + esc(p.tagline) + "</p>" +
          consensusNote(con) +
          bandLadder(p.id) +
        "</div>" +
        "<div>" +
          '<div class="p-fit"><b id="vFit">0</b><span>fit out of 100<br><span id="vN">0</span> responses</span></div>' +
          '<div class="alloc-bar">' +
            keys.map(function (x) {
              return '<i style="flex:' + (alloc[x.k] || 0) + ' 0 0;background:' + x.c + '"></i>';
            }).join("") +
          "</div>" +
          '<div class="legend">' +
            keys.map(function (x) {
              return '<div><s style="background:' + x.c + '"></s>' + x.label +
                     "<b>" + (alloc[x.k] || 0) + "%</b></div>";
            }).join("") +
          "</div>" +
          (lev ? '<p class="p-verdict-gross">' + esc(lev.headline) + "</p>" : "") +
          riskStrip(p) +
        "</div>";
    }
    var f = document.getElementById("vFit");
    var c = document.getElementById("vN");
    if (f) f.textContent = top.fit;
    if (c) c.textContent = n;
  }

  /* Headline risk numbers plus the top holdings — enough for the room to
     see what the portfolio actually is, without a table nobody can read
     from the back. */
  function riskStrip(p) {
    /* Expected return and volatility only.
     *
     * Max drawdown and running yield are band-level illustrations, like the
     * bull / base / bear strip that used to sit under them: neither is
     * produced by this room's book, and a precise "-14.0%" beside the
     * room's own allocation reads as a number the engine computed for it. */
    var out = '<dl style="margin:22px 0 0">' +
      '<div class="kv"><dt>Expected return</dt><dd>' + esc(p.expReturn) + "</dd></div>" +
      '<div class="kv"><dt>Volatility</dt><dd>' + esc(p.vol) + "</dd></div>";
    out += "</dl>";

    /* No bull / base / bear strip. Those three numbers are a band-level
       illustration, not anything this room's book produces, and sitting
       under the room's own allocation they read as a forecast of it. The
       expected-return and drawdown rows above already carry the shape of
       the risk without implying a path. */

    return out;
  }

  var BUCKET_COLOUR = {
    equities:    "var(--series-equities)",
    fixedIncome: "var(--series-fixedincome)",
    notes:       "var(--series-notes)",
    fx:          "var(--series-cash)",
    options:     "var(--series-options)"
  };

  /* The room's book, one column per bucket. Repainted wholesale rather
     than diffed: it changes shape as answers land, since a sleeve can
     appear or drop out, and at four columns a repaint is cheap. */
  /* The second line under a holding, where the column can afford one. Terms
     the room would otherwise have to wait for the sleeve slide to see. */
  function bits(parts) {
    return parts.filter(function (x) { return x; }).map(esc).join(" \u00b7 ");
  }
  var HOLD_META = {
    notes: function (l) {
      var it = l.item;
      return bits([it.tenor, it.barrier ? "barrier " + it.barrier : null, it.coupon]);
    },
    fx: function (l) {
      var it = l.item, u = (it.analytics || {}).usdExposure;
      return bits([it.kind,
        u === null || u === undefined ? null : (u >= 50 ? "USD long" : "USD short")]);
    },
    equities: function (l) {
      var a = l.item.analytics || {};
      if (l.overlay) {
        return bits([l.item.strategy || "Option",
          l.item.moneyness ? pc(l.item.moneyness * 100, 0) + "% strike" : null]);
      }
      return bits([SECTOR_WORD[a.sector] || a.sector,
        a.region === "em" ? "EM" : "Developed"]);
    },
    fixedIncome: function (l) {
      var it = l.item, a = it.analytics || {};
      return bits([it.rating, it.country,
        a.yieldToWorst ? fxn(a.yieldToWorst, 2) + "% YTW" : null]);
    }
  };

  /* The whole book, every line of it.
   *
   * This slide used to show the first five of each sleeve and a "+N more"
   * note pointing at the sleeve slides. The room asked to see exactly what
   * it had bought, so it now lists all of it: four columns, one row per
   * position, sized so thirty-odd lines fit a projector without scrolling.
   *
   * Above it, the one thing the weights needed stating outright — which part
   * of the book is the client's capital and which part is notional taken on
   * top of it.
   */
  function paintBook(agg) {
    var host = document.getElementById("book");
    paintGearing(agg);
    if (!window.PRODUCTS) {
      host.innerHTML = '<p class="p-book-empty">Product shelf not loaded.</p>';
      return;
    }
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) { host.innerHTML = ""; return; }

    var alloc = sim.alloc || {};
    var cap = alloc.capital || {};
    var nt = alloc.notional || {};

    /* Funded capital first, always summing to 100, then what sits on top.
       One bar, two halves, so nobody has to add the sleeves up themselves. */
    var capRows = [
      ["equities", "Cash equities", cap.equities],
      ["fixedIncome", "Fixed income", cap.fixedIncome],
      ["notes", "Structured notes", cap.notes]
    ].filter(function (r) { return r[2]; });
    var ntRows = [
      ["options", "Equity options", nt.equityOptions],
      ["fx", "FX overlay", nt.fx]
    ].filter(function (r) { return r[2]; });

    var capTotal = capRows.reduce(function (t, r) { return t + r[2]; }, 0);
    var ntTotal = ntRows.reduce(function (t, r) { return t + r[2]; }, 0);

    function seg(rows, total) {
      return rows.map(function (r) {
        return '<i style="width:' + pc((r[2] / (total || 1)) * 100, 2) +
          "%;background:" + (BUCKET_COLOUR[r[0]] || "#888") + '"></i>';
      }).join("");
    }
    function keys(rows) {
      return rows.map(function (r) {
        return '<span class="p-key"><i style="background:' +
          (BUCKET_COLOUR[r[0]] || "#888") + '"></i>' + esc(r[1]) +
          "<b>" + pc(r[2], 1) + "%</b></span>";
      }).join("");
    }

    var band = capRows.length
      ? '<div class="p-capital">' +
          '<div class="p-cap-side">' +
            '<div class="p-cap-h"><small>Capital</small><b>' + pc(capTotal, 0) + "%</b></div>" +
            '<div class="p-cap-bar">' + seg(capRows, capTotal) + "</div>" +
            '<div class="p-cap-keys">' + keys(capRows) + "</div>" +
          "</div>" +
          (ntRows.length
            ? '<div class="p-cap-side p-cap-nt">' +
                '<div class="p-cap-h"><small>Notional on top</small><b>+' +
                  pc(ntTotal, 1) + "%</b></div>" +
                '<div class="p-cap-bar">' + seg(ntRows, ntTotal) + "</div>" +
                '<div class="p-cap-keys">' + keys(ntRows) + "</div>" +
              "</div>"
            : "") +
        "</div>"
      : "";

    var cols = sim.buckets.map(function (b) {
      var colour = BUCKET_COLOUR[b.key];
      var widest = b.lines.reduce(function (m, l) { return Math.max(m, l.weight); }, 0) || 1;
      var n = b.lines.length;

      /* A sleeve of four structures has room on this slide that a sleeve of
         fifteen funds does not, so it spends it on the terms rather than on
         air: what the structure pays, what the currency position is. */
      var meta = n <= 8 ? HOLD_META[b.key] : null;

      var lines = n
        ? b.lines.map(function (l) {
            var m = meta ? meta(l) : "";
            return '<div class="p-hold' + (l.overlay ? " p-hold-ovl" : "") +
              (m ? " p-hold-2" : "") + '">' +
              '<span class="p-hold-tk">' + esc(l.item.ticker || "") + "</span>" +
              '<span class="p-hold-nm">' + esc(l.item.name) + "</span>" +
              '<span class="p-hold-w">' + fxn(l.weight, 1) + "</span>" +
              (m ? '<span class="p-hold-meta">' + m + "</span>" : "") +
              '<i class="p-hold-bar" style="width:' +
                pc((l.weight / widest) * 100, 1) + "%;background:" + colour + '"></i>' +
            "</div>";
          }).join("")
        : '<p class="p-book-empty">Nothing here.</p>';

      /* A sleeve of fifteen lines in a quarter of the slide forces type
         nobody can read from the back. It gets a double-width column and
         flows its holdings into two, so every sleeve can use the same
         comfortable row height instead of the longest one setting it. */
      return '<div class="p-bucket' +
        (n > 10 ? " p-bucket-wide" : n <= 6 ? " p-bucket-roomy" : "") + '">' +
        '<div class="p-bucket-top"><s style="background:' + colour + '"></s>' +
        "<h3>" + esc(b.label) + "</h3>" +
        '<em>' + n + "</em></div>" +
        '<div class="p-bucket-w">' + pc(b.weight, 1) + "<i>%</i>" +
          (b.key === "fx" || (b.key === "equities" && b.weightOptions)
            ? '<u>gross</u>' : "") +
        "</div>" +
        '<div class="p-holds">' + lines + "</div></div>";
    }).join("");

    host.innerHTML = band + '<div class="p-buckets">' + cols + "</div>";
  }

  /* A geared book is shown at its gross weight, so the slide has to say so.
     Printed once, under the positions, rather than on every sleeve. */
  function paintGearing(agg) {
    var host = document.getElementById("gearing");
    if (!host) return;
    var lev = null;
    try {
      var sim = window.PRODUCTS ? window.ENGINE.roomPortfolio(agg, window.PRODUCTS) : null;
      lev = window.ENGINE.leverageDisclosure(
        (sim && sim.alloc) || window.ENGINE.roomAllocation(agg));
    } catch (e) { lev = null; }
    if (!lev) { host.innerHTML = ""; host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML =
      '<b>' + esc(lev.headline) + ".</b> " + esc(lev.short);
  }

  /* ---------- why this portfolio ----------
   *
   * A plain-language read of what the room said and which of those views
   * actually moved the allocation. Every number comes from the same
   * aggregate and the same ENGINE.roomAllocation() the book is built
   * from; nothing here is a separate model.
   */

  function band(v, cuts, words) {
    for (var i = 0; i < cuts.length; i++) if (v < cuts[i]) return words[i];
    return words[words.length - 1];
  }

  /* One sentence describing the room, built from its own averages. */
  function describeRoom(alloc) {
    var d = alloc.drivers;
    var risk = band(d.risk, [0.7, 1.35], ["cautious", "moderately positioned", "risk-seeking"]);
    var hor  = band(d.horizon, [6, 13], ["short-dated", "medium-term", "long-term"]);
    var view = band(d.view, [0.7, 1.35], ["bearish", "neutral", "bullish"]);

    var lead = alloc.equities >= alloc.fixedIncome ? "equity-led" : "income-led";
    var tail = alloc.equities >= alloc.fixedIncome
      ? (alloc.fixedIncome >= 25 ? "with real fixed-income ballast behind it"
                                 : "with little ballast behind it")
      : (alloc.equities >= 25 ? "with a meaningful equity sleeve alongside"
                              : "with equities kept small");

    return "The room was " + risk + ", " + hor + " and " + view +
           ". That produced " + (lead === "equity-led" ? "an " : "an ") + lead +
           " portfolio " + tail + ".";
  }

  /* Which views actually moved the allocation, and where. The magnitudes
     mirror the coefficients in roomAllocation(): risk carries 0.60 of the
     equity share, income pulls 0.16 out of it, and so on. */
  function drivers(alloc) {
    var d = alloc.drivers;
    var out = [];

    out.push({ mag: Math.abs(d.risk - 1) * 0.60,
               up: d.risk >= 1,
               label: (d.risk >= 1 ? "Risk appetite" : "Caution"),
               to: d.risk >= 1 ? "Equities" : "Fixed income" });

    out.push({ mag: Math.min(0.10, Math.abs(d.horizon - 10) / 20 * 0.10),
               up: d.horizon >= 10,
               label: d.horizon >= 10 ? "Long horizon" : "Short horizon",
               to: d.horizon >= 10 ? "Equities" : "Fixed income" });

    out.push({ mag: Math.abs(d.view - 1) * 0.08,
               up: d.view >= 1,
               label: d.view >= 1 ? "Bullish view" : "Bearish view",
               to: d.view >= 1 ? "Equities" : "Fixed income" });

    if (d.income > 0.15) {
      out.push({ mag: d.income * 0.16, up: true,
                 label: "Income preference", to: "Fixed income" });
    }
    if (d.levered > 0.15) {
      out.push({ mag: d.levered * 0.14, up: true,
                 label: "Leverage appetite", to: "Structured notes" });
    }
    var dollarPull = Math.abs(d.usd - 50) / 50;
    if (dollarPull > 0.35) {
      out.push({ mag: dollarPull * 0.12, up: true,
                 label: d.usd >= 50 ? "Dollar conviction" : "Away from the dollar",
                 to: "FX" });
    }

    /* Only what actually moved the needle, strongest first. */
    return out.filter(function (x) { return x.mag > 0.02; })
              .sort(function (a, b) { return b.mag - a.mag; })
              .slice(0, 3);
  }

  /* Where the room genuinely agreed. A 51/49 split is not consensus, so
     the bar is a clear majority on a question that has a winner. */
  function conviction(agg) {
    var out = [];
    window.AXES.forEach(function (axis) {
      var dist = window.ENGINE.aggDistribution(agg, axis.id);
      if (!dist.respondents) return;
      var top = dist.bars.slice().sort(function (a, b) { return b.pct - a.pct; })[0];
      if (!top || top.pct < 60) return;
      /* A multi axis lets everyone pick three, so a high share there is a
         weaker signal; hold it to a higher bar. */
      if (axis.kind === "multi" && top.pct < 70) return;
      out.push({ pct: top.pct, label: top.label, axis: axis.id });
    });
    return out.sort(function (a, b) { return b.pct - a.pct; }).slice(0, 3);
  }

  /* The one question the room was most split on, among the ones that
     actually change the book. */
  function divided(agg) {
    var WATCH = ["credit", "capitalIncome", "country", "riskProfile", "marketView", "leverage"];
    var worst = null;
    WATCH.forEach(function (id) {
      var axis = window.AXIS_BY_ID[id];
      if (!axis) return;
      var dist = window.ENGINE.aggDistribution(agg, id);
      if (dist.respondents < 4) return;
      var bars = dist.bars.slice().sort(function (a, b) { return b.pct - a.pct; });
      if (bars.length < 2 || !bars[1].pct) return;
      var gap = bars[0].pct - bars[1].pct;
      if (bars[0].pct > 55 || gap > 15) return;      /* someone clearly won */
      if (!worst || gap < worst.gap) {
        worst = { gap: gap, a: bars[0].label, b: bars[1].label, label: axis.label };
      }
    });
    return worst;
  }

  function renderWhy(agg, alloc, split) {
    var host = document.getElementById("why");
    if (!agg.count) { host.innerHTML = ""; return; }

    /* Too few people to claim anything about a room. */
    var thin = agg.count < 4;

    var drv = drivers(alloc);
    var conv = thin ? [] : conviction(agg);
    var div = thin ? null : divided(agg);

    /* The averaged profile can look calm while the individuals did not. */
    var lead = split && split[0];
    var dispersed = !thin && lead && lead.pct < 35;

    host.innerHTML =
      '<div class="p-why-head">Why this portfolio</div>' +
      '<p class="p-why-line">' + esc(describeRoom(alloc)) +
        (dispersed ? ' <b>The average looks settled. The room was not.</b>' : "") + "</p>" +

      '<div class="p-why-grid">' +
        '<div class="p-why-col">' +
          '<div class="p-why-sub">What moved it</div>' +
          drv.map(function (x) {
            return '<div class="p-drv"><span class="p-arw">' + (x.up ? "&uarr;" : "&darr;") +
              "</span><span>" + esc(x.label) + '</span><b>' + esc(x.to) + "</b></div>";
          }).join("") +
        "</div>" +

        '<div class="p-why-col">' +
          (conv.length
            ? '<div class="p-why-sub">Strongest conviction</div>' +
              '<div class="p-conv">' + conv.map(function (c) {
                return "<span>" + esc(c.label) + ' <i>' + c.pct + "%</i></span>";
              }).join('<em>·</em>') + "</div>"
            : '<div class="p-why-sub">Conviction</div><div class="p-conv p-weak">' +
              (thin ? "Too few responses to call it yet" : "No clear majority anywhere") + "</div>") +
          (div
            ? '<div class="p-why-sub" style="margin-top:14px">Most divided</div>' +
              '<div class="p-conv">' + esc(div.a) + ' <em>vs</em> ' + esc(div.b) + "</div>"
            : "") +
        "</div>" +
      "</div>";
  }


  /* ---------- one slide per sleeve ----------
   *
   * A table, not an argument. These slides used to spend half their width
   * explaining why each line was chosen, which is a conversation the
   * presenter is having out loud anyway — on screen it just crowded out the
   * holdings themselves and made the numbers hard to read.
   *
   * So each sleeve now shows what a desk would actually put in front of a
   * client: the weighted characteristics of the sleeve across the top, then
   * every position underneath with the columns that matter for that asset
   * class. Different asset classes get different columns, because a bond and
   * an FX forward have nothing in common worth tabulating.
   */
  var SLEEVE_SLIDES = [
    { key: "equities",    host: "sleeveEquities",    badge: "swEquities" },
    { key: "fixedIncome", host: "sleeveFixedIncome", badge: "swFixedIncome" },
    { key: "notes",       host: "sleeveNotes",       badge: "swNotes" },
    { key: "fx",          host: "sleeveFx",          badge: "swFx" }
  ];

  function an(it) { return (it && it.analytics) || {}; }

  /* Weighted by position, over the lines that actually carry the field. The
     share of the sleeve each average covers is returned with it, because an
     average over half a sleeve is a different claim from one over all of it. */
  function wavg(lines, get) {
    var num = 0, den = 0, total = 0;
    lines.forEach(function (l) {
      var w = l.weight || 0; total += w;
      var v = get(l);
      if (v === null || v === undefined || !isFinite(v)) return;
      num += w * v; den += w;
    });
    return { value: den > 0 ? num / den : null, coverage: total > 0 ? den / total : 0 };
  }

  function wshare(lines, test) {
    var hit = 0, total = 0;
    lines.forEach(function (l) {
      var w = l.weight || 0; total += w;
      if (test(l)) hit += w;
    });
    return total > 0 ? (hit / total) * 100 : 0;
  }

  /* Top few of something, by weight: countries for bonds, sectors for equity. */
  function topBy(lines, get, n) {
    var acc = {}, total = 0;
    lines.forEach(function (l) {
      var k = get(l); var w = l.weight || 0; total += w;
      if (k === null || k === undefined || k === "") return;
      acc[k] = (acc[k] || 0) + w;
    });
    return Object.keys(acc)
      .sort(function (a, b) { return acc[b] - acc[a]; })
      .slice(0, n || 4)
      .map(function (k) {
        return { key: k, pct: total > 0 ? (acc[k] / total) * 100 : 0 };
      });
  }

  /* ---- tear-sheet primitives -------------------------------------------
   *
   * These slides are read off a projector by people who read desk sheets for
   * a living, so they are built like one rather than like a web table: a
   * ticket line naming the sleeve and its size, a band of key figures with
   * the unit set apart from the number, the positions themselves, and the
   * one exposure that matters for that asset class as a single bar.
   *
   * Each sleeve declares its COLUMNS once, and both layouts are derived from
   * that declaration — see render() for why there are two.
   */

  /* A figure and its unit are deliberately different sizes: the eye lands on
     the number and picks the unit up afterwards, the way a term sheet reads.
     `sub` is for the caveat that would otherwise go unsaid — an average over
     half a sleeve is a different claim from one over all of it. */
  function fig(label, value, unit, sub) {
    return '<div class="p-fig"><small>' + label + "</small><b>" +
      (value === null || value === undefined ? "—" : value) +
      (unit ? '<span class="p-u">' + unit + "</span>" : "") + "</b>" +
      (sub ? "<i>" + sub + "</i>" : "") + "</div>";
  }

  /* Always the same number of decimals, or a monospaced column stops lining
     up the moment one weight is a round number. */
  function fxn(x, d) {
    return (x === null || x === undefined || !isFinite(x))
      ? "—" : Number(x).toFixed(d === undefined ? 1 : d);
  }

  function pctOr(v, suffix) {
    return (v === null || v === undefined || !isFinite(v))
      ? "—" : pc(v, 0) + (suffix === undefined ? "%" : suffix);
  }

  function tick(t) { return t ? '<span class="p-tk">' + esc(t) + "</span>" : ""; }

  /* The one breakdown that matters for this asset class, as a single bar.
     Whatever is not in the top few is kept as a final segment rather than
     dropped: a bar that stops short of the end reads as missing data. */
  function expo(label, list, fmt) {
    if (!list || !list.length) return "";
    var used = list.reduce(function (t, x) { return t + x.pct; }, 0);
    var segs = list.map(function (x, i) { return { key: x.key, pct: x.pct, i: i + 1 }; });
    if (used < 99.4) segs.push({ key: null, pct: 100 - used, i: 0 });

    var bar = segs.map(function (x) {
      return '<i class="p-seg s' + x.i + '" style="width:' + pc(x.pct, 2) + '%"></i>';
    }).join("");
    var keys = list.map(function (x, i) {
      return '<span class="p-key"><i class="s' + (i + 1) + '"></i>' +
        esc(fmt ? fmt(x.key) : x.key) + "<b>" + pc(x.pct, 1) + "%</b></span>";
    }).join("");

    return '<div class="p-expo"><small>' + label + "</small>" +
      '<div class="p-expo-bar">' + bar + "</div>" +
      '<div class="p-expo-keys">' + keys + "</div></div>";
  }

  /* Credit quality is the first thing anyone looks for on a bond line, so it
     is placed on the ladder and coloured rather than left as plain text. */
  function rateHtml(r, cls) {
    if (!r) return "—";
    var h = String(r).toUpperCase().replace(/[^A-Z]/g, "");
    var tier = /^AAA/.test(h) ? "t1" : /^AA/.test(h) ? "t2" : /^A/.test(h) ? "t3"
             : /^BBB/.test(h) ? "t4" : /^BB/.test(h) ? "t5"
             : /^B/.test(h) || /^C/.test(h) ? "t6" : "t0";
    return '<span class="p-rate ' + tier + '">' + esc(r) + "</span>" +
      (cls ? '<em class="p-pillx">' + cls.toUpperCase() + "</em>" : "");
  }

  function sideHtml(u) {
    if (u === null || u === undefined) return "—";
    return '<span class="p-side ' + (u >= 50 ? "long" : "short") + '">' +
      (u >= 50 ? "USD long" : "USD short") + "</span>";
  }

  var SECTOR_WORD = {
    core: "Broad market", tech: "Technology", financials: "Financials",
    healthcare: "Healthcare", energy: "Energy & materials",
    consumer: "Consumer", industrials: "Industrials"
  };

  function maxw(lines) {
    return lines.reduce(function (m, l) { return Math.max(m, l.weight || 0); }, 0);
  }

  /* ---- one declaration, two layouts ------------------------------------
   *
   * Four structures or three currency positions do not fill a projector as a
   * table: they leave two thirds of the slide empty, which reads as missing
   * data rather than as a short list. So a sleeve of seven lines or fewer is
   * laid out as cards and a longer one as a table — the same facts either
   * way, because both are generated from the same column spec.
   *
   * A column is { head, get, num, role }. `role` is what the cards do with
   * it: "tag" the ticker chip, "title" the heading, "sub" the line under it,
   * and anything else becomes a labelled row inside the card.
   */
  var CARD_MAX = 7;

  function render(b, figs, cols, foot, cardFn) {
    var lines = b.lines || [];
    return '<div class="p-figs">' + figs + "</div>" +
      (lines.length > CARD_MAX ? asTable(lines, cols)
                               : (cardFn || asCards)(lines, cols)) +
      (foot || "");
  }

  function cardGrid(lines, inner) {
    return '<div class="p-cards" style="--n:' + Math.min(lines.length, 4) + '">' +
      lines.map(inner).join("") + "</div>";
  }

  /* The weight track every card ends on. */
  function cardFoot(l, mx, label) {
    var pct = mx > 0 ? Math.max(3, (l.weight / mx) * 100) : 0;
    return '<div class="p-cd-foot">' +
      "<span>" + fxn(l.weight, 1) + "% " + label + "</span>" +
      '<i class="p-cd-track"><b style="width:' + pc(pct, 1) + '%"></b></i>' +
    "</div>";
  }

  /* ---- structured notes, as term sheets --------------------------------
   *
   * The generic card put the type in the headline and the coupon in a row
   * of key-values, which is backwards: nobody asks what kind of note it is
   * before asking what it pays and how far the underlying can fall first.
   * So the coupon is the headline, the underlying is the title, and the
   * barrier is drawn rather than stated — the distance to it is the whole
   * risk of the structure and a number alone does not show it.
   */
  function barrierPct(b) {
    var m = /(\d{2,3})/.exec(String(b || ""));
    return m ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : null;
  }

  function notesCards(lines) {
    var mx = maxw(lines);
    return cardGrid(lines, function (l) {
      var it = l.item;
      var bar = barrierPct(it.barrier);
      var cpn = String(it.coupon || "").trim();
      var cpnNum = /^[\d.]+%/.exec(cpn);

      return '<div class="p-cd p-cd-note">' +
        '<div class="p-cd-top">' + tick(it.ticker) +
          '<span class="p-cd-type">' + esc(it.type || "") +
          (it.isCore ? ' <em class="p-tag">index</em>' : "") + "</span>" +
        "</div>" +

        '<div class="p-cd-under">' + esc(it.underlying || "\u2014") + "</div>" +

        '<div class="p-cd-hero">' +
          "<div><b>" + esc(cpnNum ? cpnNum[0] : (cpn || "\u2014")) + "</b>" +
            "<small>coupon" + (/mem/i.test(cpn) ? ", with memory" : "") + "</small></div>" +
          "<div><b>" + esc(it.tenor || "\u2014") + "</b><small>tenor</small></div>" +
        "</div>" +

        (bar === null
          ? '<div class="p-cd-barrier p-cd-nobar">' +
              "<small>Protection</small>" +
              "<p><b>No barrier.</b> A credit-linked note pays unless the " +
              "reference entity defaults \u2014 the risk is that credit event, " +
              "not a market level.</p>" +
            "</div>"
          : '<div class="p-cd-barrier">' +
              "<small>Protection</small>" +
              '<div class="p-cd-prot">' +
                '<div class="p-cd-prot-n"><b>\u2212' + (100 - bar) + '%</b>' +
                  "<span>buffer before capital is at risk</span></div>" +
              "</div>" +
              /* The scale runs from a total loss on the left to today's level
                 on the right, with the barrier marked. The green stretch is
                 the fall the note absorbs; the red is where the investor
                 starts taking the underlying's loss. */
              '<div class="p-cd-gauge">' +
                '<i style="width:' + bar + '%"></i>' +
                '<u style="left:' + bar + '%"></u>' +
              "</div>" +
              '<div class="p-cd-gauge-ends">' +
                "<span>&minus;100%</span>" +
                '<span class="p-cd-gauge-mark" style="left:' + bar + '%">barrier ' +
                  bar + "</span>" +
                "<span>today</span>" +
              "</div>" +
              "<p>Capital is returned in full while the underlying stays " +
              "above <b>" + bar + "% of its level today</b>. Below it, the " +
              "investor takes the full fall.</p>" +
            "</div>") +

        cardFoot(l, mx, "of capital") +
      "</div>";
    });
  }

  /* ---- FX, as a dollar-side gauge --------------------------------------
   *
   * Every one of these is long something; what the room needs to read off
   * the slide is which side of the DOLLAR that puts it on, and a label alone
   * kept being misread. So the position sits on a scale with the dollar at
   * one end, which cannot be read backwards.
   */
  function fxCards(lines) {
    var mx = maxw(lines);
    return cardGrid(lines, function (l) {
      var it = l.item, u = (it.analytics || {}).usdExposure;
      var longUsd = u !== null && u !== undefined && u >= 50;

      return '<div class="p-cd p-cd-fx">' +
        '<div class="p-cd-top">' + tick(it.ticker) +
          '<span class="p-cd-type">' + esc(it.kind || "") + "</span>" +
        "</div>" +

        '<div class="p-cd-under">' + esc(it.name) + "</div>" +

        /* Three currency positions do not fill a projector on their own, so
           the card carries the two numbers behind the gauge rather than
           spacing out what little it has. */
        '<div class="p-cd-kvs">' +
          '<div class="p-cd-kv"><small>Dollar content</small><b>' +
            pctOr(u) + "</b></div>" +
          '<div class="p-cd-kv"><small>Share of sleeve</small><b>' +
            (it.weightOfSleeve ? pc(it.weightOfSleeve * 100, 0) + "%" : "\u2014") +
          "</b></div>" +
        "</div>" +

        (u === null || u === undefined
          ? ""
          : '<div class="p-cd-fxside">' +
              '<div class="p-side ' + (longUsd ? "long" : "short") + '">' +
                (longUsd ? "USD long" : "USD short") + "</div>" +
              '<div class="p-cd-scale">' +
                '<i class="p-cd-scale-fill" style="width:' + pc(u, 0) + '%"></i>' +
                '<u style="left:' + pc(u, 0) + '%"></u>' +
              "</div>" +
              '<div class="p-cd-scale-ends"><span>away from the dollar</span>' +
                "<span>into the dollar</span></div>" +
            "</div>") +

        cardFoot(l, mx, "notional") +
      "</div>";
    });
  }


  function asTable(lines, cols) {
    var mx = maxw(lines);
    var head = cols.map(function (c) {
      return "<th" + (c.num ? ' class="num"' : "") + ">" + esc(c.head || "") + "</th>";
    }).join("") + '<th class="num">Weight %</th>';

    var body = lines.map(function (l) {
      var cells = cols.map(function (c) {
        var cls = c.num ? "num" : (c.role === "title" ? "p-nm" : "");
        return "<td" + (cls ? ' class="' + cls + '"' : "") + ">" + c.get(l) + "</td>";
      }).join("");
      return "<tr" + (l.overlay ? ' class="p-r-ovl"' : "") + ">" + cells +
        wcell(l.weight, mx) + "</tr>";
    }).join("");

    var n = lines.length;
    return '<div class="p-tblwrap"><table class="p-tbl' +
      (n > 12 ? " p-tbl-dense p-tbl-tight" : n > 7 ? " p-tbl-dense" : "") + '">' +
      "<thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function asCards(lines, cols) {
    var mx = maxw(lines);
    var byRole = {};
    cols.forEach(function (c) { if (c.role) byRole[c.role] = c; });
    var rows = cols.filter(function (c) { return !c.role; });

    var cards = lines.map(function (l) {
      var kv = rows.map(function (c) {
        return '<div class="p-cd-kv"><small>' + esc(c.head || "") + "</small><b>" +
          c.get(l) + "</b></div>";
      }).join("");
      var pct = mx > 0 ? Math.max(3, (l.weight / mx) * 100) : 0;
      return '<div class="p-cd' + (l.overlay ? " p-cd-ovl" : "") + '">' +
        '<div class="p-cd-top">' +
          (byRole.tag ? byRole.tag.get(l) : "") +
          '<span class="p-cd-w">' + fxn(l.weight, 1) + "<i>%</i></span>" +
        "</div>" +
        '<div class="p-cd-title">' + (byRole.title ? byRole.title.get(l) : "") + "</div>" +
        (byRole.sub ? '<div class="p-cd-sub">' + byRole.sub.get(l) + "</div>" : "") +
        '<div class="p-cd-kvs">' + kv + "</div>" +
        '<div class="p-cd-track"><i style="width:' + pc(pct, 1) + '%"></i></div>' +
      "</div>";
    }).join("");

    return '<div class="p-cards" style="--n:' + Math.min(lines.length, 4) + '">' +
      cards + "</div>";
  }

  /* A column of percentages all the same width hides the shape of the book.
     The track is the shape — scaled to the largest line, so the sleeve fills
     the column whether its biggest position is 3% or 30%. It sits inline
     rather than behind the number: an absolutely-positioned bar ran off the
     right edge of the slide and took the last digit with it. */
  function wcell(w, max) {
    var pct = max > 0 ? Math.max(3, (w / max) * 100) : 0;
    return '<td class="p-wcell"><i class="p-track"><b style="width:' + pc(pct, 1) +
      '%"></b></i><span>' + fxn(w, 1) + "</span></td>";
  }

  /* ---- the four sleeve sheets ---- */

  function equityPanel(b) {
    var lines = b.lines || [];
    var beta = wavg(lines, function (l) { return an(l.item).beta; });
    var vol  = wavg(lines, function (l) { return an(l.item).volatility; });
    var usd  = wavg(lines, function (l) { return an(l.item).usdExposure; });
    var em   = wshare(lines, function (l) { return an(l.item).region === "em"; });
    var sectors = topBy(lines.filter(function (l) {
      return an(l.item).sector && an(l.item).sector !== "core";
    }), function (l) { return an(l.item).sector; }, 5);

    /* Cash and notional are different money and the room will ask which is
       which, so they are two figures rather than one total. */
    var figs =
      fig("Cash equities", pc(b.weightCash, 1), "%", "funded") +
      fig("Option overlay", pc(b.weightOptions, 1), "%", "notional, on top") +
      fig("Weighted beta", pc(beta.value, 2), "",
          beta.coverage < 0.99 ? pc(beta.coverage * 100, 0) + "% covered" : "") +
      fig("Daily volatility", pc(vol.value, 2), "%", "weighted") +
      fig("Dollar exposure", pc(usd.value, 0), "%") +
      fig("Emerging markets", pc(em, 0), "%");

    var cols = [
      { head: "", role: "tag", get: function (l) { return tick(l.item.ticker); } },
      { head: "Holding", role: "title", get: function (l) {
          return esc(l.item.name) + (l.overlay ? ' <em class="p-tag">overlay</em>' : "");
        } },
      { head: "Sector / structure", role: "sub", get: function (l) {
          return esc(l.overlay ? (l.item.strategy || "Option")
                               : (SECTOR_WORD[an(l.item).sector] || an(l.item).sector || ""));
        } },
      { head: "Region / underlying", get: function (l) {
          return esc(l.overlay ? (l.item.underlying || "")
                               : (an(l.item).region === "em" ? "EM" : "Developed"));
        } },
      { head: "USD % / strike", num: true, get: function (l) {
          return l.overlay ? (l.item.moneyness ? pc(l.item.moneyness * 100, 0) + "%" : "—")
                           : pctOr(an(l.item).usdExposure);
        } },
      { head: "Beta / delta", num: true, get: function (l) {
          return l.overlay ? fxn(l.item.delta, 2) : fxn(an(l.item).beta, 2);
        } }
    ];

    return render(b, figs, cols,
      expo("Sector exposure", sectors, function (k) { return SECTOR_WORD[k] || k; }));
  }

  function fixedIncomePanel(b) {
    var lines = b.lines || [];
    var ytw = wavg(lines, function (l) { return an(l.item).yieldToWorst; });
    var dur = wavg(lines, function (l) { return an(l.item).duration; });
    var cpn = wavg(lines, function (l) { return (l.item || {}).coupon; });
    var ig  = wshare(lines, function (l) { return an(l.item).creditClass === "ig"; });
    var em  = wshare(lines, function (l) { return an(l.item).region === "em"; });
    var countries = topBy(lines, function (l) {
      return an(l.item).country || (l.item || {}).country;
    }, 5);

    var figs =
      fig("Weighted YTW", pc(ytw.value, 2), "%") +
      fig("Weighted duration", pc(dur.value, 2), "y") +
      fig("Weighted coupon", pc(cpn.value, 2), "%") +
      fig("Investment grade", pc(ig, 0), "%") +
      fig("Emerging markets", pc(em, 0), "%") +
      fig("Positions", lines.length, "", "all funded");

    var cols = [
      { head: "", role: "tag", get: function (l) { return tick(l.item.ticker); } },
      { head: "Issue", role: "title", get: function (l) { return esc(l.item.name); } },
      { head: "Rating", role: "sub", get: function (l) {
          return rateHtml(l.item.rating, an(l.item).creditClass);
        } },
      { head: "Country", get: function (l) { return esc(l.item.country || ""); } },
      { head: "Maturity", get: function (l) { return esc(l.item.maturity || ""); } },
      { head: "YTW %", num: true, get: function (l) { return fxn(an(l.item).yieldToWorst, 2); } },
      { head: "Dur y", num: true, get: function (l) { return fxn(an(l.item).duration, 2); } }
    ];

    return render(b, figs, cols, expo("Country exposure", countries));
  }

  function notesPanel(b) {
    var lines = b.lines || [];
    var risk = wavg(lines, function (l) { return an(l.item).riskScore; });
    var ten  = wavg(lines, function (l) { return an(l.item).tenorYears; });
    var core = wshare(lines, function (l) { return (l.item || {}).isCore; });
    var prot = wshare(lines, function (l) { return an(l.item).principalProtected; });
    var em   = wshare(lines, function (l) { return an(l.item).region === "em"; });
    var types = topBy(lines, function (l) { return (l.item || {}).type; }, 5);

    var figs =
      fig("Weighted tenor", pc(ten.value, 1), "y") +
      fig("Index-linked", pc(core, 0), "%", "of the sleeve") +
      fig("Principal protected", pc(prot, 0), "%") +
      fig("Emerging markets", pc(em, 0), "%") +
      fig("Risk proxy", pc(risk.value * 100, 0), "/100") +
      fig("Structures", lines.length, "", "all funded");

    var cols = [
      { head: "", role: "tag", get: function (l) { return tick(l.item.ticker); } },
      { head: "Structure", role: "title", get: function (l) {
          return esc(l.item.type || "") +
            (l.item.isCore ? ' <em class="p-tag">index</em>' : "");
        } },
      { head: "Underlying", role: "sub", get: function (l) {
          return esc(l.item.underlying || "");
        } },
      { head: "Tenor", num: true, get: function (l) { return esc(l.item.tenor || "—"); } },
      { head: "Barrier", num: true, get: function (l) {
          return l.item.barrier ? esc(l.item.barrier) : "—";
        } },
      { head: "Coupon", num: true, get: function (l) {
          return '<span class="p-cpn">' + esc(l.item.coupon || "—") + "</span>";
        } }
    ];

    return render(b, figs, cols, expo("By structure", types), notesCards);
  }

  function fxPanel(b) {
    var lines = b.lines || [];
    var usd = wavg(lines, function (l) { return an(l.item).usdExposure; });
    var kinds = topBy(lines, function (l) {
      return an(l.item).kind || (l.item || {}).kind;
    }, 5);

    /* NOT "does the name start with Long": every position here is a long of
       something, and "Long Eur/Usd" is long the euro — short the dollar. The
       dollar stance is the weighted dollar exposure and its complement,
       which is what the instruments actually carry. */
    var away = usd.value === null ? null : 100 - usd.value;

    var figs =
      fig("Sleeve notional", pc(b.weight, 1), "%", "of capital, on top of it") +
      fig("Dollar exposure", pc(usd.value, 0), "%", "weighted, of the sleeve") +
      fig("Away from the dollar", pc(away, 0), "%") +
      fig("Positions", lines.length, "", "all notional");

    var cols = [
      { head: "", role: "tag", get: function (l) { return tick(l.item.ticker); } },
      { head: "Position", role: "title", get: function (l) { return esc(l.item.name); } },
      { head: "Instrument", role: "sub", get: function (l) { return esc(l.item.kind || ""); } },
      { head: "Dollar side", get: function (l) { return sideHtml(an(l.item).usdExposure); } },
      { head: "USD %", num: true, get: function (l) { return pctOr(an(l.item).usdExposure); } }
    ];

    return render(b, figs, cols, expo("By instrument", kinds), fxCards);
  }

  var PANEL = {
    equities: equityPanel, fixedIncome: fixedIncomePanel,
    notes: notesPanel, fx: fxPanel
  };

  function paintSleeves(agg, alloc) {
    if (!window.PRODUCTS) return;
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) return;
    /* The book's own allocation, not one recomputed beside it. These had
       drifted apart: the sleeve weights came from the desk's band book while
       the gross printed above them came from the engine's own calculation,
       so one slide said 72.5% equities and 135% gross when the book it was
       describing was 132.5%. */
    var lev = window.ENGINE.leverageDisclosure(sim.alloc || alloc);

    SLEEVE_SLIDES.forEach(function (S) {
      var host = document.getElementById(S.host);
      var badge = document.getElementById(S.badge);
      if (!host) return;

      var bucket = null;
      sim.buckets.forEach(function (b) { if (b.key === S.key) bucket = b; });
      if (!bucket || !bucket.lines || !bucket.lines.length) {
        if (badge) badge.textContent = "";
        host.innerHTML = '<p class="p-book-empty">Nothing in this sleeve.</p>';
        return;
      }

      /* The ticket line. With leverage the sleeves sum past 100, so a sleeve
         weight is a share of CAPITAL, not of the book — say which, or 72.5%
         equities beside 132.5% gross reads as an error. Share-of-gross is
         given too, because that is the question the number raises. */
      if (badge) badge.textContent = bucket.weight + "%";

      /* Say, per sleeve, which kind of money this is. The equity sleeve is
         part funded and part notional; FX is notional throughout; fixed
         income and the notes are funded outright. Printing one undifferent-
         iated "% of capital" on all four is what made the weights unclear in
         the first place. */
      var share = lev && lev.gross ? (bucket.weight / lev.gross) * 100 : null;
      var kind = S.key === "fx" ? "notional"
               : S.key === "equities" && bucket.weightOptions ? "split"
               : "funded";

      var sizeBits =
        kind === "split"
          ? '<span class="p-tape-i"><small>cash</small><b>' +
              pc(bucket.weightCash, 1) + "%</b></span>" +
            '<span class="p-tape-i p-tape-nt"><small>options</small><b>+' +
              pc(bucket.weightOptions, 1) + "%</b></span>"
          : kind === "notional"
            ? '<span class="p-tape-i p-tape-nt"><small>notional</small><b>+' +
                pc(bucket.weight, 1) + "%</b></span>"
            : '<span class="p-tape-i"><small>of capital</small><b>' +
                pc(bucket.weight, 1) + "%</b></span>";

      var tape = '<div class="p-tape">' +
        '<span class="p-tape-k"><s style="background:' +
          (BUCKET_COLOUR[S.key] || "currentColor") + '"></s>' + esc(bucket.label) + "</span>" +
        sizeBits +
        (bucket.book
          ? '<span class="p-tape-i"><small>book</small><b>' +
            esc(bucket.book.name) + "</b></span>"
          : "") +
        '<span class="p-tape-i"><small>lines</small><b>' +
          (bucket.lines || []).length + "</b></span>" +
        (lev
          ? '<span class="p-tape-n">capital 100% &middot; book runs ' + lev.gross +
            "% gross, " + lev.geared + " pts notional</span>"
          : "") +
        "</div>";

      host.innerHTML = tape + (PANEL[S.key] || equityPanel)(bucket);
    });
  }


  /* ---------- the room voting, live ---------- */
  var liveReady = false;

  function paintLive(agg) {
    if (!window.LIVEVOTES) return;
    if (!liveReady) {
      liveReady = window.LIVEVOTES.mount(document.getElementById("liveVotes"));
      if (!liveReady) return;
    }
    var sim = null;
    if (window.PRODUCTS && agg && agg.count) {
      try { sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS); }
      catch (e) { sim = null; }
    }
    window.LIVEVOTES.update(agg, sim);
  }

  /* ---------- slides ---------- */

  function go(i, fromHash) {
    if (!slides.length) { current = i; return; }
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle("on", n === current); });
    Array.prototype.forEach.call(dots.children, function (d, n) {
      d.classList.toggle("on", n === current);
    });
    /* Deep-linkable: present.html#3 opens straight on slide 3, so the deck
       can be driven from a bookmark or a clicker. */
    if (!fromHash) {
      try { history.replaceState(null, "", "#" + (current + 1)); } catch (e) {}
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(current + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(current - 1); }
    else if (e.key === "f" || e.key === "F") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } else if (e.key === "r" || e.key === "R") { resetVotes(); }
    else if (/^[0-9]$/.test(e.key)) {
      /* 0 is the tenth slide: the deck outgrew the digits on the keyboard. */
      var n = e.key === "0" ? 10 : parseInt(e.key, 10);
      if (n <= slides.length) go(n - 1);
    }
  });

  window.addEventListener("hashchange", function () {
    var n = parseInt(location.hash.slice(1), 10);
    if (n >= 1 && n <= slides.length) go(n - 1, true);
  });

  /* ---------- polling ---------- */

  function refresh() {
    window.STORE.results()
      .then(paint)
      .catch(function (e) {
        /* A render fault used to be swallowed here, leaving `built` false
           so every poll appended another pair of breakdown boards. Say so
           loudly and stop rebuilding. */
        console.error("[NextGen] presenter refresh failed", e);
        buildFailed = true;
      });
  }

  function resetVotes() {
    if (!window.confirm("Clear every response and start a fresh tally?")) return;

    var key = "";
    if (window.STORE.mode === "remote") {
      try { key = sessionStorage.getItem("nextgen:adminkey") || ""; } catch (e) {}
      if (!key) {
        key = window.prompt("Admin key (set with: wrangler secret put ADMIN_KEY)") || "";
        if (!key) return;
      }
    }

    window.STORE.reset(key).then(function () {
      try { if (key) sessionStorage.setItem("nextgen:adminkey", key); } catch (e) {}
      lastVerdictId = null;
      /* The skeletons were wiped by the waiting copy, so rebuild on the
         next paint rather than diffing into elements that no longer exist. */
      built = false;
      splitRows = {};
      refresh();
    }).catch(function (e) {
      try { sessionStorage.removeItem("nextgen:adminkey"); } catch (err) {}
      window.alert(e.message || "Reset failed.");
    });
  }
  document.getElementById("btnReset").addEventListener("click", resetVotes);

  renderQR();
  registerSlides();

  var startAt = parseInt(location.hash.slice(1), 10);
  go(startAt >= 1 ? startAt - 1 : 0, true);

  window.BASE.ready.then(function () {
    refresh();
    setInterval(refresh, window.CONFIG.POLL_MS);
  });
})();
