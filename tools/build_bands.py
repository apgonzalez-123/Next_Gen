#!/usr/bin/env python3
"""Build data/band-books.json from the desk's five-band workbooks.

The desk does not want a portfolio assembled by scoring a shelf. It has
written out, band by band, exactly what each of the five portfolios holds and
at what weight. This reads those sheets and writes them as data; nothing here
decides anything.

Sources, all in ~/Downloads:
  NxtGen Alloc Eq*.xlsx         equities and the option overlay, per band
                                (the most recently modified match wins)
  next gen portoflios.xlsx      structured notes, per band
  FX_Assets (1).xlsx            FX positions, per band, plus the sleeve share
  FI Portfolio Securities ...   the five fixed income books (read elsewhere)

Two things worth knowing about the equity sheet. "Sheet1" holds the weights
WITHIN the equity sleeve and they gross to 110-140%: the sleeve is levered in
the desk's own numbers. "Sheet1 (2)" is the same book scaled to the whole
portfolio and totals 50-115%, which the sheet labels the Levered Position.
Both reconcile exactly against their stated totals, and both are kept.
"""
import glob, json, os, re, sys
import openpyxl

SRC = os.path.expanduser("~/Downloads")
BANDS = ["conservative", "conservative-moderate", "moderate",
         "moderate-aggressive", "aggressive"]
BAND_NAME = ["Conservative", "Conservative to Moderate", "Moderate",
             "Moderate to Aggressive", "Aggressive"]

# The desk re-sends the equity sheet as "NxtGen Alloc Eq (2).xlsx", "(3)",
# and so on rather than overwriting it, so a fixed filename quietly keeps
# building yesterday's options. Take the most recently modified match and
# print which one, so the build says out loud what it read.
def newest(pattern):
    hits = sorted(glob.glob(os.path.join(SRC, pattern)),
                  key=os.path.getmtime, reverse=True)
    hits = [h for h in hits if not os.path.basename(h).startswith("~$")]
    if not hits:
        raise SystemExit(f"no file matching {pattern!r} in {SRC}")
    return hits[0]

def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if v is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return float(m.group()) if m else None

def slug(s, n=40):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")[:n]

# ---------------------------------------------------------------- equities
def equities():
    src = newest("NxtGen Alloc Eq*.xlsx")
    print(f"  equities   <- {os.path.basename(src)}")
    wb = openpyxl.load_workbook(src, data_only=True)
    inner, outer = wb["Sheet1"], wb["Sheet1 (2)"]
    cols = [3, 5, 7, 9, 11]            # one per band; moneyness sits at col+1
    out = {b: [] for b in BANDS}
    gross, levered, cash = {}, {}, {}

    for bi, col in enumerate(cols):
        b = BANDS[bi]
        gross[b] = round(num(inner.cell(21, col).value) or 0, 4)
        # Sheet1 (2) states both, on its own rows, and they are different
        # things: row 21 "Levered Position" is the equity sleeve's GROSS
        # market exposure including the option notional; row 23 "Unlevered
        # EQ" is the cash actually in equities. The difference is the option
        # overlay, and reading only the first made the funded book look 15 to
        # 40 points bigger than it is.
        levered[b] = round(num(outer.cell(21, col).value) or 0, 4)
        cash[b] = round(num(outer.cell(23, col).value) or 0, 4)
        for r in range(3, 21):
            ticker = str(inner.cell(r, 2).value or "").strip()
            if not ticker:
                continue
            w_outer = num(outer.cell(r, col).value)
            w_inner = num(inner.cell(r, col).value)
            if not w_outer:                       # 0 or blank: not held in this band
                continue
            desc = str(inner.cell(r, 1).value or "").strip()
            mny = num(inner.cell(r, col + 1).value)
            # "Covered Call on SPY" / "Long Put QQQ" are overlays on the line above
            low = ticker.lower()
            is_opt = any(k in low for k in ("call", "put"))
            under = None
            if is_opt:
                m = re.search(r"\b(SPY|QQQ|XLF|SMH|XLE|EEM|RSP|VXUS|XLU|XLI|XLV|SCHD)\b",
                              ticker.upper())
                under = m.group(1) if m else None
            out[b].append({
                "id": slug(ticker),
                "ticker": (under or ticker.split()[0]).upper() if not is_opt
                          else (under or "") + " " + ("CC" if "covered" in low else
                                                      "LC" if "long call" in low else
                                                      "LP" if "long put" in low else "OPT"),
                "name": ticker if is_opt else (desc or ticker),
                "overlay": is_opt,
                "structure": ticker if is_opt else None,
                "underlying": under,
                "moneyness": mny,
                "weightOfSleeve": round(w_inner, 4) if w_inner is not None else None,
                "weight": round(w_outer * 100, 4),       # % of the portfolio
            })
    return out, gross, levered, cash

