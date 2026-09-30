/* The validation dashboard.
 *
 * A developer and desk tool, not a guest screen: it exists to make it
 * obvious WHY a portfolio does or does not reflect the room. All the
 * thinking lives in portfolio-validator.js; this file only draws it.
 */
(function () {
  "use strict";

  var V = window.PORTFOLIO_VALIDATOR;
  var SCENARIOS = null;
  var current = null;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function pc(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "&mdash;";
    return (Math.round(x * Math.pow(10, d === undefined ? 1 : d)) /
            Math.pow(10, d === undefined ? 1 : d));
  }
  function pill(status) {
    return '<span class="v-pill v-' + status + '">' + status.toUpperCase() + "</span>";
  }

  /* ---------- panels ---------- */

  function row(k, v) {
    return '<div class="v-row"><span>' + k + "</span><b>" + v + "</b></div>";
  }

  function paintIntent(intent) {
    var s = intent.sectors || {};
    var top = Object.keys(s).filter(function (k) { return s[k] > 0; })
      .sort(function (a, b) { return s[b] - s[a]; })
      .slice(0, 3)
      .map(function (k) { return k + " " + Math.round(s[k] * 100) + "%"; });

    el("intentPanel").innerHTML =
      row("Responses", intent.responses) +
      row("Risk", pc(intent.riskProfile.average, 2) + " of 2") +
      row("Market view", pc(intent.marketView.average, 2) + " of 2") +
      row("Horizon", pc(intent.horizon.average) + "y") +
      row("USD target", pc(intent.usd.target) + "%") +
      row("Duration target", pc(intent.duration.target) + "y") +
      row("Credit", "IG " + Math.round(intent.credit.ig * 100) + "% / HY " +
                    Math.round(intent.credit.hy * 100) + "%") +
      row("Country", "G7 " + Math.round(intent.country.g7 * 100) + "% / EM " +
                     Math.round(intent.country.em * 100) + "%") +
      row("Top sectors", top.length ? top.join(", ") : "&mdash;") +
      row("Would use leverage", Math.round(intent.leverage.yesShare * 100) + "%") +
      row("Wants income", Math.round(intent.capitalIncome.income * 100) + "%");
  }

  function paintOutput(c) {
    var sec = c.equity.sectorExposure || {};
    var top = Object.keys(sec).filter(function (k) { return sec[k] > 0; })
      .sort(function (a, b) { return sec[b] - sec[a]; })
      .slice(0, 3)
      .map(function (k) { return k + " " + pc(sec[k]) + "%"; });

    var alloc = Object.keys(c.allocation).map(function (k) {
      return k + " " + c.allocation[k] + "%";
    }).join(" · ");

    el("outputPanel").innerHTML =
      row("Lines", c.lineCount + " (totals " + pc(c.totalWeight, 2) + "%)") +
      row("Allocation", alloc) +
      row("USD exposure", pc(c.usdExposure) + "%" +
          (c.usdCoverage < 99 ? ' <i class="v-cov">' + pc(c.usdCoverage) + "% covered</i>" : "")) +
      row("FI duration", pc(c.fixedIncome.weightedDuration, 2) + "y") +
      row("FI credit", "IG " + pc(c.fixedIncome.igWeight) + "% / HY " +
                       pc(c.fixedIncome.hyWeight) + "%") +
      row("Equity region", "G7 " + pc(c.equity.regionExposure.g7 || 0) + "% / EM " +
                           pc(c.equity.regionExposure.em || 0) + "%") +
      row("Equity beta", pc(c.equity.weightedBeta, 2)) +
      row("Top sectors", top.length ? top.join(", ") : "&mdash;") +
      row("Risk proxy", pc(c.riskProxy) + " / 100") +
      row("Income tilt", pc(c.incomeTilt) + "% <i class=\"v-cov\">ex fixed income</i>") +
      row("Concentration", "largest " + pc(c.concentration.largestPosition) + "% · top3 " +
                           pc(c.concentration.top3Positions) + "% · top5 " +
                           pc(c.concentration.top5Positions) + "%");
  }

  function paintCompare(checks) {
    var head = "<thead><tr><th>Check</th><th>Room intent</th><th>Portfolio</th>" +
               "<th>Difference</th><th>Status</th></tr></thead>";
    var body = checks.map(function (c) {
      var d = c.difference === null || c.difference === undefined ? "&mdash;"
        : (c.difference >= 0 ? "+" : "") + c.difference + (c.unit || "");
      var iv = c.intent === null || c.intent === undefined ? "&mdash;"
        : (typeof c.intent === "number" ? pc(c.intent) + (c.unit || "") : esc(c.intent));
      var av = c.actual === null || c.actual === undefined ? "&mdash;"
        : (typeof c.actual === "number" ? pc(c.actual) + (c.unit || "") : esc(c.actual));
      return '<tr class="v-r-' + c.status + '"><td><b>' + esc(c.label || c.id) + "</b>" +
        '<i class="v-msg">' + (c.message || "") + "</i></td>" +
        "<td>" + iv + "</td><td>" + av + "</td><td>" + d + "</td>" +
        "<td>" + pill(c.status) + "</td></tr>";
    }).join("");
    el("compareTable").innerHTML = head + "<tbody>" + body + "</tbody>";
  }

  function paintDiagnostics(res) {
    var html = "";

    if (res.contradictions.length) {
      html += '<h3 class="v-h3">Competing signals in the room</h3>' +
        '<p class="v-note">Not errors. The room is a crowd and crowds are not consistent; ' +
        'the engine still builds a book. These are here so nobody is surprised on stage.</p>' +
        "<ul class=\"v-list\">" + res.contradictions.map(function (c) {
          return "<li>" + esc(c.message) + "</li>";
        }).join("") + "</ul>";
    }

    if (res.warnings.length) {
      html += '<h3 class="v-h3">Portfolio warnings</h3><ul class="v-list v-warnlist">' +
        res.warnings.map(function (w) {
          return "<li>" + esc(w.message) + "</li>";
        }).join("") + "</ul>";
    }

    if (!html) html = '<p class="v-note">Nothing flagged.</p>';
    el("diagnostics").innerHTML = html;
  }

  function paintHeadline(res) {
    el("fitScore").innerHTML = res.intentFit === null ? "&mdash;" : res.intentFit;
    var c = res.counts;
    el("counts").innerHTML =
      '<span class="v-c v-pass">' + c.pass + " pass</span>" +
      '<span class="v-c v-warn">' + c.warn + " warn</span>" +
      '<span class="v-c v-fail">' + c.fail + " fail</span>" +
      (c.na ? '<span class="v-c v-na">' + c.na + " n/a</span>" : "");
    el("overall").innerHTML = pill(res.status);
    el("headline").className = "v-head v-head-" + res.status;
  }

  function render(agg, label) {
    if (!window.PRODUCTS) {
      el("diagnostics").innerHTML = '<p class="v-note">Product shelf not loaded.</p>';
      return;
    }
    if (!agg || !agg.count) {
      el("overall").innerHTML = pill("na");
      el("diagnostics").innerHTML = '<p class="v-note">No responses in ' + esc(label) +
        ' yet. Pick a golden scenario above to exercise the engine.</p>';
      return;
    }
    var res = V.validate(agg, window.PRODUCTS);
    current = res;
    paintHeadline(res);
    paintIntent(res.intent);
    paintOutput(res.characteristics);
    paintCompare(res.checks);
    paintDiagnostics(res);
  }

  /* ---------- tests ---------- */

  function runGolden() {
    var out = el("testOut");
    if (!SCENARIOS) { out.innerHTML = '<p class="v-note">Scenarios not loaded.</p>'; return; }
    var g = V.runGoldenTests(SCENARIOS, window.PRODUCTS);

    out.innerHTML = '<h3 class="v-h3">Golden scenarios &mdash; ' + g.pass + " pass, " +
      g.warn + " warn, " + g.fail + " fail of " + g.total + "</h3>" +
      g.results.map(function (r) {
        var misses = r.failedExpectations.map(function (f) {
          return '<div class="v-miss"><b>' + esc(f.key) + "</b>" +
            "<span>expected " + esc(f.expected) + "</span>" +
            "<span>actual " + esc(f.actual) + "</span></div>";
        }).join("");
        var failed = r.validation.checks.filter(function (c) { return c.status === "fail"; })
          .map(function (c) {
            return '<div class="v-miss"><b>' + esc(c.id) + "</b><span>" +
              esc(c.message) + "</span></div>";
          }).join("");
        return '<details class="v-test v-t-' + r.status + '"' +
          (r.status === "pass" ? "" : " open") + ">" +
          "<summary>" + pill(r.status) + "<b>" + esc(r.name) + "</b>" +
          '<i>fit ' + r.intentFit + "</i></summary>" +
          (misses || failed
            ? misses + failed
            : '<p class="v-note">Every expectation met.</p>') +
          "</details>";
      }).join("");
  }

  function runMono() {
    var m = V.runMonotonicityTests(window.PRODUCTS);
    el("testOut").innerHTML =
      '<h3 class="v-h3">Monotonicity &mdash; ' + m.pass + " pass, " + m.warn +
      " warn, " + m.fail + " fail of " + m.total + "</h3>" +
      '<p class="v-note">One answer moves, everything else is held. Individual holdings are ' +
      'not expected to behave monotonically &mdash; a better-fitting product legitimately ' +
      'displaces another &mdash; so the test is always on the aggregate characteristic.</p>' +
      m.tests.map(function (t) {
        var steps = t.steps.map(function (s) {
          return '<span class="v-step"><i>' + esc(s.value) + "</i>" + pc(s.metric, 2) + "</span>";
        }).join('<em>&rarr;</em>');
        var breaks = t.breaks.map(function (b) {
          return '<div class="v-miss"><b>' + esc(b.from) + " &rarr; " + esc(b.to) + "</b>" +
            "<span>" + b.fromMetric + " fell to " + b.toMetric + " (drop " + b.drop + ")</span></div>";
        }).join("");
        return '<details class="v-test v-t-' + t.status + '"' +
          (t.status === "pass" ? "" : " open") + "><summary>" + pill(t.status) +
          "<b>" + esc(t.label) + '</b><i>' + esc(t.metric) + "</i></summary>" +
          '<div class="v-steps">' + steps + "</div>" +
          (t.note ? '<p class="v-note">' + esc(t.note) + "</p>" : "") + breaks + "</details>";
      }).join("");
  }

  function runSens() {
    var agg = lastAgg;
    if (!agg) { el("testOut").innerHTML = '<p class="v-note">No room to analyse.</p>'; return; }
    var s = V.sensitivity(agg, window.PRODUCTS);
    if (!s) { el("testOut").innerHTML = '<p class="v-note">Sensitivity unavailable.</p>'; return; }

    var rows = Object.keys(s.axes).sort(function (a, b) {
      return s.axes[b].totalImpact - s.axes[a].totalImpact;
    }).map(function (k) {
      var a = s.axes[k];
      return "<tr><td><b>" + esc(k) + '</b><i class="v-msg">' + a.roles.join(", ") + "</i></td>" +
        "<td>" + a.allocationImpact + "</td><td>" + a.productImpact + "</td>" +
        "<td><b>" + a.totalImpact + "</b></td><td>" +
        Math.round((a.shareOfVariation || 0) * 100) + "%</td></tr>";
    }).join("");

    el("testOut").innerHTML =
      '<h3 class="v-h3">Sensitivity</h3>' +
      '<p class="v-note">Move one answer, rebuild, and measure how much of the book changed. ' +
      esc(s.formula) + " 0 means identical books, 1 means no shared position.</p>" +
      '<div class="v-scroll"><table class="v-table"><thead><tr><th>Axis</th>' +
      "<th>Allocation</th><th>Selection</th><th>Total</th><th>Share</th></tr></thead><tbody>" +
      rows + "</tbody></table></div>" +
      (s.notes.length
        ? '<h3 class="v-h3">Influence does not match documented role</h3><ul class="v-list v-warnlist">' +
          s.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>"
        : "");
  }

  /* ---------- wiring ---------- */

  var lastAgg = null;

  function selectSource() {
    var v = el("source").value;
    if (v === "live") {
      window.STORE.results().then(function (r) {
        lastAgg = r.agg;
        render(r.agg, "the live room");
      }).catch(function () {
        lastAgg = null;
        render(null, "the live room");
      });
      return;
    }
    var sc = (SCENARIOS.scenarios || []).filter(function (s) { return s.id === v; })[0];
    if (!sc) return;
    lastAgg = V.roomFrom(sc.answers);
    render(lastAgg, sc.name);
  }

  function boot() {
    var sel = el("source");
    sel.innerHTML = '<option value="live">Live room</option>' +
      (SCENARIOS.scenarios || []).map(function (s) {
        return '<option value="' + esc(s.id) + '">' + esc(s.name) + "</option>";
      }).join("");
    sel.addEventListener("change", selectSource);
    el("btnGolden").addEventListener("click", runGolden);
    el("btnMono").addEventListener("click", runMono);
    el("btnSens").addEventListener("click", runSens);
    selectSource();
  }

  /* The shelf is fetched by base-loader; wait for it rather than racing it. */
  function whenReady(tries) {
    if (window.PRODUCTS && SCENARIOS) return boot();
    if (tries > 80) {
      el("diagnostics").innerHTML =
        '<p class="v-note">Could not load the product shelf or the scenarios.</p>';
      return;
    }
    setTimeout(function () { whenReady((tries || 0) + 1); }, 60);
  }

  fetch("data/validation-scenarios.json")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { SCENARIOS = d || { scenarios: [] }; })
    .catch(function () { SCENARIOS = { scenarios: [] }; })
    .then(function () { whenReady(0); });
})();
