# NextGen Portfolio Lab

A guest-facing web app for the NextGen session. Guests scan a QR code, answer
five short steps on their phone, and the room's answers are averaged and
matched against a base of portfolios. A presenter screen drives the reveal on
the projector; an admin board shows who answered what.

Entirely static — **no bank network, no server required** to run the session.

---

## The four pages

| Page | Who opens it | What it does |
|---|---|---|
| `index.html` | Guests, by QR | Registration, the questions, and each guest's own portfolio |
| `present.html` | Presenter, on the projector | QR to join, live counter, and the reveal (5 slides) |
| `admin.html` | You | Every response, one row per guest, CSV / JSON export |
| `qr-gen.html` | You, before the event | *Optional* — printable personal QR codes, one per guest |

---

## Current deployment

| | |
|---|---|
| Guest (the QR target) | https://apgonzalez-123.github.io/Next_Gen/ |
| Presenter | https://apgonzalez-123.github.io/Next_Gen/present.html |
| Admin | https://apgonzalez-123.github.io/Next_Gen/admin.html |
| QR sheet *(optional)* | https://apgonzalez-123.github.io/Next_Gen/qr-gen.html |
| Vote backend | https://nextgen-votes.apgonzalez.workers.dev |
| Database | D1 `investor_profile`, table `nextgen_responses` |

Live voting is **on**: responses are collected across devices and the
synthetic demo audience is off (`DEMO_ROOM_SIZE: 0`).

The admin board asks for the session password, which is the worker secret
`ADMIN_KEY`. Rotate it with `npx wrangler secret put ADMIN_KEY` from `worker/`.

> The worker owns the `nextgen_responses` table **only**. The `responses`
> table in the same database has a different schema and belongs to separate
> work — nothing here reads, writes or alters it.

## Run it locally

```bash
python3 -m http.server 8817
```

Then open <http://localhost:8817/> (guest) and
<http://localhost:8817/present.html> (presenter).

It works immediately, with no backend: see **Demo mode** below.

