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
      country: { v: "g7" },
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
      country: { v: "g7" },
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
      country: { v: "g7" },
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
      country: { v: "g7", also: ["em"] },
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
      country: { v: "g7" },
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
      country: { v: "em" },
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
      country: { v: "g7", also: ["em"] },
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
      country: { v: "g7" },
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
  /* Score every equity product on the shelf against the room's answers.
   *
   * For each question, the room's share of each answer is multiplied by how
   * well the product fits that answer, and the result is weighted by how
   * much that question counts. One number per product, fully decomposable:
   * the validation page renders exactly this breakdown.
   */
  function scoreShelf(agg, config, opts) {
    var eqc = config;
    if (!eqc || !eqc.shelf) return { all: [], picked: [] };

    var sel = eqc.selection || {};
    var W = sel.weights || {};

    function shares(axisId) {
      var a = agg.axes[axisId];
      if (!a || !a.respondents) return null;
      var out = {};
      Object.keys(a.counts).forEach(function (k) {
        out[k] = a.counts[k] / a.respondents;
      });
      return out;
    }

    /* Three shapes of fit:
       - an array, for a scale axis reported as an index
       - a map, for a choice or multi axis reported by key
       - { target }, for a continuous axis such as the dollar share or
         duration, where the product sits at a point on the same range and
         is scored by distance from where the room landed. */
    function axisScore(axisId, fit) {
      if (!fit) return null;

      if (fit.target !== undefined) {
        var a = agg.axes[axisId];
        if (!a || !a.n) return null;
        var axis = window.AXIS_BY_ID[axisId];
        if (!axis) return null;
        var reach = (axis.max - axis.min) || 1;

        /* Score against every answer in the room and average the result,
           rather than scoring the room's average once.
           
           Those are not the same number, and the difference decided the
           book. Collapsing the room to its mean first makes a mid-range
           instrument close to almost any room, so the engine kept buying
           60-70% dollar funds and could not reach the US shelf at all:
           XLK, VGT, QQQ, XLV, SCHD and USMV all sit at 100 and were picked
           in none of 400 test rooms. It is also simply the wrong question
           to ask of a split room — half at 0% and half at 100% averages to
           50%, and the engine bought the one fund nobody had voted for.
           Averaging the scores instead lets a divided room register as
           divided: both extremes score equally, and the middle earns no
           artificial premium. */
        var tot = 0, wsum = 0;
        Object.keys(a.counts).forEach(function (k) {
          var v = Number(k);
          if (!isFinite(v)) return;
          var c = a.counts[k];
          tot += c * Math.max(0, 1 - Math.abs(v - fit.target) / reach);
          wsum += c;
        });
        return wsum ? tot / wsum : null;
      }

      var sh = shares(axisId);
      if (!sh) return null;
      var total = 0, mass = 0;
      Object.keys(sh).forEach(function (k) {
        var f = Array.isArray(fit) ? fit[Number(k)] : fit[k];
        if (f === undefined || f === null) return;
        total += sh[k] * f;
        mass += sh[k];
      });
      return mass > 0 ? total / mass : null;
    }

    /* Axes the room actually answered. An instrument is judged on all of
       them, not only the ones it happens to carry a fit for: scoring each
       instrument over its own subset rewarded thin description, because an
       instrument matched on one easy axis averaged 1.0 while one honestly
       scored on five could not. Where an instrument says nothing about an
       axis it is filled with that shelf's average for it — no information
       means typical, not perfect. */
    var liveAxes = Object.keys(W).filter(function (axisId) {
      return eqc.shelf.some(function (it) {
        return axisScore(axisId, it.fit[axisId]) !== null;
      });
    });

    var raw = eqc.shelf.map(function (item) {
      var per = {};
      liveAxes.forEach(function (axisId) {
        var sc = axisScore(axisId, item.fit[axisId]);
        if (sc !== null) per[axisId] = sc;
      });
      return { item: item, per: per };
    });

    var neutral = {};
    liveAxes.forEach(function (axisId) {
      var vals = raw.map(function (r) { return r.per[axisId]; })
                    .filter(function (v) { return v !== undefined; });
      neutral[axisId] = vals.length
        ? vals.reduce(function (t, v) { return t + v; }, 0) / vals.length : 0.5;
    });

    /* A plain weighted average lets one strong axis buy off a terrible one.
       It showed: a room that asked for technology and healthcare was offered
       an energy fund scoring 0.10 on sector, because a good risk match more
       than paid for the worst possible sector match. Averaging is the wrong
       shape for a question the room answered deliberately.

       Blending in a weighted geometric mean fixes that. A geometric mean
       collapses when any one term is near zero, so an instrument has to be
       at least passable on every axis rather than excellent on most. The
       blend is set per sleeve by selection.balance: 0 is the old arithmetic
       behaviour, 1 is fully geometric. */
    var balance = sel.balance === undefined ? 0.45 : sel.balance;

    var all = raw.map(function (r) {
      var num = 0, den = 0, known = 0, logs = 0;
      liveAxes.forEach(function (axisId) {
        var sc = r.per[axisId];
        if (sc === undefined) sc = neutral[axisId]; else known++;
        num += W[axisId] * sc;
        den += W[axisId];
        /* floored so a single zero cannot annihilate the whole score */
        logs += W[axisId] * Math.log(Math.max(sc, 0.02));
      });
      var arith = den ? num / den : 0;
      var geo = den ? Math.exp(logs / den) : 0;
      var blended = den ? Math.pow(arith, 1 - balance) * Math.pow(geo, balance) : 0;
      return {
        item: r.item,
        per: r.per,
        /* how much of the score rests on stated facts rather than the fill */
        covered: liveAxes.length ? known / liveAxes.length : 0,
        /* kept for the validation page: how lopsided the fit is */
        balancePenalty: Math.round((arith - blended) * 1000) / 1000,
        score: blended
      };
    }).sort(function (a, b) {
      /* Ties used to fall through to the ticker, so an equal-scoring shelf
         came out in alphabetical order and looked hand-arranged. Prefer the
         instrument the shelf actually knows more about, and only then fix
         the order for reproducibility. */
      return b.score - a.score
          || b.covered - a.covered
          || a.item.ticker.localeCompare(b.item.ticker);
    });

    /* ---- selection ----
     *
     * Taking the top N by score alone is not portfolio construction. Across
     * a sweep of rooms it produced sleeves that were 100% one sector and
     * routinely held near-substitutes side by side: SOXX with SMH, SCHD
     * with VYM. Both are the same exposure bought twice.
     *
     * Selection is therefore greedy on MARGINAL fit: each pick is scored on
     * how well it fits the room, discounted by how much it duplicates what
     * has already been chosen. A second semiconductor fund has to be much
     * better than the alternatives to earn its place; a first one does not.
     */
    function similarity(a, b) {
      if (a.group && b.group && a.group === b.group) return 1;      /* substitutes */
      var sameSector = a.sector && b.sector && a.sector === b.sector;
      var sameRegion = a.region && b.region && a.region === b.region;
      if (sameSector && sameRegion) return 0.5;
      if (sameSector) return 0.32;
      if (sameRegion) return 0.14;
      return 0;
    }

    /* ---- how many lines this sleeve should hold ----
     *
     * A fixed 3-to-6 band for every asset class is an arbitrary house rule,
     * and it showed: a sleeve taking 45% of the book held the same number of
     * positions as one taking 6%. Size is driven instead by what the sleeve
     * is being asked to carry and by how much the room agrees.
     *
     *   - budget: a holding should be worth owning. At ~8% of the book per
     *     line, a 45% sleeve earns six lines and an 8% sleeve earns one.
     *   - dispersion: a room that answered with one voice gets a tight,
     *     high-conviction book. A room that split needs to span the views
     *     its members actually hold, so it gets more lines.
     *
     * Both knobs live in data/products.json under selection.sizing, per
     * sleeve, so the desk can retune without touching this file.
     */
    var sizing = sel.sizing || {};
    var perLine = sizing.pctPerLine || 8;
    var minN = sizing.minN !== undefined ? sizing.minN : (sel.minN || 3);
    var maxN = sizing.maxN !== undefined ? sizing.maxN : (sel.maxN || sel.topN || 6);
    var rel  = sel.relative || 0.86;

    /* How split the room is on this sleeve's most important axis, 0..1. */
    function dispersion() {
      var lead = Object.keys(W).sort(function (a, b) { return W[b] - W[a]; })[0];
      var a = lead && agg.axes[lead];
      if (!a || !a.respondents) return 0;
      var ks = Object.keys(a.counts);
      if (ks.length < 2) return 0;
      var h = 0;
      ks.forEach(function (k) {
        var pk = a.counts[k] / a.respondents;
        if (pk > 0) h -= pk * Math.log(pk);
      });
      return Math.min(1, h / Math.log(ks.length));
    }

    var budget = opts && opts.allocation
      ? Math.round(opts.allocation / perLine)
      : maxN;
    var spreadBonus = Math.round(dispersion() * (sizing.disperseTo || 2));
    maxN = Math.max(minN, Math.min(maxN, budget + spreadBonus));
    /* How hard duplication is punished. At 0.55 a perfect substitute keeps
       under half its score, which is usually enough to lose its place. */
    var lambda = sel.diversify === undefined ? 0.55 : sel.diversify;
    var sectorCap = sel.sectorCap === undefined ? 0.6 : sel.sectorCap;

    var best = all.length ? all[0].score : 0;
    var cut = best * rel;

    var pool = all.slice(), picked = [];
    while (picked.length < maxN && pool.length) {
      var bestIdx = -1, bestAdj = -1;
      for (var i = 0; i < pool.length; i++) {
        var dup = 0;
        for (var j = 0; j < picked.length; j++) {
          dup = Math.max(dup, similarity(pool[i].item, picked[j].item));
        }
        var adj = pool[i].score * (1 - lambda * dup);
        if (adj > bestAdj) { bestAdj = adj; bestIdx = i; }
      }
      if (bestIdx === -1) break;
      /* A room that asks for one sector still should not be handed a sleeve
         that is only that sector: concentration risk is not something the
         audience votes away. No more than sectorCap of the lines may share
         a sector, so the requested theme leads the book without being the
         whole of it. */
      if (sectorCap < 1 && picked.length) {
        var cand = pool[bestIdx].item.sector;
        var same = picked.filter(function (q) { return q.item.sector === cand; }).length;
        if (cand && same >= Math.max(1, Math.ceil(maxN * sectorCap))) {
          pool.splice(bestIdx, 1);
          continue;
        }
      }
      /* Past the floor, only keep taking while the marginal pick still
         clears the quality bar on its own merits. */
      if (picked.length >= minN && pool[bestIdx].score < cut) break;
      var chosen = pool.splice(bestIdx, 1)[0];
      chosen.adjusted = Math.round(bestAdj * 1000) / 1000;
      picked.push(chosen);
    }

    /* Rank on the shelf, by raw fit, for the validation page. */
    all.forEach(function (r, i) { r.rank = i + 1; });

    var n = picked.length;
    return { all: all, picked: picked, selected: n, cut: cut, best: best };
  }

  /* Kept for callers that only want equities. */
  function scoreEquityShelf(agg, products, opts) {
    return scoreShelf(agg, products && products.equities, opts);
  }

  function roomPortfolio(agg, products) {
    if (!products) return null;
    var alloc = roomAllocation(agg);
    /* Every sleeve is now scored off its own shelf with the same machinery,
       so there is one selection path to validate rather than four. */

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
    /* Scores cluster in the top few percent, so weighting straight in
       proportion to them produced sleeves that were effectively equal
       weighted: across a sweep, 301 of 400 had less than 15% between the
       largest and smallest line. Raising the ratio to a power restores a
       real ordering without letting the best line dominate. */
    function amplify(parts, conviction) {
      var k = conviction === undefined ? 7 : conviction;
      var top = parts.reduce(function (m, p) { return Math.max(m, p.w); }, 0);
      if (top <= 0) return parts;
      return parts.map(function (p) {
        return { item: p.item, w: Math.pow(p.w / top, k) };
      });
    }

    /* Conviction, like every other selection knob, is read from
       data/products.json so a sleeve can be retuned without editing this
       file. Fixed income holds a flatter book than equities on purpose. */
    function spreadFor(total, cfg, rawParts) {
      return spread(total, rawParts, ((cfg || {}).selection || {}).conviction);
    }

    function spread(total, rawParts, conviction) {
      var parts = amplify(rawParts, conviction);
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

    /* --- equities: score the shelf against the room ------------------- */
    var eq = scoreEquityShelf(agg, products, { allocation: alloc.equities });
    var eqLines = spreadFor(alloc.equities, products.equities, eq.picked.map(function (p) {
      return { item: p.item, w: p.score };
    }));
    /* Carry the score onto the line so the validation page can show why
       each holding is here. */
    eqLines.forEach(function (l) {
      var m = eq.picked.filter(function (p) { return p.item === l.item; })[0];
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank; }
    });
    buckets.push({
      key: "equities", label: "Equities", weight: alloc.equities,
      lines: eqLines, scored: eq.all
    });

    /* --- fixed income: scored off its own shelf, same machinery -------- */
    var fi = scoreShelf(agg, products.fixedIncome, { allocation: alloc.fixedIncome });
    var fiLines = spreadFor(alloc.fixedIncome, products.fixedIncome, fi.picked.map(function (p) {
      return { item: p.item, w: p.score };
    }));
    fiLines.forEach(function (l) {
      var m = fi.picked.filter(function (p) { return p.item === l.item; })[0];
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank; }
    });
    buckets.push({
      key: "fixedIncome", label: "Fixed income", weight: alloc.fixedIncome,
      lines: fiLines, scored: fi.all
    });

    /* --- structured notes: scored, then held to the index-note floor -- */
    var nt = scoreShelf(agg, products.notes, { allocation: alloc.notes });
    var picks = nt.picked.slice();

    /* House rule: at least half the notes sleeve sits in the desk's core
       picks, which are the rows highlighted in the source file. */
    var FLOOR = (products.notes.selection || {}).coreFloor || 0.5;
    var isIdx = function (p) { return !!p.item.isCore; };

    if (!picks.some(isIdx)) {
      /* No core pick was selected, so promote the best-scoring one in
         place of the weakest non-core pick. */
      var best = nt.all.filter(isIdx)[0];
      if (best) picks[picks.length - 1] = best;
    }

    var ntLines = spreadFor(alloc.notes, products.notes, picks.map(function (p) {
      return { item: p.item, w: p.score };
    }));

    var idxW = ntLines.filter(isIdx).reduce(function (t, l) { return t + l.weight; }, 0);
    if (alloc.notes > 0 && idxW < alloc.notes * FLOOR) {
      /* Scale the two groups so the core side reaches the floor exactly,
         keeping the relative weights inside each group unchanged. */
      var want = alloc.notes * FLOOR;
      var restW = alloc.notes - idxW;
      var upIdx = idxW > 0 ? want / idxW : 0;
      var dnRest = restW > 0 ? (alloc.notes - want) / restW : 0;
      ntLines.forEach(function (l) {
        l.weight = Math.round(l.weight * (isIdx(l) ? upIdx : dnRest) * 10) / 10;
      });
      /* Put rounding drift on the largest core line so the floor holds. */
      var sum = ntLines.reduce(function (t, l) { return t + l.weight; }, 0);
      var drift = Math.round((alloc.notes - sum) * 10) / 10;
      if (drift) {
        var big = ntLines.filter(isIdx).sort(function (a, b) { return b.weight - a.weight; })[0]
               || ntLines[0];
        if (big) big.weight = Math.round((big.weight + drift) * 10) / 10;
      }
    }

    ntLines.forEach(function (l) {
      var m = picks.filter(function (p) { return p.item === l.item; })[0];
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank; }
      l.note = l.item.isCore ? "core pick" : "satellite";
    });

    buckets.push({
      key: "notes", label: "Structured notes", weight: alloc.notes,
      lines: ntLines, scored: nt.all,
      indexShare: alloc.notes > 0
        ? Math.round((ntLines.filter(isIdx).reduce(function (t, l) { return t + l.weight; }, 0)
                      / alloc.notes) * 100)
        : 0
    });

    /* --- fx: the desk scores these itself, translated in the shelf --- */
    var fxr = scoreShelf(agg, products.fx, { allocation: alloc.fx });
    var fxLines = spreadFor(alloc.fx, products.fx, fxr.picked.map(function (p) {
      return { item: p.item, w: p.score };
    }));
    fxLines.forEach(function (l) {
      var m = fxr.picked.filter(function (p) { return p.item === l.item; })[0];
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank; }
    });
    buckets.push({
      key: "fx", label: "FX", weight: alloc.fx,
      lines: fxLines, scored: fxr.all
    });

    /* Present each sleeve in score order and number the lines 1..n.
       The shelf-wide rank is not the right label here: a note promoted to
       meet the core floor carries its rank from the full shelf, which
       would read as "#14" in a list of six. */
    buckets.forEach(function (b) {
      b.lines.sort(function (x, y) { return (y.score || 0) - (x.score || 0); });
      b.lines.forEach(function (l, i) {
        l.shelfRank = l.rank;      /* kept for the validation page */
        l.rank = i + 1;
      });
    });

    return { alloc: alloc, buckets: buckets };
  }

  /* ---- backtest ------------------------------------------------------
   *
   * The book as if it had been struck on 1 January and held: each line's
   * weight multiplied by that instrument's year-to-date move.
   *
   * Two things are deliberately NOT hidden. The figures are PRICE returns,
   * so dividends and coupons are excluded. And not every sleeve can be
   * measured this way: a structured note has no public price history, and
   * an option's payoff is not linear in its underlying. Those weights are
   * reported as excluded rather than quietly assumed to be zero.
   */
  /* Fraction of the year elapsed since 1 January, used to accrue coupon.
     Computed from the data's own as-of date so it does not drift. */
  function yearElapsed(asOf) {
    var d = asOf ? new Date(asOf + "T00:00:00Z") : new Date();
    var start = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.max(0, Math.min(1, (d.getTime() - start) / (365 * 864e5)));
  }

  function backtest(sim, asOf) {
    if (!sim) return null;
    var elapsed = yearElapsed(asOf);
    var coveredW = 0, excludedW = 0, contribution = 0, carryTotal = 0;

    var bySleeve = sim.buckets.map(function (b) {
      var cw = 0, ew = 0, contrib = 0;
      var carry = 0;
      var lines = b.lines.map(function (l) {
        var d = l.item.data || {};
        var ytd = typeof d.ytd === "number" ? d.ytd : null;
        if (ytd === null) {
          ew += l.weight;
          return { item: l.item, weight: l.weight, ytd: null,
                   why: d.ytdExcluded || "no price history" };
        }
        cw += l.weight;
        contrib += (l.weight / 100) * ytd;

        /* A bond's coupon is most of its return, and a price series misses
           it entirely. Accrue the instrument's own yield over the elapsed
           part of the year and report it separately. */
        var lineCarry = typeof d.ytw === "number" ? d.ytw * elapsed : 0;
        carry += (l.weight / 100) * lineCarry;

        return { item: l.item, weight: l.weight, ytd: ytd,
                 contribution: (l.weight / 100) * ytd,
                 carry: lineCarry || null,
                 proxy: d.ytdProxy || null, proxyNote: d.ytdProxyNote || null };
      });
      coveredW += cw; excludedW += ew; contribution += contrib; carryTotal += carry;
      return {
        key: b.key, label: b.label, weight: b.weight,
        covered: Math.round(cw * 10) / 10, excluded: Math.round(ew * 10) / 10,
        contribution: Math.round(contrib * 100) / 100,
        carry: Math.round(carry * 100) / 100,
        /* What that sleeve returned on its own measurable part. */
        sleeveReturn: cw > 0 ? Math.round((contrib / (cw / 100)) * 100) / 100 : null,
        sleeveTotal: cw > 0 ? Math.round(((contrib + carry) / (cw / 100)) * 100) / 100 : null,
        lines: lines
      };
    });

    return {
      asOf: asOf || null,
      elapsed: Math.round(elapsed * 1000) / 1000,
      coveredWeight: Math.round(coveredW * 10) / 10,
      excludedWeight: Math.round(excludedW * 10) / 10,
      /* Price contribution to the whole book from the measurable part. */
      contribution: Math.round(contribution * 100) / 100,
      /* Accrued coupon over the same period, on the same lines. */
      carry: Math.round(carryTotal * 100) / 100,
      /* Price only, restated as if the measurable part were the whole book. */
      scaledReturn: coveredW > 0 ? Math.round((contribution / (coveredW / 100)) * 100) / 100 : null,
      /* Price plus accrued coupon, same basis. Equity dividends are still
         excluded: the feed does not carry a yield for these funds. */
      scaledTotal: coveredW > 0
        ? Math.round(((contribution + carryTotal) / (coveredW / 100)) * 100) / 100 : null,
      bySleeve: bySleeve
    };
  }

  return {
    rank: rank,
    eligible: eligible,
    roomAllocation: roomAllocation,
    roomPortfolio: roomPortfolio,
    backtest: backtest,
    scoreEquityShelf: scoreEquityShelf,
    scoreShelf: scoreShelf,
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
