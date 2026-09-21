/* NextGen Portfolio Builder — question schema.
 *
 * Edit labels and options here. The matching engine, both result screens,
 * the presenter breakdown and the admin export all derive from this file,
 * so adding a question needs no other code change — only a `target` for
 * the new axis on every portfolio, and an entry in `weights`.
 *
 * Axis kinds:
 *   "scale"  ordinal 0..3  — averaged across the room, compared by distance
 *   "choice" pick one      — room shows the modal pick, compared by identity
 *   "multi"  pick several  — room shows what share picked each option;
 *                            scored on the guest's best match, with a small
 *                            penalty for unrelated extras. Optional `max`
 *                            caps the picks; `min: 0` allows none.
 *
 * A multi axis marked `hard: true` is a CONSTRAINT, not a preference: a
 * portfolio whose target lists a conflicting holding is ruled out entirely
 * rather than merely scored down. That is what makes "I will not own fossil
 * fuels" behave the way a client means it.
 *
 * Steps marked `optional: true` can be switched off in config.js (STEPS)
 * without touching this file.
 */
window.SCHEMA = {
  steps: [
    {
      id: "profile",
      n: 1,
      title: "Quick Profile",
      blurb: "Two questions to anchor everything else.",
      questions: [
        {
          id: "horizon",
          kind: "scale",
          label: "What is your investment horizon?",
          hint: "How long before you would need this capital back.",
          options: [
            { v: 0, label: "Under 1 year",  sub: "Liquidity first" },
            { v: 1, label: "1 – 3 years",   sub: "Short cycle" },
            { v: 2, label: "3 – 7 years",   sub: "Full market cycle" },
            { v: 3, label: "7 years or more", sub: "Generational" }
          ]
        },
        {
          id: "maxLoss",
          kind: "scale",
          label: "How much would you be comfortable having at risk?",
          hint: "The drawdown you could live through without selling.",
          options: [
            { v: 0, label: "Up to 5%",      sub: "Capital preservation" },
            { v: 1, label: "5 – 10%",       sub: "Mild volatility" },
            { v: 2, label: "10 – 20%",      sub: "Real drawdowns" },
            { v: 3, label: "More than 20%", sub: "Full equity risk" }
          ]
        }
      ]
    },
    {
      id: "equities",
      n: 2,
      title: "Equities & Options",
      blurb: "Where you want the growth engine to sit.",
      questions: [
        {
          id: "sector",
          kind: "multi",
          max: 3,
          label: "Which sectors are you most constructive on?",
          hint: "Pick up to three.",
          options: [
            { v: "tech",        label: "Technology" },
            { v: "financials",  label: "Financials" },
            { v: "healthcare",  label: "Healthcare" },
            { v: "energy",      label: "Energy & Materials" },
            { v: "consumer",    label: "Consumer" },
            { v: "industrials", label: "Industrials" }
          ]
        },
        {
          id: "region",
          kind: "choice",
          label: "What country of risk do you prefer?",
          options: [
            { v: "us",     label: "United States" },
            { v: "europe", label: "Europe" },
            { v: "latam",  label: "Brazil & LatAm" },
            { v: "asia",   label: "Asia ex-Japan" },
            { v: "global", label: "Global diversified" }
          ]
        },
        {
          id: "options",
          kind: "choice",
          label: "Would you add an options overlay?",
          options: [
            { v: "none",       label: "No options",      sub: "Keep it linear" },
            { v: "income",     label: "Sell calls",      sub: "Enhance yield" },
            { v: "protection", label: "Buy puts",        sub: "Pay for downside cover" },
            { v: "leverage",   label: "Buy calls",       sub: "Convex upside" }
          ]
        }
      ]
    },
    {
      id: "fixedincome",
      n: 3,
      title: "Fixed Income",
      blurb: "The ballast — and how much credit risk it carries.",
      questions: [
        {
          id: "credit",
          kind: "scale",
          label: "Investment grade or high yield?",
          options: [
            { v: 0, label: "Investment grade only", sub: "IG" },
            { v: 1, label: "Mostly IG, some HY",    sub: "IG tilt" },
            { v: 2, label: "Balanced IG & HY",      sub: "Blend" },
            { v: 3, label: "High yield focused",    sub: "HY" }
          ]
        },
        {
          id: "duration",
          kind: "scale",
          label: "What duration range?",
          hint: "Sensitivity to interest-rate moves.",
          options: [
            { v: 0, label: "0 – 2 years",   sub: "Minimal rate risk" },
            { v: 1, label: "2 – 5 years",   sub: "Short" },
            { v: 2, label: "5 – 10 years",  sub: "Intermediate" },
            { v: 3, label: "10 years plus", sub: "Long" }
          ]
        },
        {
          id: "rank",
          kind: "scale",
          label: "How far down the capital structure?",
          hint: "Bond rank — where you sit if things go wrong.",
          options: [
            { v: 0, label: "Senior secured",       sub: "First in line" },
            { v: 1, label: "Senior unsecured",     sub: "Standard" },
            { v: 2, label: "Subordinated / Tier 2", sub: "Paid later" },
            { v: 3, label: "Perpetual / AT1",      sub: "Deepest risk" }
          ]
        }
      ]
    },
    {
      id: "fx",
      n: 4,
      title: "FX",
      blurb: "One currency you back, one you would rather avoid.",
      questions: [
        {
          id: "fxLong",
          kind: "choice",
          label: "Which currency are you optimistic about?",
          options: [
            { v: "usd", label: "USD", sub: "US Dollar" },
            { v: "eur", label: "EUR", sub: "Euro" },
            { v: "brl", label: "BRL", sub: "Brazilian Real" },
            { v: "jpy", label: "JPY", sub: "Japanese Yen" },
            { v: "gbp", label: "GBP", sub: "Sterling" },
            { v: "chf", label: "CHF", sub: "Swiss Franc" }
          ]
        },
        {
          id: "fxConcern",
          kind: "choice",
          label: "Which currency concerns you?",
          options: [
            { v: "usd", label: "USD", sub: "US Dollar" },
            { v: "eur", label: "EUR", sub: "Euro" },
            { v: "brl", label: "BRL", sub: "Brazilian Real" },
            { v: "jpy", label: "JPY", sub: "Japanese Yen" },
            { v: "gbp", label: "GBP", sub: "Sterling" },
            { v: "chf", label: "CHF", sub: "Swiss Franc" }
          ]
        }
      ]
    },
    {
      id: "notes",
      n: 5,
      title: "Structured Notes",
      blurb: "The trade-off every note makes: yield against protection.",
      questions: [
        {
          id: "snReturn",
          kind: "scale",
          label: "What target return range?",
          options: [
            { v: 0, label: "6 – 8%",      sub: "Conservative coupon" },
            { v: 1, label: "8 – 12%",     sub: "Enhanced yield" },
            { v: 2, label: "12 – 18%",    sub: "Aggressive coupon" },
            { v: 3, label: "18% or more", sub: "Maximum yield" }
          ]
        },
        {
          id: "snProtection",
          kind: "scale",
          label: "What level of protection do you need?",
          options: [
            { v: 0, label: "100% capital protected", sub: "No downside" },
            { v: 1, label: "90% protected",          sub: "Soft buffer" },
            { v: 2, label: "70% barrier",            sub: "Contingent" },
            { v: 3, label: "No protection",          sub: "Full downside" }
          ]
        }
      ]
    },
    {
      id: "construction",
      n: 6,
      optional: true,
      title: "Portfolio Construction",
      blurb: "How the book is actually put together.",
      questions: [
        {
          id: "maxPosition",
          kind: "scale",
          label: "How large can a single position get?",
          hint: "Concentration is where most real risk hides.",
          options: [
            { v: 0, label: "Under 2%",  sub: "Highly diversified" },
            { v: 1, label: "2 – 5%",    sub: "Standard" },
            { v: 2, label: "5 – 10%",   sub: "Concentrated" },
            { v: 3, label: "Over 10%",  sub: "High conviction" }
          ]
        },
        {
          id: "liquidity",
          kind: "scale",
          label: "How quickly must you be able to get out?",
          options: [
            { v: 0, label: "Daily",             sub: "Fully liquid" },
            { v: 1, label: "Within a month",    sub: "Near liquid" },
            { v: 2, label: "Within a quarter",  sub: "Some lock-up" },
            { v: 3, label: "Multi-year is fine", sub: "Illiquidity premium" }
          ]
        },
        {
          id: "themes",
          kind: "multi",
          max: 3,
          label: "Which themes should the portfolio express?",
          hint: "Pick up to three.",
          options: [
            { v: "ai",          label: "AI & automation" },
            { v: "energy",      label: "Energy transition" },
            { v: "health",      label: "Healthcare innovation" },
            { v: "infra",       label: "Infrastructure" },
            { v: "consumer",    label: "Premium consumer" },
            { v: "fintech",     label: "Financial disruption" }
          ]
        },
        {
          id: "exclusions",
          kind: "multi",
          min: 0,
          hard: true,
          label: "Anything you would rule out entirely?",
          hint: "Select any that apply, or none.",
          options: [
            { v: "tobacco",  label: "Tobacco & gambling" },
            { v: "fossil",   label: "Fossil fuels" },
            { v: "defence",  label: "Defence" },
            { v: "em",       label: "Emerging markets" },
            { v: "illiquid", label: "Anything illiquid" }
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
      max: q.max, min: q.min, hard: q.hard
    };
  });
});

window.AXIS_BY_ID = Object.fromEntries(window.AXES.map(function (a) { return [a.id, a]; }));
