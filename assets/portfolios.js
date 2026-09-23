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
    expReturn: "4-6%",
    vol: "Low",
    traits: ["Senior secured credit", "Sub-2y duration", "100% principal protection"],
    holdings: [
      {
        "name": "US 2Y Treasury Note",
        "ticker": "T 2Y",
        "cls": "fixedIncome",
        "weight": 22,
        "detail": "Sovereign \u00b7 2y"
      },
      {
        "name": "Short-dated IG corporate ladder",
        "ticker": "IG 1-3Y",
        "cls": "fixedIncome",
        "weight": 20,
        "detail": "A\u2013 avg \u00b7 senior secured"
      },
      {
        "name": "Covered bond basket (EUR)",
        "ticker": "CB EUR",
        "cls": "fixedIncome",
        "weight": 13,
        "detail": "AAA \u00b7 2y"
      },
      {
        "name": "100% capital-protected note, 3y",
        "ticker": "CPN 3Y",
        "cls": "notes",
        "weight": 25,
        "detail": "Principal protected \u00b7 index-linked"
      },
      {
        "name": "Global minimum-volatility equity",
        "ticker": "MinVol",
        "cls": "equities",
        "weight": 10,
        "detail": "Defensive equity sleeve"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 10,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 5,
      "vol": 4.2,
      "maxDrawdown": -4.5,
      "sharpe": 0.71,
      "yield": 4.3,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 8.5,
          "driver": "Rates rally, credit spreads tighten"
        },
        {
          "label": "Base",
          "pct": 5,
          "driver": "Carry earned, protection unused"
        },
        {
          "label": "Bear",
          "pct": -1.5,
          "driver": "Protection caps the loss at the note floor"
        }
      ]
    },
    target: {
      riskProfile: 0, marketView: 0, horizon: 2,
      leverage: { v: "no" },
      country: { v: "us", also: ["g7"] },
      sector: { v: "consumer", also: ["healthcare"] },
      usd: 75,
      capitalIncome: { v: "income" },
      duration: 2,
      credit: { v: "ig" }
    }
  },
  {
    id: "income",
    name: "Steady Income",
    tagline: "A coupon you can plan around.",
    blurb: "Investment grade credit and dividend equity, with covered calls layered on to lift the running yield.",
    alloc: { equities: 25, fixedIncome: 50, notes: 20, cash: 5 },
    expReturn: "6-8%",
    vol: "Low to moderate",
    traits: ["Dividend equity core", "Covered call overlay", "90% protected notes"],
    holdings: [
      {
        "name": "IG corporate credit, 3-5y",
        "ticker": "IG 3-5Y",
        "cls": "fixedIncome",
        "weight": 28,
        "detail": "BBB+ avg \u00b7 senior unsecured"
      },
      {
        "name": "EUR financials senior paper",
        "ticker": "FIN SR",
        "cls": "fixedIncome",
        "weight": 12,
        "detail": "Senior preferred"
      },
      {
        "name": "Emerging sovereign hard currency",
        "ticker": "EMD HC",
        "cls": "fixedIncome",
        "weight": 10,
        "detail": "USD-denominated"
      },
      {
        "name": "Global dividend equity",
        "ticker": "DIV",
        "cls": "equities",
        "weight": 17,
        "detail": "Yield 3.8% \u00b7 quality screen"
      },
      {
        "name": "Covered-call overlay on the equity sleeve",
        "ticker": "BXM",
        "cls": "equities",
        "weight": 8,
        "detail": "Systematic call writing"
      },
      {
        "name": "90% protected autocallable, 2y",
        "ticker": "AC 2Y",
        "cls": "notes",
        "weight": 20,
        "detail": "8% coupon \u00b7 90% barrier"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 5,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 7,
      "vol": 6.8,
      "maxDrawdown": -8,
      "sharpe": 0.74,
      "yield": 5.6,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 12,
          "driver": "Coupons paid, autocall triggers early"
        },
        {
          "label": "Base",
          "pct": 7,
          "driver": "Carry plus dividends, calls expire worthless"
        },
        {
          "label": "Bear",
          "pct": -5.5,
          "driver": "Barrier tested, dividends cushion the drawdown"
        }
      ]
    },
    target: {
      riskProfile: 0, marketView: 1, horizon: 5,
      leverage: { v: "no" },
      country: { v: "g7", also: ["us"] },
      sector: { v: "financials", also: ["consumer", "industrials"] },
      usd: 60,
      capitalIncome: { v: "income" },
      duration: 5,
      credit: { v: "ig" }
    }
  },
  {
    id: "balanced",
    name: "Balanced Core",
    tagline: "The middle of the road, held with conviction.",
    blurb: "A classic split between global equities and intermediate investment grade credit. No overlay, no leverage.",
    alloc: { equities: 45, fixedIncome: 40, notes: 10, cash: 5 },
    expReturn: "7-9%",
    vol: "Moderate",
    traits: ["Global equity core", "5-10y IG credit", "Minimal complexity"],
    holdings: [
      {
        "name": "Developed market equity core",
        "ticker": "DM EQ",
        "cls": "equities",
        "weight": 30,
        "detail": "Cap-weighted global"
      },
      {
        "name": "Global industrials & infrastructure",
        "ticker": "INFRA",
        "cls": "equities",
        "weight": 15,
        "detail": "Thematic tilt"
      },
      {
        "name": "IG corporate credit, 5-10y",
        "ticker": "IG 5-10Y",
        "cls": "fixedIncome",
        "weight": 25,
        "detail": "BBB+ avg \u00b7 intermediate"
      },
      {
        "name": "US Treasury 7-10y",
        "ticker": "UST 7-10",
        "cls": "fixedIncome",
        "weight": 15,
        "detail": "Duration ballast"
      },
      {
        "name": "90% protected note on equity index, 3y",
        "ticker": "PN 3Y",
        "cls": "notes",
        "weight": 10,
        "detail": "Soft buffer"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 5,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 8,
      "vol": 9.5,
      "maxDrawdown": -15,
      "sharpe": 0.63,
      "yield": 3.1,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 17,
          "driver": "Equity beta delivers, duration neutral"
        },
        {
          "label": "Base",
          "pct": 8,
          "driver": "Equity earnings growth plus bond carry"
        },
        {
          "label": "Bear",
          "pct": -12,
          "driver": "Equity drawdown, partly offset by duration"
        }
      ]
    },
    target: {
      riskProfile: 1, marketView: 1, horizon: 10,
      leverage: { v: "no" },
      country: { v: "g7", also: ["us", "europe"] },
      sector: { v: "industrials", also: ["tech", "healthcare"] },
      usd: 55,
      capitalIncome: { v: "capital", also: ["income"] },
      duration: 8,
      credit: { v: "ig" }
    }
  },
  {
    id: "growth",
    name: "Global Growth",
    tagline: "Own the compounders. Sit still.",
    blurb: "Equity-led and unapologetic about it. Developed market growth names, long horizon, drawdowns accepted.",
    alloc: { equities: 70, fixedIncome: 15, notes: 10, cash: 5 },
    expReturn: "9-12%",
    vol: "Moderate to high",
    traits: ["70% equity weight", "DM growth tilt", "Long horizon required"],
    holdings: [
      {
        "name": "US large-cap growth",
        "ticker": "US GRW",
        "cls": "equities",
        "weight": 30,
        "detail": "Quality growth screen"
      },
      {
        "name": "Global healthcare innovation",
        "ticker": "HLTH",
        "cls": "equities",
        "weight": 15,
        "detail": "Thematic sleeve"
      },
      {
        "name": "Asia ex-Japan equity",
        "ticker": "AXJ",
        "cls": "equities",
        "weight": 15,
        "detail": "Regional diversifier"
      },
      {
        "name": "Global software & semis",
        "ticker": "TECH",
        "cls": "equities",
        "weight": 10,
        "detail": "Concentrated"
      },
      {
        "name": "IG corporate credit, 5-10y",
        "ticker": "IG 5-10Y",
        "cls": "fixedIncome",
        "weight": 15,
        "detail": "Ballast only"
      },
      {
        "name": "Participation note on equity index, 3y",
        "ticker": "PPN 3Y",
        "cls": "notes",
        "weight": 10,
        "detail": "1.2x upside, no cap"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 5,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 10.5,
      "vol": 14.5,
      "maxDrawdown": -26,
      "sharpe": 0.58,
      "yield": 1.4,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 26,
          "driver": "Growth multiple expansion, note participates 1.2x"
        },
        {
          "label": "Base",
          "pct": 10.5,
          "driver": "Earnings compound, multiples flat"
        },
        {
          "label": "Bear",
          "pct": -22,
          "driver": "Multiple compression; little ballast to absorb it"
        }
      ]
    },
    target: {
      riskProfile: 2, marketView: 2, horizon: 20,
      leverage: { v: "no", also: ["yes"] },
      country: { v: "us", also: ["asia", "g7"] },
      sector: { v: "tech", also: ["healthcare", "industrials"] },
      usd: 70,
      capitalIncome: { v: "capital" },
      duration: 7,
      credit: { v: "ig", also: ["hy"] }
    }
  },
  {
    id: "credit",
    name: "Credit Opportunist",
    tagline: "Paid to take the risk others won't.",
    blurb: "High yield and subordinated financial paper. The return comes from carry and spread compression, not from equity beta.",
    alloc: { equities: 20, fixedIncome: 60, notes: 15, cash: 5 },
    expReturn: "8-10%",
    vol: "Moderate",
    traits: ["High yield core", "Subordinated / Tier 2", "Carry-driven"],
    holdings: [
      {
        "name": "European high yield, BB-B",
        "ticker": "EU HY",
        "cls": "fixedIncome",
        "weight": 25,
        "detail": "Senior unsecured"
      },
      {
        "name": "Subordinated financials (Tier 2)",
        "ticker": "T2",
        "cls": "fixedIncome",
        "weight": 20,
        "detail": "Subordinated"
      },
      {
        "name": "US high yield, short duration",
        "ticker": "US HY SD",
        "cls": "fixedIncome",
        "weight": 15,
        "detail": "2-4y"
      },
      {
        "name": "Financials equity",
        "ticker": "FIN EQ",
        "cls": "equities",
        "weight": 12,
        "detail": "Banks & insurers"
      },
      {
        "name": "Covered-call overlay",
        "ticker": "BXM",
        "cls": "equities",
        "weight": 8,
        "detail": "Yield enhancement"
      },
      {
        "name": "Credit-linked note, 3y",
        "ticker": "CLN 3Y",
        "cls": "notes",
        "weight": 15,
        "detail": "Reference: IG index"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 5,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 9,
      "vol": 8.5,
      "maxDrawdown": -16,
      "sharpe": 0.71,
      "yield": 7.4,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 15,
          "driver": "Spreads compress, no defaults in the book"
        },
        {
          "label": "Base",
          "pct": 9,
          "driver": "Carry earned, default rate near historical average"
        },
        {
          "label": "Bear",
          "pct": -13,
          "driver": "Spread widening and subordinated paper repriced hardest"
        }
      ]
    },
    target: {
      riskProfile: 1, marketView: 1, horizon: 7,
      leverage: { v: "no", also: ["yes"] },
      country: { v: "europe", also: ["g7"] },
      sector: { v: "financials", also: ["energy"] },
      usd: 45,
      capitalIncome: { v: "income" },
      duration: 6,
      credit: { v: "hy" }
    }
  },
  {
    id: "emfx",
    name: "EM Carry & FX",
    tagline: "The currency is the trade.",
    blurb: "Emerging market local debt and commodity exposure, where the FX call drives more of the return than the credit does.",
    alloc: { equities: 30, fixedIncome: 45, notes: 15, cash: 10 },
    expReturn: "10-14%",
    vol: "High",
    traits: ["EM local currency", "Commodity linked equity", "FX is the main risk"],
    holdings: [
      {
        "name": "Brazil local-currency sovereign (NTN-B)",
        "ticker": "NTN-B",
        "cls": "fixedIncome",
        "weight": 20,
        "detail": "BRL \u00b7 inflation-linked"
      },
      {
        "name": "EM local-currency sovereign basket",
        "ticker": "EM LC",
        "cls": "fixedIncome",
        "weight": 15,
        "detail": "LatAm & Asia"
      },
      {
        "name": "EM hard-currency corporates",
        "ticker": "EM CORP",
        "cls": "fixedIncome",
        "weight": 10,
        "detail": "BB avg"
      },
      {
        "name": "LatAm energy & materials equity",
        "ticker": "LATAM",
        "cls": "equities",
        "weight": 18,
        "detail": "Commodity linked"
      },
      {
        "name": "Global mining equity",
        "ticker": "MINE",
        "cls": "equities",
        "weight": 12,
        "detail": "Diversified miners"
      },
      {
        "name": "FX-linked note, BRL/USD, 2y",
        "ticker": "FXN 2Y",
        "cls": "notes",
        "weight": 15,
        "detail": "Currency participation"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 10,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 12,
      "vol": 17,
      "maxDrawdown": -30,
      "sharpe": 0.53,
      "yield": 8.1,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 30,
          "driver": "BRL appreciates, commodity cycle turns up"
        },
        {
          "label": "Base",
          "pct": 12,
          "driver": "High local carry, currency roughly flat"
        },
        {
          "label": "Bear",
          "pct": -25,
          "driver": "Currency depreciation overwhelms the carry"
        }
      ]
    },
    target: {
      riskProfile: 2, marketView: 2, horizon: 8,
      leverage: { v: "no", also: ["yes"] },
      country: { v: "em", also: ["latam", "asia"] },
      sector: { v: "energy", also: ["financials", "industrials"] },
      usd: 30,
      capitalIncome: { v: "income" },
      duration: 4,
      credit: { v: "hy" }
    }
  },
  {
    id: "thematic",
    name: "Thematic Alpha",
    tagline: "Concentrated, convex, uncomfortable.",
    blurb: "A small number of high-conviction themes with long-dated calls on top. The widest range of outcomes on the shelf.",
    alloc: { equities: 75, fixedIncome: 5, notes: 15, cash: 5 },
    expReturn: "12-18%",
    vol: "High",
    traits: ["Concentrated themes", "Long call overlay", "Wide outcome range"],
    holdings: [
      {
        "name": "AI & automation basket",
        "ticker": "AI",
        "cls": "equities",
        "weight": 25,
        "detail": "Concentrated \u00b7 12 names"
      },
      {
        "name": "Healthcare innovation basket",
        "ticker": "BIO",
        "cls": "equities",
        "weight": 20,
        "detail": "Concentrated \u00b7 10 names"
      },
      {
        "name": "Financial disruption basket",
        "ticker": "FNTK",
        "cls": "equities",
        "weight": 15,
        "detail": "Payments & exchanges"
      },
      {
        "name": "Long-dated calls on the theme baskets",
        "ticker": "LEAPS",
        "cls": "equities",
        "weight": 15,
        "detail": "2y calls \u00b7 convex"
      },
      {
        "name": "Leveraged participation note, 3y",
        "ticker": "LPN 3Y",
        "cls": "notes",
        "weight": 15,
        "detail": "1.5x upside, no protection"
      },
      {
        "name": "IG corporate credit",
        "ticker": "IG",
        "cls": "fixedIncome",
        "weight": 5,
        "detail": "Minimal ballast"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 5,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 15,
      "vol": 24,
      "maxDrawdown": -42,
      "sharpe": 0.52,
      "yield": 0.4,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 48,
          "driver": "Themes re-rate; calls and the 1.5x note compound the move"
        },
        {
          "label": "Base",
          "pct": 15,
          "driver": "Themes grow into their multiples"
        },
        {
          "label": "Bear",
          "pct": -38,
          "driver": "Calls expire worthless; concentration offers nowhere to hide"
        }
      ]
    },
    target: {
      riskProfile: 2, marketView: 2, horizon: 25,
      leverage: { v: "yes", also: ["no"] },
      country: { v: "us", also: ["asia"] },
      sector: { v: "tech", also: ["healthcare"] },
      usd: 80,
      capitalIncome: { v: "capital" },
      duration: 3,
      credit: { v: "hy", also: ["ig"] }
    }
  },
  {
    id: "notesled",
    name: "Yield Enhancer",
    tagline: "Structure does the work.",
    blurb: "Half the book in autocallables and reverse convertibles. Equity-linked payoffs with a barrier, rather than equity itself.",
    alloc: { equities: 20, fixedIncome: 25, notes: 50, cash: 5 },
    expReturn: "8-11%",
    vol: "Moderate",
    traits: ["Autocallable core", "70% barrier notes", "Equity-linked, not equity"],
    holdings: [
      {
        "name": "Autocallable on US index, 2y",
        "ticker": "AC 2Y",
        "cls": "notes",
        "weight": 20,
        "detail": "9% coupon \u00b7 70% barrier"
      },
      {
        "name": "Reverse convertible on financials basket, 1y",
        "ticker": "RC 1Y",
        "cls": "notes",
        "weight": 15,
        "detail": "11% coupon \u00b7 70% barrier"
      },
      {
        "name": "Autocallable on EuroStoxx, 3y",
        "ticker": "AC EU",
        "cls": "notes",
        "weight": 15,
        "detail": "8.5% coupon \u00b7 65% barrier"
      },
      {
        "name": "IG corporate credit, 1-3y",
        "ticker": "IG 1-3Y",
        "cls": "fixedIncome",
        "weight": 25,
        "detail": "Collateral sleeve"
      },
      {
        "name": "US large-cap equity",
        "ticker": "US EQ",
        "cls": "equities",
        "weight": 20,
        "detail": "Unhedged residual"
      },
      {
        "name": "USD money market",
        "ticker": "MMF",
        "cls": "cash",
        "weight": 5,
        "detail": "Daily liquidity"
      }
    ],
    risk: {
      "expReturn": 9.5,
      "vol": 10.5,
      "maxDrawdown": -22,
      "sharpe": 0.62,
      "yield": 9.2,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 11,
          "driver": "Notes autocall at the first observation; coupon capped"
        },
        {
          "label": "Base",
          "pct": 9.5,
          "driver": "Coupons paid, barriers intact"
        },
        {
          "label": "Bear",
          "pct": -19,
          "driver": "Barriers breached \u2014 full equity downside, coupons stop"
        }
      ]
    },
    target: {
      riskProfile: 1, marketView: 1, horizon: 4,
      leverage: { v: "yes", also: ["no"] },
      country: { v: "us", also: ["europe"] },
      sector: { v: "financials", also: ["tech", "consumer"] },
      usd: 70,
      capitalIncome: { v: "income" },
      duration: 3,
      credit: { v: "ig" }
    }
  }
];

