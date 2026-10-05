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
    /* CONFIG.GUEST_URL wins when it is set, so the room can be sent to the
       public domain while the projector runs from wherever is convenient.
       Falling back to this page's own address keeps a rehearsal working
       with no configuration at all. */
    var cfg = (window.CONFIG || {}).GUEST_URL;
    if (cfg) return cfg.replace(/\/+$/, "") + "/";
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
    paintSplit(split);
    var vSim = null;
    if (window.PRODUCTS) {
      try { vSim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS); } catch (e) { vSim = null; }
    }
    paintVerdict(window.ENGINE.rank(roomProfile)[0], agg.count, vSim);
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

  function paintVerdict(top, n, sim) {
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

    /* Only rebuild when the winning portfolio actually changes — otherwise
       just refresh the numbers that move. */
    if (lastVerdictId !== p.id + ":" + JSON.stringify(alloc)) {
      lastVerdictId = p.id + ":" + JSON.stringify(alloc);
      host.innerHTML =
        "<div>" +
          "<h1>" + esc(p.name) + "</h1>" +
          '<p class="tagline">' + esc(p.tagline) + "</p>" +
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
    fx:          "var(--series-cash)",
    options:     "var(--series-options)"
  };

  /* The room's book, one column per bucket. Repainted wholesale rather
     than diffed: it changes shape as answers land, since a sleeve can
     appear or drop out, and at four columns a repaint is cheap. */
  function paintBook(agg) {
    var host = document.getElementById("book");
    paintGearing(agg);
    if (!window.PRODUCTS) {
      host.innerHTML = '<p class="p-book-empty">Product shelf not loaded.</p>';
      return;
    }
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) { host.innerHTML = ""; return; }

    host.innerHTML = sim.buckets.map(function (b) {
      var colour = BUCKET_COLOUR[b.key];
      var widest = b.lines.reduce(function (m, l) { return Math.max(m, l.weight); }, 0) || 1;

      /* This board is the summary; each sleeve's own slide carries the full
         list. A long book ran off the bottom of the column and simply
         stopped, with nothing to say it had — which reads as the book being
         shorter than it is. */
      var SHOW = 6;
      var hidden = Math.max(0, b.lines.length - SHOW);
      var lines = b.lines.length
        ? b.lines.slice(0, SHOW).map(function (l) {
            /* The room's own answer wins over the shelf's generic blurb:
               a duration note says something about THIS room. */
            var detail = l.note || l.item.detail || "";
            return '<div class="p-pos' + (l.overlay ? " p-pos-overlay" : "") + '">' +
              '<div class="p-pos-top"><span class="p-pos-name">' +
                '<i class="p-rank">' + (l.rank || "") + "</i>" +
                (l.overlay ? '<em class="p-tag">overlay</em>' : "") +
                esc(l.item.name) + "</span>" +
              '<span class="p-pos-w">' + l.weight + "%</span></div>" +
              '<div class="p-pos-bar"><i style="width:' +
                Math.round((l.weight / widest) * 100) + "%;background:" + colour + '"></i></div>' +
              '<div class="p-pos-meta">' +
                (l.item.ticker ? '<span class="p-tk">' + esc(l.item.ticker) + "</span>" : "") +
                esc(detail) +
              "</div>" +
              "</div>";
          }).join("") +
          (hidden ? '<p class="p-book-more">+ ' + hidden + " more on the " +
                    esc(b.label.toLowerCase()) + " slide</p>" : "")
        : '<p class="p-book-empty">Nothing here.</p>';

      return '<div class="p-bucket">' +
        '<div class="p-bucket-top"><s style="background:' + colour + '"></s>' +
        "<h3>" + esc(b.label) + "</h3></div>" +
        '<div class="p-bucket-w">' + b.weight + "%</div>" +
        lines + "</div>";
    }).join("");
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

  function statCell(label, value, sub) {
    return '<div class="p-stat"><small>' + label + "</small><b>" + value + "</b>" +
      (sub ? "<i>" + sub + "</i>" : "") + "</div>";
  }

  function chips(list, fmt) {
    return list.map(function (x) {
      return '<span class="p-chip">' + esc(fmt ? fmt(x.key) : x.key) +
             "<b>" + pc(x.pct, 0) + "%</b></span>";
    }).join("");
  }

  var SECTOR_WORD = {
    core: "Broad market", tech: "Technology", financials: "Financials",
    healthcare: "Healthcare", energy: "Energy & materials",
    consumer: "Consumer", industrials: "Industrials"
  };

  /* ---- the four sleeve tables ---- */

  function equityPanel(b) {
    var lines = b.lines || [];
    var beta = wavg(lines, function (l) { return an(l.item).beta; });
    var vol  = wavg(lines, function (l) { return an(l.item).volatility; });
    var usd  = wavg(lines, function (l) { return an(l.item).usdExposure; });
    var em   = wshare(lines, function (l) { return an(l.item).region === "em"; });
    var ovl  = wshare(lines, function (l) { return l.overlay; });
    var sectors = topBy(lines.filter(function (l) {
      return an(l.item).sector && an(l.item).sector !== "core";
    }), function (l) { return an(l.item).sector; }, 4);

    var stats =
      statCell("Positions", lines.length) +
      statCell("Weighted beta", pc(beta.value, 2),
               beta.coverage < 0.99 ? pc(beta.coverage * 100, 0) + "% covered" : "") +
      statCell("Weighted volatility", pc(vol.value, 2)) +
      statCell("Dollar exposure", pc(usd.value, 0) + "%") +
      statCell("Emerging markets", pc(em, 0) + "%") +
      statCell("Option overlay", pc(ovl, 0) + "%", "of the sleeve");

    var rows = lines.map(function (l) {
      var it = l.item, a = an(it);
      var isOpt = !!l.overlay;
      return "<tr" + (isOpt ? ' class="p-r-ovl"' : "") + ">" +
        "<td>" + tick(it.ticker) + "</td>" +
        "<td>" + esc(it.name) + (isOpt ? ' <em class="p-tag">overlay</em>' : "") + "</td>" +
        "<td>" + esc(isOpt ? (it.strategy || "") : (SECTOR_WORD[a.sector] || a.sector || "")) + "</td>" +
        "<td>" + esc(isOpt ? (it.underlying || "") : (a.region === "em" ? "EM" : "Developed")) + "</td>" +
        '<td class="num">' + (isOpt ? (it.moneyness ? pc(it.moneyness * 100, 0) + "%" : "&mdash;")
                                    : (a.usdExposure === null ? "&mdash;" : a.usdExposure + "%")) + "</td>" +
        '<td class="num">' + (isOpt ? (it.delta === null || it.delta === undefined ? "&mdash;" : pc(it.delta, 2))
                                    : pc(a.beta, 2)) + "</td>" +
        '<td class="num p-w">' + l.weight + "%</td></tr>";
    }).join("");

    return panel(b, stats,
      ["", "Holding", "Sector / structure", "Region / underlying", "USD % / strike", "Beta / delta", "Weight"],
      rows,
      sectors.length ? "Sector exposure " + chips(sectors, function (k) {
        return SECTOR_WORD[k] || k;
      }) : "");
  }

  function fixedIncomePanel(b) {
    var lines = b.lines || [];
    var ytw = wavg(lines, function (l) { return an(l.item).yieldToWorst; });
    var dur = wavg(lines, function (l) { return an(l.item).duration; });
    var cpn = wavg(lines, function (l) { return (l.item || {}).coupon; });
    var ig  = wshare(lines, function (l) { return an(l.item).creditClass === "ig"; });
    var em  = wshare(lines, function (l) { return an(l.item).region === "em"; });
    var countries = topBy(lines, function (l) { return an(l.item).country || (l.item || {}).country; }, 5);

    var stats =
      statCell("Positions", lines.length) +
      statCell("Weighted YTW", pc(ytw.value, 2) + "%") +
      statCell("Weighted duration", pc(dur.value, 2) + "y") +
      statCell("Weighted coupon", pc(cpn.value, 2) + "%") +
      statCell("Investment grade", pc(ig, 0) + "%") +
      statCell("Emerging markets", pc(em, 0) + "%");

    var rows = lines.map(function (l) {
      var it = l.item, a = an(it);
      return "<tr><td>" + tick(it.ticker) + "</td>" +
        "<td>" + esc(it.name) + "</td>" +
        "<td>" + esc(it.rating || "") +
          (a.creditClass ? ' <em class="p-pillx">' + a.creditClass.toUpperCase() + "</em>" : "") + "</td>" +
        "<td>" + esc(it.country || "") + "</td>" +
        "<td>" + esc(it.maturity || "") + "</td>" +
        '<td class="num">' + pc(a.yieldToWorst, 2) + "</td>" +
        '<td class="num">' + pc(a.duration, 2) + "</td>" +
        '<td class="num p-w">' + l.weight + "%</td></tr>";
    }).join("");

    var book = b.book ? '<span class="p-bookname">' + esc(b.book.name) + "</span>" : "";
    return panel(b, stats,
      ["", "Issue", "Rating", "Country", "Maturity", "YTW", "Duration", "Weight"],
      rows,
      (book ? "Book " + book + " &nbsp; " : "") +
      (countries.length ? "Country exposure " + chips(countries) : ""));
  }

  function notesPanel(b) {
    var lines = b.lines || [];
    var risk = wavg(lines, function (l) { return an(l.item).riskScore; });
    var ten  = wavg(lines, function (l) { return an(l.item).tenorYears; });
    var core = wshare(lines, function (l) { return (l.item || {}).isCore; });
    var prot = wshare(lines, function (l) { return an(l.item).principalProtected; });
    var em   = wshare(lines, function (l) { return an(l.item).region === "em"; });

    var stats =
      statCell("Structures", lines.length) +
      statCell("Weighted tenor", pc(ten.value, 1) + "y") +
      statCell("Index-linked", pc(core, 0) + "%", "of the sleeve") +
      statCell("Principal protected", pc(prot, 0) + "%") +
      statCell("Emerging markets", pc(em, 0) + "%") +
      statCell("Risk proxy", pc(risk.value * 100, 0) + " / 100");

    var rows = lines.map(function (l) {
      var it = l.item;
      return "<tr><td>" + tick(it.ticker) + "</td>" +
        "<td>" + esc(it.name) + (it.isCore ? ' <em class="p-tag">index</em>' : "") + "</td>" +
        "<td>" + esc(it.type || "") + "</td>" +
        "<td>" + esc(it.underlying || "") + "</td>" +
        "<td>" + esc(it.tenor || "") + "</td>" +
        "<td>" + (it.barrier ? esc(it.barrier) : "\u2014") + "</td>" +
        "<td>" + esc(it.coupon || "") + "</td>" +
        '<td class="num p-w">' + l.weight + "%</td></tr>";
    }).join("");

    return panel(b, stats,
      ["", "Structure", "Type", "Underlying", "Tenor", "Barrier", "Coupon", "Weight"],
      rows, "");
  }

  function fxPanel(b) {
    var lines = b.lines || [];
    var usd = wavg(lines, function (l) { return an(l.item).usdExposure; });
    var kinds = topBy(lines, function (l) { return an(l.item).kind || (l.item || {}).kind; }, 4);

    /* NOT "does the name start with Long": every position here is a long of
       something, and "Long Eur/Usd" is long the euro — short the dollar.
       The dollar stance is the weighted dollar exposure and its complement,
       which is what the instrument actually carries. */
    var away = usd.value === null ? null : 100 - usd.value;

    var stats =
      statCell("Positions", lines.length) +
      statCell("Dollar exposure", pc(usd.value, 0) + "%", "weighted, of the sleeve") +
      statCell("Away from the dollar", pc(away, 0) + "%") +
      statCell("Instruments", kinds.map(function (k) { return k.key; }).join(", ") || "\u2014");

    var rows = lines.map(function (l) {
      var it = l.item, a = an(it);
      return "<tr><td>" + tick(it.ticker) + "</td>" +
        "<td>" + esc(it.name) + "</td>" +
        "<td>" + esc(it.kind || "") + "</td>" +
        "<td>" + esc(it.note || "") + "</td>" +
        '<td class="num">' + (a.usdExposure === null || a.usdExposure === undefined
          ? "\u2014" : a.usdExposure + "%") + "</td>" +
        '<td class="num p-w">' + l.weight + "%</td></tr>";
    }).join("");

    return panel(b, stats,
      ["", "Position", "Instrument", "Exposure", "USD %", "Weight"], rows, "");
  }

  function tick(t) { return t ? '<span class="p-tk">' + esc(t) + "</span>" : ""; }

  function panel(b, stats, head, rows, foot) {
    return '<div class="p-stats">' + stats + "</div>" +
      '<div class="p-tblwrap"><table class="p-tbl' +
        ((b.lines || []).length > 12 ? " p-tbl-dense p-tbl-tight"
          : (b.lines || []).length > 7 ? " p-tbl-dense" : "") + '">' +
        "<thead><tr>" + head.map(function (h, i) {
          return "<th" + (i >= head.length - 3 ? ' class="num"' : "") + ">" + h + "</th>";
        }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      (foot ? '<p class="p-foot-note">' + foot + "</p>" : "");
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

      /* With leverage the sleeves sum past 100, so a sleeve weight is a share
         of CAPITAL, not of the book — say which, or 69% equities next to 135%
         gross looks like an error. */
      if (badge) badge.textContent = bucket.weight + "%";

      var head = lev
        ? '<p class="p-sleeve-gross">' + bucket.weight + "% of capital &middot; the book runs " +
          lev.gross + "% gross, " + lev.geared + " points of it notional</p>"
        : "";

      host.innerHTML = head + (PANEL[S.key] || equityPanel)(bucket);
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
