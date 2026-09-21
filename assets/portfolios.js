/* NextGen Portfolio Builder — the portfolio base and the matching engine.
 *
 * Eight archetypes. Each carries a `target` on every axis in schema.js:
 *   scale  axes -> a number 0..3 (the portfolio's natural position)
 *   choice axes -> { v: preferred, also: [near-misses that still fit] }
 *
 * To swap in the real product shelf, replace the objects below. Nothing
 * else reads portfolio data directly.
 */
window.PORTFOLIOS = [
  {
    id: "shield",
    name: "Capital Shield",
    tagline: "Preserve first. Return second.",
    blurb: "Short-dated investment grade paper and fully protected notes. Built for capital that cannot be impaired.",
    alloc: { equities: 10, fixedIncome: 55, notes: 25, cash: 10 },
    expReturn: "4 – 6%",
    vol: "Low",
    traits: ["Senior secured credit", "Sub-2y duration", "100% principal protection"],
    target: {
      horizon: 0, maxLoss: 0,
      sector: { v: "consumer", also: ["healthcare"] },
      region: { v: "global", also: ["us"] },
      options: { v: "protection", also: ["none"] },
      credit: 0, duration: 0, rank: 0,
      fxLong: { v: "usd", also: ["chf"] },
      fxConcern: { v: "brl", also: ["jpy"] },
      snReturn: 0, snProtection: 0
    }
  },
  {
    id: "income",
    name: "Steady Income",
    tagline: "A coupon you can plan around.",
    blurb: "Investment grade credit and dividend equity, with covered calls layered on to lift the running yield.",
    alloc: { equities: 25, fixedIncome: 50, notes: 20, cash: 5 },
    expReturn: "6 – 8%",
    vol: "Low to moderate",
    traits: ["Dividend equity core", "Covered call overlay", "90% protected notes"],
    target: {
      horizon: 1, maxLoss: 1,
      sector: { v: "financials", also: ["consumer", "industrials"] },
      region: { v: "global", also: ["us"] },
      options: { v: "income", also: ["none"] },
      credit: 1, duration: 1, rank: 1,
      fxLong: { v: "usd", also: ["eur"] },
      fxConcern: { v: "jpy", also: ["gbp"] },
      snReturn: 1, snProtection: 1
    }
  },
  {
    id: "balanced",
    name: "Balanced Core",
    tagline: "The middle of the road, held with conviction.",
    blurb: "A classic split between global equities and intermediate investment grade credit. No overlay, no leverage.",
    alloc: { equities: 45, fixedIncome: 40, notes: 10, cash: 5 },
    expReturn: "7 – 9%",
    vol: "Moderate",
    traits: ["Global equity core", "5–10y IG credit", "Minimal complexity"],
    target: {
      horizon: 2, maxLoss: 1,
      sector: { v: "industrials", also: ["tech", "healthcare"] },
      region: { v: "global", also: ["us", "europe"] },
      options: { v: "none", also: ["income"] },
      credit: 1, duration: 2, rank: 1,
      fxLong: { v: "usd", also: ["eur"] },
      fxConcern: { v: "gbp", also: ["brl"] },
      snReturn: 1, snProtection: 1
    }
  },
  {
    id: "growth",
    name: "Global Growth",
    tagline: "Own the compounders. Sit still.",
    blurb: "Equity-led and unapologetic about it. Developed market growth names, long horizon, drawdowns accepted.",
    alloc: { equities: 70, fixedIncome: 15, notes: 10, cash: 5 },
    expReturn: "9 – 12%",
    vol: "Moderate to high",
    traits: ["70% equity weight", "DM growth tilt", "Long horizon required"],
    target: {
      horizon: 3, maxLoss: 2,
      sector: { v: "tech", also: ["healthcare", "industrials"] },
      region: { v: "us", also: ["asia", "global"] },
      options: { v: "leverage", also: ["none"] },
      credit: 2, duration: 2, rank: 1,
      fxLong: { v: "usd", also: ["jpy"] },
      fxConcern: { v: "eur", also: ["gbp"] },
      snReturn: 2, snProtection: 2
    }
  },
  {
    id: "credit",
    name: "Credit Opportunist",
    tagline: "Paid to take the risk others won't.",
    blurb: "High yield and subordinated financial paper. The return comes from carry and spread compression, not from equity beta.",
    alloc: { equities: 20, fixedIncome: 60, notes: 15, cash: 5 },
    expReturn: "8 – 10%",
    vol: "Moderate",
    traits: ["High yield core", "Subordinated / Tier 2", "Carry-driven"],
    target: {
      horizon: 2, maxLoss: 2,
      sector: { v: "financials", also: ["energy"] },
      region: { v: "europe", also: ["global", "us"] },
      options: { v: "income", also: ["none"] },
      credit: 3, duration: 2, rank: 2,
      fxLong: { v: "eur", also: ["usd"] },
      fxConcern: { v: "jpy", also: ["chf"] },
      snReturn: 2, snProtection: 2
    }
  },
  {
    id: "emfx",
    name: "EM Carry & FX",
    tagline: "The currency is the trade.",
    blurb: "Emerging market local debt and commodity exposure, where the FX call drives more of the return than the credit does.",
    alloc: { equities: 30, fixedIncome: 45, notes: 15, cash: 10 },
    expReturn: "10 – 14%",
    vol: "High",
    traits: ["EM local currency", "Commodity linked equity", "FX is the main risk"],
    target: {
      horizon: 2, maxLoss: 3,
      sector: { v: "energy", also: ["financials", "industrials"] },
      region: { v: "latam", also: ["asia"] },
      options: { v: "none", also: ["income"] },
      credit: 3, duration: 1, rank: 2,
      fxLong: { v: "brl", also: ["usd"] },
      fxConcern: { v: "eur", also: ["jpy"] },
      snReturn: 3, snProtection: 2
    }
  },
  {
    id: "thematic",
    name: "Thematic Alpha",
    tagline: "Concentrated, convex, uncomfortable.",
    blurb: "A small number of high-conviction themes with long-dated calls on top. The widest range of outcomes on the shelf.",
    alloc: { equities: 75, fixedIncome: 5, notes: 15, cash: 5 },
    expReturn: "12 – 18%",
    vol: "High",
    traits: ["Concentrated themes", "Long call overlay", "Wide outcome range"],
    target: {
      horizon: 3, maxLoss: 3,
      sector: { v: "tech", also: ["healthcare"] },
      region: { v: "us", also: ["asia"] },
      options: { v: "leverage", also: ["protection"] },
      credit: 2, duration: 3, rank: 3,
      fxLong: { v: "usd", also: ["jpy"] },
      fxConcern: { v: "chf", also: ["eur"] },
      snReturn: 3, snProtection: 3
    }
  },
  {
    id: "notesled",
    name: "Yield Enhancer",
    tagline: "Structure does the work.",
    blurb: "Half the book in autocallables and reverse convertibles. Equity-linked payoffs with a barrier, rather than equity itself.",
    alloc: { equities: 20, fixedIncome: 25, notes: 50, cash: 5 },
    expReturn: "8 – 11%",
    vol: "Moderate",
    traits: ["Autocallable core", "70% barrier notes", "Equity-linked, not equity"],
    target: {
      horizon: 1, maxLoss: 2,
      sector: { v: "financials", also: ["tech", "consumer"] },
      region: { v: "us", also: ["europe"] },
      options: { v: "income", also: ["protection"] },
      credit: 2, duration: 1, rank: 2,
      fxLong: { v: "usd", also: ["eur"] },
      fxConcern: { v: "brl", also: ["gbp"] },
      snReturn: 2, snProtection: 2
    }
  }
];