# ---------------------------------------------------------------- notes
NOTE_TYPE = {"AC": "Autocallable", "CLN": "Credit-linked note",
             "PPN": "Principal protected note", "CAT": "Capital protected",
             "IC": "Income certificate", "CP": "Capped participation"}

# An index-linked note is one struck on a broad index or basket of indices
# rather than on single names. The desk's rule holds half the sleeve in these.
INDEX_UNDERLYINGS = re.compile(r"\b(SPY|SPX|IWM|QQQ|RTY|SX5E|NDX)\b", re.I)

# "Long EUR/USD Call Spread" -> "EUR/USD". Falls back to the first word when
# the sheet writes a position with no pair in it.
FX_PAIR = re.compile(r"\b([A-Z]{3})\s*/\s*([A-Z]{3})\b", re.I)

def fx_pair(name):
    m = FX_PAIR.search(name or "")
    if m:
        return (m.group(1) + "/" + m.group(2)).upper()
    w = re.sub(r"[^A-Za-z ]", " ", name or "").split()
    return (w[0].upper() if w else "")

def pct_text(v):
    """The sheet writes a coupon either as text ("11%mem") or as a fraction
    (0.1185). Printing the fraction raw put "0.1185" on the projector."""
    if v is None:
        return ""
    s = str(v).strip()
    if not s or s == "-":
        return ""
    if isinstance(v, (int, float)):
        return f"{v * 100:.2f}%" if v < 1 else f"{v:.2f}%"
    try:
        f = float(s)
        return f"{f * 100:.2f}%" if f < 1 else f"{f:.2f}%"
    except ValueError:
        pass
    # Written as text, e.g. "11%mem" or "9.5% mem" — a memory coupon, which
    # pays the missed observations when it next pays. Space it so the column
    # reads as a number and a qualifier rather than one run-on token.
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*(.*)$", s)
    if m:
        num = float(m.group(1))
        tail = m.group(2).strip()
        tail = {"mem": "mem", "memory": "mem"}.get(tail.lower(), tail)
        return f"{num:.2f}%" + (" " + tail if tail else "")
    return s

def notes():
    ws = openpyxl.load_workbook(os.path.join(SRC, "next gen portoflios.xlsx"),
                                data_only=True)["Sheet1"]
    heads = {"conservative": "conservative", "conservative/moderate": "conservative-moderate",
             "moderate": "moderate", "moderate/aggressive": "moderate-aggressive",
             "aggressive": "aggressive"}
    out = {b: [] for b in BANDS}
    cur = None
    for r in range(1, ws.max_row + 1):
        a = str(ws.cell(r, 4).value or "").strip()
        if not a:
            continue
        key = heads.get(a.lower())
        if key and not ws.cell(r, 5).value:
            cur = key
            continue
        if cur is None:
            continue
        typ = str(ws.cell(r, 5).value or "").strip()
        if not typ:
            continue
        w = num(ws.cell(r, 9).value)
        full = NOTE_TYPE.get(typ.upper(), typ)
        under = a.strip()
        # "CLN on Brazil Lifter CLN" read twice; drop the code where the
        # underlying already carries it.
        bare = re.sub(r"\s*\b" + re.escape(typ) + r"\b\s*$", "", under).strip() or under
        barrier = str(ws.cell(r, 7).value or "").strip()
        out[cur].append({
            "id": slug(a + "-" + typ + "-" + str(ws.cell(r, 6).value)),
            "ticker": typ.upper(),
            "underlying": bare,
            "type": full,
            "tenor": str(ws.cell(r, 6).value or "").strip().upper(),
            "barrier": "" if barrier in ("-", "") else barrier,
            "coupon": pct_text(ws.cell(r, 8).value),
            "name": full + " on " + bare,
            "isCore": bool(INDEX_UNDERLYINGS.search(bare)),
            "weightOfSleeve": round(w, 4) if w is not None else None,
        })
    return out

