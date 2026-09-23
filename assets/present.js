/* NextGen Portfolio Builder — presenter view.
 *
 * Five slides: join (QR) -> the split -> the verdict -> two breakdown
 * boards. Arrow keys move; the data refreshes on a timer regardless of
 * which slide is up, so the counter keeps climbing on the join screen.
 *
 * Painting is DIFF-BASED on purpose. Rewriting innerHTML on every poll
 * would reset every bar to zero and re-run the grow animation every few
 * seconds — a visible flicker on a projector. Instead the DOM is built
 * once and only widths, numbers and ordering are updated, so bars glide
 * from their old value to the new one as votes land.
 */
(function () {
  var PANELS_PER_BOARD = 6;
  var stage   = document.querySelector(".p-stage");
  var slides  = [];
  var dots    = document.getElementById("dots");
  var current = 0;
  var last    = null;

  var built = false;      /* skeletons built? */
  var buildFailed = false;
  var splitRows = {};     /* portfolio id -> { root, fill, val, name } */
  var axisRows  = {};     /* axis id -> { head, bars: { value -> {row, fill, val} } } */
  var lastVerdictId = null;

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
    var u = window.location.href.split("?")[0].split("#")[0];
    return u.replace(/present\.html?$/, "").replace(/\/$/, "") + "/";
  }

  function renderQR() {
    /* The address is deliberately not printed on the projector: the room
       scans the code, and a long URL on screen only invites typos. It is
       still logged here for whoever is driving the deck. */
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

    /* --- breakdown boards, generated from the schema ---
       Six panels to a board keeps a projector-legible 3x2 whatever the
       question count, and adding questions adds boards rather than
       overflowing the last one. */
    var boards = Math.ceil(window.AXES.length / PANELS_PER_BOARD);
    var hosts = [];
    for (var b = 0; b < boards; b++) {
      var first = b * PANELS_PER_BOARD;
      var axesHere = window.AXES.slice(first, first + PANELS_PER_BOARD);
      var stepNames = axesHere.map(function (a) {
        var st = window.SCHEMA.activeSteps.find(function (s) { return s.id === a.step; });
        return st ? st.title : "";
      }).filter(function (v, i, arr) { return v && arr.indexOf(v) === i; });

      var sec = document.createElement("section");
      sec.className = "p-slide";
      sec.innerHTML =
        '<h2 class="p-h">Answer by answer</h2>' +
        '<p class="p-sub">' + esc(stepNames.join(" &middot; ").replace(/&amp;middot;/g, "·")) +
        (boards > 1 ? '  <span style="opacity:.6">(' + (b + 1) + " of " + boards + ")</span>" : "") +
        "</p>" +
        '<div class="p-grid"></div>';
      stage.appendChild(sec);
      hosts.push(sec.querySelector(".p-grid"));
    }

    window.AXES.forEach(function (axis, i) {
      var panel = el("div", "p-panel");
      var head = el("h4", "", esc(axis.label));
      panel.appendChild(head);
      var bars = el("div", "bars");
      var map = {};
      /* A range axis has no option list: its rows are the reporting bands,
         keyed by the same band value aggDistribution reports. */
      var rows = axis.kind === "range"
        ? window.ENGINE.rangeBuckets(axis).map(function (b) { return { v: b.lo, label: b.label }; })
        : axis.options.map(function (o) { return { v: o.v, label: o.label }; });

      rows.forEach(function (o) {
        var row = el("div", "bar-row");
        row.innerHTML =
          '<div class="bar-top"><span class="bar-name">' + esc(o.label) + "</span>" +
          '<span class="bar-val">0%</span></div>' +
          '<div class="bar-track"><i class="bar-fill" style="width:0"></i></div>';
        bars.appendChild(row);
        map[o.v] = {
          row:  row,
          fill: row.querySelector(".bar-fill"),
          val:  row.querySelector(".bar-val")
        };
      });
      panel.appendChild(bars);
      hosts[Math.floor(i / PANELS_PER_BOARD)].appendChild(panel);
      axisRows[axis.id] = { head: head, label: axis.label, bars: map };
    });

    /* The deck grew — re-register slides and dots. */
    rebuildSlides();
    built = true;
  }

  function rebuildSlides() {
    slides = Array.prototype.slice.call(document.querySelectorAll(".p-slide"));
    dots.innerHTML = "";
    slides.forEach(function (_, i) {
      var d = document.createElement("i");
      d.addEventListener("click", function () { go(i); });
      dots.appendChild(d);
    });
    go(current, true);
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

    if (!agg.count) return;
    if (!built) {
      if (buildFailed) return;   /* do not retry a build that already threw */
      buildSkeletons();
    }

    var roomProfile = window.ENGINE.aggProfile(agg);
    paintSplit(window.ENGINE.aggSplit(agg));
    paintVerdict(window.ENGINE.rank(roomProfile)[0], agg.count);
    paintBreakdown(agg, roomProfile);
  }

  function paintSplit(split) {
    split.forEach(function (row, i) {
      var r = splitRows[row.portfolio.id];
      if (!r) return;
      r.root.style.order = i;                 /* reorder without rebuilding */
      r.root.classList.toggle("lead", i === 0 && row.count > 0);
      r.fill.style.width = row.pct + "%";     /* CSS transition does the rest */
      r.val.innerHTML = row.pct + "%";
    });
  }

  function ALLOC_KEYS() {
    return [
      { k: "equities",    label: "Equities",         c: "var(--series-equities)" },
      { k: "fixedIncome", label: "Fixed income",     c: "var(--series-fixedincome)" },
      { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
      { k: "cash",        label: "Cash",             c: "var(--series-cash)" }
    ];
  }

  function paintVerdict(top, n) {
    var p = top.portfolio;
    var host = document.getElementById("verdict");
    var keys = ALLOC_KEYS();

    /* Only rebuild when the winning portfolio actually changes — otherwise
       just refresh the numbers that move. */
    if (lastVerdictId !== p.id) {
      lastVerdictId = p.id;
      host.innerHTML =
        "<div>" +
          "<h1>" + esc(p.name) + "</h1>" +
          '<p class="tagline">' + esc(p.tagline) + "</p>" +
          '<p class="body">' + esc(p.blurb) + "</p>" +
        "</div>" +
        "<div>" +
          '<div class="p-fit"><b id="vFit">0</b><span>fit out of 100<br><span id="vN">0</span> responses</span></div>' +
          '<div class="alloc-bar">' +
            keys.map(function (x) {
              return '<i style="flex:' + p.alloc[x.k] + ' 0 0;background:' + x.c + '"></i>';
            }).join("") +
          "</div>" +
          '<div class="legend">' +
            keys.map(function (x) {
              return '<div><s style="background:' + x.c + '"></s>' + x.label + "<b>" + p.alloc[x.k] + "%</b></div>";
            }).join("") +
          "</div>" +
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
    var r = p.risk;
    var out = '<dl style="margin:22px 0 0">' +
      '<div class="kv"><dt>Expected return</dt><dd>' + esc(p.expReturn) + "</dd></div>" +
      '<div class="kv"><dt>Volatility</dt><dd>' + esc(p.vol) + "</dd></div>";
    if (r) {
      out += '<div class="kv"><dt>Max drawdown</dt><dd style="color:var(--neg)">' +
             r.maxDrawdown.toFixed(1) + "%</dd></div>" +
             '<div class="kv"><dt>Running yield</dt><dd>' + r.yield.toFixed(1) + "%</dd></div>";
    }
    out += "</dl>";

    if (r && r.scenarios) {
      out += '<div class="p-scen">' + r.scenarios.map(function (sc) {
        var up = sc.pct >= 0;
        return '<div><span class="lbl">' + esc(sc.label) + "</span>" +
               '<span class="val ' + (up ? "up" : "down") + '">' +
               (up ? "+" : "") + sc.pct.toFixed(1) + "%</span></div>";
      }).join("") + "</div>";
    }

    if (p.holdings && p.holdings.length) {
      var top = p.holdings.slice().sort(function (a, b) { return b.weight - a.weight; }).slice(0, 4);
      out += '<div class="p-hold"><div class="p-hold-h">Largest positions</div>' +
        top.map(function (h) {
          return '<div class="p-hold-row"><span>' + esc(h.name) + "</span><b>" + h.weight + "%</b></div>";
        }).join("") +
        '<div class="p-hold-more">' + p.holdings.length + " positions, hypothetical</div></div>";
    }
    return out;
  }

  function paintBreakdown(agg, roomProfile) {
    window.AXES.forEach(function (axis) {
      var panel = axisRows[axis.id];
      var dist = window.ENGINE.aggDistribution(agg, axis.id);
      var maxPct = Math.max.apply(null, dist.bars.map(function (b) { return b.pct; }));

      var note = "";
      if (axis.kind === "scale" && roomProfile[axis.id] !== null) {
        note = ' <span style="color:var(--accent);font-weight:500">&middot; avg ' +
               roomProfile[axis.id].toFixed(1) + "</span>";
      } else if (axis.kind === "multi") {
        /* Bars on a multi axis sum past 100% by design — label them as a
           share of the room so nobody on the projector reads it as a bug. */
        var avgPicks = dist.respondents ? (dist.picks / dist.respondents) : 0;
        note = ' <span style="color:var(--muted);font-weight:400">' +
               avgPicks.toFixed(1) + " picks each</span>";
      }
      panel.head.innerHTML = esc(panel.label) + note;

      dist.bars.forEach(function (b) {
        var r = panel.bars[b.value];
        if (!r) return;
        r.fill.style.width = b.pct + "%";
        r.val.textContent = b.pct + "%";
        r.row.classList.toggle("lead", b.pct === maxPct && b.pct > 0);
      });
    });
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
    else if (/^[1-9]$/.test(e.key)) {
      var n = parseInt(e.key, 10);
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
      refresh();
    }).catch(function (e) {
      try { sessionStorage.removeItem("nextgen:adminkey"); } catch (err) {}
      window.alert(e.message || "Reset failed.");
    });
  }
  document.getElementById("btnReset").addEventListener("click", resetVotes);

  renderQR();
  rebuildSlides();

  var startAt = parseInt(location.hash.slice(1), 10);
  go(startAt >= 1 ? startAt - 1 : 0, true);

  window.BASE.ready.then(function () {
    refresh();
    setInterval(refresh, window.CONFIG.POLL_MS);
  });
})();
