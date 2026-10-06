/* Portfolio validation and calibration.
 *
 * The construction engine in portfolios.js answers "which products fit this
 * room". This file answers a different and harder question: "does the book we
 * ended up with actually look like what the room asked for?"
 *
 * Those are not the same question. A sleeve can be full of individually
 * well-scoring products and still, taken as a whole, express the wrong
 * duration, the wrong credit mix or the wrong risk. Scoring happens one
 * instrument at a time; a portfolio is the sum.
 *
 * This module only ever MEASURES. It never changes a weight. If a check
 * fails, the failure is surfaced and the portfolio is left exactly as the
 * engine built it — understanding the behaviour has to come before repairing
 * it, and a validator that quietly edits its own subject cannot be trusted to
 * report on it.
 *
 * Everything here is deterministic: same answers plus same products.json
 * gives the same result, every time. No randomness, no clock, no network.
 */
window.PORTFOLIO_VALIDATOR = (function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Configuration. Every tolerance and weight lives here so the whole
   * thing can be recalibrated in one place rather than hunted through
   * the checks.
   * ------------------------------------------------------------------ */

  var LIMITS = {
    /* Weights are rounded to 0.1 when the book is built, and the rounding
       drift is pushed onto the largest line, so the total can sit a whisker
       off 100 without anything being wrong. */
    totalWeightTolerance: 0.6,
    sleeveReconcileTolerance: 0.6,

    /* Percentage-point gaps between what the room asked for and what the
       book holds. Generous on purpose: the room is being matched, not
       replicated. */
    usd:      { pass: 10, warn: 20 },
    region:   { pass: 15, warn: 28 },   /* EM share of equity */
    credit:   { pass: 15, warn: 28 },   /* IG share of fixed income */
    income:   { pass: 20, warn: 35 },

    /* Years. */
    duration: { pass: 2, warn: 4 },

    /* The risk proxy is anchored so 100 is an ungeared book at full risk
       weight; a geared one runs past it. See riskProxy(). */
    risk:     { pass: 15, warn: 26 },

    /* Concentration, as a share of the whole book. */
    maxSinglePosition: 25,
    warnSinglePosition: 18,
    maxTop3Concentration: 60,
    maxTop5Concentration: 75,

    /* A sector taking more than this share of the EQUITY sleeve is called
       out, even when the room asked for it. */
    warnSectorConcentration: 45,

    /* A sleeve this big with nothing in it is a construction failure, not
       a rounding artefact. */
    emptySleeveMaterial: 2,

    /* Economic sanity. */
    shortHorizonYears: 5,
    longDurationYears: 9,
    conservativeRisk01: 0.34,
    aggressiveRisk01: 0.66,
    conservativeEquityMax: 45,
    lowLeverageShare: 0.2,
    leverageProductWarn: 40   /* % of the notes+options sleeves */
  };

  /* How much each dimension counts toward the overall Room Intent Fit.
     Risk and currency lead because they are the two things a client
     notices first. */
  var FIT_WEIGHTS = {
    risk: 1.4,
    usd: 1.2,
    credit: 1.0,
    duration: 1.0,
    region: 0.9,
    sector: 0.9,
    income: 0.7
  };

  /* The portfolio risk proxy needs to say that 10% in equities is more risk
     than 10% in investment-grade bonds. Per-product riskScore is risk WITHIN
     a sleeve, so it cannot do that on its own. These anchors set the scale
     between sleeves, and the product's own score then modulates it.
     They are judgements, stated openly, not estimates of anything. */
  var SLEEVE_RISK_ANCHOR = {
    equities:    1.00,
    options:     1.25,   /* geared, and can expire worthless */
    notes:       0.60,   /* barriers absorb some of it, coupons none */
    fixedIncome: 0.30,
    fx:          0.35
  };

  /* Maps the room's 0-1 risk answer onto the same 0-100 proxy the portfolio
     is measured on, so the two can be compared at all. A conservative room
     is asserted to belong near 15, an aggressive one near 75. */
  var RISK_INTENT_BASE = 15;
  var RISK_INTENT_SPAN = 60;

  /* Which stage of construction each question actually reaches. Documentation
     and diagnostics: sensitivity() measures the realised influence and flags
     an axis whose real effect does not match what is claimed here. */
  var AXIS_ROLE = {
    riskProfile:   ["allocation", "productRiskTilt"],
    marketView:    ["allocation", "optionsSelection"],
    horizon:       ["allocation", "notesSelection"],
    leverage:      ["notesAllocation", "optionsAllocation", "optionsSelection"],
    country:       ["productSelection"],
    sector:        ["equitySelection", "optionsSelection"],
    usd:           ["fxAllocation", "currencySelection"],
    capitalIncome: ["allocation", "selection"],
    duration:      ["fixedIncomeSelection"],
    credit:        ["fixedIncomeSelection"]
  };

  /* ---- duration lots ---------------------------------------------------
   *
   * A single weighted duration hides the shape of a bond book: 5.2 years is
   * the same number whether every line sits at five years or half sit at two
   * and half at nine, and those are different portfolios with different
   * behaviour in a rate move. So duration is also reported in lots, and the
   * room's answer is placed in one.
   *
   * Three lots, chosen to match how a desk actually talks about the curve
   * rather than to be evenly spaced: inside four years a bond is a cash
   * substitute, four to eight is the belly where most credit sits, and past
   * eight the position is a rates view whatever the credit says.
   */
  var DURATION_LOTS = [
    { id: "short", label: "1\u20134y", lo: 0, hi: 4 },
    { id: "belly", label: "4\u20138y", lo: 4, hi: 8 },
    { id: "long",  label: "8y+",      lo: 8, hi: Infinity }
  ];

  function durationLot(years) {
    if (years === null || years === undefined || !isFinite(years)) return null;
    for (var i = 0; i < DURATION_LOTS.length; i++) {
      if (years < DURATION_LOTS[i].hi) return DURATION_LOTS[i];
    }
    return DURATION_LOTS[DURATION_LOTS.length - 1];
  }

  function durationLotLabel(years) {
    var l = durationLot(years);
    return l ? l.label : "\u2014";
  }

  /* How the sleeve's weight is spread across the lots. This is the figure a
     single weighted average cannot give you. */
  function durationSpread(rows, total) {
    var acc = {};
    DURATION_LOTS.forEach(function (l) { acc[l.id] = 0; });
    var covered = 0;
    rows.forEach(function (r) {
      var d = an(r.item).duration;
      var l = durationLot(d);
      if (!l) return;
      acc[l.id] += r.weight || 0;
      covered += r.weight || 0;
    });
    return DURATION_LOTS.map(function (l) {
      return {
        id: l.id, label: l.label,
        weight: round(acc[l.id], 2),
        pct: round(total > 0 ? (acc[l.id] / total) * 100 : 0, 1)
      };
    });
  }

  var Q_SECTORS = ["tech", "financials", "healthcare", "energy",
                   "consumer", "industrials"];

  /* The equity sleeve now contains the option overlay as well, so one key
     covers both; analytics.sleeve still tells them apart line by line. */
  var EQUITY_LIKE = ["equities"];

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  function round(x, n) {
    if (x === null || x === undefined || !isFinite(x)) return null;
    var f = Math.pow(10, n === undefined ? 2 : n);
    return Math.round(x * f) / f;
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }

  function lines(sim, keys) {
    var out = [];
    (sim.buckets || []).forEach(function (b) {
      if (keys && keys.indexOf(b.key) === -1) return;
      (b.lines || []).forEach(function (l) {
        out.push({ bucket: b.key, item: l.item, weight: l.weight || 0, line: l });
      });
    });
    return out;
  }

  function an(item) { return (item && item.analytics) || {}; }

  /* Weighted mean over the lines that actually carry the field, with the
     weight that was covered reported alongside. A number averaged over 40%
     of a sleeve is not the same claim as one averaged over all of it, and
     the difference has to survive into the output. */
  function weightedMean(rows, get) {
    var num = 0, den = 0, total = 0;
    rows.forEach(function (r) {
      total += r.weight;
      var v = get(r);
      if (v === null || v === undefined || !isFinite(v)) return;
      num += r.weight * v;
      den += r.weight;
    });
    return {
      value: den > 0 ? num / den : null,
      covered: den,
      coverage: total > 0 ? den / total : 0
    };
  }

  /* Share of `rows` weight falling in each bucket named by get(). */
  function shares(rows, get, base) {
    var out = {}, den = base === undefined ? sum(rows.map(function (r) { return r.weight; })) : base;
    rows.forEach(function (r) {
      var k = get(r);
      if (k === null || k === undefined) return;
      out[k] = (out[k] || 0) + r.weight;
    });
    Object.keys(out).forEach(function (k) {
      out[k] = den > 0 ? round((out[k] / den) * 100, 2) : 0;
    });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 1 · Portfolio characteristics
   *
   * What the finished book actually IS, computed from final weights.
   * Every figure is weight-weighted; nothing here is an unweighted average
   * of the instruments on a shelf.
   * ------------------------------------------------------------------ */

  function riskProxy(all) {
    /* A PROXY, not a volatility and not a VaR. Each line contributes its
       weight times its sleeve's risk anchor, modulated +/-50% by the
       product's own risk score. Transparent on purpose: it exists so that
       "did this room get the risk it asked for" has a single number, and it
       should never be presented as an estimate of loss.

       100 is an UNGEARED book carried at full risk weight, not a ceiling.
       Because the sum is over weight and a geared book carries more than
       100% of it, the aggressive band reads about 120 — which is the point,
       and why this is not clamped at 100. */
    var contrib = 0;
    all.forEach(function (r) {
      var a = an(r.item);
      /* Keyed off the instrument's own sleeve, not the bucket it is shown
         in: options are presented inside the equity sleeve now, and they are
         still geared whatever column they are printed in. */
      var anchor = SLEEVE_RISK_ANCHOR[a.sleeve || r.bucket];
      if (anchor === undefined) anchor = 0.5;
      var s = (a.riskScore === null || a.riskScore === undefined) ? 0.5 : a.riskScore;
      contrib += r.weight * anchor * (0.5 + 0.5 * s);
    });
    return round(clamp(contrib, 0, 200), 2);
  }

  function characteristics(sim, products) {
    var all = lines(sim);
    var eq = lines(sim, EQUITY_LIKE);
    var fi = lines(sim, ["fixedIncome"]);
    var totalWeight = round(sum(all.map(function (r) { return r.weight; })), 2);

    /* Allocation as the engine declared it, and as the lines actually add
       up. Reporting both is what makes sleeve reconciliation checkable. */
    var declared = {}, actual = {};
    (sim.buckets || []).forEach(function (b) {
      declared[b.key] = b.weight;
      actual[b.key] = round(sum((b.lines || []).map(function (l) { return l.weight || 0; })), 2);
    });

    var usd = weightedMean(all, function (r) { return an(r.item).usdExposure; });
    var beta = weightedMean(eq, function (r) { return an(r.item).beta; });
    var vol = weightedMean(eq, function (r) { return an(r.item).volatility; });
    var dur = weightedMean(fi, function (r) { return an(r.item).duration; });

    var eqWeight = round(sum(eq.map(function (r) { return r.weight; })), 2);
    var fiWeight = round(sum(fi.map(function (r) { return r.weight; })), 2);

    /* Sector exposure is a share OF THE EQUITY SLEEVE, not of the book, and
       only over sleeves that carry the questionnaire's own sector taxonomy.
       A bond's "sector" in the source export is a Bloomberg industry string
       and is deliberately not counted here. */
    var sectorExposure = {};
    Q_SECTORS.forEach(function (s) { sectorExposure[s] = 0; });
    var sectorRaw = shares(eq, function (r) { return an(r.item).sector; }, eqWeight);
    Object.keys(sectorRaw).forEach(function (k) {
      if (k === "core") return;                    /* broad market is not a sector bet */
      if (Q_SECTORS.indexOf(k) >= 0) sectorExposure[k] = sectorRaw[k];
    });
    var coreShare = sectorRaw.core || 0;

    var weights = all.map(function (r) { return r.weight; })
                     .sort(function (a, b) { return b - a; });

    var leverageWeight = round(sum(all.filter(function (r) {
      return an(r.item).expressesLeverage;
    }).map(function (r) { return r.weight; })), 2);

    var gearedNotes = round(sum(lines(sim, ["notes"]).filter(function (r) {
      return an(r.item).geared;
    }).map(function (r) { return r.weight; })), 2);

    var incomeWeight = round(sum(all.filter(function (r) {
      return an(r.item).incomeProducing;
    }).map(function (r) { return r.weight; })), 2);

    /* Income tilt is measured over equities, notes and options only.
       Every bond pays a coupon whatever the room asked for, so counting the
       fixed income sleeve made a capital-growth room read as 53% income
       oriented purely because it held bonds. FX is excluded for the mirror
       reason: its size is set by the dollar answer, not this one. What is
       left is the part of the book where the income answer actually picks
       the instruments. */
    var tiltRows = lines(sim, ["equities", "notes", "options"]);
    var tiltBase = sum(tiltRows.map(function (r) { return r.weight; }));
    var tiltIncome = sum(tiltRows.filter(function (r) {
      return an(r.item).incomeProducing;
    }).map(function (r) { return r.weight; }));

    var allocGross = (sim.alloc && sim.alloc.gross) || null;

    return {
      totalWeight: totalWeight,
      lineCount: all.length,

      /* Gross is what is at work in the market, net is the capital behind
         it, and the difference is notional carried through options and FX
         rather than money borrowed. They are the same number unless the room
         asked for leverage. */
      fromBandBook: !!sim.fromBandBook,
      gross: allocGross,
      net: (sim.alloc && sim.alloc.net) || null,
      geared: (sim.alloc && sim.alloc.geared) || 0,
      capital: (sim.alloc && sim.alloc.capital) || null,
      notionalSplit: (sim.alloc && sim.alloc.notional) || null,

      allocation: declared,
      allocationFromLines: actual,

      usdExposure: round(usd.value, 2),
      usdCoverage: round(usd.coverage * 100, 1),

      equity: {
        weight: eqWeight,
        sectorExposure: sectorExposure,
        coreShare: coreShare,
        regionExposure: shares(eq, function (r) { return an(r.item).region; }, eqWeight),
        weightedBeta: round(beta.value, 3),
        betaCoverage: round(beta.coverage * 100, 1),
        weightedVolatility: round(vol.value, 3)
      },

      fixedIncome: {
        weight: fiWeight,
        weightedDuration: round(dur.value, 2),
        durationCoverage: round(dur.coverage * 100, 1),
        durationLot: durationLotLabel(dur.value),
        durationSpread: durationSpread(fi, fiWeight),
        igWeight: round((shares(fi, function (r) { return an(r.item).creditClass; }, fiWeight).ig) || 0, 2),
        hyWeight: round((shares(fi, function (r) { return an(r.item).creditClass; }, fiWeight).hy) || 0, 2),
        regionExposure: shares(fi, function (r) { return an(r.item).region; }, fiWeight)
      },

      overlayWeight: round(sum(all.filter(function (r) {
        return an(r.item).sleeve === "options";
      }).map(function (r) { return r.weight; })), 2),

      leverageExposure: leverageWeight,
      gearedNotesWeight: gearedNotes,
      incomeWeight: incomeWeight,
      incomeTilt: tiltBase > 0 ? round((tiltIncome / tiltBase) * 100, 2) : null,
      incomeTiltBase: round(tiltBase, 2),

      concentration: {
        largestPosition: round(weights[0] || 0, 2),
        top3Positions: round(sum(weights.slice(0, 3)), 2),
        top5Positions: round(sum(weights.slice(0, 5)), 2)
      },

      riskProxy: riskProxy(all)
    };
  }

  /* ------------------------------------------------------------------ *
   * 2 · Room intent
   *
   * The room's answers, normalised, with the DISTRIBUTION kept. A room that
   * is 61% investment grade and 39% high yield is a different instruction
   * from a room that simply "said IG", and collapsing it to the modal answer
   * throws away the part that matters.
   * ------------------------------------------------------------------ */

  function axisAvg(agg, id, fallback) {
    var a = agg.axes && agg.axes[id];
    return a && a.n ? a.sum / a.n : fallback;
  }

  function axisShares(agg, id) {
    var a = agg.axes && agg.axes[id];
    if (!a || !a.respondents) return {};
    var out = {};
    Object.keys(a.counts).forEach(function (k) {
      out[k] = round(a.counts[k] / a.respondents, 4);
    });
    return out;
  }

  function normRange(id, value) {
    var ax = window.AXIS_BY_ID && window.AXIS_BY_ID[id];
    if (!ax || value === null || value === undefined) return null;
    var lo = ax.min !== undefined ? ax.min : 0;
    var hi = ax.max !== undefined ? ax.max : (ax.options ? ax.options.length - 1 : 1);
    if (hi === lo) return 0;
    return round(clamp((value - lo) / (hi - lo), 0, 1), 4);
  }

  function roomIntent(agg) {
    var risk = axisAvg(agg, "riskProfile", null);
    var view = axisAvg(agg, "marketView", null);
    var hor = axisAvg(agg, "horizon", null);
    var usd = axisAvg(agg, "usd", null);
    var dur = axisAvg(agg, "duration", null);

    var lev = axisShares(agg, "leverage");
    var ctry = axisShares(agg, "country");
    var ci = axisShares(agg, "capitalIncome");
    var cr = axisShares(agg, "credit");

    /* Sector is a multi-select: counts are per option but respondents are
       people, so a share here is "what fraction of the room asked for this",
       and the shares deliberately do not add to 1. */
    var sectors = {};
    var sa = agg.axes && agg.axes.sector;
    if (sa && sa.respondents) {
      Q_SECTORS.forEach(function (s) {
        sectors[s] = round((sa.counts[s] || 0) / sa.respondents, 4);
      });
    }

    return {
      responses: agg.count || 0,

      riskProfile:   { average: round(risk, 3), normalized: risk === null ? null : round(risk / 2, 4) },
      marketView:    { average: round(view, 3), normalized: view === null ? null : round(view / 2, 4) },
      horizon:       { average: round(hor, 2), normalized: normRange("horizon", hor) },
      leverage:      { yesShare: lev.yes || 0, noShare: lev.no || 0 },
      country:       { g7: ctry.g7 || 0, em: ctry.em || 0 },
      sectors:       sectors,
      usd:           { target: round(usd, 2), normalized: normRange("usd", usd) },
      capitalIncome: { capital: ci.capital || 0, income: ci.income || 0 },
      duration:      { target: round(dur, 2), normalized: normRange("duration", dur) },
      credit:        { ig: cr.ig || 0, hy: cr.hy || 0 }
    };
  }

  /* ------------------------------------------------------------------ *
   * 3 · Intent versus output
   *
   * The heart of it. For each dimension the room can express, what did it
   * ask for and what did it actually get.
   *
   * Nothing here demands equality. A room is being matched, not replicated,
   * and the tolerances in LIMITS say how far apart the two are allowed to
   * drift before anyone should care.
   * ------------------------------------------------------------------ */

  /* Turns a gap into a status and a 0-1 score. Continuous on purpose: a
     check that only ever returned pass/fail would throw away the difference
     between "just inside tolerance" and "exactly right". */
  function band(diff, tol) {
    var d = Math.abs(diff);
    if (d <= tol.pass) {
      return { status: "pass", score: round(1 - 0.25 * (d / tol.pass), 4) };
    }
    if (d <= tol.warn) {
      return { status: "warn",
               score: round(0.75 - 0.35 * ((d - tol.pass) / (tol.warn - tol.pass)), 4) };
    }
    return { status: "fail",
             score: round(Math.max(0, 0.4 - 0.4 * ((d - tol.warn) / tol.warn)), 4) };
  }

  function check(id, label, intent, actual, tol, unit, note) {
    if (intent === null || intent === undefined ||
        actual === null || actual === undefined) {
      return { id: id, label: label, status: "na", score: null,
               intent: intent === undefined ? null : intent,
               actual: actual === undefined ? null : actual,
               difference: null, unit: unit || "pp",
               message: note || "Not enough data to compare." };
    }
    var diff = round(actual - intent, 2);
    var b = band(diff, tol);
    return {
      id: id, label: label, status: b.status, score: b.score,
      intent: round(intent, 2), actual: round(actual, 2),
      difference: diff, unit: unit || "pp",
      message: (note ? note + " " : "") +
        "Room " + round(intent, 1) + (unit || "pp") + ", portfolio " +
        round(actual, 1) + (unit || "pp") + " (" + (diff >= 0 ? "+" : "") + diff + ")."
    };
  }

  /* Sector is the one dimension where magnitudes are not comparable. The
     room's sector answers are multi-select, so their shares are "what
     fraction of the room asked for this" and do not add to 1; the
     portfolio's are shares of the equity sleeve and do. Comparing the two
     numbers directly would be meaningless.
     
     So both sides are normalised to a distribution and compared with total
     variation distance, which asks the right question: are the proportions
     alike? Sector leadership is reported separately because it is what a
     presenter is actually challenged on. */
  function sectorCheck(intent, chars) {
    var wanted = intent.sectors || {};
    var got = (chars.equity && chars.equity.sectorExposure) || {};

    var wSum = sum(Q_SECTORS.map(function (s) { return wanted[s] || 0; }));
    var gSum = sum(Q_SECTORS.map(function (s) { return got[s] || 0; }));

    if (wSum <= 0) {
      return { id: "sector", label: "Sector mix", status: "na", score: null,
               intent: null, actual: null, difference: null, unit: "",
               message: "The room expressed no sector preference." };
    }
    if (gSum <= 0) {
      return { id: "sector", label: "Sector mix", status: "fail", score: 0,
               intent: null, actual: null, difference: null, unit: "",
               message: "The room asked for sectors but the equity sleeve holds " +
                        "no sector exposure at all." };
    }

    var tv = 0;
    Q_SECTORS.forEach(function (s) {
      tv += Math.abs((wanted[s] || 0) / wSum - (got[s] || 0) / gSum);
    });
    tv = tv / 2;                                  /* total variation, 0..1 */
    var score = round(1 - tv, 4);

    var topWanted = Q_SECTORS.slice().sort(function (a, b) {
      return (wanted[b] || 0) - (wanted[a] || 0) || a.localeCompare(b);
    })[0];
    var topGot = Q_SECTORS.slice().sort(function (a, b) {
      return (got[b] || 0) - (got[a] || 0) || a.localeCompare(b);
    })[0];
    var led = topWanted === topGot;

    var status = score >= 0.72 ? "pass" : score >= 0.5 ? "warn" : "fail";
    /* Getting the leading sector wrong is worse than the distance suggests,
       because it is the one thing anyone in the room will check. */
    if (!led && status === "pass") status = "warn";

    return {
      id: "sector", label: "Sector mix",
      status: status, score: score,
      intent: topWanted, actual: topGot, difference: null, unit: "",
      topWanted: topWanted, topHeld: topGot, leadMatches: led,
      message: "Room led on " + topWanted + ", portfolio leads on " + topGot +
               ". Proportional agreement " + Math.round(score * 100) + "%."
    };
  }

  /* What the shelf can actually deliver on a dimension.
   *
   * Fixed income is no longer assembled bond by bond: the desk supplies five
   * finished books and the room picks one. So the achievable set is five
   * points, not a continuum, and a room asking for 100% high yield cannot
   * have it — the most any book carries is 71%.
   *
   * Scoring that as a 29-point miss would be measuring the engine against
   * something that does not exist. The check instead asks the question that
   * can be answered: given what is on the shelf, did it pick the closest?
   * The room's real target and the real gap are still reported, with a note
   * saying the target was out of reach. */
  function achievable(products, pick) {
    var books = ((products || {}).fixedIncome || {}).portfolios || [];
    if (books.length < 2) return null;
    var vals = books.map(pick).filter(function (v) {
      return v !== null && v !== undefined && isFinite(v);
    });
    if (!vals.length) return null;
    return { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
  }

  function checkWithin(id, label, intent, actual, tol, unit, range, what) {
    var c = check(id, label, intent, actual, tol, unit);
    if (!range || c.status === "na" || intent === null || intent === undefined) return c;
    if (intent >= range.min && intent <= range.max) return c;

    var near = intent < range.min ? range.min : range.max;
    var within = check(id, label, near, actual, tol, unit);
    within.intent = round(intent, 2);
    within.difference = round(actual - intent, 2);
    within.achievable = { min: round(range.min, 2), max: round(range.max, 2),
                          nearest: round(near, 2) };
    within.message =
      "Room asked " + round(intent, 1) + (unit || "") + ", which no " + what +
      " offers — they run " + round(range.min, 1) + " to " + round(range.max, 1) +
      (unit || "") + ". Closest available is " + round(near, 1) + (unit || "") +
      "; the book holds " + round(actual, 1) + (unit || "") + ".";
    return within;
  }

  function compare(intent, chars, agg, products) {
    var out = [];
    var L = LIMITS;

    /* When the sleeve is one finished book rather than an assembly, its
       characteristics come as a package. The room cannot have the duration of
       one book and the credit of another, so the engine has to trade them off
       — and a trade-off it made deliberately is not a construction failure.
       These dimensions therefore report at most a warning in portfolio mode,
       and the overall intent fit is where the cost of the trade still shows. */
    var fiPackaged = (((products || {}).fixedIncome || {}).selection || {}).mode === "portfolio";

    /* When the whole book comes from the desk's band sheets, the engine does
       not choose any product at all — it chooses which of five finished
       portfolios the room gets. "Did the holdings match the preference" then
       stops being a question about the engine and becomes one about the
       desk's books, so every preference check reports as information. The
       integrity checks stay hard: a book that does not add up is still
       broken whoever wrote it. */
    var deskBook = !!(chars && chars.fromBandBook);
    function soften(c) {
      if (deskBook && c.status === "fail") {
        c.status = "warn";
        c.packaged = true;
        c.message += " The book is one of the desk's five, written line by " +
                     "line, so this is reported rather than treated as a fault.";
        return c;
      }
      if (fiPackaged && c.status === "fail") {
        c.status = "warn";
        c.packaged = true;
        c.message += " The sleeve is one of five finished books, so this " +
                     "characteristic came as part of a package.";
      }
      return c;
    }

    out.push(soften(check("usd", "USD exposure",
      intent.usd.target, chars.usdExposure, L.usd, "%",
      chars.usdCoverage < 90
        ? "Covers " + chars.usdCoverage + "% of the book by weight." : "")));

    out.push(soften(checkWithin("duration", "Fixed income duration",
      intent.duration.target,
      chars.fixedIncome.weight > 0 ? chars.fixedIncome.weightedDuration : null,
      L.duration, "y",
      achievable(products, function (b) { return (b.stats || {}).duration; }),
      "book")));

    /* Same axis, read in lots rather than as one average. A book can sit two
       years from the room's answer and still be in the lot the room asked
       for, or sit half a year away and straddle two — the average cannot
       tell those apart and this does. */
    if (chars.fixedIncome.weight > 0) {
      var wantLot = durationLot(intent.duration.target);
      var gotLot = durationLot(chars.fixedIncome.weightedDuration);
      var spread = chars.fixedIncome.durationSpread || [];
      var inWanted = wantLot
        ? (spread.filter(function (x) { return x.id === wantLot.id; })[0] || {}).pct || 0
        : 0;
      var lotOk = !!(wantLot && gotLot && wantLot.id === gotLot.id);
      out.push({
        id: "durationLot", label: "Duration lot",
        /* A warn, never a fail: the sleeve is one of five finished books,
           so the lot is whatever the chosen book happens to carry. */
        status: !wantLot || !gotLot ? "na" : lotOk ? "pass" : "warn",
        score: lotOk ? 1 : 0,
        intent: wantLot ? wantLot.label : null,
        actual: gotLot ? gotLot.label : null,
        difference: null, unit: "",
        message:
          (wantLot ? "Room asked in the " + wantLot.label + " lot" : "No duration asked") +
          (gotLot ? "; the book averages " + gotLot.label : "") + ". Sleeve sits " +
          spread.filter(function (x) { return x.pct > 0; }).map(function (x) {
            return x.pct + "% in " + x.label;
          }).join(", ") + "." +
          (wantLot && inWanted < 50
            ? " Only " + inWanted + "% of it is in the lot the room asked for."
            : "")
      });
    }

    out.push(soften(checkWithin("credit", "Investment grade share",
      intent.credit.ig * 100,
      chars.fixedIncome.weight > 0 ? chars.fixedIncome.igWeight : null,
      L.credit, "%",
      achievable(products, function (b) { return (b.stats || {}).igWeight; }),
      "book")));

    out.push(soften(check("region", "Emerging market share of equity",
      intent.country.em * 100,
      chars.equity.weight > 0 ? (chars.equity.regionExposure.em || 0) : null,
      L.region, "%")));

    out.push(soften(sectorCheck(intent, chars)));

    /* Risk has to be put on one scale before the two sides can be compared
       at all: see SLEEVE_RISK_ANCHOR and RISK_INTENT_BASE. */
    var riskIntent = intent.riskProfile.normalized === null ? null
      : RISK_INTENT_BASE + RISK_INTENT_SPAN * intent.riskProfile.normalized;
    out.push(soften(check("risk", "Risk proxy",
      riskIntent, chars.riskProxy, L.risk, "",
      "Proxy, not a volatility estimate.")));

    out.push(incomeCheck(intent, chars, agg, products));

    return out;
  }

  /* Income resists a level comparison. "100% of the room wants income" does
     not mean "100% of the book should pay a coupon", and any threshold
     picked for that would be invented. So it is tested directionally
     instead: rebuild the same room with the income answer flipped, and ask
     whether answering "income" actually tilted the book toward income more
     than answering "capital" would have. That is the question the check is
     really for, and it has a defensible answer. */
  function incomeCheck(intent, chars, agg, products) {
    var leansIncome = intent.capitalIncome.income >= 0.5;
    if (!agg || !products || chars.incomeTilt === null) {
      return { id: "income", label: "Income tilt", status: "na", score: null,
               intent: null, actual: chars.incomeTilt, difference: null, unit: "%",
               message: "Nothing outside fixed income to measure a tilt over." };
    }

    var flipped = leansIncome ? "capital" : "income";
    var cfSim = window.ENGINE.roomPortfolio(
      withAxis(agg, "capitalIncome", flipped), products);
    var cf = cfSim ? characteristics(cfSim, products) : null;

    if (!cf || cf.incomeTilt === null) {
      return { id: "income", label: "Income tilt", status: "na", score: null,
               intent: null, actual: chars.incomeTilt, difference: null, unit: "%",
               message: "Counterfactual room produced nothing to compare." };
    }

    /* Signed so that positive always means "the answer moved the book the
       way it should have". */
    var delta = round((chars.incomeTilt - cf.incomeTilt) * (leansIncome ? 1 : -1), 2);
    var status, score;
    if (delta >= 8)      { status = "pass"; score = round(Math.min(1, 0.8 + delta / 100), 4); }
    else if (delta >= 1) { status = "pass"; score = round(0.6 + (delta / 8) * 0.2, 4); }
    else if (delta > -3) { status = "warn"; score = 0.45; }
    else                 { status = "fail"; score = round(Math.max(0, 0.4 + delta / 40), 4); }

    return {
      id: "income", label: "Income tilt",
      status: status, score: score,
      intent: leansIncome ? "income" : "capital",
      actual: chars.incomeTilt, difference: delta, unit: "%",
      counterfactual: cf.incomeTilt,
      message: "Room leans " + (leansIncome ? "income" : "capital") + ". Book is " +
               chars.incomeTilt + "% income-oriented outside fixed income, against " +
               cf.incomeTilt + "% had it answered the other way (" +
               (delta >= 0 ? "+" : "") + delta + "pp in the intended direction)."
    };
  }

  /* ------------------------------------------------------------------ *
   * 4 · Integrity
   *
   * Construction checks that hold regardless of what the room wanted. These
   * are hard constraints: a book that fails one of them is broken, not
   * merely off-preference.
   * ------------------------------------------------------------------ */

  function integrity(sim, chars, products) {
    var out = [];
    var L = LIMITS;

    function push(id, label, ok, warnOnly, message, extra) {
      var c = { id: id, label: label,
                status: ok ? "pass" : (warnOnly ? "warn" : "fail"),
                score: ok ? 1 : 0, message: message, hard: !warnOnly };
      if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
      out.push(c);
    }

    /* A geared book is SUPPOSED to total more than 100: the excess is
       notional. Checking it against 100 regardless would report every
       geared portfolio as broken and, worse, would have hidden the real
       bug — that the engine was forcing leverage back down to 100 and
       showing a geared book as though it were ungeared. The target is the
       gross the allocation declares, and the geared part is reported. */
    var grossTarget = (chars.gross !== null && chars.gross !== undefined)
      ? chars.gross : 100;
    var drift = round(chars.totalWeight - grossTarget, 2);
    push("weights", "Weights reconcile to gross exposure",
      Math.abs(drift) <= L.totalWeightTolerance, false,
      "Portfolio totals " + chars.totalWeight + "% against a declared gross of " +
      grossTarget + "%" +
      (chars.geared ? ", of which " + chars.geared + " points are notional above capital" : "") + ".",
      { intent: grossTarget, actual: chars.totalWeight, difference: drift, unit: "pp" });

    /* The funded book is the client's money and must be exactly 100%. Gross
       may run past it — that is the notional — but if capital itself does
       not reconcile then one of the five sleeve weights is wrong, and the
       room would be shown a portfolio that cannot be bought. This is the
       check that would have caught the sleeve shares being four separate
       guesses rather than three numbers and a remainder. */
    if (chars.capital) {
      var capParts = ["equities", "fixedIncome", "notes"];
      var capTotal = round(capParts.reduce(function (t, k) {
        return t + (chars.capital[k] || 0);
      }, 0), 2);
      var capDrift = round(capTotal - 100, 2);
      push("capital", "Funded capital is 100%",
        Math.abs(capDrift) <= 0.5, false,
        "Cash equities " + (chars.capital.equities || 0) + "%, fixed income " +
        (chars.capital.fixedIncome || 0) + "%, structured notes " +
        (chars.capital.notes || 0) + "% \u2014 " + capTotal + "% of capital." +
        (chars.notionalSplit
          ? " On top of it: " + (chars.notionalSplit.equityOptions || 0) +
            " points of equity options and " + (chars.notionalSplit.fx || 0) +
            " points of FX, both notional."
          : ""),
        { intent: 100, actual: capTotal, difference: capDrift, unit: "pp" });
    }

    /* Each sleeve's lines must add up to the sleeve weight the rest of the
       app displays; otherwise the presenter and the book disagree. */
    var worst = 0, worstKey = null;
    Object.keys(chars.allocation).forEach(function (k) {
      var d = Math.abs((chars.allocationFromLines[k] || 0) - (chars.allocation[k] || 0));
      if (d > worst) { worst = d; worstKey = k; }
    });
    push("sleeveReconcile", "Sleeves reconcile",
      worst <= L.sleeveReconcileTolerance, false,
      worstKey
        ? "Largest gap is " + round(worst, 2) + "pp in " + worstKey + "."
        : "Every sleeve's lines add up to its stated weight.",
      { actual: round(worst, 2), unit: "pp" });

    var all = lines(sim);

    var missing = all.filter(function (r) {
      return !r.item || !r.item.id;
    });
    push("products", "Every line references a real product",
      missing.length === 0, false,
      missing.length ? missing.length + " line(s) reference no product." :
                       "All " + all.length + " lines resolve.");

    var negative = all.filter(function (r) { return r.weight < 0; });
    push("negativeWeights", "No negative weights",
      negative.length === 0, false,
      negative.length ? negative.length + " line(s) carry a negative weight." :
                        "No negative weights.");

    /* A sleeve with a material allocation and nothing in it must never pass
       quietly: the book would be silently short that much exposure. */
    var empties = [];
    Object.keys(chars.allocation).forEach(function (k) {
      var w = chars.allocation[k] || 0;
      var held = chars.allocationFromLines[k] || 0;
      if (w >= L.emptySleeveMaterial && held <= 0.05) empties.push(k + " at " + w + "%");
    });
    push("emptySleeve", "No material sleeve left empty",
      empties.length === 0, false,
      empties.length ? "Allocated but unpopulated: " + empties.join(", ") + "."
                     : "Every allocated sleeve holds product.");

    var c = chars.concentration;
    push("singlePosition", "Largest position",
      c.largestPosition <= L.warnSinglePosition,
      c.largestPosition <= L.maxSinglePosition,
      "Largest single line is " + c.largestPosition + "% of the book.",
      { actual: c.largestPosition, intent: L.warnSinglePosition, unit: "%" });

    push("top3", "Top three concentration",
      c.top3Positions <= L.maxTop3Concentration, true,
      "Top three lines are " + c.top3Positions + "% of the book.",
      { actual: c.top3Positions, intent: L.maxTop3Concentration, unit: "%" });

    push("top5", "Top five concentration",
      c.top5Positions <= L.maxTop5Concentration, true,
      "Top five lines are " + c.top5Positions + "% of the book.",
      { actual: c.top5Positions, intent: L.maxTop5Concentration, unit: "%" });

    return out;
  }

  /* ------------------------------------------------------------------ *
   * 5 · Economic sanity
   *
   * Combinations that are individually legal and jointly odd. These warn
   * rather than fail: the room is allowed to want strange things, but a
   * presenter should not be surprised by them on stage.
   * ------------------------------------------------------------------ */

  function sanity(intent, chars) {
    var w = [], L = LIMITS;

    if (intent.horizon.average !== null && chars.fixedIncome.weightedDuration !== null &&
        intent.horizon.average <= L.shortHorizonYears &&
        chars.fixedIncome.weightedDuration >= L.longDurationYears) {
      w.push({ id: "shortHorizonLongDuration", severity: "warn",
        message: "The room's average horizon is " + round(intent.horizon.average, 1) +
                 " years but the fixed income sleeve carries " +
                 chars.fixedIncome.weightedDuration + " years of duration." });
    }

    var eqLike = chars.equity.weight;
    if (intent.riskProfile.normalized !== null &&
        intent.riskProfile.normalized <= L.conservativeRisk01 &&
        eqLike > L.conservativeEquityMax) {
      w.push({ id: "conservativeHighEquity", severity: "warn",
        message: "A conservative room is holding " + eqLike +
                 "% in equity and equity-like positions." });
    }

    if (intent.riskProfile.normalized !== null &&
        intent.riskProfile.normalized <= L.conservativeRisk01 &&
        chars.fixedIncome.hyWeight > 50) {
      w.push({ id: "conservativeHighYield", severity: "warn",
        message: "A conservative room's bond sleeve is " +
                 chars.fixedIncome.hyWeight + "% high yield." });
    }

    /* If the room said no to leverage, products whose whole purpose is to
       express leverage should not be running the risk sleeves. */
    var levSleeves = (chars.allocation.notes || 0) + (chars.allocation.options || 0);
    if (intent.leverage.yesShare <= L.lowLeverageShare && levSleeves > 0) {
      var levShare = round((chars.leverageExposure / levSleeves) * 100, 1);
      if (levShare > L.leverageProductWarn) {
        w.push({ id: "unwantedLeverage", severity: "warn",
          message: "Only " + Math.round(intent.leverage.yesShare * 100) +
                   "% of the room would use leverage, but leverage-expressing " +
                   "products are " + levShare + "% of the notes and options sleeves." });
      }
    }

    if (intent.credit.ig >= 0.7 && chars.fixedIncome.weight > 0 &&
        chars.fixedIncome.hyWeight > chars.fixedIncome.igWeight) {
      w.push({ id: "creditInversion", severity: "warn",
        message: "The room asked " + Math.round(intent.credit.ig * 100) +
                 "% investment grade but the sleeve is majority high yield." });
    }

    if (intent.country.g7 >= 0.7 && chars.equity.weight > 0 &&
        (chars.equity.regionExposure.em || 0) > 50) {
      w.push({ id: "regionInversion", severity: "warn",
        message: "The room asked " + Math.round(intent.country.g7 * 100) +
                 "% G7 but equity exposure is majority emerging market." });
    }

    Q_SECTORS.forEach(function (s) {
      var x = (chars.equity.sectorExposure || {})[s] || 0;
      if (x > L.warnSectorConcentration) {
        w.push({ id: "sectorConcentration:" + s, severity: "warn",
          message: s.charAt(0).toUpperCase() + s.slice(1) +
                   " is " + x + "% of equity exposure." });
      }
    });

    return w;
  }

  /* ------------------------------------------------------------------ *
   * 6 · Contradictions
   *
   * A room is a crowd and crowds are not consistent. These are not errors
   * and must not block construction: the engine still builds a book. They
   * are named so a presenter can say out loud what the room did, instead of
   * being caught out by it.
   * ------------------------------------------------------------------ */

  function contradictions(intent, products) {
    var out = [];

    if (intent.riskProfile.normalized >= LIMITS.aggressiveRisk01 &&
        intent.horizon.average !== null && intent.horizon.average <= LIMITS.shortHorizonYears) {
      out.push({ id: "aggressiveShortHorizon",
        message: "Competing signals: the room has an aggressive risk appetite but an " +
                 "average horizon of only " + round(intent.horizon.average, 1) + " years." });
    }

    if (intent.usd.target !== null && intent.usd.target >= 85 && intent.country.em >= 0.4) {
      out.push({ id: "usdVersusEm",
        message: "Competing signals: the room wants " + Math.round(intent.usd.target) +
                 "% in dollars while " + Math.round(intent.country.em * 100) +
                 "% asked for emerging market risk." });
    }

    if (intent.capitalIncome.income >= 0.6) {
      var growthy = (intent.sectors.tech || 0);
      if (growthy >= 0.5) {
        out.push({ id: "incomeVersusGrowthSectors",
          message: "Competing signals: " + Math.round(intent.capitalIncome.income * 100) +
                   "% of the room wants income, while " + Math.round(growthy * 100) +
                   "% asked for technology, which pays little of it." });
      }
    }

    if (intent.leverage.yesShare >= 0.4 &&
        intent.riskProfile.normalized !== null &&
        intent.riskProfile.normalized <= LIMITS.conservativeRisk01) {
      out.push({ id: "leverageVersusConservative",
        message: "Competing signals: " + Math.round(intent.leverage.yesShare * 100) +
                 "% would use leverage despite a conservative average risk profile." });
    }

    /* Wanting emerging market risk and wanting no dollars is a contradiction
       on this shelf specifically: every emerging market bond on it settles in
       USD, and the non-dollar paper is almost all European. The engine
       honours the currency answer, so the room gets European credit rather
       than the EM exposure it asked for, and the credit mix slips with it.
       Checked against the shelf rather than asserted, so it stops firing the
       day the desk adds non-dollar EM paper. */
    if (intent.country.em >= 0.6 && intent.usd.target !== null &&
        intent.usd.target <= 30 && products && products.fixedIncome) {
      var emBonds = products.fixedIncome.shelf.filter(function (b) {
        return (b.analytics || {}).region === "em";
      });
      var emNonUsd = emBonds.filter(function (b) {
        return ((b.analytics || {}).usdExposure || 0) < 95;
      });
      if (emBonds.length && !emNonUsd.length) {
        out.push({ id: "emWithoutDollars",
          message: "Competing signals: " + Math.round(intent.country.em * 100) +
                   "% of the room asked for emerging market risk while targeting " +
                   Math.round(intent.usd.target) + "% in dollars, but all " +
                   emBonds.length + " emerging market bonds on the shelf settle in " +
                   "dollars. The currency answer wins, so the fixed income sleeve " +
                   "goes to non-dollar developed market credit instead." });
      }
    }

    /* The five fixed income books all settle in dollars, so a room asking to
       be out of them cannot be: the sleeve is a fixed dollar block whatever
       the equities and FX do. Checked against the books rather than asserted,
       so it stops firing if the desk adds a non-dollar one. */
    var fiBooks = ((products || {}).fixedIncome || {}).portfolios || [];
    if (fiBooks.length && intent.usd.target !== null && intent.usd.target <= 25) {
      var nonUsd = fiBooks.filter(function (b) {
        return (b.holdings || []).some(function (h) {
          return ((h.analytics || {}).usdExposure || 0) < 95;
        });
      });
      if (!nonUsd.length) {
        out.push({ id: "fiAllDollar",
          message: "Competing signals: the room wants " +
                   Math.round(intent.usd.target) + "% in dollars, but all " +
                   fiBooks.length + " fixed income books settle in dollars, so " +
                   "that sleeve stays a dollar block however the rest is built." });
      }
    }

    /* No developed-markets book is high yield: the most any carries is 14%,
       against 71% in the emerging long book. A room asking for both is asking
       for something the shelf does not hold. */
    if (fiBooks.length && intent.credit.hy >= 0.6 && intent.country.g7 >= 0.6) {
      var dmHy = Math.max.apply(null, fiBooks
        .filter(function (b) { return ((b.stats || {}).emWeight || 0) < 25; })
        .map(function (b) { return (b.stats || {}).hyWeight || 0; }).concat([0]));
      out.push({ id: "hyVersusDeveloped",
        message: "Competing signals: the room leans high yield and developed " +
                 "markets, but the most high yield any developed book carries " +
                 "is " + Math.round(dmHy) + "%. The high yield sits in the " +
                 "emerging books." });
    }

    if (intent.credit.hy >= 0.5 && intent.riskProfile.normalized !== null &&
        intent.riskProfile.normalized <= LIMITS.conservativeRisk01) {
      out.push({ id: "hyVersusConservative",
        message: "Competing signals: the room leans high yield on credit but " +
                 "conservative on risk." });
    }

    return out;
  }

  /* ------------------------------------------------------------------ *
   * 7 · Room Intent Fit
   *
   * One number for "does this book look like what the room asked for".
   * Deliberately NOT built from the product fit scores: those say how well
   * each instrument answered the questionnaire, which is the thing being
   * audited here, so reusing them would make the audit circular.
   * ------------------------------------------------------------------ */

  function intentFit(checks) {
    var components = {}, num = 0, den = 0;
    checks.forEach(function (c) {
      var w = FIT_WEIGHTS[c.id];
      if (w === undefined || c.score === null || c.status === "na") return;
      components[c.id] = Math.round(c.score * 100);
      num += w * c.score;
      den += w;
    });
    return {
      total: den > 0 ? Math.round((num / den) * 100) : null,
      components: components,
      measured: Object.keys(components).length
    };
  }

  /* ------------------------------------------------------------------ *
   * 8 · Top level
   * ------------------------------------------------------------------ */

  function analyze(agg, products) {
    var sim = window.ENGINE.roomPortfolio(agg, products);
    if (!sim) return null;
    return {
      sim: sim,
      intent: roomIntent(agg),
      characteristics: characteristics(sim, products)
    };
  }

  function validate(agg, products) {
    var a = analyze(agg, products);
    if (!a) {
      return { valid: false, status: "fail", intentFit: null, characteristics: null,
               checks: [], warnings: [], failures: ["No portfolio could be built."],
               contradictions: [] };
    }

    var intentChecks = compare(a.intent, a.characteristics, agg, products);
    var hardChecks = integrity(a.sim, a.characteristics, products);
    var checks = hardChecks.concat(intentChecks);

    var warnings = sanity(a.intent, a.characteristics);
    var contra = contradictions(a.intent, products);

    var failures = checks.filter(function (c) { return c.status === "fail"; });
    var warns = checks.filter(function (c) { return c.status === "warn"; });
    var fit = intentFit(intentChecks);

    return {
      valid: failures.length === 0,
      status: failures.length ? "fail" : (warns.length || warnings.length) ? "warn" : "pass",
      intentFit: fit.total,
      fitComponents: fit.components,
      intent: a.intent,
      characteristics: a.characteristics,
      checks: checks,
      counts: {
        pass: checks.filter(function (c) { return c.status === "pass"; }).length,
        warn: warns.length,
        fail: failures.length,
        na: checks.filter(function (c) { return c.status === "na"; }).length
      },
      warnings: warnings,
      contradictions: contra,
      failures: failures,
      sim: a.sim
    };
  }

  /* ------------------------------------------------------------------ *
   * 9 · Deterministic room construction
   *
   * Tests need rooms that never vary. Everything below builds its rooms
   * from fixed answers or by overwriting one axis of an existing
   * aggregate; nothing samples, and nothing reads a clock.
   * ------------------------------------------------------------------ */

  var TEST_ROOM_SIZE = 20;

  function roomFrom(answers, size) {
    var n = size || TEST_ROOM_SIZE, rs = [];
    for (var i = 0; i < n; i++) rs.push({ name: "s" + i, answers: answers });
    return window.ENGINE.aggregate(rs);
  }

  /* A copy of `agg` in which one axis has been overwritten so the whole
     room answers `value`. Used by sensitivity and the monotonicity runs,
     because it needs no access to individual responses — which the
     validator should not have anyway. */
  function withAxis(agg, id, value) {
    var out = { count: agg.count, complete: agg.complete, matches: agg.matches, axes: {} };
    Object.keys(agg.axes).forEach(function (k) { out.axes[k] = agg.axes[k]; });

    var respondents = agg.count || TEST_ROOM_SIZE;
    var counts = {}, s = 0, n = 0;
    if (Array.isArray(value)) {
      value.forEach(function (v) { counts[v] = respondents; });
    } else if (typeof value === "number") {
      counts[value] = respondents; s = value * respondents; n = respondents;
    } else {
      counts[value] = respondents;
    }
    out.axes[id] = { counts: counts, sum: s, n: n, respondents: respondents };
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 10 · Golden scenarios
   *
   * Expectations are written about portfolio CHARACTERISTICS, never about
   * which tickers come out. A test that names instruments breaks the moment
   * the desk changes the shelf, and would be testing the shelf rather than
   * the engine.
   * ------------------------------------------------------------------ */

  var EXPECTATIONS = {
    equityMin:      function (c) { return [c.equity.weight, "equity weight"]; },
    equityMax:      function (c) { return [c.equity.weight, "equity weight"]; },
    fixedIncomeMin: function (c) { return [c.allocation.fixedIncome || 0, "fixed income"]; },
    fixedIncomeMax: function (c) { return [c.allocation.fixedIncome || 0, "fixed income"]; },
    notesMin:       function (c) { return [c.allocation.notes || 0, "notes"]; },
    notesMax:       function (c) { return [c.allocation.notes || 0, "notes"]; },
    optionsMax:     function (c) { return [c.overlayWeight || 0, "option overlay"]; },
    usdMin:         function (c) { return [c.usdExposure, "USD exposure"]; },
    usdMax:         function (c) { return [c.usdExposure, "USD exposure"]; },
    durationMin:    function (c) { return [c.fixedIncome.weightedDuration, "FI duration"]; },
    durationMax:    function (c) { return [c.fixedIncome.weightedDuration, "FI duration"]; },
    igMin:          function (c) { return [c.fixedIncome.igWeight, "IG share"]; },
    hyMin:          function (c) { return [c.fixedIncome.hyWeight, "HY share"]; },
    emMin:          function (c) { return [c.equity.regionExposure.em || 0, "EM share of equity"]; },
    emMax:          function (c) { return [c.equity.regionExposure.em || 0, "EM share of equity"]; },
    riskMin:        function (c) { return [c.riskProxy, "risk proxy"]; },
    riskMax:        function (c) { return [c.riskProxy, "risk proxy"]; },
    leverageMax:    function (c) { return [c.leverageExposure, "leverage-expressing weight"]; },
    largestPositionMax: function (c) { return [c.concentration.largestPosition, "largest position"]; }
  };

  function evaluate(expectations, chars, result) {
    var out = [];
    Object.keys(expectations || {}).forEach(function (key) {
      var want = expectations[key];

      if (key === "hyShouldExceedIg" || key === "igShouldExceedHy") {
        var ig = chars.fixedIncome.igWeight, hy = chars.fixedIncome.hyWeight;
        var ok = key === "hyShouldExceedIg" ? hy > ig : ig > hy;
        out.push({ key: key, pass: ok === want,
          expected: key === "hyShouldExceedIg" ? "HY > IG" : "IG > HY",
          actual: "IG " + ig + "%, HY " + hy + "%" });
        return;
      }

      /* The fixed income decision is now which of five finished books the
         room gets, so that is what a scenario asserts. Asking about an exact
         credit mix tests a freedom the sleeve no longer has. */
      if (key === "bookShouldBe") {
        var bk = null;
        (result.sim.buckets || []).forEach(function (b) {
          if (b.key === "fixedIncome" && b.book) bk = b.book;
        });
        out.push({ key: key, pass: !!bk && bk.id === want,
          expected: "fixed income book is " + want,
          actual: bk ? bk.id + " (" + bk.name + ")" : "no book selected" });
        return;
      }

      if (key === "topSector") {
        var ex = chars.equity.sectorExposure || {};
        var top = Q_SECTORS.slice().sort(function (a, b) {
          return (ex[b] || 0) - (ex[a] || 0) || a.localeCompare(b);
        })[0];
        out.push({ key: key, pass: top === want,
          expected: "largest equity sector is " + want,
          actual: top + " at " + (ex[top] || 0) + "%" });
        return;
      }

      if (key === "sectorShouldExceed") {
        var e2 = chars.equity.sectorExposure || {};
        var a = e2[want[0]] || 0, b = e2[want[1]] || 0;
        out.push({ key: key, pass: a > b,
          expected: want[0] + " > " + want[1],
          actual: want[0] + " " + a + "%, " + want[1] + " " + b + "%" });
        return;
      }

      if (key === "intentFitMin") {
        out.push({ key: key, pass: result.intentFit !== null && result.intentFit >= want,
          expected: "intent fit >= " + want, actual: String(result.intentFit) });
        return;
      }

      if (key === "noFailures") {
        out.push({ key: key, pass: (result.counts.fail === 0) === want,
          expected: want ? "no failing checks" : "at least one failing check",
          actual: result.counts.fail + " failing" });
        return;
      }

      var fn = EXPECTATIONS[key];
      if (!fn) {
        out.push({ key: key, pass: false, expected: "known expectation",
                   actual: "unrecognised expectation '" + key + "'" });
        return;
      }
      var pair = fn(chars), value = pair[0], label = pair[1];
      if (value === null || value === undefined) {
        out.push({ key: key, pass: false, expected: label + " available",
                   actual: "not measurable" });
        return;
      }
      var isMin = /Min$/.test(key);
      var ok = isMin ? value >= want : value <= want;
      out.push({ key: key, pass: ok,
        expected: label + (isMin ? " >= " : " <= ") + want,
        actual: label + " is " + round(value, 2) });
    });
    return out;
  }

  function runScenario(scenario, products) {
    var agg = roomFrom(scenario.answers);
    var result = validate(agg, products);
    var checks = evaluate(scenario.expectations, result.characteristics, result);
    var failed = checks.filter(function (c) { return !c.pass; });

    return {
      id: scenario.id,
      name: scenario.name,
      status: failed.length ? "fail" : (result.counts.fail ? "fail" :
              (result.counts.warn || result.warnings.length) ? "warn" : "pass"),
      intentFit: result.intentFit,
      expectations: checks,
      failedExpectations: failed,
      validation: result
    };
  }

  function runGoldenTests(scenarios, products) {
    var list = (scenarios && scenarios.scenarios) || scenarios || [];
    var results = list.map(function (s) { return runScenario(s, products); });
    return {
      total: results.length,
      pass: results.filter(function (r) { return r.status === "pass"; }).length,
      warn: results.filter(function (r) { return r.status === "warn"; }).length,
      fail: results.filter(function (r) { return r.status === "fail"; }).length,
      results: results
    };
  }

  /* ------------------------------------------------------------------ *
   * 11 · Monotonicity
   *
   * The sharpest test in the file. Move ONE answer and nothing else, and
   * check the portfolio moves the way economics says it should. A model can
   * pass every golden scenario and still be incoherent; if raising the risk
   * answer lowers portfolio risk, something is wrong no matter how good any
   * single book looks.
   *
   * Individual product weights are NOT expected to behave monotonically —
   * a better-fitting instrument legitimately displaces another. The test is
   * always on the aggregate characteristic.
   * ------------------------------------------------------------------ */

  /* Tolerance for a step backwards, in the metric's own units. Selection is
     discrete: one product swapping for another can nudge a characteristic
     the wrong way without the engine being wrong. */
  var MONO_TOLERANCE = {
    riskProxy: 2.0, equityWeight: 2.0, usdExposure: 2.0,
    duration: 0.5, hyWeight: 2.0, notesPlusOptions: 1.5
  };

  var BASE_ANSWERS = {
    riskProfile: 1, marketView: 1, horizon: 10, leverage: "no",
    country: "g7", sector: ["tech"], usd: 50, capitalIncome: "capital",
    duration: 6, credit: "ig"
  };

  function metric(chars, name) {
    switch (name) {
      case "riskProxy":       return chars.riskProxy;
      case "equityWeight":    return chars.equity.weight;
      case "usdExposure":     return chars.usdExposure;
      case "duration":        return chars.fixedIncome.weightedDuration;
      case "hyWeight":        return chars.fixedIncome.hyWeight;
      case "notesPlusOptions":
        return round((chars.allocation.notes || 0) + (chars.allocation.options || 0), 2);
      default: return null;
    }
  }

  function monoRun(label, axis, values, metricName, products, note) {
    var steps = values.map(function (v) {
      var answers = {};
      Object.keys(BASE_ANSWERS).forEach(function (k) { answers[k] = BASE_ANSWERS[k]; });
      answers[axis] = v;
      var chars = characteristics(window.ENGINE.roomPortfolio(roomFrom(answers), products), products);
      return { value: v, metric: metric(chars, metricName) };
    });

    var tol = MONO_TOLERANCE[metricName] || 1;
    var breaks = [];
    for (var i = 1; i < steps.length; i++) {
      var a = steps[i - 1].metric, b = steps[i].metric;
      if (a === null || b === null) continue;
      if (b < a - tol) {
        breaks.push({ from: steps[i - 1].value, to: steps[i].value,
                      fromMetric: round(a, 2), toMetric: round(b, 2),
                      drop: round(a - b, 2) });
      }
    }

    return {
      id: axis + ":" + metricName,
      label: label,
      axis: axis,
      metric: metricName,
      note: note || "",
      tolerance: tol,
      steps: steps.map(function (s) {
        return { value: s.value, metric: round(s.metric, 2) };
      }),
      status: breaks.length ? "fail" : "pass",
      breaks: breaks
    };
  }

  function runMonotonicityTests(products) {
    var tests = [
      monoRun("Risk appetite raises portfolio risk", "riskProfile", [0, 1, 2],
        "riskProxy", products, "Conservative to aggressive should not reduce risk."),
      monoRun("Risk appetite raises equity", "riskProfile", [0, 1, 2],
        "equityWeight", products),
      monoRun("Longer horizon raises equity", "horizon", [3, 10, 25],
        "equityWeight", products, "More time should buy more risk capacity."),
      monoRun("Dollar preference raises dollar exposure", "usd", [0, 25, 50, 75, 100],
        "usdExposure", products, "The single most important monotonicity test."),
      monoRun("Duration preference raises duration", "duration", [2, 5, 10, 20],
        "duration", products),
      monoRun("High yield preference raises HY", "credit", ["ig", "hy"],
        "hyWeight", products),
      monoRun("Leverage appetite raises notes and options", "leverage", ["no", "yes"],
        "notesPlusOptions", products)
    ];

    /* Sector is not an ordered axis, so it cannot be monotone. The
       equivalent question is whether asking for a sector actually buys more
       of it than not asking does. */
    var sectorTests = ["tech", "healthcare", "energy", "industrials"].map(function (s) {
      var answers = {};
      Object.keys(BASE_ANSWERS).forEach(function (k) { answers[k] = BASE_ANSWERS[k]; });
      answers.sector = [s];
      var chars = characteristics(window.ENGINE.roomPortfolio(roomFrom(answers), products), products);
      var ex = chars.equity.sectorExposure || {};
      var mine = ex[s] || 0;
      var others = Q_SECTORS.filter(function (x) { return x !== s; })
                            .map(function (x) { return ex[x] || 0; });
      var best = Math.max.apply(null, others.concat([0]));
      return {
        id: "sector:" + s,
        label: "Asking for " + s + " buys " + s,
        axis: "sector",
        metric: "sectorExposure",
        status: mine > 0 && mine >= best ? "pass" : (mine > 0 ? "warn" : "fail"),
        steps: [{ value: s, metric: round(mine, 2) }],
        breaks: mine >= best ? [] : [{
          from: s, to: "other sectors",
          fromMetric: round(mine, 2), toMetric: round(best, 2),
          drop: round(best - mine, 2)
        }],
        note: s + " reaches " + round(mine, 2) + "% of equity; strongest other sector " +
              round(best, 2) + "%."
      };
    });

    var all = tests.concat(sectorTests);
    return {
      total: all.length,
      pass: all.filter(function (t) { return t.status === "pass"; }).length,
      warn: all.filter(function (t) { return t.status === "warn"; }).length,
      fail: all.filter(function (t) { return t.status === "fail"; }).length,
      tests: all
    };
  }

  /* ------------------------------------------------------------------ *
   * 12 · Sensitivity
   *
   * Which questions actually move the book. The engine lets some answers
   * reach both the sleeve split and product selection, which can quietly
   * double-count them; this measures the realised influence so that can be
   * seen rather than assumed.
   *
   * Distance is portfolio turnover:
   *
   *     d(A, B) = 0.5 * SUM |weight_A(i) - weight_B(i)| / 100
   *
   * over the union of instruments, which is 0 for identical books and 1
   * when they share no position. allocationImpact applies the same formula
   * to sleeve weights; productImpact applies it within each sleeve after
   * renormalising that sleeve to 100, then weights each sleeve by its size,
   * so it isolates selection from allocation.
   * ------------------------------------------------------------------ */

  function turnover(a, b) {
    var keys = {}, total = 0;
    Object.keys(a).forEach(function (k) { keys[k] = 1; });
    Object.keys(b).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      total += Math.abs((a[k] || 0) - (b[k] || 0));
    });
    return round(clamp(0.5 * total / 100, 0, 1), 4);
  }

  function weightMap(sim) {
    var out = {};
    (sim.buckets || []).forEach(function (b) {
      (b.lines || []).forEach(function (l) {
        if (l.item && l.item.id) out[l.item.id] = (out[l.item.id] || 0) + (l.weight || 0);
      });
    });
    return out;
  }

  function sleeveMap(sim) {
    var out = {};
    (sim.buckets || []).forEach(function (b) { out[b.key] = b.weight || 0; });
    return out;
  }

  function withinSleeve(simA, simB) {
    var keys = {};
    [simA, simB].forEach(function (s) {
      (s.buckets || []).forEach(function (b) { keys[b.key] = 1; });
    });
    var acc = 0, den = 0;
    Object.keys(keys).forEach(function (k) {
      function normed(sim) {
        var bucket = (sim.buckets || []).filter(function (b) { return b.key === k; })[0];
        if (!bucket) return { map: {}, weight: 0 };
        var tot = sum((bucket.lines || []).map(function (l) { return l.weight || 0; }));
        var m = {};
        (bucket.lines || []).forEach(function (l) {
          if (l.item && l.item.id && tot > 0) m[l.item.id] = (l.weight / tot) * 100;
        });
        return { map: m, weight: bucket.weight || 0 };
      }
      var A = normed(simA), B = normed(simB);
      var w = (A.weight + B.weight) / 2;
      if (w <= 0) return;
      acc += w * turnover(A.map, B.map);
      den += w;
    });
    return den > 0 ? round(acc / den, 4) : 0;
  }

  /* The alternative each axis is moved to. Fixed values, so the numbers are
     reproducible; each is roughly the opposite end of its axis. */
  var SENSITIVITY_ALT = {
    riskProfile: 2, marketView: 2, horizon: 25, leverage: "yes",
    country: "em", sector: ["healthcare"], usd: 100,
    capitalIncome: "income", duration: 20, credit: "hy"
  };

  function sensitivity(agg, products) {
    var baseSim = window.ENGINE.roomPortfolio(agg, products);
    if (!baseSim) return null;
    var baseW = weightMap(baseSim), baseS = sleeveMap(baseSim);

    var out = {}, totals = [];
    Object.keys(SENSITIVITY_ALT).forEach(function (axis) {
      var alt = SENSITIVITY_ALT[axis];

      /* If the room already sits on the alternative, move it the other way
         instead, or the axis would falsely read as having no influence. */
      var current = agg.axes && agg.axes[axis];
      var use = alt;
      if (current && current.counts && !Array.isArray(alt)) {
        var only = Object.keys(current.counts);
        if (only.length === 1 && String(only[0]) === String(alt)) {
          use = axis === "riskProfile" || axis === "marketView" ? 0
              : axis === "horizon" ? 2
              : axis === "usd" ? 0
              : axis === "duration" ? 2
              : axis === "leverage" ? "no"
              : axis === "country" ? "g7"
              : axis === "capitalIncome" ? "capital"
              : axis === "credit" ? "ig" : alt;
        }
      }

      var sim2 = window.ENGINE.roomPortfolio(withAxis(agg, axis, use), products);
      if (!sim2) return;

      var total = turnover(baseW, weightMap(sim2));
      var allocation = turnover(baseS, sleeveMap(sim2));
      var product = withinSleeve(baseSim, sim2);

      out[axis] = {
        movedTo: use,
        allocationImpact: allocation,
        productImpact: product,
        totalImpact: total,
        roles: AXIS_ROLE[axis] || []
      };
      totals.push({ axis: axis, total: total });
    });

    /* Flag an axis whose realised influence does not match the role it is
       documented as playing: an axis that only selects products should not
       be the largest mover of the whole book, and one that drives the
       allocation should not be invisible. */
    var grand = sum(totals.map(function (t) { return t.total; })) || 1;
    var notes = [];
    totals.forEach(function (t) {
      var share = t.total / grand;
      out[t.axis].shareOfVariation = round(share, 4);
      var roles = AXIS_ROLE[t.axis] || [];
      var allocating = roles.some(function (r) { return /llocation/.test(r); });
      if (share > 0.28 && !allocating) {
        notes.push(t.axis + " accounts for " + Math.round(share * 100) +
          "% of realised portfolio variation but is documented as affecting " +
          "selection only (" + roles.join(", ") + ").");
      }
      if (share < 0.02 && allocating) {
        notes.push(t.axis + " is documented as driving allocation but accounts " +
          "for only " + Math.round(share * 100) + "% of realised variation.");
      }
    });

    return { axes: out, notes: notes, formula:
      "d(A,B) = 0.5 * SUM |weight_A(i) - weight_B(i)| / 100, over the union of instruments." };
  }

  /* ------------------------------------------------------------------ */

  return {
    LIMITS: LIMITS,
    FIT_WEIGHTS: FIT_WEIGHTS,
    AXIS_ROLE: AXIS_ROLE,
    SLEEVE_RISK_ANCHOR: SLEEVE_RISK_ANCHOR,
    BASE_ANSWERS: BASE_ANSWERS,

    characteristics: characteristics,
    roomIntent: roomIntent,
    riskProxy: riskProxy,
    compare: compare,
    integrity: integrity,
    sanity: sanity,
    contradictions: contradictions,
    intentFit: intentFit,

    analyze: analyze,
    validate: validate,

    roomFrom: roomFrom,
    withAxis: withAxis,
    runScenario: runScenario,
    runGoldenTests: runGoldenTests,
    runMonotonicityTests: runMonotonicityTests,
    sensitivity: sensitivity,
    turnover: turnover
  };
})();