## Publish it (GitHub Pages)

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch**, branch
   `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

That URL is public and outside the bank network, which is what the QR code
needs. The presenter page builds the QR from its **own address**, so there is
nothing to configure — deploy it anywhere and the code points to the right place.

---

## The ten questions

| Section | Questions |
|---|---|
| 1 · Risk Profile | Risk profile · market view · investment horizon *(1–30y)* |
| 2 · Positioning | Leverage · country of risk |
| 3 · Equities | Sector exposure *(pick 3)* |
| 4 · FX | USD share *(0–100%, quarters)* |
| 5 · Fixed Income | Capital or income · duration *(1–30y)* · IG or HY |

Four question kinds:

| Kind | Behaviour | Room view |
|---|---|---|
| `scale` | pick one on an ordered list, any length | averaged |
| `range` | a number on a slider (`min`/`max`/`step`/`unit`/`def`) | averaged; reported in bands |
| `choice` | pick one | modal pick |
| `multi` | pick several (`max` caps, `min: 0` allows none) | share of the room per option — bars exceed 100% by design |

A `range` axis with few enough stops gets one bar per stop (USD, in quarters);
a wide one is collected into six bands (1–30y becomes 1–5y, 6–10y, …) so the
projector shows something readable rather than thirty bars.

### Adding your own questions

Add it to the right section in `assets/schema.js`, then give every portfolio a
`target` for it and add a `weights` entry. Nothing else changes — the guest
flow, the presenter breakdown, the admin table and the CSV all derive from the
schema, and the presenter paginates into as many boards as it needs.

## Where the room landed

Once guests have answered, the admin board shows the room's collective
allocation across **Equities · Fixed income · Structured notes · FX**, with the
drivers behind it and the portfolio the averaged profile matches.

That split is **indicative**, computed by `ENGINE.roomAllocation()` from the
room's own answers: risk appetite, market view and horizon set the equity share
of the risk budget, an income mandate pulls out of it, leverage is expressed
through structured notes, and a dollar view far from neutral justifies an FX
sleeve. The specialist sleeves are carved out first and equity/fixed income
split what remains — adding them on top instead made the result non-monotonic.

Replace that function with the real construction rules once the portfolio shelf
is built.

## Where each guest stands

Every guest's result ends with their standing against the room: what share of
the room is more or less cautious than they are, their own answer against the
room average on each numeric question, and how many others landed on the same
portfolio. It is computed from the same aggregate counts every other room
screen uses, so it never exposes another guest's answers.

## How matching works

Each portfolio declares a `target` on every one of the twelve axes. A guest's
fit is a weighted similarity across those axes:

- **scale axes** — `1 − |answer − target| / 3`
- **choice axes** — `1` exact, `0.55` if the answer is in the portfolio's
  `also` list, `0.1` otherwise
- **multi axes (affinity)** — `0.7 × best pick + 0.3 × mean of all picks`, so
  the strongest match carries the axis while scattershot picking is shaded
  down rather than rewarded
- **multi axes (avoidance)** — see exclusions below

Weights live in `data/portfolios.json` (`weights`). Risk appetite and
protection dominate; the FX opinion is flavour rather than structure.

### Exclusions are constraints, not preferences

The exclusions question is marked `hard: true`, and each portfolio splits what
it holds into two tiers:

```jsonc
"exclusions": {
  "conflicts": ["em"],        // the strategy cannot exist without it
  "screens":   ["fossil"]     // it holds some, but could screen it out
}
```

A `conflicts` hit **rules the portfolio out entirely** — it sorts below every
eligible portfolio and the guest is told which exclusion did it. A `screens`
hit costs 25% of that axis. So "I will not own emerging markets" removes the EM
carry strategy outright, while "no tobacco" merely shades a dividend sleeve, and
neither is left to be outvoted by fifteen other axes.

If a guest's exclusions rule out the whole shelf, the result screen says so
rather than recommending something they have refused.

The results screens show **two different numbers**, and the difference is the
point of the session:

- **The composite** — every answer averaged into one profile, then matched.
  Averaging pulls toward the middle, so this tends to land on a balanced
  portfolio.
- **The split** — each guest matched on their *own* answers, then tallied.
  This shows how genuinely varied the room is, which the average hides.

---

## Replacing the portfolio base

The shelf lives in **`data/portfolios.json`** — replace that one file. Nothing
else needs to change.

```jsonc
{
  "weights": { "horizon": 1.2, "maxLoss": 1.6, ... },
  "portfolios": [
    {
      "id": "shield",
      "name": "Capital Shield",
      "tagline": "Preserve first. Return second.",
      "blurb": "One or two sentences shown on the result screen.",
      "alloc": { "equities": 10, "fixedIncome": 55, "notes": 25, "cash": 10 },
      "expReturn": "4 – 6%",
      "vol": "Low",
      "traits": ["Senior secured credit", "Sub-2y duration"],
      "target": {
        "horizon": 0, "maxLoss": 0,                      // scale: 0–3
        "sector": { "v": "consumer", "also": ["healthcare"] },  // choice
        "region": { "v": "global",  "also": ["us"] },
        "options": { "v": "protection", "also": ["none"] },
        "credit": 0, "duration": 0, "rank": 0,
        "fxLong":    { "v": "usd", "also": ["chf"] },
        "fxConcern": { "v": "brl", "also": ["jpy"] },
        "snReturn": 0, "snProtection": 0
      }
    }
  ]
}
```

### The proposed book

Each portfolio also carries the instruments it would actually hold and the risk
that comes with them:

```jsonc
"holdings": [
  { "name": "IG corporate credit, 3-5y", "ticker": "IG 3-5Y",
    "cls": "fixedIncome", "weight": 28, "detail": "BBB+ avg · senior unsecured" }
],
"risk": {
  "expReturn": 7.0, "vol": 6.8, "maxDrawdown": -8.0,
  "sharpe": 0.74, "yield": 5.6,
  "scenarios": [
    { "label": "Bull", "pct": 12.0, "driver": "Coupons paid, autocall triggers early" },
    { "label": "Base", "pct":  7.0, "driver": "Carry plus dividends" },
    { "label": "Bear", "pct": -5.5, "driver": "Barrier tested" }
  ]
}
```

`cls` must be one of `equities`, `fixedIncome`, `notes`, `cash`. Holdings appear
on the guest's result screen grouped by asset class, and the presenter's verdict
slide shows the headline risk figures plus the four largest positions.

**The instruments shipped in this repo are representative placeholders** — broad
sleeves and generic instrument descriptions, not a real proposal, and the return
figures are modelled illustrations rather than forecasts. Replace them with the
real book. The result screen carries a "Hypothetical" disclaimer under the risk
numbers; keep it there, or replace it with your own approved wording.

Rules:

- Every portfolio needs a `target` for **every** axis in the active steps.
- `alloc` must sum to 100.
- `holdings` weights must sum to 100 **and** reconcile to `alloc` per asset
  class — the loader rejects a base where the pie chart and the line items
  disagree.
- Valid `choice` and `multi` values are the option `v` keys in `assets/schema.js`.
- The file is **validated on load**. If anything is wrong the site falls back
  to the eight built-in portfolios and prints exactly what failed to the browser
  console — check there if a change does not appear.

Six to eight portfolios is the sweet spot. Check they are all *reachable*:
if one can never win, guests will never see it.

To change the **questions** themselves, edit `assets/schema.js` — the matching
engine, both result screens and the admin export all derive from it. Any new
axis needs a matching `target` on every portfolio and an entry in `weights`.

---

## The guest journey

One generic QR for the whole room. A guest scans it and walks through:

```
scan → welcome → 1. Registration → 2..n. the questions → their portfolio
```

**Registration is the first step**, with its own slot in the progress rail.
It asks for whatever `REGISTER_FIELDS` lists in `assets/config.js`:

```js
REGISTER_FIELDS: [
  { id: "name",  label: "Your name",     required: true, autocomplete: "name" },
  { id: "group", label: "Table / group", required: false }
  // { id: "email", label: "Email", type: "email", autocomplete: "email" }
]
```

`name` and `group` have dedicated columns in the admin table and the CSV;
**any other field you add gets its own column automatically** — no code
change. Continue stays disabled until every `required` field is filled.

`IDENTIFY` controls whether the step appears at all:

```js
IDENTIFY: "required"   // "required" | "optional" | "off"
```

At the end the guest gets their own portfolio, headed with their name, the
proposed holdings and the risk analysis.

> If you add a contact field such as email, update `PRIVACY_NOTE` to say so —
> it is what guests are shown at registration, and it should stay true. An
> event sign-up is still a collection of personal data.

### Optional: a personal code per guest

The generic QR above is the intended path. If you would rather guests did not
type anything at all, open
`qr-gen.html`, paste the guest list, print the sheet, put a card at each place
setting. Each card encodes:

```
https://<site>/?g=<token>&n=<name>&t=<group>
```

The guest lands already identified — the registration step is skipped — and
every answer is recorded against that token. Re-scanning the same card
**updates** that guest's row rather than creating a second one.

Either way, `admin.html` shows one row per guest and one column per question,
plus the portfolio they matched, and exports the lot as CSV or JSON.

---

## Demo mode vs. live voting

**Demo mode** is the default (`BACKEND_URL: ""`). Votes stay on the device and
are blended into a seeded synthetic audience of ~42 guests, so every results
screen is fully populated before anyone has scanned anything. Enough to
rehearse, and enough to present from a single laptop. The presenter and admin
screens both label it clearly, and synthetic guests are **never** included in
the admin table or any export.

**Live voting across the room** needs the backend in `worker/`:

```bash
cd worker
npm install
npx wrangler d1 create nextgen-votes     # paste the database_id into wrangler.toml
npx wrangler secret put ADMIN_KEY        # guards reset + server-side export
npx wrangler deploy
```

Then set the URL it prints in `assets/config.js`:

```js
BACKEND_URL: "https://nextgen-votes.<your-subdomain>.workers.dev",
SESSION_ID:  "nextgen-2026",   // bump between rehearsal and the live run
```

It is a single Cloudflare Worker over a D1 database — SQL and strongly
consistent, because the tally is read back immediately after each write (KV is
eventually consistent and would lag the projector by several seconds).

| Route | |
|---|---|
| `POST /api/vote` | upsert one guest's answers |
| `GET /api/results?session=ID` | every response for a session |
| `GET /api/export?session=ID&key=…` | CSV straight from the backend |
| `POST /api/reset` | clear a session (needs `ADMIN_KEY`) |

`ADMIN_KEY` is never stored in `config.js` — that file ships to every guest.
The presenter is prompted for it once and it is held in `sessionStorage` for
that session only.

---

## Running the session

1. Open `present.html` on the projector, press **F** for fullscreen.
2. Slide 1 shows the QR and a live response counter. Wait for the room.
3. **→** to slide 2: where the room landed, per guest.
4. **→** to slide 3: the room's composite portfolio — the reveal.
5. **→** slides 4 and 5: answer-by-answer breakdown, for discussion.

| Key | |
|---|---|
| `←` `→` / space | move between slides |
| `1`–`5` | jump to a slide (also `present.html#3`) |
| `F` | fullscreen |
| `R` | reset votes |

