/* NextGen Portfolio Builder — question schema.
 *
 * The ten questions, grouped into sections that the admin opens one at a
 * time as the presentation reaches them.
 *
 * Edit labels and options here. The matching engine, both result screens,
 * the presenter breakdown and the admin export all derive from this file,
 * so adding a question needs no other code change — only a `target` for
 * the new axis on every portfolio, and an entry in `weights`.
 *
 * Axis kinds:
 *   "scale"  pick one on an ordered list — averaged across the room,
 *            compared by distance. Any number of options.
 *   "range"  a number on a continuous slider (min..max, snapped to step).
 *            Averaged; compared by distance across the full span.
 *   "choice" pick one — room shows the modal pick, compared by identity.
 *   "multi"  pick several — room shows what share picked each option.
 *            `max` caps the picks; `min: 0` allows none.
 *
 * A multi axis marked `hard: true` is a CONSTRAINT, not a preference: a
 * portfolio whose target lists a conflicting holding is ruled out entirely
 * rather than merely scored down.
 *
 * Steps marked `optional: true` can be switched off in config.js (STEPS)
 * without touching this file.
 */
window.SCHEMA = {
  steps: [
    {
      id: "profile",
      n: 1,
      title: "Risk Profile",
      blurb: "Where you sit before we talk about any single asset.",
      questions: [
        {
          id: "riskProfile",
          kind: "scale",
          label: "What is your risk profile?",
          options: [
            { v: 0, label: "Conservative", sub: "Protect what is there" },
            { v: 1, label: "Moderate",     sub: "Balanced trade-off" },
            { v: 2, label: "Aggressive",   sub: "Accept real drawdowns" }
          ]
        },
        {
          id: "marketView",
          kind: "scale",
          label: "What is your view on markets from here?",
          options: [
            { v: 0, label: "Bearish", sub: "Positioned defensively" },
            { v: 1, label: "Neutral", sub: "No strong call" },
            { v: 2, label: "Bullish", sub: "Leaning into risk" }
          ]
        },
        {
          id: "horizon",
          kind: "range",
          label: "What is your investment horizon?",
          hint: "Drag to the number of years before you would need this capital.",
          min: 1, max: 30, step: 1, unit: "y", def: 10,
          minLabel: "1 year", maxLabel: "30 years",
          format: function (v) { return v + (v === 1 ? " year" : " years"); }
        }
      ]
    },
    {
      id: "positioning",
      n: 2,
      title: "Positioning",
      blurb: "How the book is built, and where the risk sits.",
      questions: [
        {
          id: "leverage",
          kind: "choice",
          label: "Would you use leverage?",
          options: [
            { v: "no",  label: "No",  sub: "Unlevered" },
            { v: "yes", label: "Yes", sub: "Amplify both directions" }
          ]
        },
        {
          id: "country",
          kind: "choice",
          label: "What country of risk do you prefer?",
          options: [
            { v: "g7", label: "G7", sub: "Developed markets" },
            { v: "em", label: "EM", sub: "Emerging markets" }
          ]
        }
      ]
    },
    {
      id: "equities",
      n: 3,
      title: "Equities",
      blurb: "Where the growth engine sits.",
      questions: [
        {
          id: "sector",
          kind: "multi",
          max: 3,
          label: "Which sectors would you be exposed to?",
          hint: "Pick up to three.",
          options: [
            { v: "tech",        label: "Technology" },
            { v: "financials",  label: "Financials" },
            { v: "healthcare",  label: "Healthcare" },
            { v: "energy",      label: "Energy & Materials" },
            { v: "consumer",    label: "Consumer" },
            { v: "industrials", label: "Industrials" }
          ]
        }
      ]
    },
    {
      id: "fx",
      n: 4,
      title: "FX",
      blurb: "How much of the book should sit in dollars.",
      questions: [
        {
          id: "usd",
          kind: "range",
          label: "What share of the portfolio would you hold in USD?",
          hint: "Moves in quarters.",
          min: 0, max: 100, step: 25, unit: "%", def: 50,
          minLabel: "0%", maxLabel: "100%",
          format: function (v) { return v + "%"; }
        }
      ]
    },
    {
      id: "fixedincome",
      n: 5,
      title: "Fixed Income",
      blurb: "The ballast, and how much credit risk it carries.",
      questions: [
        {
          id: "capitalIncome",
          kind: "choice",
          label: "Are you looking for capital growth or income?",
          options: [
            { v: "capital", label: "Capital growth", sub: "Total return" },
            { v: "income",  label: "Income",         sub: "A coupon to spend" }
          ]
        },
        {
          id: "duration",
          kind: "range",
          label: "What duration would you run?",
          hint: "Sensitivity to interest-rate moves, in years.",
          min: 1, max: 30, step: 1, unit: "y", def: 5,
          minLabel: "1 year", maxLabel: "30 years",
          format: function (v) { return v + (v === 1 ? " year" : " years"); }
        },
        {
          id: "credit",
          kind: "choice",
          label: "Investment grade or high yield?",
          options: [
            { v: "ig", label: "Investment grade", sub: "Lower yield, lower risk" },
            { v: "hy", label: "High yield",       sub: "Paid for the credit risk" }
          ]
        }
      ]
    }
  ]
};

/* Steps actually in play this session. config.js may switch optional steps
 * off (STEPS: ["profile","equities",...]) without editing the schema. */
window.SCHEMA.activeSteps = (function () {
  var want = window.CONFIG && window.CONFIG.STEPS;
  var steps = window.SCHEMA.steps.filter(function (s) {
    if (!want || want === "all") return true;
    return want.indexOf(s.id) !== -1;
  });
  /* Renumber so the progress rail and "Step 3 of 5" stay honest when a
     step is switched off. */
  steps.forEach(function (s, i) { s.n = i + 1; });
  return steps;
})();

/* Flat list of every active axis, in order — used by the engine and every
 * result screen. A switched-off step contributes no axes, so it simply
 * drops out of matching, the breakdown and the export. */
window.AXES = window.SCHEMA.activeSteps.flatMap(function (s) {
  return s.questions.map(function (q) {
    return {
      id: q.id, kind: q.kind, label: q.label, step: s.id, options: q.options,
      max: q.max, min: q.min, step_: q.step, unit: q.unit, def: q.def,
      minLabel: q.minLabel, maxLabel: q.maxLabel, format: q.format, hard: q.hard
    };
  });
});

window.AXIS_BY_ID = Object.fromEntries(window.AXES.map(function (a) { return [a.id, a]; }));

/* How a value reads back to a human — used by results, the admin table and
 * the CSV, so every surface says the same thing. */
window.axisLabel = function (axisId, value) {
  var axis = window.AXIS_BY_ID[axisId];
  if (!axis || value === null || value === undefined) return "";
  if (axis.kind === "range") {
    return axis.format ? axis.format(value) : value + (axis.unit || "");
  }
  if (Array.isArray(value)) {
    if (!value.length) return "None";
    return value.map(function (v) { return window.axisLabel(axisId, v); }).join("; ");
  }
  var opt = (axis.options || []).find(function (o) { return o.v === value; });
  return opt ? opt.label : String(value);
};