/* How much each answer moves the match. Risk appetite and protection
 * dominate; the FX opinion is flavour, not structure. */
window.WEIGHTS = {
  horizon: 1.2, maxLoss: 1.6,
  sector: 0.8, region: 0.8, options: 1.0,
  credit: 1.2, duration: 1.0, rank: 1.0,
  fxLong: 0.6, fxConcern: 0.5,
  snReturn: 1.2, snProtection: 1.5
};

window.ENGINE = (function () {
  var SCALE_MAX = 3;

  /* One axis, one answer, one portfolio -> 0..1 */
  function scoreAxis(axis, value, target) {
    if (value === null || value === undefined) return null;
    if (axis.kind === "scale") {
      return 1 - Math.abs(value - target) / SCALE_MAX;
    }
    if (value === target.v) return 1;
    if ((target.also || []).indexOf(value) !== -1) return 0.55;
    return 0.1;
  }

  /* A full answer set -> fit score per portfolio, best first.
   * Unanswered axes are skipped rather than penalised, so a partial
   * set still produces a sensible ranking. */
  function rank(answers) {
    return window.PORTFOLIOS.map(function (p) {
      var num = 0, den = 0, per = {};
      window.AXES.forEach(function (axis) {
        var s = scoreAxis(axis, answers[axis.id], p.target[axis.id]);
        if (s === null) return;
        var w = window.WEIGHTS[axis.id];
        per[axis.id] = s;
        num += w * s;
        den += w;
      });
      return {
        portfolio: p,
        fit: den ? Math.round((num / den) * 100) : 0,
        per: per
      };
    }).sort(function (a, b) {
      /* Ties are common once the room average settles mid-scale. Break
       * them on the shelf's own order so the headline never flickers. */
      return b.fit - a.fit || indexOf(a.portfolio) - indexOf(b.portfolio);
    });
  }

  function indexOf(p) { return window.PORTFOLIOS.indexOf(p); }

  /* Many answer sets -> the room's single composite answer set.
   * Scale axes average; choice axes take the modal pick. */
  function roomProfile(responses) {
    var profile = {};
    window.AXES.forEach(function (axis) {
      var vals = responses
        .map(function (r) { return r.answers[axis.id]; })
        .filter(function (v) { return v !== null && v !== undefined; });
      if (!vals.length) { profile[axis.id] = null; return; }
      if (axis.kind === "scale") {
        profile[axis.id] = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      } else {
        var tally = {};
        vals.forEach(function (v) { tally[v] = (tally[v] || 0) + 1; });
        profile[axis.id] = Object.keys(tally).sort(function (a, b) {
          return tally[b] - tally[a] || a.localeCompare(b);
        })[0];
      }
    });
    return profile;
  }

  /* Vote counts per option for one axis, in the schema's option order. */
  function distribution(responses, axisId) {
    var axis = window.AXIS_BY_ID[axisId];
    var tally = {};
    var total = 0;
    responses.forEach(function (r) {
      var v = r.answers[axisId];
      if (v === null || v === undefined) return;
      tally[v] = (tally[v] || 0) + 1;
      total++;
    });
    return {
      total: total,
      bars: axis.options.map(function (o) {
        var count = tally[o.v] || 0;
        return {
          value: o.v,
          label: o.label,
          sub: o.sub || "",
          count: count,
          pct: total ? Math.round((count / total) * 100) : 0
        };
      })
    };
  }

  /* Averaging pulls the room to the middle of every scale, so the
   * composite match alone hides how varied the room actually is. This
   * matches each guest on their OWN answers and tallies the winners —
   * the number that makes the reveal worth watching. */
  function roomSplit(responses) {
    var tally = {};
    responses.forEach(function (r) {
      var top = rank(r.answers)[0];
      if (!top) return;
      tally[top.portfolio.id] = (tally[top.portfolio.id] || 0) + 1;
    });
    var total = responses.length;
    return window.PORTFOLIOS.map(function (p) {
      var count = tally[p.id] || 0;
      return {
        portfolio: p,
        count: count,
        pct: total ? Math.round((count / total) * 100) : 0
      };
    }).sort(function (a, b) {
      return b.count - a.count || indexOf(a.portfolio) - indexOf(b.portfolio);
    });
  }

  /* Where the room sits on a 0..3 axis, as a percentage along the track. */
  function scalePosition(profile, axisId) {
    var v = profile[axisId];
    return v === null || v === undefined ? null : (v / SCALE_MAX) * 100;
  }

  return {
    rank: rank,
    roomProfile: roomProfile,
    roomSplit: roomSplit,
    distribution: distribution,
    scalePosition: scalePosition,
    scoreAxis: scoreAxis
  };
})();