/* How much each answer moves the match. Risk appetite and protection
 * dominate; the FX opinion is flavour, not structure. */
window.WEIGHTS = {
  riskProfile: 1.8, marketView: 1.0, horizon: 1.3,
  leverage: 0.9, country: 0.9,
  sector: 0.8,
  usd: 0.8,
  capitalIncome: 1.2, duration: 1.0, credit: 1.2
};

window.ENGINE = (function () {

  /* How far apart two values on this axis can possibly be — the
     denominator that turns a distance into a 0..1 score. A scale spans its
     option count, a range spans min..max. */
  function span(axis) {
    if (axis.kind === "range") return (axis.max - axis.min) || 1;
    return ((axis.options || []).length - 1) || 1;
  }

  /* The bands a range axis is reported in. Few enough stops and each stop
     is its own bar; otherwise six equal bands, so a 1-30y slider does not
     produce thirty unreadable bars on the projector. */
  function rangeBuckets(axis) {
    var stops = Math.round((axis.max - axis.min) / (axis.step_ || 1)) + 1;
    var out = [], i;
    if (stops <= 8) {
      for (i = 0; i < stops; i++) {
        var v = axis.min + i * (axis.step_ || 1);
        out.push({ lo: v, hi: v, label: axis.format ? axis.format(v) : v + (axis.unit || "") });
      }
      return out;
    }
    var bands = 6;
    var width = (axis.max - axis.min + 1) / bands;
    for (i = 0; i < bands; i++) {
      var lo = Math.round(axis.min + i * width);
      var hi = i === bands - 1 ? axis.max : Math.round(axis.min + (i + 1) * width) - 1;
      out.push({ lo: lo, hi: hi, label: lo + "-" + hi + (axis.unit || "") });
    }
    return out;
  }

  /* One axis, one answer, one portfolio -> 0..1, or null to skip the axis.
   *
   * multi axes come in two flavours, told apart by the target's shape:
   *   affinity  { v, also }    things the guest WANTS — sectors, themes
   *   avoidance { conflicts }  things the guest RULES OUT — exclusions,
   *                            where a hit means this portfolio holds
   *                            something the guest will not own
   */
  function scoreAxis(axis, value, target) {
    if (value === null || value === undefined) return null;

    if (axis.kind === "scale" || axis.kind === "range") {
      return 1 - Math.abs(value - target) / span(axis);
    }

    if (axis.kind === "multi") {
      var picks = Array.isArray(value) ? value : [value];

      if (target && (target.conflicts || target.screens)) {
        /* Two tiers, because they are genuinely different problems:
         *   conflicts — the strategy cannot exist without it (an EM carry
         *               book without emerging markets). Handled in rank()
         *               as a hard block; scored 0 here.
         *   screens   — the portfolio happens to hold it and could screen
         *               it out. A real cost, not a disqualification. */
        if (!picks.length) return 1;
        var hard = picks.filter(function (v) {
          return (target.conflicts || []).indexOf(v) !== -1;
        }).length;
        if (hard) return 0;
        var soft = picks.filter(function (v) {
          return (target.screens || []).indexOf(v) !== -1;
        }).length;
        return Math.max(0, 1 - soft * 0.25);
      }

      /* Nothing picked on an affinity axis says nothing about fit — skip
         it rather than scoring the guest down for abstaining. */
      if (!picks.length) return null;

      var each = picks.map(function (v) {
        if (v === target.v) return 1;
        if ((target.also || []).indexOf(v) !== -1) return 0.55;
        return 0.1;
      });
      var best = Math.max.apply(null, each);
      var mean = each.reduce(function (a, b) { return a + b; }, 0) / each.length;
      /* The strongest match carries the axis; unrelated extras shade it
         down a little, so scattershot picking does not beat conviction. */
      return 0.7 * best + 0.3 * mean;
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
      var num = 0, den = 0, per = {}, blockedBy = [];

      window.AXES.forEach(function (axis) {
        var value = answers[axis.id];
        var target = p.target[axis.id];

        /* A hard axis is a constraint, not a preference: if the guest
           ruled out something this portfolio actually holds, no score on
           the other fifteen axes should be able to recommend it. */
        if (axis.hard && target && target.conflicts && Array.isArray(value)) {
          value.forEach(function (v) {
            if (target.conflicts.indexOf(v) !== -1) {
              var opt = axis.options.find(function (o) { return o.v === v; });
              blockedBy.push(opt ? opt.label : v);
            }
          });
        }

        var s = scoreAxis(axis, value, target);
        if (s === null) return;
        var w = window.WEIGHTS[axis.id];
        per[axis.id] = s;
        num += w * s;
        den += w;
      });

      return {
        portfolio: p,
        fit: den ? Math.round((num / den) * 100) : 0,
        per: per,
        blocked: blockedBy.length > 0,
        blockedBy: blockedBy
      };
    }).sort(function (a, b) {
      /* Ruled-out portfolios sort below everything still eligible, however
         well they score elsewhere. Ties are common once the room average
         settles mid-scale, so break them on the shelf's own order and the
         headline never flickers. */
      if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
      return b.fit - a.fit || indexOf(a.portfolio) - indexOf(b.portfolio);
    });
  }

  /* The portfolios a guest is still eligible for. */
  function eligible(answers) {
    return rank(answers).filter(function (r) { return !r.blocked; });
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

      if (axis.kind === "scale" || axis.kind === "range") {
        profile[axis.id] = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        return;
      }

      var tally = {};
      var respondents = 0;
      vals.forEach(function (v) {
        respondents++;
        (Array.isArray(v) ? v : [v]).forEach(function (x) {
          tally[x] = (tally[x] || 0) + 1;
        });
      });
      var ranked = Object.keys(tally).sort(function (a, b) {
        return tally[b] - tally[a] || a.localeCompare(b);
      });

      if (axis.kind === "multi") {
        /* The room's collective pick: every option a quarter of the room
           or more chose, and never fewer than one. */
        var floor = respondents * 0.25;
        var kept = ranked.filter(function (k) { return tally[k] >= floor; });
        profile[axis.id] = kept.length ? kept : ranked.slice(0, 1);
      } else {
        profile[axis.id] = ranked[0];
      }
    });
    return profile;
  }

  /* Vote counts per option for one axis, in the schema's option order. */
  /* Vote counts per option for one axis, in the schema's option order.
   *
   * `pct` is the share of RESPONDENTS who picked that option — so on a
   * multi axis the bars legitimately sum to more than 100%, and each bar
   * still reads as "this fraction of the room wanted this". */
  function distribution(responses, axisId) {
    var axis = window.AXIS_BY_ID[axisId];
    var tally = {};
    var respondents = 0;
    var picks = 0;

    responses.forEach(function (r) {
      var v = r.answers[axisId];
      if (v === null || v === undefined) return;
      if (Array.isArray(v)) {
        /* An empty set is a real answer on an opt-out axis ("exclude
           nothing"), so it counts as a respondent either way. */
        respondents++;
        v.forEach(function (x) { tally[x] = (tally[x] || 0) + 1; picks++; });
      } else {
        respondents++;
        tally[v] = (tally[v] || 0) + 1;
        picks++;
      }
    });

    return {
      total: respondents,
      respondents: respondents,
      picks: picks,
      multi: axis.kind === "multi",
      bars: axis.options.map(function (o) {
        var count = tally[o.v] || 0;
        return {
          value: o.v,
          label: o.label,
          sub: o.sub || "",
          count: count,
          pct: respondents ? Math.round((count / respondents) * 100) : 0
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

  /* Where a value sits along an axis's track, as a percentage. */
  function scalePosition(profile, axisId) {
    var v = profile[axisId];
    if (v === null || v === undefined) return null;
    var axis = window.AXIS_BY_ID[axisId];
    var base = axis.kind === "range" ? axis.min : 0;
    return ((v - base) / span(axis)) * 100;
  }

  /* ---- aggregate views -------------------------------------------
   * The room screens read COUNTS, never individual responses: the
   * backend never sends them, so one guest can never see another's
   * answers. Everything below derives from the same aggregate shape:
   *   { count, axes: { id: {counts, sum, n, respondents} }, matches: {} }
   */

  /* Build that shape locally — used with no backend, so the rendering
     path is identical whether or not a worker is configured. */
  function aggregate(responses) {
    var axes = {}, matches = {}, complete = 0;
    responses.forEach(function (r) {
      var top = rank(r.answers)[0];
      if (top && !top.blocked) { matches[top.portfolio.id] = (matches[top.portfolio.id] || 0) + 1; complete++; }
      window.AXES.forEach(function (axis) {
        var v = r.answers[axis.id];
        if (v === null || v === undefined) return;
        var a = axes[axis.id] || (axes[axis.id] = { counts: {}, sum: 0, n: 0, respondents: 0 });
        a.respondents++;
        if (Array.isArray(v)) {
          v.forEach(function (x) { a.counts[x] = (a.counts[x] || 0) + 1; });
        } else if (typeof v === "number") {
          a.counts[v] = (a.counts[v] || 0) + 1; a.sum += v; a.n++;
        } else {
          a.counts[v] = (a.counts[v] || 0) + 1;
        }
      });
    });
    return { count: responses.length, complete: complete, axes: axes, matches: matches };
  }

  function aggProfile(agg) {
    var profile = {};
    window.AXES.forEach(function (axis) {
      var a = agg.axes[axis.id];
      if (!a || !a.respondents) { profile[axis.id] = null; return; }

      if (axis.kind === "scale" || axis.kind === "range") {
        profile[axis.id] = a.n ? a.sum / a.n : null;
        return;
      }
      var ranked = Object.keys(a.counts).sort(function (x, y) {
        return a.counts[y] - a.counts[x] || x.localeCompare(y);
      });
      if (!ranked.length) { profile[axis.id] = axis.kind === "multi" ? [] : null; return; }
      if (axis.kind === "multi") {
        var floor = a.respondents * 0.25;
        var kept = ranked.filter(function (k) { return a.counts[k] >= floor; });
        profile[axis.id] = kept.length ? kept : ranked.slice(0, 1);
      } else {
        profile[axis.id] = ranked[0];
      }
    });
    return profile;
  }

  function aggDistribution(agg, axisId) {
    var axis = window.AXIS_BY_ID[axisId];
    var a = agg.axes[axisId] || { counts: {}, respondents: 0 };
    var picks = Object.keys(a.counts).reduce(function (t, k) { return t + a.counts[k]; }, 0);
    var bars;

    if (axis.kind === "range") {
      /* Slider values are counted individually, then collected into the
         reporting bands. */
      bars = rangeBuckets(axis).map(function (b) {
        var count = 0;
        Object.keys(a.counts).forEach(function (k) {
          var v = Number(k);
          if (v >= b.lo && v <= b.hi) count += a.counts[k];
        });
        return {
          value: b.lo, label: b.label, sub: "", count: count,
          pct: a.respondents ? Math.round((count / a.respondents) * 100) : 0
        };
      });
    } else {
      bars = axis.options.map(function (o) {
        var count = a.counts[o.v] || a.counts[String(o.v)] || 0;
        return {
          value: o.v, label: o.label, sub: o.sub || "", count: count,
          pct: a.respondents ? Math.round((count / a.respondents) * 100) : 0
        };
      });
    }

    return {
      total: a.respondents,
      respondents: a.respondents,
      picks: picks,
      multi: axis.kind === "multi",
      bars: bars
    };
  }

  /* Where one guest sits against the room on a numeric axis: the share of
     the room at or below their answer. */
  function percentile(agg, axisId, value) {
    var a = agg.axes[axisId];
    if (!a || !a.respondents || value === null || value === undefined) return null;
    var below = 0, total = 0;
    Object.keys(a.counts).forEach(function (k) {
      var n = a.counts[k];
      total += n;
      if (Number(k) < value) below += n;
      else if (Number(k) === value) below += n / 2;   /* ties sit mid-band */
    });
    return total ? Math.round((below / total) * 100) : null;
  }

  function aggSplit(agg) {
    var total = Object.keys(agg.matches || {}).reduce(function (t, k) { return t + agg.matches[k]; }, 0);
    return window.PORTFOLIOS.map(function (p) {
      var count = (agg.matches && agg.matches[p.id]) || 0;
      return { portfolio: p, count: count, pct: total ? Math.round((count / total) * 100) : 0 };
    }).sort(function (a, b) {
      return b.count - a.count || indexOf(a.portfolio) - indexOf(b.portfolio);
    });
  }

  /* ---- where the room landed, as an allocation ----------------------
   *
   * An INDICATIVE breakdown across the four sleeves, derived from the
   * room's own answers. It exists so the admin board can show where the
   * room collectively sits before the real portfolio shelf is built;
   * replace this with the real construction rules when it is.
   *
   * Everything is read from the aggregate rather than from a modal pick,
   * so the bar moves smoothly as answers come in instead of jumping when
   * one option overtakes another.
   */
  function roomAllocation(agg) {
    function avg(id, fallback) {
      var a = agg.axes[id];
      return a && a.n ? a.sum / a.n : fallback;
    }
    function share(id, value) {
      var a = agg.axes[id];
      if (!a || !a.respondents) return 0;
      return (a.counts[value] || 0) / a.respondents;
    }

    var risk    = avg("riskProfile", 1);      /* 0..2 */
    var view    = avg("marketView", 1);       /* 0..2 */
    var horizon = avg("horizon", 10);         /* 1..30 */
    var usd     = avg("usd", 50);             /* 0..100 */
    var levered = share("leverage", "yes");   /* 0..1  */
    var income  = share("capitalIncome", "income");

    /* Carve out the specialist sleeves FIRST, then split what is left
       between equity and fixed income. Adding them on top instead made the
       split non-monotonic: a levered room ended up with LESS equity than
       an income-seeking one, purely because its notes sleeve squeezed the
       remainder. */

    /* Leverage is expressed through structured notes rather than margin. */
    var notes = 8 + levered * 14;

    /* A strong dollar view either way justifies a real FX sleeve;
       indifference at 50% does not. */
    var fx = 5 + (Math.abs(usd - 50) / 50) * 12;

    /* What share of the remaining risk budget belongs in equity. */
    var equityShare = 0.15
      + (risk / 2) * 0.60
      + (view - 1) * 0.08
      + Math.max(-0.10, Math.min(0.10, ((horizon - 10) / 20) * 0.10))
      - income * 0.16;
    equityShare = Math.max(0.05, Math.min(0.90, equityShare));

    var remaining = 100 - notes - fx;
    var equity = remaining * equityShare;
    var fixedIncome = remaining - equity;

    var raw = { equities: equity, fixedIncome: fixedIncome, notes: notes, fx: fx };
    var total = raw.equities + raw.fixedIncome + raw.notes + raw.fx;

    /* Round to whole percent and put any rounding drift on the largest
       sleeve, so the four always read as exactly 100. */
    var out = {};
    Object.keys(raw).forEach(function (k) { out[k] = Math.round((raw[k] / total) * 100); });
    var sum = Object.keys(out).reduce(function (t, k) { return t + out[k]; }, 0);
    if (sum !== 100) {
      var biggest = Object.keys(out).reduce(function (a, b) { return out[a] >= out[b] ? a : b; });
      out[biggest] += 100 - sum;
    }

    out.drivers = {
      risk: risk, view: view, horizon: horizon, usd: usd,
      levered: levered, income: income
    };
    return out;
  }

  /* ---- the room's simulated book -------------------------------------
   *
   * Takes the allocation above and fills each bucket with actual products,
   * weighted by what the room asked for: sector votes drive the equity
   * sleeves, the IG/HY split and duration drive fixed income, leverage and
   * risk appetite drive which notes appear, and the dollar share drives FX.
   *
   * The shelf itself lives in data/products.json so it can be replaced
   * without touching this logic. Weights inside a bucket always sum to
   * that bucket's allocation.
   */
  function roomPortfolio(agg, products) {
    if (!products) return null;
    var alloc = roomAllocation(agg);

    function share(id, value) {
      var a = agg.axes[id];
      if (!a || !a.respondents) return 0;
      return (a.counts[value] || 0) / a.respondents;
    }
    function avg(id, fallback) {
      var a = agg.axes[id];
      return a && a.n ? a.sum / a.n : fallback;
    }
    function topKeys(id) {
      var a = agg.axes[id];
      if (!a) return [];
      return Object.keys(a.counts).sort(function (x, y) {
        return a.counts[y] - a.counts[x] || x.localeCompare(y);
      });
    }

    /* Spread a bucket's weight across picks in proportion, rounding so the
       parts still add up to the whole. */
    function spread(total, parts) {
      var sum = parts.reduce(function (t, p) { return t + p.w; }, 0);
      if (sum <= 0) return [];
      var out = parts.map(function (p) {
        return { item: p.item, weight: (p.w / sum) * total };
      });
      out.forEach(function (o) { o.weight = Math.round(o.weight * 10) / 10; });
      var drift = Math.round((total - out.reduce(function (t, o) { return t + o.weight; }, 0)) * 10) / 10;
      if (drift && out.length) out[0].weight = Math.round((out[0].weight + drift) * 10) / 10;
      return out.filter(function (o) { return o.weight > 0; });
    }

    var buckets = [];

    /* --- equities: the room's sector votes, plus a regional core ------- */
    var eqLines = [];
    var secAxis = agg.axes.sector;
    if (secAxis && secAxis.respondents) {
      var parts = Object.keys(secAxis.counts).map(function (k) {
        return { item: products.equities.sectors[k], w: secAxis.counts[k] };
      }).filter(function (p) { return p.item; });

      /* The most-voted country of risk carries a core position, so the
         book is not purely a pile of sector bets. */
      var region = topKeys("country")[0];
      var regionItem = region && products.equities.regions[region];
      var coreShare = 0.4;
      if (regionItem) {
        eqLines = eqLines.concat(spread(alloc.equities * coreShare, [{ item: regionItem, w: 1 }]));
        eqLines = eqLines.concat(spread(alloc.equities * (1 - coreShare), parts));
      } else {
        eqLines = spread(alloc.equities, parts);
      }
    }
    buckets.push({ key: "equities", label: "Equities", weight: alloc.equities, lines: eqLines });

    /* --- fixed income: credit quality split, duration on the sovereign - */
    var hy = share("credit", "hy");
    var ig = share("credit", "ig");
    var dur = avg("duration", 5);
    var fiParts = [
      { item: products.fixedIncome.govt, w: 0.30 },
      { item: products.fixedIncome.ig,   w: 0.55 * (ig || 0.5) + 0.15 },
      { item: products.fixedIncome.hy,   w: 0.55 * hy },
      { item: products.fixedIncome.sub,  w: 0.20 * hy }
    ];
    if (topKeys("country")[0] === "em" || topKeys("country")[0] === "latam") {
      fiParts.push({ item: products.fixedIncome.em, w: 0.25 });
    }
    var fiLines = spread(alloc.fixedIncome, fiParts.filter(function (p) { return p.item && p.w > 0; }));
    /* The sovereign line carries the room's duration, so say what it is. */
    fiLines.forEach(function (l) {
      if (l.item === products.fixedIncome.govt) {
        l.note = Math.round(dur) + "y duration";
      }
    });
    buckets.push({ key: "fixedIncome", label: "Fixed income", weight: alloc.fixedIncome, lines: fiLines });

    /* --- notes: protection at the cautious end, gearing at the other --- */
    var risk = avg("riskProfile", 1) / 2;          /* 0..1 */
    var levered = share("leverage", "yes");
    var noteParts = [
      { item: products.notes.protected,     w: Math.max(0, 1 - risk * 1.6) },
      { item: products.notes.buffered,      w: 0.6 },
      { item: products.notes.autocall,      w: 0.4 + risk * 0.6 },
      { item: products.notes.participation, w: levered * 0.9 },
      { item: products.notes.reverse,       w: Math.max(0, risk - 0.4) * 1.2 }
    ];
    buckets.push({
      key: "notes", label: "Structured notes", weight: alloc.notes,
      lines: spread(alloc.notes, noteParts.filter(function (p) { return p.item && p.w > 0.05; }))
    });

    /* --- fx: the dollar share against everything else ------------------ */
    var usd = avg("usd", 50) / 100;
    var fxParts = [
      { item: products.fx.usd,   w: Math.max(0.05, usd) },
      { item: products.fx.local, w: Math.max(0.05, 1 - usd) }
    ];
    var ctry = topKeys("country")[0];
    if (ctry === "europe") fxParts.push({ item: products.fx.eur, w: 0.35 });
    if (ctry === "latam")  fxParts.push({ item: products.fx.brl, w: 0.35 });
    buckets.push({
      key: "fx", label: "FX", weight: alloc.fx,
      lines: spread(alloc.fx, fxParts.filter(function (p) { return p.item; }))
    });

    return { alloc: alloc, buckets: buckets };
  }

  return {
    rank: rank,
    eligible: eligible,
    roomAllocation: roomAllocation,
    roomPortfolio: roomPortfolio,
    aggregate: aggregate,
    aggProfile: aggProfile,
    aggDistribution: aggDistribution,
    aggSplit: aggSplit,
    percentile: percentile,
    rangeBuckets: rangeBuckets,
    span: span,
    roomProfile: roomProfile,
    roomSplit: roomSplit,
    distribution: distribution,
    scalePosition: scalePosition,
    scoreAxis: scoreAxis
  };
})();
