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
    var alloc = window.ENGINE.roomAllocation(agg);
    renderWhy(agg, alloc, split);
    paintBook(agg);
    paintSleeves(agg, alloc);
  }

  var WAITING = [
    ["splitBars", "Each guest is matched on their own answers. The split appears here as they finish."],
    ["verdict",   "Every answer averaged into one profile, then matched. Waiting on the room."],
    ["book",      "The book the room's answers build. Waiting on the room."],
    ["why",       ""],
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
              '<div class="p-pos-top"><span class="p-pos-name">' +
                '<i class="p-rank">' + (l.rank || "") + "</i>" + esc(l.item.name) + "</span>" +
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


  /* ---------- one slide per sleeve ----------
   *
   * Two questions a client always asks: why this much of it, and why these
   * instruments. Both answers are read back out of the same allocation and
   * the same scores the book itself is built from — this is a restatement
   * of the engine, never a second opinion about it. If the arithmetic below
   * ever stops matching ENGINE.roomAllocation(), the slide is wrong and the
   * engine is right.
   */

  var SLEEVE_SLIDES = [
    { key: "equities",    host: "sleeveEquities",    badge: "swEquities" },
    { key: "fixedIncome", host: "sleeveFixedIncome", badge: "swFixedIncome" },
    { key: "notes",       host: "sleeveNotes",       badge: "swNotes" },
    { key: "fx",          host: "sleeveFx",          badge: "swFx" }
  ];

  function pct(x) { return (Math.round(x * 10) / 10) + "%"; }
  function signed(x) {
    var v = Math.round(x * 10) / 10;
    return (v > 0 ? "+" : v === 0 ? "" : "") + v + "%";
  }

  /* The allocation arithmetic, restated term by term. Mirrors
     ENGINE.roomAllocation() exactly. */
  function allocTerms(alloc) {
    var d = alloc.drivers;
    var notesRaw = 8 + d.levered * 14;
    var fxRaw    = 5 + (Math.abs(d.usd - 50) / 50) * 12;
    var left     = 100 - notesRaw - fxRaw;

    var eqRisk = (d.risk / 2) * 0.60;
    var eqView = (d.view - 1) * 0.08;
    var eqHor  = Math.max(-0.10, Math.min(0.10, ((d.horizon - 10) / 20) * 0.10));
    var eqInc  = -d.income * 0.16;
    var share  = Math.max(0.05, Math.min(0.90, 0.15 + eqRisk + eqView + eqHor + eqInc));

    var riskWord = band(d.risk, [0.7, 1.35], ["cautious", "moderate", "risk-seeking"]);
    var viewWord = band(d.view, [0.7, 1.35], ["bearish", "neutral", "bullish"]);

    return {
      equities: {
        rows: [
          ["Starting risk budget", "every room begins here", signed(15)],
          ["Risk appetite &mdash; " + riskWord,
           "averaged " + (Math.round(d.risk * 100) / 100) + " of 2", signed(eqRisk * 100)],
          ["Market view &mdash; " + viewWord,
           "averaged " + (Math.round(d.view * 100) / 100) + " of 2", signed(eqView * 100)],
          ["Horizon &mdash; " + Math.round(d.horizon) + " years",
           "against a 10-year baseline", signed(eqHor * 100)],
          ["Income seekers",
           Math.round(d.income * 100) + "% of the room wanted income", signed(eqInc * 100)]
        ],
        sum:   ["Equity share of what is left", pct(share * 100)],
        total: ["of the " + pct(left) + " outside notes and FX", alloc.equities + "%"]
      },
      fixedIncome: {
        rows: [
          ["Equities take their share first", "driven by the room's risk appetite", pct(share * 100)],
          ["Fixed income takes the rest", "it is the residual, not a target", pct((1 - share) * 100)]
        ],
        sum:   ["Share of what is left", pct((1 - share) * 100)],
        total: ["of the " + pct(left) + " outside notes and FX", alloc.fixedIncome + "%"]
      },
      notes: {
        rows: [
          ["Base allocation", "a standing place in the book", signed(8)],
          ["Leverage appetite",
           Math.round(d.levered * 100) + "% of the room said yes &mdash; expressed through notes, not margin",
           signed(d.levered * 14)]
        ],
        total: ["Structured notes", alloc.notes + "%"]
      },
      fx: {
        rows: [
          ["Base allocation", "a standing place in the book", signed(5)],
          ["Dollar conviction",
           "the room averaged " + Math.round(d.usd) + "% in dollars, " +
           Math.round(Math.abs(d.usd - 50)) + " points off indifference",
           signed((Math.abs(d.usd - 50) / 50) * 12)]
        ],
        total: ["FX", alloc.fx + "%"]
      }
    };
  }

  var SECTOR_WORD = {
    core: "broad market", tech: "technology", financials: "financials",
    healthcare: "healthcare", energy: "energy and materials",
    consumer: "consumer", industrials: "industrials"
  };

  /* Why THIS instrument, in concrete terms. A reason that could be printed
     against any line in the sleeve is not a reason, so each one names the
     actual fact that earned the place: the sector, the rating, the tenor,
     the dollar weight. */
  function axisPhrase(axisId, agg, item) {
    var f = item.fit || {}, d = item.data || {};
    function roomLeads(k) {
      var c = (agg.axes[axisId] || {}).counts || {}, best = null;
      Object.keys(c).forEach(function (x) { if (!best || c[x] > c[best]) best = x; });
      return best === k;
    }
    switch (axisId) {
      case "sector": {
        var w = SECTOR_WORD[item.sector] || item.sector;
        if (!w) return "the sector mix the room asked for";
        var asked = ((agg.axes.sector || {}).counts || {})[item.sector];
        return w + (asked ? " &mdash; a sector the room chose" : ", for breadth");
      }
      case "country":
        return (item.region === "em" || item.region === "EM")
          ? "emerging markets" : "developed markets";
      case "usd": {
        var t = f.usd && f.usd.target;
        if (t === undefined) return "the dollar weight the room wanted";
        return t >= 95 ? "fully dollar-denominated"
             : t <= 10 ? "priced outside the dollar"
             : Math.round(t) + "% dollar exposure";
      }
      case "riskProfile": {
        var r = f.riskProfile && f.riskProfile.target;
        if (r === undefined) return "sits where the room's risk sits";
        return r >= 1.5 ? "high beta, which the room asked for"
             : r <= 0.5 ? "defensive, as the room asked"
             : "mid risk, where the room landed";
      }
      case "capitalIncome": return roomLeads("income") ? "pays a coupon" : "held for capital growth";
      case "duration":      return d.duration ? (Math.round(d.duration * 10) / 10) + "-year duration" : "the duration the room asked for";
      case "credit":        return item.rating ? "rated " + item.rating : (roomLeads("hy") ? "the credit risk the room accepted" : "investment grade, as asked");
      case "horizon":       return item.tenor ? item.tenor + " tenor" : "tenor matches the room's horizon";
      case "leverage":      return "carries the gearing the room wanted";
      default:              return axisId;
    }
  }

  /* Rank the axes an instrument is unusually strong on, measured against
     the rest of its own shelf. */
  function edges(line, scored, W) {
    var per = line.per || {}, axes = Object.keys(per);
    var mean = {};
    axes.forEach(function (ax) {
      var t = 0, n = 0;
      scored.forEach(function (r) {
        if (r.per && r.per[ax] !== undefined) { t += r.per[ax]; n++; }
      });
      mean[ax] = n ? t / n : 0;
    });
    return axes.map(function (ax) {
      return { ax: ax, edge: (W[ax] || 1) * (per[ax] - mean[ax]), score: per[ax] };
    }).filter(function (x) { return x.edge > 0.015 && x.score >= 0.45; })
      .sort(function (a, b) { return b.edge - a.edge; });
  }

  /* Reasons are assigned across the whole sleeve at once. Five lines that
     each say "matches the room's risk" tell a client nothing, so once an
     angle is used it is not repeated while another one is still available. */
  /* What a line IS, for when what it is good at has already been claimed
     by something above it. */
  function identityPhrase(item, used) {
    var f = item.fit || {}, d = item.data || {};
    var cands = [];
    if (item.sector && SECTOR_WORD[item.sector]) {
      cands.push(SECTOR_WORD[item.sector] + " &mdash; breadth beyond the lead exposures");
    }
    if (item.rating) cands.push("rated " + item.rating + ", spreading issuer risk");
    if (item.tenor)  cands.push(item.tenor + " tenor, laddering the sleeve");
    if (d.duration)  cands.push((Math.round(d.duration * 10) / 10) + "-year duration, laddering the sleeve");
    if (item.region) cands.push((item.region === "em" || item.region === "EM"
      ? "emerging market" : "developed market") + " exposure, for spread");
    cands.push("closest remaining fit once the sleeve was diversified");
    for (var i = 0; i < cands.length; i++) {
      if (!used[cands[i]]) { used[cands[i]] = 1; return cands[i]; }
    }
    return cands[cands.length - 1];
  }

  function reasonsForSleeve(lines, scored, W, agg) {
    /* Tracked by wording, not by axis. Two funds can both be strongest on
       sector and still earn different sentences ("technology", "healthcare"),
       but four funds that are all simply mid-risk produce the same sentence
       four times, which reads as the deck having nothing to say. */
    var used = {};
    function take(e, line) {
      for (var i = 0; i < e.length; i++) {
        var phrase = axisPhrase(e[i].ax, agg, line.item);
        if (!used[phrase]) { used[phrase] = 1; return { phrase: phrase, edge: e[i].edge }; }
      }
      return null;
    }

    return lines.map(function (l) {
      var out = [], e = edges(l, scored, W);

      var first = take(e, l);
      if (first) out.push(first.phrase);

      /* A second angle only when it is genuinely strong and not already
         said somewhere else in this sleeve. */
      var second = take(e.filter(function (x) { return x.edge >= 0.05; }), l);
      if (second) out.push(second.phrase);

      if (l.shelfRank && l.rank && l.shelfRank > l.rank + 1) {
        out.push("#" + l.shelfRank + (l.shelfOf ? " of " + l.shelfOf : "") +
                 " on fit alone &mdash; held for breadth");
      }
      if (l.item && l.item.isCore) out.push("index-linked, counts toward the 50% floor");

      /* Nothing distinctive left to say is itself the honest answer — the
         sleeve had already taken the obvious exposures — but it should
         still name what this line adds rather than repeating a shrug. */
      if (!out.length) out.push(identityPhrase(l.item, used));
      return out;
    });
  }

  function paintSleeves(agg, alloc) {
    if (!window.PRODUCTS) return;
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) return;
    var terms = allocTerms(alloc);

    SLEEVE_SLIDES.forEach(function (S) {
      var host = document.getElementById(S.host);
      var badge = document.getElementById(S.badge);
      if (!host) return;

      var bucket = null;
      sim.buckets.forEach(function (b) { if (b.key === S.key) bucket = b; });
      if (!bucket) { host.innerHTML = ""; return; }

      if (badge) badge.textContent = bucket.weight + "%";

      var cfg = window.PRODUCTS[S.key] || {};
      var W = (cfg.selection || {}).weights || {};
      var scored = bucket.scored || [];
      if (!scored.length) {
        try { scored = window.ENGINE.scoreShelf(agg, cfg, { allocation: bucket.weight }).all; }
        catch (e) { scored = []; }
      }

      var T = terms[S.key] || { rows: [] };
      var colour = BUCKET_COLOUR[S.key];

      var whyMuch =
        '<div class="p-sl-head">Why ' + bucket.weight + '%</div>' +
        T.rows.map(function (r) {
          return '<div class="p-term">' +
            '<span class="p-term-l">' + r[0] + '<i>' + r[1] + "</i></span>" +
            '<b>' + r[2] + "</b></div>";
        }).join("") +
        (T.sum ? '<div class="p-term p-term-sum"><span class="p-term-l">' + T.sum[0] +
                 "</span><b>" + T.sum[1] + "</b></div>" : "") +
        (T.total ? '<div class="p-term p-term-tot"><span class="p-term-l">' + T.total[0] +
                 "</span><b>" + T.total[1] + "</b></div>" : "");

      var n = bucket.lines.length;
      var heading = n === 1 ? "Why this one"
                  : n === 2 ? "Why these two"
                  : n === 3 ? "Why these three"
                  : "Why these " + n;

      /* The same three axes down the whole sleeve, so the bars can be read
         against each other. Picking each line's own best three made every
         row a different chart. */
      var present = {};
      bucket.lines.forEach(function (l) {
        Object.keys(l.per || {}).forEach(function (ax) { present[ax] = 1; });
      });
      var showAxes = Object.keys(present).sort(function (a, b) {
        return (W[b] || 1) - (W[a] || 1);
      }).slice(0, 3);

      var allReasons = reasonsForSleeve(bucket.lines, scored, W, agg);

      var picks = bucket.lines.length
        ? bucket.lines.map(function (l, idx) {
            var per = l.per || {};
            var bars = showAxes.map(function (ax) {
              var v = per[ax];
              return '<span class="p-ax"><em>' + esc(shortAxis(ax)) + "</em>" +
                '<i><u style="width:' + (v === undefined ? 0 : Math.round(v * 100)) +
                "%;background:" + colour + '"></u></i></span>';
            }).join("");

            return '<div class="p-pk">' +
              '<div class="p-pk-top"><i class="p-rank">' + (l.rank || "") + "</i>" +
                '<span class="p-pk-name">' + esc(l.item.name) + "</span>" +
                '<b class="p-pk-w">' + l.weight + "%</b></div>" +
              '<div class="p-pk-why">' + allReasons[idx].join(" <em>&middot;</em> ") + "</div>" +
              '<div class="p-pk-axes">' + bars + "</div>" +
              "</div>";
          }).join("")
        : '<p class="p-book-empty">Nothing in this sleeve.</p>';

      host.innerHTML =
        '<div class="p-sl-col p-sl-why">' + whyMuch + "</div>" +
        '<div class="p-sl-col p-sl-picks"><div class="p-sl-head">' + heading + "</div>" +
          picks + "</div>";
    });
  }

  /* Axis labels are full questions; a bar needs a word. */
  function shortAxis(id) {
    return ({ riskProfile: "risk", marketView: "view", horizon: "horizon",
              leverage: "gearing", country: "region", sector: "sector",
              usd: "dollar", capitalIncome: "income", duration: "duration",
              credit: "credit" })[id] || id;
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
