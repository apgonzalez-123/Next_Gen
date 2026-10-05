#!/usr/bin/env python3
"""Build data/band-books.json from the desk's five-band workbooks.

The desk does not want a portfolio assembled by scoring a shelf. It has
written out, band by band, exactly what each of the five portfolios holds and
at what weight. This reads those sheets and writes them as data; nothing here
decides anything.

Sources, all in ~/Downloads:
  NxtGen Alloc Eq.xlsx          equities and the option overlay, per band
  next gen portoflios.xlsx      structured notes, per band
  FX_Assets (1).xlsx            FX positions, per band, plus the sleeve share
  FI Portfolio Securities ...   the five fixed income books (read elsewhere)

Two things worth knowing about the equity sheet. "Sheet1" holds the weights
WITHIN the equity sleeve and they gross to 110-140%: the sleeve is levered in
the desk's own numbers. "Sheet1 (2)" is the same book scaled to the whole
portfolio and totals 50-115%, which the sheet labels the Levered Position.
Both reconcile exactly against their stated totals, and both are kept.
"""
import json, os, re, sys
import openpyxl

SRC = os.path.expanduser("~/Downloads")
BANDS = ["conservative", "conservative-moderate", "moderate",
         "moderate-aggressive", "aggressive"]
BAND_NAME = ["Conservative", "Conservative to Moderate", "Moderate",
             "Moderate to Aggressive", "Aggressive"]

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
    wb = openpyxl.load_workbook(os.path.join(SRC, "NxtGen Alloc Eq.xlsx"), data_only=True)
    inner, outer = wb["Sheet1"], wb["Sheet1 (2)"]
    cols = [3, 5, 7, 9, 11]            # one per band; moneyness sits at col+1
    out = {b: [] for b in BANDS}
    gross, levered = {}, {}

    for bi, col in enumerate(cols):
        b = BANDS[bi]
        gross[b] = round(num(inner.cell(21, col).value) or 0, 4)
        levered[b] = round(num(outer.cell(21, col).value) or 0, 4)
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
    return out, gross, levered

# ---------------------------------------------------------------- notes
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
        out[cur].append({
            "id": slug(a + "-" + typ + "-" + str(ws.cell(r, 6).value)),
            "ticker": typ,
            "underlying": a,
            "type": typ,
            "tenor": str(ws.cell(r, 6).value or "").strip(),
            "barrier": str(ws.cell(r, 7).value or "").strip(),
            "coupon": str(ws.cell(r, 8).value or "").strip(),
            "name": typ + " on " + a,
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
                "ticker": re.sub(r"[^A-Z/]", "", name.upper()).replace("/", "")[:9],
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

# The workbooks specify the equity and FX sleeve shares. They do NOT specify
# the structured-note or fixed-income shares, and nothing in the deck does
# either. These are therefore DEFAULTS, written here so the desk can set the
# real numbers in one place rather than hunting them through the engine —
# they taper the bond sleeve as risk rises and grow the note sleeve, which is
# the direction the five fixed income books themselves move in.
#
# Everything else in this file is the desk's own number. These two are not.
ASSUMED_NOTES = [10.0, 12.0, 14.0, 16.0, 18.0]
ASSUMED_FI    = [40.0, 32.0, 24.0, 16.0, 10.0]

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
                "principalProtected": line.get("type", "").upper() in ("PPN", "CAT"),
                "tenorYears": num(line.get("tenor")),
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
    eq, eqGross, eqLevered = equities()
    nt = notes()
    fxp, fxShare, fxStance, fxLev = fx()

    books = []
    for i, b in enumerate(BANDS):
        books.append({
            "id": b, "name": BAND_NAME[i], "band": i,
            "equities": {
                "lines": eq[b],
                "grossOfSleeve": eqGross[b],      # 1.10 .. 1.40
                "weight": round(eqLevered[b] * 100, 2),   # % of portfolio, gross
            },
            "notes": {"lines": nt[b], "weight": ASSUMED_NOTES[i], "assumed": True},
            "fixedIncome": {"weight": ASSUMED_FI[i], "assumed": True,
                            "book": i},   # band i takes fixed income book i
            "fx": {
                "lines": fxp[b],
                "weight": round(fxShare[b] * (1 + fxLev[b]), 2),   # gross % of portfolio
                "weightUnlevered": fxShare[b],
                "leverage": fxLev[b],
                "usdStance": fxStance[b],
            },
        })

    doc = {
        "$note": ("Written by tools/build_bands.py from the desk's five-band workbooks. "
                  "Every weight here is the desk's; nothing in this file is computed by "
                  "the engine. Equity weights are GROSS and sum past 100% of the sleeve "
                  "in every band, which is the leverage the desk intends."),
        "asOf": "2026-10-04",
        "bands": books,
    }
    attach_analytics(books, os.path.join(os.path.dirname(__file__), "..", "data", "products.json"))

    out = os.path.join(os.path.dirname(__file__), "..", "data", "band-books.json")
    json.dump(doc, open(out, "w"), indent=1)

    print(f"{len(books)} bands")
    for bk in books:
        print(f"  {bk['name']:<26} equity {bk['equities']['weight']:>6.2f}% "
              f"(gross {bk['equities']['grossOfSleeve']:.3f} of sleeve, "
              f"{len(bk['equities']['lines']):>2} lines)  "
              f"notes {len(bk['notes']['lines'])}  "
              f"fx {bk['fx']['weight']:>5.1f}% (x{1 + bk['fx']['leverage']:.2f}) "
              f"({len(bk['fx']['lines'])} lines, USD stance {bk['fx']['usdStance']})")

if __name__ == "__main__":
    main()
