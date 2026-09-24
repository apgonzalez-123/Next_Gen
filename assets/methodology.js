/* NextGen — methodology and validation page.
 *
 * Renders the equity shelf, the fit matrix and the selection weights
 * straight out of data/products.json, then runs the live room through the
 * same ENGINE.scoreEquityShelf() the guest and presenter screens call. If
 * the numbers here disagree with the rest of the site, the site is wrong.
 */
(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function n(v, d) { return v === null || v === undefined ? "" : Number(v).toFixed(d === undefined ? 2 : d); }

  /* A fit of 0 is the page background, 1 is a solid accent. Shading the
     matrix makes its shape readable before any number is. */
  function shade(v) {
    var a = Math.max(0, Math.min(1, v));
    return "background:rgba(57,135,229," + (a * 0.42).toFixed(3) + ")";
  }

  var SECTORS = ["tech", "financials", "healthcare", "energy", "consumer", "industrials"];
  var SECTOR_LABEL = {
    tech: "Tech", financials: "Fin", healthcare: "Health",
    energy: "Energy", consumer: "Cons", industrials: "Indus"
  };
  var RISK_LABEL = ["Conservative", "Moderate", "Aggressive"];
  var VIEW_LABEL = ["Bearish", "Neutral", "Bullish"];

  /* ---------- 01 buckets ---------- */
  function renderBuckets() {
    var steps = [
      ["Structured notes", "<code>8 + 14 &times; share who would use leverage</code>. Leverage is expressed through notes rather than margin."],
      ["FX", "<code>5 + 12 &times; |USD share &minus; 50| / 50</code>. A dollar view away from neutral funds a real sleeve; indifference at 50% does not."],
      ["Equity share", "<code>0.15 + 0.60&times;risk + 0.08&times;(view&minus;1) + horizon tilt &minus; 0.16&times;income</code>, clamped to 0.05&ndash;0.90. This is a share of what remains, not of the whole book."],
      ["Equities", "<code>(100 &minus; notes &minus; FX) &times; equity share</code>"],
      ["Fixed income", "<code>(100 &minus; notes &minus; FX) &minus; equities</code>. It absorbs the remainder."]
    ];
    el("bucketFormula").innerHTML = steps.map(function (s) {
      return '<div class="m-step"><b>' + esc(s[0]) + "</b><span>" + s[1] + "</span></div>";
    }).join("");
  }

  /* ---------- 02 the shelf ---------- */
  function renderShelf(eqc) {
    el("shelfLead").innerHTML =
      esc(eqc.shelf.length) + " products, chosen to span the six sectors, both regions, " +
      "the range from defensive income to high-beta growth, and the currency spectrum " +
      "from wholly dollar to wholly local. <b>USD %</b> is how much of a holding's " +
      "currency exposure is in dollars, which is what lets the dollar answer reach the " +
      "equity sleeve rather than only the FX one. Figures are a " +
      esc(eqc.source || "TradingView") + " snapshot taken on " + esc(eqc.asOf) + ".";

    var head = ["", "Product", "Sector", "Region", "USD %", "Style", "Price", "Beta 1y", "1y %", "Vol", "Fee %"];
    var rows = eqc.shelf.map(function (p) {
      var d = p.data;
      return "<tr>" +
        '<td><span class="m-tk">' + esc(p.ticker) + "</span></td>" +
        '<td><span class="m-name">' + esc(p.name) + "</span><br>" +
          '<span class="m-sub">' + esc(p.note) + "</span></td>" +
        "<td>" + esc(p.sector === "core" ? "Broad" : (SECTOR_LABEL[p.sector] || p.sector)) + "</td>" +
        "<td>" + esc(p.region.toUpperCase()) + "</td>" +
        '<td class="num">' + esc(p.usdExposure) + "</td>" +
        '<td><span class="m-pill">' + esc(p.style) + "</span></td>" +
        '<td class="num">' + n(d.price) + "</td>" +
        '<td class="num">' + n(d.beta1y) + "</td>" +
        '<td class="num ' + (d.perf1y >= 0 ? "m-pos" : "m-neg") + '">' +
          (d.perf1y >= 0 ? "+" : "") + n(d.perf1y, 1) + "</td>" +
        '<td class="num">' + n(d.volatility) + "</td>" +
        '<td class="num">' + n(d.expenseRatio) + "</td>" +
        "</tr>";
    }).join("");

    el("shelfTable").innerHTML =
      "<thead><tr>" + head.map(function (h, i) {
        return "<th" + (i === 4 || i >= 6 ? ' class="num"' : "") + ">" + esc(h) + "</th>";
      }).join("") + "</tr></thead><tbody>" + rows + "</tbody>";
  }

  /* ---------- 03 weights ---------- */
  var WEIGHT_LABEL = {
    riskProfile: "Risk profile", sector: "Sector exposure", country: "Country of risk",
    capitalIncome: "Capital or income", marketView: "Market view", usd: "USD share",
    credit: "IG or HY", duration: "Duration"
  };

  function weightBars(W, hostId) {
    var max = Math.max.apply(null, Object.keys(W).map(function (k) { return W[k]; })) || 1;
    el(hostId).innerHTML = Object.keys(W).sort(function (a, b) { return W[b] - W[a]; })
      .map(function (k) {
        return '<div class="m-wrow"><span>' + esc(WEIGHT_LABEL[k] || k) + "</span>" +
          '<span class="m-wbar"><i style="width:' + ((W[k] / max) * 100) + '%"></i></span>' +
          "<b>" + n(W[k], 1) + "</b></div>";
      }).join("");
  }

  function renderWeights(eqc) {
    var sel = eqc.selection || {};
    var W = sel.weights || {};
    weightBars(W, "weightBars");

    el("selNote").innerHTML =
      "Risk profile counts most because it is the answer that should move a book. " +
      "Market view counts least: it is a call about the next few months, and the " +
      "portfolio outlives it. The top <b>" + esc(sel.topN || 6) +
      "</b> products by score make the book, weighted in proportion to those scores. " +
      "Horizon, duration, leverage and the dollar share do not appear here because " +
      "they size the buckets rather than choose within equities.";
  }

  /* ---------- 04 the matrix ---------- */
  function renderMatrix(eqc) {
    var cols = [];
    SECTORS.forEach(function (s) { cols.push({ k: "sector", a: s, label: SECTOR_LABEL[s] }); });
    cols.push({ k: "country", a: "g7", label: "G7" });
    cols.push({ k: "country", a: "em", label: "EM" });
    RISK_LABEL.forEach(function (l, i) { cols.push({ k: "riskProfile", a: i, label: l.slice(0, 5) }); });
    VIEW_LABEL.forEach(function (l, i) { cols.push({ k: "marketView", a: i, label: l.slice(0, 4) }); });
    cols.push({ k: "capitalIncome", a: "capital", label: "Capital" });
    cols.push({ k: "capitalIncome", a: "income", label: "Income" });
    cols.push({ k: "usd", a: "target", label: "USD", target: true });

    var groups = [["Sector", 6], ["Country", 2], ["Risk profile", 3], ["Market view", 3],
                  ["Capital / income", 2], ["Dollar", 1]];

    var head =
      "<tr><th></th>" + groups.map(function (g) {
        return '<th colspan="' + g[1] + '" style="text-align:center">' + esc(g[0]) + "</th>";
      }).join("") + "</tr>" +
      '<tr><th>Product</th>' + cols.map(function (c) {
        return '<th class="rot" style="text-align:center">' + esc(c.label) + "</th>";
      }).join("") + "</tr>";

    var body = eqc.shelf.map(function (p) {
      return "<tr>" +
        '<td><span class="m-tk">' + esc(p.ticker) + "</span></td>" +
        cols.map(function (c) {
          var f = p.fit[c.k];
          if (c.target) {
            /* A target is a position on the 0-100 range, not a 0-1 fit, so
               it is shaded by that position and printed as a percentage. */
            var t = f ? f.target : null;
            if (t === null || t === undefined) return '<td class="c"></td>';
            return '<td class="c" style="' + shade(t / 100) + '">' + t + "</td>";
          }
          var v = Array.isArray(f) ? f[c.a] : f[c.a];
          return '<td class="c" style="' + shade(v) + '">' + n(v, 2) + "</td>";
        }).join("") +
        "</tr>";
    }).join("");

    el("matrixTable").innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
  }

  /* ---------- 05 worked example ---------- */
  /* One renderer for either scored sleeve. */
  function scoreTable(tableId, scored, bucket, axes, labels) {
    var picked = {};
    bucket.lines.forEach(function (l) { picked[l.item.id] = l.weight; });

    var head = "<tr><th></th><th>Product</th>" +
      axes.map(function (a) { return '<th class="num">' + esc(labels[a] || a) + "</th>"; }).join("") +
      '<th class="num">Score</th><th class="num">Weight</th></tr>';

    var body = scored.map(function (r) {
      var w = picked[r.item.id];
      return '<tr class="' + (w ? "m-picked" : "") + '">' +
        '<td><span class="m-tk">' + esc(r.item.ticker) + "</span></td>" +
        '<td><span class="m-name">' + esc(r.item.name) + "</span></td>" +
        axes.map(function (a) {
          return '<td class="c" style="' + shade(r.per[a]) + '">' + n(r.per[a], 2) + "</td>";
        }).join("") +
        '<td class="num"><b>' + n(r.score, 3) + "</b></td>" +
        '<td class="num">' + (w ? w + "%" : '<span class="m-sub">not selected</span>') + "</td>" +
        "</tr>";
    }).join("");

    el(tableId).innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
  }

  function renderLive(agg, eqc, sim) {
    var lead = el("liveLead");
    if (!agg.count) {
      lead.textContent = "No responses yet. Once the room answers, every product's score appears here with its breakdown.";
      el("liveTable").innerHTML = "";
      return;
    }

    var scored = window.ENGINE.scoreEquityShelf(agg, window.PRODUCTS);
    sim = sim || window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    var eqBucket = sim.buckets[0];

    lead.innerHTML = "The equity sleeve is <b>" + eqBucket.weight +
      "%</b> of the book, and the top " + esc((eqc.selection || {}).topN || 6) +
      " products by score share it in proportion. Highlighted rows made the book. " +
      "This is the same <code>ENGINE.scoreEquityShelf()</code> the guest and presenter " +
      "screens call, so if these numbers are wrong they are wrong everywhere.";

    scoreTable("liveTable", scored.all, eqBucket,
      ["riskProfile", "sector", "country", "usd", "capitalIncome", "marketView"],
      { riskProfile: "Risk", sector: "Sector", country: "Country", usd: "USD",
        capitalIncome: "Cap/Inc", marketView: "View" });

    var fiScored = window.ENGINE.scoreShelf(agg, window.PRODUCTS.fixedIncome);
    scoreTable("fiLiveTable", fiScored.all, sim.buckets[1],
      ["credit", "duration", "usd", "country", "capitalIncome"],
      { credit: "IG/HY", duration: "Duration", usd: "USD", country: "Country",
        capitalIncome: "Cap/Inc" });
  }

  /* ---------- 05 the other shelves ---------- */
  var BUCKET_COLOUR = {
    equities: "var(--series-equities)", fixedIncome: "var(--series-fixedincome)",
    notes: "var(--series-notes)", fx: "var(--series-cash)"
  };

  function renderFixedIncome(fic) {
    el("fiLead").innerHTML =
      esc(fic.shelf.length) + " instruments spanning sovereign to high yield, developed to " +
      "emerging, and the same currency spectrum as the equity shelf. This sleeve is scored " +
      "rather than rule-picked, which is what lets the dollar answer reach it: an unhedged " +
      "international treasury line and a dollar aggregate sit at opposite ends of the same " +
      "range. Top <b>" + esc((fic.selection || {}).topN || 4) + "</b> make the book.";

    var head = ["", "Instrument", "Credit", "Region", "USD %", "Duration", "Price", "Beta 1y", "1y %", "Vol", "Fee %"];
    var rows = fic.shelf.map(function (p) {
      var d = p.data;
      return "<tr>" +
        '<td><span class="m-tk">' + esc(p.ticker) + "</span></td>" +
        '<td><span class="m-name">' + esc(p.name) + "</span><br>" +
          '<span class="m-sub">' + esc(p.note) + "</span></td>" +
        '<td><span class="m-pill">' + esc(p.credit.toUpperCase()) + "</span></td>" +
        "<td>" + esc(p.region.toUpperCase()) + "</td>" +
        '<td class="num">' + esc(p.usdExposure) + "</td>" +
        '<td class="num">' + esc(p.fit.duration.target) + "y</td>" +
        '<td class="num">' + n(d.price) + "</td>" +
        '<td class="num">' + n(d.beta1y) + "</td>" +
        '<td class="num ' + (d.perf1y >= 0 ? "m-pos" : "m-neg") + '">' +
          (d.perf1y >= 0 ? "+" : "") + n(d.perf1y, 1) + "</td>" +
        '<td class="num">' + n(d.volatility) + "</td>" +
        '<td class="num">' + n(d.expenseRatio) + "</td>" +
        "</tr>";
    }).join("");

    el("fiTable").innerHTML = "<thead><tr>" + head.map(function (h, i) {
      return "<th" + (i >= 4 ? ' class="num"' : "") + ">" + esc(h) + "</th>";
    }).join("") + "</tr></thead><tbody>" + rows + "</tbody>";

    weightBars((fic.selection || {}).weights || {}, "fiWeights");
  }

  function renderOtherShelves(products) {
    var groups = [
      ["notes", "Structured notes", "Risk appetite slides the sleeve from capital-protected toward autocallables and reverse convertibles. Leverage adds the participation note."],
      ["fx", "FX", "The dollar share splits USD against a local-currency basket. An EM room adds a BRL sleeve. This sleeve is deliberately small: most of a book's currency exposure now comes from where the equities and bonds are denominated."]
    ];
    el("otherShelves").innerHTML = groups.map(function (g) {
      var shelf = products[g[0]] || {};
      var items = Object.keys(shelf).map(function (k) {
        var it = shelf[k];
        if (!it || !it.name) return "";
        return '<div class="m-item"><div class="n">' + esc(it.name) + "</div>" +
          '<div class="d"><span class="m-tk">' + esc(it.ticker) + "</span>" + esc(it.detail || "") + "</div></div>";
      }).join("");
      return '<div class="m-shelf"><h4><s style="background:' + BUCKET_COLOUR[g[0]] + '"></s>' +
        esc(g[1]) + "</h4><p>" + esc(g[2]) + "</p>" + items + "</div>";
    }).join("");
  }

  /* ---------- 06 sandbox ---------- */
  var mode = "live";
  var scenario = {};

  function defaultScenario() {
    var a = {};
    window.AXES.forEach(function (ax) {
      if (ax.kind === "range") a[ax.id] = typeof ax.def === "number" ? ax.def : Math.round((ax.min + ax.max) / 2);
      else if (ax.kind === "scale") a[ax.id] = Math.floor(ax.options.length / 2);
      else if (ax.kind === "multi") a[ax.id] = [ax.options[0].v];
      else a[ax.id] = ax.options[0].v;
    });
    return a;
  }

  function renderControls() {
    var host = el("controls");
    host.innerHTML = window.AXES.map(function (ax) {
      var body;
      if (ax.kind === "range") {
        body = '<div class="m-range"><input type="range" class="rng-input" data-ax="' + ax.id +
          '" min="' + ax.min + '" max="' + ax.max + '" step="' + (ax.step_ || 1) +
          '" value="' + scenario[ax.id] + '"><b id="rv-' + ax.id + '">' +
          esc(window.axisLabel(ax.id, scenario[ax.id])) + "</b></div>";
      } else {
        body = '<div class="m-seg">' + ax.options.map(function (o) {
          var on = ax.kind === "multi"
            ? (scenario[ax.id] || []).indexOf(o.v) !== -1
            : scenario[ax.id] === o.v;
          return '<button type="button" data-ax="' + ax.id + '" data-v="' + esc(String(o.v)) +
            '" class="' + (on ? "on" : "") + '">' + esc(o.label) + "</button>";
        }).join("") + "</div>";
      }
      return '<div class="m-ctl"><label>' + esc(ax.label) + "</label>" + body + "</div>";
    }).join("");

    host.querySelectorAll(".m-seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        var ax = window.AXIS_BY_ID[b.getAttribute("data-ax")];
        var raw = b.getAttribute("data-v");
        var v = ax.kind === "scale" ? Number(raw) : raw;
        if (ax.kind === "multi") {
          var list = scenario[ax.id] || [];
          var at = list.indexOf(v);
          if (at !== -1) { if (list.length > 1) list.splice(at, 1); }
          else { if (ax.max && list.length >= ax.max) list.shift(); list.push(v); }
          scenario[ax.id] = list;
        } else {
          scenario[ax.id] = v;
        }
        renderControls();
        recompute();
      });
    });

    host.querySelectorAll('input[type="range"]').forEach(function (r) {
      r.addEventListener("input", function () {
        var id = r.getAttribute("data-ax");
        scenario[id] = Number(r.value);
        el("rv-" + id).textContent = window.axisLabel(id, scenario[id]);
        recompute();
      });
    });
  }

  function paintBook(agg, eqc) {
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) return;

    var keys = [
      { k: "equities", label: "Equities" }, { k: "fixedIncome", label: "Fixed income" },
      { k: "notes", label: "Structured notes" }, { k: "fx", label: "FX" }
    ];
    el("sbBar").innerHTML = keys.map(function (x) {
      return '<i style="flex:' + sim.alloc[x.k] + ' 0 0;background:' + BUCKET_COLOUR[x.k] + '"></i>';
    }).join("");
    el("sbLegend").innerHTML = keys.map(function (x) {
      return '<div><s style="background:' + BUCKET_COLOUR[x.k] + '"></s>' + x.label +
        "<b>" + sim.alloc[x.k] + "%</b></div>";
    }).join("");

    el("sbBook").innerHTML = sim.buckets.map(function (b) {
      return '<div><div class="m-bk-top"><s style="background:' + BUCKET_COLOUR[b.key] + '"></s>' +
        "<h4>" + esc(b.label) + "</h4><b>" + b.weight + "%</b></div>" +
        (b.lines.length ? b.lines.map(function (l) {
          return '<div class="m-bk-line"><span>' + esc(l.item.name) + "</span><b>" + l.weight + "%</b></div>";
        }).join("") : '<div class="m-bk-line"><span class="m-sub">nothing</span></div>') +
        "</div>";
    }).join("");

    renderLive(agg, eqc, sim);
  }

  function recompute() {
    var eqc = window.PRODUCTS.equities;
    if (mode === "custom") {
      el("modeNote").textContent = "A hypothetical room where everyone answers this way.";
      paintBook(window.ENGINE.aggregate([{ id: "s", answers: scenario }]), eqc);
    } else {
      window.STORE.results().then(function (res) {
        el("modeNote").textContent = res.agg.count
          ? res.agg.count + " response" + (res.agg.count === 1 ? "" : "s") + " in the room right now."
          : "No responses yet. Switch to a custom scenario to exercise the engine.";
        paintBook(res.agg, eqc);
      }).catch(function () {
        el("modeNote").textContent = "Could not reach the vote backend.";
      });
    }
  }

  function setMode(m) {
    mode = m;
    el("modeLive").classList.toggle("on", m === "live");
    el("modeCustom").classList.toggle("on", m === "custom");
    el("controls").hidden = m !== "custom";
    if (m === "custom" && !Object.keys(scenario).length) {
      scenario = defaultScenario();
      renderControls();
    }
    recompute();
  }

  /* ---------- boot ---------- */
  window.BASE.ready.then(function () {
    var eqc = window.PRODUCTS && window.PRODUCTS.equities;
    if (!eqc || !eqc.shelf) {
      document.querySelector(".m-wrap").innerHTML =
        '<p class="m-lead">Could not load the product shelf from data/products.json.</p>';
      return;
    }

    el("asOf").textContent = "Market data " + eqc.asOf + " · " + (eqc.source || "");
    renderBuckets();
    renderShelf(eqc);
    renderWeights(eqc);
    renderMatrix(eqc);

    if (window.PRODUCTS.fixedIncome && window.PRODUCTS.fixedIncome.shelf) {
      renderFixedIncome(window.PRODUCTS.fixedIncome);
    }
    renderOtherShelves(window.PRODUCTS);

    el("modeLive").addEventListener("click", function () { setMode("live"); });
    el("modeCustom").addEventListener("click", function () { setMode("custom"); });
    setMode("live");

    /* Only poll while showing the live room; a custom scenario must not be
       overwritten by an incoming response. */
    setInterval(function () { if (mode === "live") recompute(); }, 8000);
  });
})();
