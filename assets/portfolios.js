/* NextGen Portfolio Builder — the portfolio base and the matching engine.
 *
 * Eight archetypes. Each carries a `target` on every axis in schema.js:
 *   scale  axes -> a number 0..3 (the portfolio's natural position)
 *   choice axes -> { v: preferred, also: [near-misses that still fit] }
 *
 * To swap in the real product shelf, replace the objects below. Nothing
 * else reads portfolio data directly.
 */
/* The five risk bands, as a fallback only. data/portfolios.json is the
 * source and base-loader replaces this on load; this copy exists so the
 * app still works from file:// or when the fetch fails, and it must stay
 * in step with that file — a guest seeing a different set of names
 * because a fetch failed is worse than no names at all. */
window.PORTFOLIOS =
[
  {
    "id": "conservative",
    "name": "Conservative",
    "tagline": "Capital first. Income from high-grade credit, equity kept small.",
    "blurb": "Capital preservation leads. The bond sleeve is short-dated and investment grade, and equity is kept to a supporting role.",
    "alloc": {
      "equities": 15,
      "fixedIncome": 60,
      "notes": 15,
      "cash": 10
    },
    "expReturn": "3-6%",
    "vol": "Low",
    "risk": {
      "expReturn": 4.5,
      "vol": 4.5,
      "maxDrawdown": -6,
      "sharpe": 0.7,
      "yield": 4.2,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 8,
          "driver": "Carry plus a small equity contribution"
        },
        {
          "label": "Base",
          "pct": 4.5,
          "driver": "Coupons do most of the work"
        },
        {
          "label": "Bear",
          "pct": -4,
          "driver": "Duration cushions the equity drawdown"
        }
      ]
    },
    "target": {
      "riskProfile": 0,
      "marketView": 1,
      "horizon": 4,
      "leverage": {
        "v": "no"
      },
      "country": {
        "v": "g7"
      },
      "sector": {
        "v": "consumer",
        "also": [
          "healthcare"
        ]
      },
      "usd": 95,
      "capitalIncome": {
        "v": "income"
      },
      "duration": 3,
      "credit": {
        "v": "ig"
      }
    }
  },
  {
    "id": "conservative-moderate",
    "name": "Conservative to Moderate",
    "tagline": "Still income-led, with enough equity to keep pace.",
    "blurb": "Income still leads, with enough equity to keep pace rather than only defend. Credit stays investment grade.",
    "alloc": {
      "equities": 28,
      "fixedIncome": 52,
      "notes": 15,
      "cash": 5
    },
    "expReturn": "4-7%",
    "vol": "Low to moderate",
    "risk": {
      "expReturn": 5.8,
      "vol": 6.5,
      "maxDrawdown": -9,
      "sharpe": 0.68,
      "yield": 3.8,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 11,
          "driver": "Equity participates without leading"
        },
        {
          "label": "Base",
          "pct": 5.8,
          "driver": "Coupons plus modest equity growth"
        },
        {
          "label": "Bear",
          "pct": -7,
          "driver": "Investment grade holds while equity falls"
        }
      ]
    },
    "target": {
      "riskProfile": 0.5,
      "marketView": 1,
      "horizon": 7,
      "leverage": {
        "v": "no"
      },
      "country": {
        "v": "g7",
        "also": [
          "em"
        ]
      },
      "sector": {
        "v": "healthcare",
        "also": [
          "consumer",
          "industrials"
        ]
      },
      "usd": 85,
      "capitalIncome": {
        "v": "income",
        "also": [
          "capital"
        ]
      },
      "duration": 4,
      "credit": {
        "v": "ig"
      }
    }
  },
  {
    "id": "moderate",
    "name": "Moderate",
    "tagline": "An even split, held with conviction on both sides.",
    "blurb": "An even split, held with conviction on both sides: global equity against intermediate credit, with notes and FX doing the rest.",
    "alloc": {
      "equities": 45,
      "fixedIncome": 38,
      "notes": 13,
      "cash": 4
    },
    "expReturn": "6-9%",
    "vol": "Moderate",
    "risk": {
      "expReturn": 7.2,
      "vol": 9.5,
      "maxDrawdown": -14,
      "sharpe": 0.63,
      "yield": 3.1,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 16,
          "driver": "Equity beta delivers, duration neutral"
        },
        {
          "label": "Base",
          "pct": 7.2,
          "driver": "Earnings growth plus bond carry"
        },
        {
          "label": "Bear",
          "pct": -12,
          "driver": "Equity drawdown partly offset by duration"
        }
      ]
    },
    "target": {
      "riskProfile": 1,
      "marketView": 1,
      "horizon": 11,
      "leverage": {
        "v": "no"
      },
      "country": {
        "v": "g7",
        "also": [
          "em"
        ]
      },
      "sector": {
        "v": "tech",
        "also": [
          "healthcare",
          "industrials"
        ]
      },
      "usd": 70,
      "capitalIncome": {
        "v": "capital",
        "also": [
          "income"
        ]
      },
      "duration": 5,
      "credit": {
        "v": "ig"
      }
    }
  },
  {
    "id": "moderate-aggressive",
    "name": "Moderate to Aggressive",
    "tagline": "Equity-led, with the overlay and the notes doing real work.",
    "blurb": "Equity-led, with the option overlay and the structured notes carrying real weight rather than sitting to one side.",
    "alloc": {
      "equities": 60,
      "fixedIncome": 24,
      "notes": 13,
      "cash": 3
    },
    "expReturn": "7-10%",
    "vol": "Moderate to high",
    "risk": {
      "expReturn": 8.8,
      "vol": 13,
      "maxDrawdown": -20,
      "sharpe": 0.58,
      "yield": 2.4,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 22,
          "driver": "Equity and the call overlay both pay"
        },
        {
          "label": "Base",
          "pct": 8.8,
          "driver": "Equity leads, notes add coupon"
        },
        {
          "label": "Bear",
          "pct": -18,
          "driver": "Little ballast behind the equity"
        }
      ]
    },
    "target": {
      "riskProfile": 1.5,
      "marketView": 2,
      "horizon": 16,
      "leverage": {
        "v": "yes"
      },
      "country": {
        "v": "g7",
        "also": [
          "em"
        ]
      },
      "sector": {
        "v": "tech",
        "also": [
          "industrials",
          "financials"
        ]
      },
      "usd": 70,
      "capitalIncome": {
        "v": "capital"
      },
      "duration": 7,
      "credit": {
        "v": "ig",
        "also": [
          "hy"
        ]
      }
    }
  },
  {
    "id": "aggressive",
    "name": "Aggressive",
    "tagline": "Growth first, and the drawdowns that come with it.",
    "blurb": "Growth first. A long, higher-yielding bond sleeve sits behind a large equity position, and the drawdowns that implies are accepted.",
    "alloc": {
      "equities": 75,
      "fixedIncome": 12,
      "notes": 10,
      "cash": 3
    },
    "expReturn": "9-12%",
    "vol": "High",
    "risk": {
      "expReturn": 10.5,
      "vol": 17,
      "maxDrawdown": -28,
      "sharpe": 0.54,
      "yield": 1.8,
      "scenarios": [
        {
          "label": "Bull",
          "pct": 30,
          "driver": "Growth equity and gearing compound"
        },
        {
          "label": "Base",
          "pct": 10.5,
          "driver": "Equity carries the book"
        },
        {
          "label": "Bear",
          "pct": -26,
          "driver": "Thin ballast, barriers tested"
        }
      ]
    },
    "target": {
      "riskProfile": 2,
      "marketView": 2,
      "horizon": 22,
      "leverage": {
        "v": "yes"
      },
      "country": {
        "v": "em",
        "also": [
          "g7"
        ]
      },
      "sector": {
        "v": "tech",
        "also": [
          "energy",
          "financials"
        ]
      },
      "usd": 60,
      "capitalIncome": {
        "v": "capital"
      },
      "duration": 7,
      "credit": {
        "v": "hy",
        "also": [
          "ig"
        ]
      }
    }
  }
]
;