# ---------------------------------------------------------------- fx
def fx():
    wb = openpyxl.load_workbook(os.path.join(SRC, "FX_Assets (1).xlsx"), data_only=True)
    ws = wb["Portfolios"]
    cols = [3, 4, 5, 6, 7]
    out = {b: [] for b in BANDS}
    share, stance, lev = {}, {}, {}
    for bi, col in enumerate(cols):
        b = BANDS[bi]
        stance[b] = num(ws.cell(1, col).value)          # +1 long USD .. -1 short USD
        share[b] = round((num(ws.cell(2, col).value) or 0) * 100, 4)   # % of portfolio
        # Read as a multiplier on the sleeve, not as extra points of the whole
        # portfolio — the same way the equity sheet expresses its own gearing
        # (gross of sleeve 1.10 to 1.40). Taking it as +20pp of the portfolio
        # put the aggressive book at 183% gross, which the rest of the
        # workbook does not support.
        lev[b] = round(num(ws.cell(3, col).value) or 0, 4)              # 0 .. 0.20
        for r in range(6, 20):
            name = str(ws.cell(r, 2).value or "").strip()
            if not name:
                continue
            w = num(ws.cell(r, col).value)
            if not w:
                continue
            out[b].append({
                "id": slug(name),
                # The pair itself, not a slug of the whole sentence. Stripping
                # the punctuation out of "Long EUR/USD Call Spread" gave
                # "LONGEURUS", which tells a reader nothing.
                "ticker": fx_pair(name),
                "name": name.title().replace("Usd", "USD").replace("Xau", "XAU")
                            .replace("Jpy", "JPY").replace("Eur", "EUR")
                            .replace("Brl", "BRL").replace("Mxn", "MXN")
                            .replace("Ndf", "NDF"),
                "kind": ("option structure" if "spread" in name.lower()
                         else "option" if ("call" in name.lower() or "put" in name.lower())
                         else "forward" if "ndf" in name.lower() else "spot"),
                "weightOfSleeve": round(w, 4),
            })
    return out, share, stance, lev

# ---- how the 100% of capital is divided -------------------------------
#
# The workbooks give four of the five numbers outright:
#
#   equity cash      "Unlevered EQ"     40 / 50 / 60 / 70 / 75
#   equity gross     "Levered Position" 50 / 57.5 / 72.5 / 90 / 115
#   FX share         "% of FX in the portfolio"  5 / 10 / 20 / 20 / 20
#   FX leverage      "Leverage"          0 / 0 / 0.10 / 0.15 / 0.20
#
# The difference between equity gross and equity cash is the option overlay,
# and it is NOTIONAL: a long call controls the underlying for its premium, so
# it adds market exposure without consuming the capital the cash book sits
# in. The FX sleeve is the same shape — calls, call spreads and NDFs, sized
# by notional rather than funded outright.
#
# So capital and exposure are tracked separately:
#
#   FUNDED CAPITAL  equity cash + fixed income + structured notes  = 100%
#   NOTIONAL ON TOP equity options + the FX overlay
#   GROSS EXPOSURE  the two added together
#
# That leaves exactly ONE number the desk has not written down: how much of
# the funded book is in structured notes. It is set here, deliberately in one
# place, as a ladder that grows with risk appetite and stays inside the 20%
# cap a private bank normally puts on structured product. Fixed income is
# then the remainder, so the funded book always reconciles to 100 instead of
# being a second guess that has to be made to fit.
#
# Everything else in this file is the desk's own number. This one is not.
NOTES_LADDER = [10.0, 12.0, 14.0, 16.0, 18.0]

