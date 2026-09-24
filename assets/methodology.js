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
      "and the range from defensive income to high-beta growth. Figures are a " +
      esc(eqc.source || "TradingView") + " snapshot taken on " + esc(eqc.asOf) + ".";

    var head = ["", "Product", "Sector", "Region", "Style", "Price", "Beta 1y", "1y %", "Vol", "Fee %"];
    var rows = eqc.shelf.map(function (p) {
      var d = p.data;
      return "<tr>" +
        '<td><span class="m-tk">' + esc(p.ticker) + "</span></td>" +
        '<td><span class="m-name">' + esc(p.name) + "</span><br>" +
          '<span class="m-sub">' + esc(p.note) + "</span></td>" +
        "<td>" + esc(p.sector === "core" ? "Broad" : (SECTOR_LABEL[p.sector] || p.sector)) + "</td>" +
        "<td>" + esc(p.region.toUpperCase()) + "</td>" +
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
        return "<th" + (i >= 5 ? ' class="num"' : "") + ">" + esc(h) + "</th>";
      }).join("") + "</tr></thead><tbody>" + rows + "</tbody>";
  }

  /* ---------- 03 weights ---------- */
  function renderWeights(eqc) {
    var sel = eqc.selection || {};
    var W = sel.weights || {};
    var max = Math.max.apply(null, Object.keys(W).map(function (k) { return W[k]; })) || 1;
    var labels = {
      riskProfile: "Risk profile", sector: "Sector exposure", country: "Country of risk",
      capitalIncome: "Capital or income", marketView: "Market view"
    };
    el("weightBars").innerHTML = Object.keys(W).sort(function (a, b) { return W[b] - W[a]; })
      .map(function (k) {
        return '<div class="m-wrow"><span>' + esc(labels[k] || k) + "</span>" +
          '<span class="m-wbar"><i style="width:' + ((W[k] / max) * 100) + '%"></i></span>' +
          "<b>" + n(W[k], 1) + "</b></div>";
      }).join("");

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

    var groups = [["Sector", 6], ["Country", 2], ["Risk profile", 3], ["Market view", 3], ["Capital / income", 2]];

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
          var v = Array.isArray(f) ? f[c.a] : f[c.a];
          return '<td class="c" style="' + shade(v) + '">' + n(v, 2) + "</td>";
        }).join("") +
        "</tr>";
    }).join("");

    el("matrixTable").innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
  }

  /* ---------- 05 worked example ---------- */
  function renderLive(agg, eqc) {
    var lead = el("liveLead");
    if (!agg.count) {
      lead.textContent = "No responses yet. Once the room answers, every product's score appears here with its breakdown.";
      el("liveTable").innerHTML = "";
      return;
    }

    var scored = window.ENGINE.scoreEquityShelf(agg, window.PRODUCTS);
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    var eqBucket = sim.buckets[0];
    var picked = {};
    eqBucket.lines.forEach(function (l) { picked[l.item.id] = l.weight; });

    lead.innerHTML = "Scored against <b>" + agg.count + "</b> response" +
      (agg.count === 1 ? "" : "s") + " in the room right now. The equity sleeve is <b>" +
      eqBucket.weight + "%</b> of the book; the top " + esc((eqc.selection || {}).topN || 6) +
      " products share it in proportion to their scores.";

    var axes = ["riskProfile", "sector", "country", "capitalIncome", "marketView"];
    var axisLabel = {
      riskProfile: "Risk", sector: "Sector", country: "Country",
      capitalIncome: "Cap/Inc", marketView: "View"
    };

    var head = "<tr><th></th><th>Product</th>" +
      axes.map(function (a) { return '<th class="num">' + esc(axisLabel[a]) + "</th>"; }).join("") +
      '<th class="num">Score</th><th class="num">Weight</th></tr>';

    var body = scored.all.map(function (r) {
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

    el("liveTable").innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
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

    function pull() {
      window.STORE.results()
        .then(function (res) { renderLive(res.agg, eqc); })
        .catch(function (e) {
          console.error(e);
          el("liveLead").textContent = "Could not reach the vote backend.";
        });
    }
    pull();
    setInterval(pull, 8000);
  });
})();
