/* NextGen — methodology and validation page.
 *
 * Renders the whole product universe, the fit matrix and the selection
 * weights straight out of data/products.json, then runs either the live
 * room or a scenario you set through the same ENGINE.roomPortfolio() the
 * guest and presenter screens call. If the numbers here disagree with the
 * rest of the site, the site is wrong.
 */
(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function n(v, d) {
    return v === null || v === undefined || v === "" ? "" : Number(v).toFixed(d === undefined ? 2 : d);
  }
  function shade(v) {
    var a = Math.max(0, Math.min(1, v));
    return "background:rgba(57,135,229," + (a * 0.42).toFixed(3) + ")";
  }

  var BUCKETS = [
    { key: "equities",    label: "Equities",         colour: "var(--series-equities)" },
    { key: "fixedIncome", label: "Fixed income",     colour: "var(--series-fixedincome)" },
    { key: "notes",       label: "Structured notes", colour: "var(--series-notes)" },
    { key: "fx",          label: "FX",               colour: "var(--series-cash)" }
  ];

  var WEIGHT_LABEL = {
    riskProfile: "Risk profile", sector: "Sector", country: "Country of risk",
    capitalIncome: "Capital or income", marketView: "Market view", usd: "USD share",
    credit: "IG or HY", duration: "Duration", horizon: "Horizon", leverage: "Leverage"
  };

  /* Each sleeve shows the columns that mean something for it. */
  var COLUMNS = {
    equities: [
      ["Instrument", function (p) { return name2(p, p.note); }],
      ["Sleeve",  function (p) { return pill(p.sleeve); }],
      ["Sector",  function (p) { return p.sector; }],
      ["Region",  function (p) { return p.region.toUpperCase(); }],
      ["USD %",   function (p) { return p.usdExposure; }, "num"],
      ["Ccy",     function (p) { return (p.data && p.data.currency) || ""; }],
      ["Price",   function (p) { return p.data && p.data.price ? n(p.data.price) : "&mdash;"; }, "num"]
    ],
    fixedIncome: [
      ["Instrument", function (p) { return name2(p, p.note); }],
      ["Ccy",     function (p) { return p.currency; }],
      ["Credit",  function (p) { return pill(p.credit.toUpperCase()); }],
      ["Rating",  function (p) { return p.rating || ""; }],
      ["USD %",   function (p) { return p.usdExposure; }, "num"],
      ["YTW",     function (p) { return n(p.data.ytw); }, "num"],
      ["Dur",     function (p) { return n(p.data.duration); }, "num"],
      ["Coupon",  function (p) { return n(p.data.coupon); }, "num"]
    ],
    notes: [
      ["Instrument", function (p) { return name2(p, p.note); }],
      ["Linked to", function (p) {
        return p.isIndex ? '<span class="m-pill m-idx">Index</span>'
                         : '<span class="m-pill">Single name</span>'; }],
      ["Type",    function (p) { return pill(p.type); }],
      ["Tenor",   function (p) { return p.tenor; }],
      ["Barrier", function (p) { return p.barrier || "&mdash;"; }],
      ["Coupon",  function (p) { return p.coupon || ""; }],
      ["Risk",    function (p) { return p.riskBand; }, "num"],
      ["Region",  function (p) { return p.region; }]
    ],
    fx: [
      ["Instrument", function (p) { return name2(p, p.note); }],
      ["Kind",    function (p) { return pill(p.kind); }]
    ]
  };

  function name2(p, sub) {
    return '<span class="m-name">' + esc(p.name) + "</span>" +
      (sub ? '<br><span class="m-sub">' + esc(sub) + "</span>" : "");
  }
  function pill(t) { return t ? '<span class="m-pill">' + esc(t) + "</span>" : ""; }

  var active = "equities";

  /* ---------- 01 buckets ---------- */
  function renderBuckets() {
    var steps = [
      ["Structured notes", "<code>8 + 14 &times; share who would use leverage</code>"],
      ["FX", "<code>5 + 12 &times; |USD share &minus; 50| / 50</code>. A dollar view away from neutral funds a real sleeve."],
      ["Equity share", "<code>0.15 + 0.60&times;risk + 0.08&times;(view&minus;1) + horizon tilt &minus; 0.16&times;income</code>, clamped to 0.05&ndash;0.90, of what remains."],
      ["Equities", "<code>(100 &minus; notes &minus; FX) &times; equity share</code>"],
      ["Fixed income", "<code>(100 &minus; notes &minus; FX) &minus; equities</code>"]
    ];
    el("bucketFormula").innerHTML = steps.map(function (s) {
      return '<div class="m-step"><b>' + esc(s[0]) + "</b><span>" + s[1] + "</span></div>";
    }).join("");
  }

  /* ---------- 02 the universe ---------- */
  function renderNav(P) {
    el("shelfNav").innerHTML = BUCKETS.map(function (b) {
      return '<button type="button" class="m-tab' + (b.key === active ? " on" : "") +
        '" data-b="' + b.key + '"><s style="background:' + b.colour + '"></s>' +
        esc(b.label) + " <em>" + P[b.key].shelf.length + "</em></button>";
    }).join("");
    el("shelfNav").querySelectorAll(".m-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        active = t.getAttribute("data-b");
        renderNav(P); renderShelf(P); renderMatrix(P);
      });
    });
  }

  function renderShelf(P) {
    var cfg = P[active], cols = COLUMNS[active];
    el("shelfTable").innerHTML =
      "<thead><tr><th></th>" + cols.map(function (c) {
        return "<th" + (c[2] === "num" ? ' class="num"' : "") + ">" + esc(c[0]) + "</th>";
      }).join("") + "</tr></thead><tbody>" +
      cfg.shelf.map(function (p) {
        return "<tr><td><span class=\"m-tk\">" + esc(p.ticker) + "</span></td>" +
          cols.map(function (c) {
            return "<td" + (c[2] === "num" ? ' class="num"' : "") + ">" + c[1](p) + "</td>";
          }).join("") + "</tr>";
      }).join("") + "</tbody>";

    var note = "Top <b>" + esc((cfg.selection || {}).topN || 4) + "</b> by score make the book, " +
      "weighted in proportion to those scores.";
    if (cfg.$rule) {
      note += " <b>House rule:</b> " + esc(cfg.$rule) +
        " If the scores alone do not reach it, the index lines are scaled up and the " +
        "single-name lines down until they do, keeping the order within each group.";
    }
    el("shelfNote").innerHTML = note;
  }

  function renderUniLead(P) {
    var total = BUCKETS.reduce(function (t, b) { return t + P[b.key].shelf.length; }, 0);
    el("uniLead").innerHTML =
      "<b>" + total + "</b> instruments across the four sleeves, taken from the desk's own " +
      "product files. The FX shelf arrives already scored against these ten questions and is " +
      "translated into the site's units rather than reinterpreted. Market data where shown is " +
      "a snapshot dated " + esc(P.asOf) + ".";
  }

  /* ---------- 03 weights ---------- */
  function renderAllWeights(P) {
    el("allWeights").innerHTML = BUCKETS.map(function (b) {
      var W = (P[b.key].selection || {}).weights || {};
      var max = Math.max.apply(null, Object.keys(W).map(function (k) { return W[k]; })) || 1;
      return '<div class="m-wcol"><h4><s style="background:' + b.colour + '"></s>' +
        esc(b.label) + "</h4>" +
        Object.keys(W).sort(function (x, y) { return W[y] - W[x]; }).map(function (k) {
          return '<div class="m-wrow2"><span>' + esc(WEIGHT_LABEL[k] || k) + "</span>" +
            '<span class="m-wbar"><i style="width:' + ((W[k] / max) * 100) +
            "%;background:" + b.colour + '"></i></span><b>' + n(W[k], 1) + "</b></div>";
        }).join("") + "</div>";
    }).join("");
  }

  /* ---------- 04 matrix ---------- */
  function renderMatrix(P) {
    var shelf = P[active].shelf;
    /* Only show the axes this sleeve actually scores on. */
    var axes = [];
    shelf.forEach(function (p) {
      Object.keys(p.fit).forEach(function (k) { if (axes.indexOf(k) === -1) axes.push(k); });
    });

    var cols = [];
    axes.forEach(function (axisId) {
      var axis = window.AXIS_BY_ID[axisId];
      var anyTarget = shelf.some(function (p) { return p.fit[axisId] && p.fit[axisId].target !== undefined; });
      if (anyTarget) {
        cols.push({ axis: axisId, target: true, label: WEIGHT_LABEL[axisId] || axisId, group: WEIGHT_LABEL[axisId] || axisId });
      } else if (axis && axis.options) {
        axis.options.forEach(function (o) {
          cols.push({ axis: axisId, a: o.v, label: String(o.label).slice(0, 7), group: WEIGHT_LABEL[axisId] || axisId });
        });
      }
    });

    var groups = [];
    cols.forEach(function (c) {
      var last = groups[groups.length - 1];
      if (last && last[0] === c.group) last[1]++; else groups.push([c.group, 1]);
    });

    el("matrixTable").innerHTML =
      "<thead><tr><th></th>" + groups.map(function (g) {
        return '<th colspan="' + g[1] + '" style="text-align:center">' + esc(g[0]) + "</th>";
      }).join("") + "</tr><tr><th>Instrument</th>" + cols.map(function (c) {
        return '<th class="rot" style="text-align:center">' + esc(c.label) + "</th>";
      }).join("") + "</tr></thead><tbody>" +
      shelf.map(function (p) {
        return "<tr><td><span class=\"m-tk\">" + esc(p.ticker) + "</span></td>" +
          cols.map(function (c) {
            var f = p.fit[c.axis];
            if (!f) return '<td class="c"></td>';
            if (c.target) {
              var t = f.target;
              if (t === undefined) return '<td class="c"></td>';
              var axis = window.AXIS_BY_ID[c.axis];
              var frac = axis ? (t - (axis.min || 0)) / (window.ENGINE.span(axis) || 1) : t;
              return '<td class="c" style="' + shade(frac) + '">' + t + "</td>";
            }
            var v = Array.isArray(f) ? f[c.a] : f[c.a];
            return v === undefined ? '<td class="c"></td>'
              : '<td class="c" style="' + shade(v) + '">' + n(v, 2) + "</td>";
          }).join("") + "</tr>";
      }).join("") + "</tbody>";
  }

  /* ---------- 05 sandbox ---------- */
  var mode = "live", scenario = {};

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
          var on = ax.kind === "multi" ? (scenario[ax.id] || []).indexOf(o.v) !== -1
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
          var list = scenario[ax.id] || [], at = list.indexOf(v);
          if (at !== -1) { if (list.length > 1) list.splice(at, 1); }
          else { if (ax.max && list.length >= ax.max) list.shift(); list.push(v); }
          scenario[ax.id] = list;
        } else scenario[ax.id] = v;
        renderControls(); recompute();
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

  function paintBook(agg) {
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) return;

    el("sbBar").innerHTML = BUCKETS.map(function (b) {
      return '<i style="flex:' + sim.alloc[b.key] + ' 0 0;background:' + b.colour + '"></i>';
    }).join("");
    el("sbLegend").innerHTML = BUCKETS.map(function (b) {
      return '<div><s style="background:' + b.colour + '"></s>' + esc(b.label) +
        "<b>" + sim.alloc[b.key] + "%</b></div>";
    }).join("");

    el("sbBook").innerHTML = sim.buckets.map(function (b) {
      var colour = (BUCKETS.filter(function (x) { return x.key === b.key; })[0] || {}).colour;
      return '<div><div class="m-bk-top"><s style="background:' + colour + '"></s>' +
        "<h4>" + esc(b.label) + "</h4><b>" + b.weight + "%</b></div>" +
        (b.lines.length ? b.lines.map(function (l) {
          return '<div class="m-bk-line"><span>' + esc(l.item.name) +
            (l.item.isIndex ? ' <span class="m-idx-dot" title="index-linked"></span>' : "") +
            "</span><b>" + l.weight + "%</b></div>";
        }).join("") : '<div class="m-bk-line"><span class="m-sub">nothing</span></div>') +
        (b.indexShare !== undefined
          ? '<div class="m-bk-rule">index-linked ' + b.indexShare + '% of the sleeve</div>' : "") +
        "</div>";
    }).join("");

    /* One score table per sleeve, so every selection is inspectable. */
    el("scoreTables").innerHTML = sim.buckets.map(function (b) {
      return '<h3 class="m-sub3">' + esc(b.label) + " scores</h3>" +
        '<div class="m-scroll"><table class="m-table" id="st-' + b.key + '"></table></div>';
    }).join("");

    sim.buckets.forEach(function (b) {
      var W = ((window.PRODUCTS[b.key] || {}).selection || {}).weights || {};
      var axes = Object.keys(W);
      var picked = {};
      b.lines.forEach(function (l) { picked[l.item.id] = l.weight; });

      var head = "<tr><th></th><th>Instrument</th>" +
        axes.map(function (a) { return '<th class="num">' + esc(WEIGHT_LABEL[a] || a) + "</th>"; }).join("") +
        '<th class="num">Score</th><th class="num">Weight</th></tr>';

      var body = (b.scored || []).map(function (r) {
        var w = picked[r.item.id];
        return '<tr class="' + (w ? "m-picked" : "") + '">' +
          '<td><span class="m-tk">' + esc(r.item.ticker) + "</span></td>" +
          '<td><span class="m-name">' + esc(r.item.name) + "</span></td>" +
          axes.map(function (a) {
            return r.per[a] === undefined ? '<td class="c"></td>'
              : '<td class="c" style="' + shade(r.per[a]) + '">' + n(r.per[a], 2) + "</td>";
          }).join("") +
          '<td class="num"><b>' + n(r.score, 3) + "</b></td>" +
          '<td class="num">' + (w ? w + "%" : '<span class="m-sub">not selected</span>') + "</td>" +
          "</tr>";
      }).join("");

      el("st-" + b.key).innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
    });

    el("liveLead").innerHTML =
      "Highlighted rows made the book. This runs the same <code>ENGINE.roomPortfolio()</code> " +
      "the guest and presenter screens call, so if these numbers are wrong they are wrong everywhere.";
  }

  function recompute() {
    if (mode === "custom") {
      el("modeNote").textContent = "A hypothetical room where everyone answers this way.";
      paintBook(window.ENGINE.aggregate([{ id: "s", answers: scenario }]));
    } else {
      window.STORE.results().then(function (res) {
        el("modeNote").textContent = res.agg.count
          ? res.agg.count + " response" + (res.agg.count === 1 ? "" : "s") + " in the room right now."
          : "No responses yet. Switch to a custom scenario to exercise the engine.";
        if (res.agg.count) paintBook(res.agg);
        else { el("sbBook").innerHTML = ""; el("scoreTables").innerHTML = ""; }
      }).catch(function () { el("modeNote").textContent = "Could not reach the vote backend."; });
    }
  }

  function setMode(m) {
    mode = m;
    el("modeLive").classList.toggle("on", m === "live");
    el("modeCustom").classList.toggle("on", m === "custom");
    el("controls").hidden = m !== "custom";
    if (m === "custom" && !Object.keys(scenario).length) { scenario = defaultScenario(); renderControls(); }
    recompute();
  }

  /* ---------- boot ---------- */
  window.BASE.ready.then(function () {
    var P = window.PRODUCTS;
    if (!P || !P.equities || !P.equities.shelf) {
      document.querySelector(".m-wrap").innerHTML =
        '<p class="m-lead">Could not load the product universe from data/products.json.</p>';
      return;
    }

    el("asOf").textContent = "Data " + P.asOf + " · " + (P.source || "");
    renderBuckets();
    renderUniLead(P);
    renderNav(P);
    renderShelf(P);
    renderAllWeights(P);
    renderMatrix(P);

    el("modeLive").addEventListener("click", function () { setMode("live"); });
    el("modeCustom").addEventListener("click", function () { setMode("custom"); });
    setMode("live");
    setInterval(function () { if (mode === "live") recompute(); }, 8000);
  });
})();