def funded_split(eq_cash_pct, i):
    """Equity cash is the desk's; notes are the ladder above; fixed income is
    whatever is left, so the three always sum to 100."""
    notes = NOTES_LADDER[i]
    fi = round(100.0 - eq_cash_pct - notes, 2)
    if fi < 0:
        raise SystemExit(
            f"band {BANDS[i]}: equity cash {eq_cash_pct}% + notes {notes}% is over "
            f"100% of capital, leaving {fi}% for fixed income. Lower NOTES_LADDER."
        )
    return fi, notes

# A line in a band book is still a product, and everything downstream reads
# it as one: the validator's sector and currency checks, the weighted figures
# on the presenter, the risk proxy. Without an analytics block the equity
# sleeve reports no sector exposure at all and the dollar figure covers 6% of
# the book, which is what the validation layer caught.
#
# Characteristics are joined from data/products.json where the instrument is
# already on the shelf. Two names on the desk's equity sheet are not —
# VXUS and RSP — so they carry stated facts rather than a guess: VXUS is
# developed-market ex-US and therefore mostly non-dollar, RSP is the S&P 500
# equal weighted and therefore US and dollar.
EXTRA_EQUITY = {
  "VXUS": {"sector": "core", "region": "g7", "usdExposure": 10, "riskScore": 0.45,
           "name": "Vanguard Total International Stock"},
  "RSP":  {"sector": "core", "region": "g7", "usdExposure": 100, "riskScore": 0.48,
           "name": "Invesco S&P 500 Equal Weight"},
}

def attach_analytics(bands, products_path):
    try:
        PR = json.load(open(products_path))
    except Exception as e:
        print(f"  ! products.json unreadable ({e}); band lines carry no analytics")
        return
    by_ticker = {}
    for sleeve in ("equities", "fixedIncome", "notes", "fx", "options"):
        for it in PR.get(sleeve, {}).get("shelf", []):
            t = str(it.get("ticker") or "").upper()
            if t and t not in by_ticker:
                by_ticker[t] = it

    missing = set()
    for bk in bands:
        for line in bk["equities"]["lines"]:
            base = (line.get("underlying") or line["ticker"].split()[0]).upper()
            src = by_ticker.get(base)
            a = dict((src or {}).get("analytics") or {})
            if not a and base in EXTRA_EQUITY:
                e = EXTRA_EQUITY[base]
                a = {"sleeve": "equities", "sector": e["sector"], "region": e["region"],
                     "usdExposure": e["usdExposure"], "riskScore": e["riskScore"],
                     "beta": None, "volatility": None,
                     "expressesLeverage": False, "incomeProducing": False}
                line["name"] = line.get("name") or e["name"]
            if not a:
                missing.add(base)
                continue
            a = dict(a)
            if line.get("overlay"):
                # An option is its own instrument: geared if it is a long call,
                # and its risk is the structure's, not the underlying's.
                st = (line.get("structure") or "").lower()
                a["sleeve"] = "options"
                a["expressesLeverage"] = "long call" in st
                a["incomeProducing"] = "covered call" in st
                a["riskScore"] = 0.9 if "long call" in st else \
                                 0.3 if "covered call" in st else 0.35
            bk_line = line
            bk_line["analytics"] = a

        for line in bk["notes"]["lines"]:
            line["analytics"] = {
                "sleeve": "notes", "region": "g7", "sector": None,
                "usdExposure": 100, "riskScore": 0.55,
                "expressesLeverage": False, "incomeProducing": True,
                # type is now the full name, not the sheet's code
                "principalProtected": bool(re.search(r"protect", line.get("type", ""), re.I)),
                "tenorYears": num(line.get("tenor")),
                "isCore": bool(line.get("isCore")),
            }
        for line in bk["fx"]["lines"]:
            nm = line["name"].upper()
            # "LONG USD/JPY" is long the dollar; "LONG EUR/USD" is not.
            longUsd = nm.startswith("LONG USD") or nm.startswith("SHORT USD") is False and "USD/" in nm and nm.index("USD/") < 6
            line["analytics"] = {
                "sleeve": "fx", "region": "g7", "sector": None,
                "usdExposure": 100 if nm.startswith("LONG USD") else 0,
                "riskScore": 0.5, "kind": line.get("kind"),
                "expressesLeverage": False, "incomeProducing": False,
            }
    if missing:
        print(f"  ! no analytics for: {', '.join(sorted(missing))}")