Press **R** after the rehearsal so practice votes do not pollute the real
numbers — or bump `SESSION_ID`, which starts a clean tally and keeps the old
one intact.

---

## Re-skinning

All colour, type and spacing tokens are the `:root` block at the top of
`assets/app.css`. Swapping the palette to brand colours is a six-line change;
nothing else references a raw hex.

The four asset-class colours (`--series-*`) and the scenario gain/loss pair
(`--pos` / `--neg`) are deliberate: both sets are validated for contrast and
colour-blind separation against this dark navy surface, in the order they appear
on screen. The scenario pair is aqua/orange rather than green/red for exactly
that reason, and every bar is direct-labelled so colour is never the only cue.
If you change them, keep adjacent segments distinguishable.

There is **no bank branding anywhere** — the wordmark is plain "NextGen
Portfolio Lab". Add the real mark in `index.html`, `present.html` and
`admin.html` (the `.wordmark` element) once you know what is approved.

---

## Layout

```
index.html          guest flow
present.html        projector view
admin.html          responses + export
qr-gen.html         printable personal QR codes
data/
  portfolios.json   THE PORTFOLIO BASE — replace this
assets/
  schema.js         the five steps and their questions
  portfolios.js     built-in fallback base + matching engine
  base-loader.js    loads & validates data/portfolios.json
  store.js          sync layer (demo mode / live backend)
  config.js         deployment + identity settings
  app.js            guest flow
  present.js        presenter slides
  admin.js          admin table + CSV/JSON export
  qr-gen.js         personal QR codes
  app.css           tokens + guest styles
  present.css       projector layout
  admin.css         admin table
  vendor/qrcode.min.js   vendored so a weak venue wifi cannot break the QR
worker/
  index.js          Cloudflare Worker + D1 vote backend
  wrangler.toml
```

---

## Not investment advice

Every portfolio, return range and volatility label in this repo is illustrative,
written to make the session work. Nothing here is an offer, a recommendation, or
advice, and the result screens say so.
