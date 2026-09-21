/* NextGen Portfolio Builder — question schema.
 * 5 steps, 11 axes. Edit labels/options here; the matching engine and all
 * result screens read from this file, so nothing else needs to change.
 *
 * Axis kinds:
 *   "scale"  ordinal 0..3 — averaged across the room, compared by distance
 *   "choice" categorical  — room shows the modal pick, compared by identity
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
          kind: "choice",
          label: "Which sector are you most constructive on?",
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
    }
  ]
};

/* Flat list of every axis, in order — used by the engine and result screens. */
window.AXES = window.SCHEMA.steps.flatMap(function (s) {
  return s.questions.map(function (q) {
    return { id: q.id, kind: q.kind, label: q.label, step: s.id, options: q.options };
  });
});

window.AXIS_BY_ID = Object.fromEntries(window.AXES.map(function (a) { return [a.id, a]; }));