/* How much each answer moves the match. Risk appetite and protection
 * dominate; the FX opinion is flavour, not structure. */
window.WEIGHTS = {"riskProfile": 6, "marketView": 1, "horizon": 1.3, "leverage": 0.9, "country": 0.9, "sector": 0.8, "usd": 0.8, "capitalIncome": 1.2, "duration": 1, "credit": 1.2};

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

    /* Options are an overlay on the equity sleeve, not a separate bet, so
       they are carved OUT of equities rather than added on top — you cannot
       write a covered call on stock you do not own. The desk's rule is that
       leverage and income are expressed through options, so those two
       answers size the overlay, with a bullish view adding to it. */
    var bullish = Math.max(0, view - 1);
    /* A bearish room wants the overlay too, for the opposite reason: the long
       put is downside cover on stock the book still holds. Without this term
       the sleeve collapsed to zero exactly when the room was most worried,
       and the protective structure on the shelf could never be reached at
       all — three of the four strategies were selectable and the fourth was
       dead code. */
    var bearish = Math.max(0, 1 - view);
    var overlay = Math.min(0.30, levered * 0.18 + bullish * 0.10 +
                                 income * 0.12 + bearish * 0.10);
    var options = equity * overlay;
    equity = equity - options;

    var raw = { equities: equity, fixedIncome: fixedIncome, notes: notes,
                fx: fx, options: options };
    var total = raw.equities + raw.fixedIncome + raw.notes + raw.fx + raw.options;

    /* Round to whole percent and put any rounding drift on the largest
       sleeve, so the four always read as exactly 100. */
    var out = {};
    Object.keys(raw).forEach(function (k) { out[k] = Math.round((raw[k] / total) * 100); });
    var sum = Object.keys(out).reduce(function (t, k) { return t + out[k]; }, 0);
    if (sum !== 100) {
      var biggest = Object.keys(out).reduce(function (a, b) { return out[a] >= out[b] ? a : b; });
      out[biggest] += 100 - sum;
    }

    /* ---- leverage ----
     *
     * Everything above sums to 100: that is the capital. Leverage is not a
     * reshuffle of it. The room's exposure runs PAST its capital, because
     * positions are taken through instruments whose notional is bigger than
     * the cash committed to them. Forcing the sleeves back to 100 when the
     * room asked for leverage showed a geared portfolio as though it were
     * ungeared, which is the one thing it is not.
     *
     * So the uplift is added on top and the sleeves deliberately sum to more
     * than 100. Net stays 100 — the client's capital — and the difference is
     * notional. It goes to the two sleeves where that notional actually
     * lives: the equity options and the FX sleeve. A structured note is
     * geared inside its own structure, not by being held larger.
     *
     * Nothing here is borrowed. No cash is lent, nothing is repayable and
     * there is no margin call: the gearing is the size of the contracts, not
     * a loan against them.
     *
     * The cap is a judgement, stated plainly rather than buried: a room
     * unanimously asking for leverage reaches 1.35x gross. It is NOT a margin
     * model and makes no claim about what any client would be offered.
     */
    var MAX_UPLIFT = 35;                 /* percentage points at full appetite */
    var EQUITY_SHARE_OF_UPLIFT = 0.72;   /* the rest goes to FX */

    var uplift = Math.round(levered * MAX_UPLIFT);
    if (uplift > 0) {
      var toEq = Math.round(uplift * EQUITY_SHARE_OF_UPLIFT);
      out.equities += toEq;
      out.fx += uplift - toEq;
    }

    var gross = ["equities", "fixedIncome", "notes", "fx", "options"]
      .reduce(function (t, k) { return t + (out[k] || 0); }, 0);

    out.gross = gross;          /* what is at work in the market */
    out.net = 100;              /* the capital behind it */
    out.geared = gross - 100;   /* notional above capital, not money borrowed */
    out.levered = uplift > 0;

    out.drivers = {
      risk: risk, view: view, horizon: horizon, usd: usd,
      levered: levered, income: income, overlay: overlay, uplift: uplift
    };
    return out;
  }

  /* ---- gearing disclosure ---------------------------------------------
   *
   * One wording, used everywhere the book is shown, so the guest screen, the
   * projector, the admin board and the methodology page cannot drift into
   * saying different things about the same portfolio.
   *
   * It describes GEARING, not borrowing. An earlier version talked about
   * money being lent, repayable in full, and a lender calling for collateral.
   * None of that happens here: the exposure runs past capital because
   * positions are held through instruments whose notional is larger than the
   * cash committed to them — a long call controls the whole underlying for
   * the premium, and the FX sleeve is sized the same way. There is no loan,
   * so there is nothing to repay and no margin call. What there is, is a book
   * that moves as though it were bigger than it is, which is the part that
   * has to be said out loud.
   */
  function leverageDisclosure(alloc) {
    if (!alloc || !alloc.geared || alloc.geared <= 0) return null;
    var gross = alloc.gross, over = alloc.geared;
    var x = Math.round((gross / 100) * 100) / 100;
    return {
      gross: gross, net: alloc.net, geared: over, multiple: x,
      headline: "Geared " + x + "x: " + gross + "% of market exposure on 100% of capital",
      points: [
        "The book carries " + gross + "% of exposure against " + alloc.net +
        "% of capital. The extra " + over + " points are notional, not money " +
        "borrowed: nothing is lent and nothing is repayable.",

        "It comes from the instruments themselves. An option controls the " +
        "whole position for the premium, and the FX sleeve is sized the same " +
        "way, so the exposure is larger than the cash committed to it.",

        "Gains and losses track the exposure, not the cash. A 10% move in the " +
        "geared sleeves is worth about " + Math.round(gross / 10) + "% of " +
        "capital, in either direction.",

        "An option can expire worthless. Where the gearing comes from a long " +
        "call or a long put, the premium is the most that position can lose — " +
        "and losing all of it is an ordinary outcome, not a tail.",

        "The structured notes are geared inside the structure, through their " +
        "barriers, rather than by size. That is a different risk and does not " +
        "show in this number."
      ],
      /* Deliberately does NOT restate the headline: the two are printed
         next to each other, and saying the same figure twice in one line
         reads as a bug. */
      short: "The extra " + over + " points are notional — options and FX " +
             "sized above the cash committed — not money borrowed. Gains and " +
             "losses track the exposure, and a long option can expire worthless."
    };
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
        /* How far from the room's answer counts as a total miss.
         *
         * This used to be the axis's whole range, and that was wrong in a way
         * that decided what got bought. Duration runs 1 to 30 years, so a
         * bond nine years away from what the room asked for still scored 0.67
         * on duration — a third of one axis — which credit and currency could
         * trivially outvote. A room asking for three years was sold a
         * 12.6-year bond while a 2.3-year one sat unpicked.
         *
         * matchScale is the distance at which an instrument has simply
         * stopped answering the question, so the axis can actually decide
         * something. It falls back to the full range where none is set. */
        var reach = axis.matchScale || (axis.max - axis.min) || 1;

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
          /* Decays toward zero without ever reaching it, so distance still
             ranks instruments even when nothing on the shelf is close.
             A straight 1 - d/scale clipped at zero looked equivalent and was
             not: a room asking for twenty years of duration found no bond
             within scale of it, every one scored exactly zero, and the axis
             stopped discriminating altogether — so the sleeve fell back on
             other axes and came out SHORTER than the ten-year room's. Half
             marks at one scale, and always ordered by distance. */
          var d = Math.abs(v - fit.target) / reach;
          tot += c * (1 / (1 + d * d));
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

    /* ---- position-size constraint ----
     *
     * How many lines a sleeve needs is not only a question of how many
     * products are good enough. A sleeve carrying 72% of the book cannot be
     * expressed in three positions without putting 30% of a client's money
     * in one bond, however well that bond scores.
     *
     * This is what the relative cut got wrong. It decided the line count on
     * quality alone, so an unusual room — one where only a few products
     * cleared the bar — produced a handful of enormous positions, while a
     * mainstream room produced eight comfortable ones. Same code, wildly
     * different construction.
     *
     * So the ceiling on a single position sets a FLOOR on the line count,
     * and it outranks the quality bar: a construction constraint is not
     * something individual fit gets to overrule.
     */
    var maxLine = sel.maxLineWeight;
    if (maxLine && opts && opts.allocation) {
      var needed = Math.ceil(opts.allocation / maxLine);
      /* One spare line so weights can still differentiate under the cap
         rather than being forced flat against it. */
      if (needed > 1) needed += 1;
      minN = Math.max(minN, Math.min(needed, all.length));
      maxN = Math.max(maxN, minN);
    }
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
    all.forEach(function (r, i) { r.rank = i + 1; r.shelfOf = all.length; });

    var n = picked.length;
    return { all: all, picked: picked, selected: n, cut: cut, best: best };
  }

  /* Kept for callers that only want equities. */
  function scoreEquityShelf(agg, products, opts) {
    return scoreShelf(agg, products && products.equities, opts);
  }

  /* ---- the desk's own book, by band -----------------------------------
   *
   * When data/band-books.json is present the portfolio is not constructed at
   * all: the desk has written out, band by band, exactly what each of the
   * five holds and at what weight, and the room's answers only choose which
   * band. That is what the desk asked for — every question translates into
   * which of the five portfolios is selected — and it means the weights on
   * screen are the desk's, not the engine's.
   *
   * The sleeves deliberately do not sum to 100. The equity sheet alone runs
   * 50% of capital at Conservative and 115% at Aggressive, because the book
   * is geared; adding the other sleeves takes gross to between 105% and 167%.
   * Forcing that back to 100 would be the same mistake as flattening
   * leverage, just in a different place.
   */
  function bandBook(agg, products, bandsDoc) {
    var top = rank(aggProfile(agg))[0];
    if (!top || !top.portfolio) return null;
    var band = (bandsDoc.bands || []).filter(function (b) {
      return b.id === top.portfolio.id;
    })[0];
    if (!band) return null;

    var buckets = [];

    function lines(src, sleeveWeight, tag) {
      var raw = (src || []).slice();
      if (!raw.length) return [];
      /* Equity lines already carry a weight as a share of the whole
         portfolio. Notes and FX carry a share of their own sleeve, so they
         are scaled onto the sleeve's weight. */
      var haveAbs = raw.every(function (l) { return typeof l.weight === "number"; });
      var tot = raw.reduce(function (t, l) {
        return t + (haveAbs ? l.weight : (l.weightOfSleeve || 0));
      }, 0) || 1;
      return raw.map(function (l, i) {
        var w = haveAbs ? l.weight : ((l.weightOfSleeve || 0) / tot) * sleeveWeight;
        return {
          item: l, weight: Math.round(w * 10) / 10, rank: i + 1,
          overlay: !!l.overlay
        };
      }).filter(function (l) { return l.weight > 0; });
    }

    buckets.push({
      key: "equities", label: "Equities",
      weight: band.equities.weight,
      overlayWeight: (band.equities.lines || []).filter(function (l) { return l.overlay; })
        .reduce(function (t, l) { return t + (l.weight || 0); }, 0),
      grossOfSleeve: band.equities.grossOfSleeve,
      lines: lines(band.equities.lines, band.equities.weight), scored: []
    });

    /* Fixed income is the matching book out of the five, taken whole. */
    var fiBooks = ((products.fixedIncome || {}).portfolios) || [];
    var fiBook = fiBooks[band.fixedIncome.book] || null;
    buckets.push({
      key: "fixedIncome", label: "Fixed income",
      weight: band.fixedIncome.weight,
      book: fiBook, bookAssumedWeight: !!band.fixedIncome.assumed,
      lines: fiBook ? lines((fiBook.holdings || []).map(function (h) {
        return Object.assign({}, h, { weight: undefined, weightOfSleeve: h.weight });
      }), band.fixedIncome.weight) : [],
      scored: []
    });

    buckets.push({
      key: "notes", label: "Structured notes",
      weight: band.notes.weight,
      lines: lines(band.notes.lines, band.notes.weight), scored: []
    });

    buckets.push({
      key: "fx", label: "FX",
      weight: band.fx.weight, fxLeverage: band.fx.leverage,
      usdStance: band.fx.usdStance,
      lines: lines(band.fx.lines, band.fx.weight), scored: []
    });

    var gross = buckets.reduce(function (t, b) { return t + (b.weight || 0); }, 0);
    var alloc = {
      equities: band.equities.weight, fixedIncome: band.fixedIncome.weight,
      notes: band.notes.weight, fx: band.fx.weight, options: 0,
      gross: Math.round(gross * 10) / 10, net: 100,
      geared: Math.round((gross - 100) * 10) / 10,
      levered: gross > 100.5,
      band: band.id, bandName: band.name,
      drivers: roomAllocation(agg).drivers
    };

    return { alloc: alloc, buckets: buckets, band: band, fromBandBook: true };
  }

  function roomPortfolio(agg, products) {
    /* The desk's own book wins when it is available. */
    if (window.BANDS && window.BANDS.bands) {
      var desk = bandBook(agg, products, window.BANDS);
      if (desk) return desk;
    }

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
      var sel = (cfg || {}).selection || {};
      return spread(total, rawParts, sel.conviction, sel.maxLineWeight);
    }

    /* No line may exceed maxLineWeight of the whole book. Excess is pushed
       into the lines that still have room, repeatedly, because moving weight
       onto a line can itself breach the cap. If every line ends up at the
       ceiling the sleeve simply cannot be built this small, and the line
       count floor above is what prevents that. */
    function capLines(out, cap) {
      if (!cap) return out;
      for (var pass = 0; pass < 16; pass++) {
        var over = 0;
        out.forEach(function (o) {
          if (o.weight > cap + 1e-9) { over += o.weight - cap; o.weight = cap; o.capped = true; }
        });
        if (over <= 1e-9) break;
        var room = out.filter(function (o) { return o.weight < cap - 1e-9; });
        var headroom = room.reduce(function (t, o) { return t + (cap - o.weight); }, 0);
        if (headroom <= 1e-9) break;
        var share = Math.min(1, over / headroom);
        room.forEach(function (o) { o.weight += (cap - o.weight) * share; });
      }
      return out;
    }

    function spread(total, rawParts, conviction, maxLineWeight) {
      var parts = amplify(rawParts, conviction);
      var sum = parts.reduce(function (t, p) { return t + p.w; }, 0);
      if (sum <= 0) return [];
      var out = parts.map(function (p) {
        return { item: p.item, weight: (p.w / sum) * total };
      });
      capLines(out, maxLineWeight);
      out.forEach(function (o) { o.weight = Math.round(o.weight * 10) / 10; });
      var drift = Math.round((total - out.reduce(function (t, o) { return t + o.weight; }, 0)) * 10) / 10;
      if (drift && out.length) {
        /* Put the drift on the largest line that can absorb it without
           breaching the ceiling the cap just enforced. */
        var host = out[0];
        if (maxLineWeight) {
          for (var i = 0; i < out.length; i++) {
            if (out[i].weight + drift <= maxLineWeight + 0.05) { host = out[i]; break; }
          }
        }
        host.weight = Math.round((host.weight + drift) * 10) / 10;
      }
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
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank;
               l.adjusted = m.adjusted; l.shelfOf = m.shelfOf; }
    });
    buckets.push({
      key: "equities", label: "Equities", weight: alloc.equities,
      lines: eqLines, scored: eq.all
    });

    /* --- fixed income ---------------------------------------------------
     *
     * The desk builds five finished books rather than a universe to pick
     * from, so the room chooses between them instead of having a sleeve
     * assembled bond by bond. They run from developed/short to emerging/long,
     * ordered by yield to worst, which is the market pricing the risk.
     *
     * They are scored by exactly the same machinery as every shelf — the
     * same distance falloff, the same geometric blend — with the selection
     * narrowed to one. That keeps one scoring path to validate rather than
     * two, and means a book is chosen the way a product is.
     */
    function pickFixedIncomeBook(agg, products) {
      var cfg = products.fixedIncome || {};
      var books = cfg.portfolios || [];
      if (!books.length) return null;
      var sel = cfg.selection || {};
      var scored = scoreShelf(agg, {
        shelf: books,
        selection: {
          weights: sel.portfolioWeights || { riskProfile: 2, duration: 1.2 },
          /* exactly one book, whole: no diversification, no quality cut */
          sizing: { minN: 1, maxN: 1 },
          relative: 0, diversify: 0, sectorCap: 1,
          balance: sel.balance
        }
      }, { allocation: 0 });
      return scored.picked.length
        ? { book: scored.picked[0].item, score: scored.picked[0].score,
            per: scored.picked[0].per, ranked: scored.all }
        : null;
    }

    /* --- fixed income: scored off its own shelf, same machinery -------- */
    var fiBucket;
    var fiMode = ((products.fixedIncome || {}).selection || {}).mode;
    var chosen = fiMode === "portfolio" ? pickFixedIncomeBook(agg, products) : null;

    if (chosen) {
      /* The book is taken whole, at the weights the desk sized it with, and
         rescaled to whatever share of the room's allocation fixed income
         got. Nothing is re-picked inside it: the point of a finished book is
         that it was built as one. */
      var hs = chosen.book.holdings || [];
      var fiLines = spread(alloc.fixedIncome, hs.map(function (h) {
        return { item: h, w: h.weight || 1 };
      }), 1, ((products.fixedIncome.selection || {}).maxLineWeight));
      fiLines.forEach(function (l, i) {
        l.rank = i + 1;
        l.score = chosen.score;
      });
      fiBucket = {
        key: "fixedIncome", label: "Fixed income", weight: alloc.fixedIncome,
        lines: fiLines,
        book: chosen.book, bookScore: chosen.score, bookPer: chosen.per,
        bookRanked: chosen.ranked,
        scored: []
      };
    } else {
      var fi = scoreShelf(agg, products.fixedIncome, { allocation: alloc.fixedIncome });
      var fiLines2 = spreadFor(alloc.fixedIncome, products.fixedIncome, fi.picked.map(function (p) {
        return { item: p.item, w: p.score };
      }));
      fiLines2.forEach(function (l) {
        var m = fi.picked.filter(function (p) { return p.item === l.item; })[0];
        if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank;
                 l.adjusted = m.adjusted; l.shelfOf = m.shelfOf; }
      });
      fiBucket = {
        key: "fixedIncome", label: "Fixed income", weight: alloc.fixedIncome,
        lines: fiLines2, scored: fi.all
      };
    }
    buckets.push(fiBucket);

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
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank;
               l.adjusted = m.adjusted; l.shelfOf = m.shelfOf; }
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
      if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank;
               l.adjusted = m.adjusted; l.shelfOf = m.shelfOf; }
    });
    buckets.push({
      key: "fx", label: "FX", weight: alloc.fx,
      lines: fxLines, scored: fxr.all
    });

    /* --- options: an overlay INSIDE the equity sleeve ------------------
     *
     * They were a sixth bucket, which read as a separate asset class. They
     * are not one: a covered call is written against stock this book already
     * holds, and a call replaces stock it would otherwise have bought. The
     * weight is still carved out of equities when the allocation is struck —
     * that part does not change — but the sleeve is presented as one thing,
     * with the overlay lines marked.
     */
    if (products.options && alloc.options > 0) {
      var op = scoreShelf(agg, products.options, { allocation: alloc.options });
      var opLines = spreadFor(alloc.options, products.options, op.picked.map(function (p) {
        return { item: p.item, w: p.score };
      }));
      opLines.forEach(function (l) {
        var m = op.picked.filter(function (p) { return p.item === l.item; })[0];
        if (m) { l.score = m.score; l.per = m.per; l.rank = m.rank;
                 l.adjusted = m.adjusted; l.shelfOf = m.shelfOf; }
        l.overlay = true;
      });
      var eqB = buckets.filter(function (b) { return b.key === "equities"; })[0];
      if (eqB) {
        eqB.lines = eqB.lines.concat(opLines);
        eqB.weight = Math.round((eqB.weight + alloc.options) * 10) / 10;
        eqB.overlayWeight = alloc.options;
        eqB.overlayScored = op.all;
      }
    }

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
    leverageDisclosure: leverageDisclosure,
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
