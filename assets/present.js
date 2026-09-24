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
  var stage   = document.querySelector(".p-stage");
  var slides  = [];
  var dots    = document.getElementById("dots");
  var current = 0;
  var last    = null;

  var built = false;      /* skeletons built? */
  var buildFailed = false;
  var splitRows = {};     /* portfolio id -> { root, fill, val, name } */
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
    paintSplit(split);
    paintVerdict(window.ENGINE.rank(roomProfile)[0], agg.count);
    renderWhy(agg, window.ENGINE.roomAllocation(agg), split);
    paintBook(agg);
  }

  var WAITING = [
    ["splitBars", "Each guest is matched on their own answers. The split appears here as they finish."],
    ["verdict",   "Every answer averaged into one profile, then matched. Waiting on the room."],
    ["book",      "The book the room's answers build. Waiting on the room."],
    ["why",       ""]
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

    return out;
  }

  var BUCKET_COLOUR = {
    equities:    "var(--series-equities)",
    fixedIncome: "var(--series-fixedincome)",
    notes:       "var(--series-notes)",
    fx:          "var(--series-cash)"
  };

  /* The room's book, one column per bucket. Repainted wholesale rather
     than diffed: it changes shape as answers land, since a sleeve can
     appear or drop out, and at four columns a repaint is cheap. */
  function paintBook(agg) {
    var host = document.getElementById("book");
    if (!window.PRODUCTS) {
      host.innerHTML = '<p class="p-book-empty">Product shelf not loaded.</p>';
      return;
    }
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) { host.innerHTML = ""; return; }

    host.innerHTML = sim.buckets.map(function (b) {
      var colour = BUCKET_COLOUR[b.key];
      var widest = b.lines.reduce(function (m, l) { return Math.max(m, l.weight); }, 0) || 1;

      var lines = b.lines.length
        ? b.lines.map(function (l) {
            /* The room's own answer wins over the shelf's generic blurb:
               a duration note says something about THIS room. */
            var detail = l.note || l.item.detail || "";
            return '<div class="p-pos">' +
              '<div class="p-pos-top"><span class="p-pos-name">' + esc(l.item.name) + "</span>" +
              '<span class="p-pos-w">' + l.weight + "%</span></div>" +
              '<div class="p-pos-bar"><i style="width:' +
                Math.round((l.weight / widest) * 100) + "%;background:" + colour + '"></i></div>' +
              '<div class="p-pos-meta">' +
                (l.item.ticker ? '<span class="p-tk">' + esc(l.item.ticker) + "</span>" : "") +
                esc(detail) +
              "</div>" +
              "</div>";
          }).join("")
        : '<p class="p-book-empty">Nothing here.</p>';

      return '<div class="p-bucket">' +
        '<div class="p-bucket-top"><s style="background:' + colour + '"></s>' +
        "<h3>" + esc(b.label) + "</h3></div>" +
        '<div class="p-bucket-w">' + b.weight + "%</div>" +
        lines + "</div>";
    }).join("");
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