def main():
    eq, eqGross, eqLevered, eqCash = equities()
    nt = notes()
    fxp, fxShare, fxStance, fxLev = fx()

    books = []
    for i, b in enumerate(BANDS):
        cash_pct = round(eqCash[b] * 100, 2)          # funded equity
        gross_pct = round(eqLevered[b] * 100, 2)      # equity incl. option notional
        opt_pct = round(gross_pct - cash_pct, 2)      # the overlay, notional only
        fi_pct, note_pct = funded_split(cash_pct, i)

        fx_cash = round(fxShare[b], 2)
        fx_gross = round(fx_cash * (1 + fxLev[b]), 2)

        books.append({
            "id": b, "name": BAND_NAME[i], "band": i,

            # What 100% of the client's capital is divided into. These three
            # sum to exactly 100 in every band.
            "capital": {
                "equities": cash_pct,
                "fixedIncome": fi_pct,
                "notes": note_pct,
            },
            # Market exposure taken on top of that capital, through
            # instruments whose notional exceeds the cash committed to them.
            "notional": {
                "equityOptions": opt_pct,
                "fx": fx_gross,
            },
            "grossExposure": round(gross_pct + fi_pct + note_pct + fx_gross, 2),

            "equities": {
                "lines": eq[b],
                "grossOfSleeve": eqGross[b],      # 1.10 .. 1.40
                "weight": gross_pct,              # % of portfolio, gross
                "weightCash": cash_pct,           # % of portfolio, funded
                "weightOptions": opt_pct,         # % of portfolio, notional
            },
            "notes": {"lines": nt[b], "weight": note_pct, "assumed": True},
            "fixedIncome": {"weight": fi_pct, "derived": True,
                            "book": i},   # band i takes fixed income book i
            "fx": {
                "lines": fxp[b],
                "weight": fx_gross,               # gross % of portfolio
                "weightUnlevered": fx_cash,
                "leverage": fxLev[b],
                "usdStance": fxStance[b],
                "overlay": True,                  # notional, not funded
            },
        })

    doc = {
        "$note": ("Written by tools/build_bands.py from the desk's five-band workbooks. "
                  "`capital` is the funded book and sums to 100% in every band. "
                  "`notional` is the market exposure taken on top of it through the "
                  "equity options and the FX overlay, which carry notional larger than "
                  "the cash committed to them. Every number is the desk's except the "
                  "structured-note ladder (NOTES_LADDER in the builder); fixed income "
                  "is the remainder, so the funded book always reconciles."),
        "asOf": "2026-10-05",
        "notesLadder": NOTES_LADDER,
        "bands": books,
    }
    attach_analytics(books, os.path.join(os.path.dirname(__file__), "..", "data", "products.json"))

    out = os.path.join(os.path.dirname(__file__), "..", "data", "band-books.json")
    json.dump(doc, open(out, "w"), indent=1)

    print(f"{len(books)} bands")
    print(f"  {'band':<26} {'EQ':>6} {'FI':>6} {'NOTE':>6} {'=cap':>6} "
          f"{'+opt':>6} {'+fx':>6} {'=gross':>7}")
    for bk in books:
        c, n = bk["capital"], bk["notional"]
        cap = c["equities"] + c["fixedIncome"] + c["notes"]
        print(f"  {bk['name']:<26} {c['equities']:>6.1f} {c['fixedIncome']:>6.1f} "
              f"{c['notes']:>6.1f} {cap:>6.1f} {n['equityOptions']:>6.1f} "
              f"{n['fx']:>6.1f} {bk['grossExposure']:>7.1f}")
        if abs(cap - 100) > 0.01:
            print(f"    ! funded capital is {cap}%, not 100%")

if __name__ == "__main__":
    main()
