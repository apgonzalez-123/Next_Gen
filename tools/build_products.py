#!/usr/bin/env python3
"""
Build data/products.json from the desk's own source files.

Sources (kept outside the repo; paths passed in or defaulted to ~/Downloads):
  FX_Assets.xlsx              the FX shelf, already scored against the ten questions
  next gen picks.xlsx         the structured note shelf
  Securities-YYYY-MM-DD.xlsx  the USD bond universe
  Safra Bank - *.pdf          non-USD bond ideas and the equity sleeve

NOTHING client-identifying is read out of the PDF. Only instrument-level
facts are taken: issuer, coupon, yield, duration, rating, currency. The
client name, the account allocations and the fee schedule are ignored.

Re-run after any source file changes:
    python3 tools/build_products.py
"""
import json, os, re, sys, datetime
import openpyxl

SRC = os.path.expanduser("~/Downloads")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "products.json")

# ---------------------------------------------------------------- helpers
def num(v, default=None):
    return float(v) if isinstance(v, (int, float)) else default

def slug(s, n=28):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")[:n]

# ---------------------------------------------------------------- FX
# The desk scores these itself, 0 to 1, against the ten questions. Blank
# means the question does not apply to that instrument. Their scale is
# translated into this site's units rather than reinterpreted.
FX_COLS = {  # spreadsheet column -> (axis id, translation)
    "C": ("riskProfile",   lambda v: round(v * 2, 2)),          # 0..1  -> 0..2
    "D": ("marketView",    lambda v: round(v * 2, 2)),          # 0..1  -> 0..2
    "E": ("leverage",      lambda v: "yes" if v >= 0.5 else "no"),
    "F": ("horizon",       lambda v: max(1, round(v * 30))),     # 0..1  -> years
    "G": ("country",       lambda v: "em" if v >= 0.5 else "g7"),
    "I": ("usd",           lambda v: round(v * 100)),            # 0..1  -> %
    "J": ("capitalIncome", lambda v: "capital" if v >= 0.5 else "income"),
    "K": ("duration",      lambda v: max(1, round(v * 30))),
    "L": ("credit",        lambda v: "hy" if v >= 0.5 else "ig"),
}

def build_fx(path):
    ws = openpyxl.load_workbook(path, data_only=True)["Sheet1"]
    out = []
    for r in range(4, ws.max_row + 1):
        name = ws.cell(r, 2).value
        if not name:
            continue
        fit = {}
        for col, (axis, conv) in FX_COLS.items():
            v = num(ws[f"{col}{r}"].value)
            if v is None:
                continue                      # blank: axis does not apply
            t = conv(v)
            fit[axis] = {"target": t} if isinstance(t, (int, float)) else {t: 1.0, _other(axis, t): 0.2}
        out.append({
            "id": slug(name), "ticker": _fx_ticker(name, _fx_kind(name)),
            "name": str(name).title(),
            "kind": _fx_kind(name), "note": _fx_note(name), "fit": fit,
        })
    return out

def _other(axis, picked):
    pairs = {"leverage": ("no", "yes"), "country": ("g7", "em"),
             "capitalIncome": ("income", "capital"), "credit": ("ig", "hy")}
    a, b = pairs[axis]
    return b if picked == a else a

def _fx_ticker(name, kind):
    m = re.search(r"([A-Z]{3})/([A-Z]{3})", str(name))
    base = (m.group(1) + m.group(2)) if m else slug(name, 8).upper()
    suffix = {"option": " OPT", "option structure": " CS", "forward": " NDF"}.get(kind, "")
    return base + suffix

def _fx_kind(name):
    s = str(name).upper()
    if "CALL SPREAD" in s: return "option structure"
    if "CALL" in s or "PUT" in s: return "option"
    if "NDF" in s: return "forward"
    return "spot"

def _fx_note(name):
    s = str(name).upper()
    if "XAU" in s:  return "Gold against the dollar."
    if "BRL" in s:  return "Short the dollar against the real, non-deliverable."
    if "MXN" in s:  return "Dollar against the Mexican peso."
    if "JPY" in s:  return "Dollar against the yen."
    if "EUR" in s:  return "Euro against the dollar."
    return ""

# ---------------------------------------------------------------- notes
NOTE_TYPE = {"AC": "Autocallable", "IC": "Income certificate", "CTPL": "Capital protected",
             "PPN": "Principal protected note", "CLN": "Credit-linked note",
             "CAT": "Capped participation"}
NOTE_SECTOR = {"TECH": "tech", "FINANCIAL": "financials", "HY": None,
               "USA": None, "World": None, "MEXICO": None, "BRAZIL": None}

# Index and broad-ETF underlyings. A note on one of these is an index note;
# anything else is a single-name or basket structure.
INDEX_TOKENS = {"SPX", "SPY", "IWM", "QQQ", "RTY", "SX5E", "EWY", "EWZ",
                "XLE", "XLF", "XLK", "NDX", "DAX", "UKX"}

def is_index_note(underlying):
    toks = [t for t in re.split(r"[\s/,]+", str(underlying).upper()) if t]
    return bool(toks) and all(t in INDEX_TOKENS for t in toks)

def build_notes(path):
    ws = openpyxl.load_workbook(path, data_only=True)["Sheet1"]
    out = []
    for r in range(3, ws.max_row + 1):
        under = ws.cell(r, 3).value
        if not under:
            continue
        typ = str(ws.cell(r, 4).value or "").strip()
        tenor = str(ws.cell(r, 5).value or "").strip()
        barrier = str(ws.cell(r, 6).value or "").strip()
        coupon = ws.cell(r, 7).value
        risk = num(ws.cell(r, 9).value, 2)          # 1..3
        sector = str(ws.cell(r, 10).value or "").strip()
        capinc = str(ws.cell(r, 11).value or "income").strip().lower()
        country = str(ws.cell(r, 12).value or "US").strip().lower()

        yrs = num(re.sub(r"[^0-9.]", "", tenor) or 0, 3) or 3
        sec = NOTE_SECTOR.get(sector, None)

        fit = {
            "riskProfile": {"target": round((risk - 1), 2)},        # 1..3 -> 0..2
            "horizon": {"target": max(1, round(yrs))},
            "capitalIncome": ({"capital": 1.0, "income": 0.3} if capinc == "capital"
                              else {"income": 1.0, "capital": 0.4}),
            "country": ({"em": 1.0, "g7": 0.3} if country == "em" else {"g7": 1.0, "em": 0.3}),
            "usd": {"target": 100},                                  # all USD-settled
        }
        if sec:
            fit["sector"] = {s: (1.0 if s == sec else 0.2) for s in
                             ["tech", "financials", "healthcare", "energy", "consumer", "industrials"]}
        if sector == "HY":
            fit["credit"] = {"hy": 1.0, "ig": 0.3}

        out.append({
            "id": slug(f"{under}-{typ}-{tenor}", 34),
            "ticker": typ or "NOTE",
            "name": f"{NOTE_TYPE.get(typ, typ)} on {under}",
            "underlying": str(under), "type": NOTE_TYPE.get(typ, typ), "tenor": tenor,
            "barrier": barrier if barrier != "-" else "",
            "coupon": (f"{coupon*100:.2f}%" if isinstance(coupon, float) and coupon < 1 else str(coupon or "")),
            "riskBand": int(risk), "region": country.upper(),
            "isIndex": is_index_note(under),
            "note": f"{tenor} · {barrier if barrier!='-' else 'no barrier'}",
            "fit": fit,
        })
    return out

# ---------------------------------------------------------------- bonds
def build_bonds(path):
    ws = openpyxl.load_workbook(path, data_only=True)["Securities"]
    hdr = {ws.cell(1, c).value: c for c in range(1, ws.max_column + 1)}
    g = lambda r, k: ws.cell(r, hdr[k]).value if k in hdr else None
    EM = {"AR", "BR", "MX", "CO", "CL", "PE", "TR", "ZA", "IN", "CN", "ID"}
    out = []
    for r in range(2, ws.max_row + 1):
        issuer = g(r, "Issuer")
        if not issuer:
            continue
        ccy = str(g(r, "Crncy") or "USD").upper()
        ighy = str(g(r, "Bloomberg HY or IG") or "IG").upper()
        ytw = num(g(r, "Ask YTW")); mdur = num(g(r, "Ask MDur"))
        ctry = str(g(r, "Country of Risk") or "US").upper()
        out.append(_bond(
            issuer=str(issuer).title(), ccy=ccy, ighy="hy" if ighy == "HY" else "ig",
            ytw=ytw, mdur=mdur, coupon=num(g(r, "Coupon %")),
            rank=str(g(r, "Payment Rank") or ""), rating=str(g(r, "BBG Composite Rating") or ""),
            sector=str(g(r, "Industry Sector") or ""), country=ctry,
            em=ctry in EM, isin=str(g(r, "ISIN") or ""), source="Securities export",
        ))
    return out

def _bond(issuer, ccy, ighy, ytw, mdur, coupon, rank, rating, sector, country, em, isin="", source=""):
    usd_exposure = 100 if ccy == "USD" else 5
    return {
        "id": slug(f"{issuer}-{ccy}-{rating}", 34),
        # Bonds have no ticker; show a short issuer code plus the currency so
        # two lines from the same issuer stay distinguishable.
        "ticker": (re.sub(r"[^A-Za-z]", "", issuer)[:4].upper() + "." + ccy),
        "name": issuer, "isin": isin,
        "currency": ccy, "credit": ighy, "rating": rating, "rank": rank,
        "sector": sector, "country": country, "usdExposure": usd_exposure,
        "source": source,
        "data": {"ytw": ytw, "duration": mdur, "coupon": coupon},
        "note": f"{rating or ighy.upper()} · {rank or 'Sr Unsecured'} · {country}",
        "fit": {
            "credit": {"ig": 1.0 if ighy == "ig" else 0.25, "hy": 1.0 if ighy == "hy" else 0.3},
            "country": {"em": 1.0 if em else 0.35, "g7": 0.35 if em else 1.0},
            "duration": {"target": max(1, round(mdur))} if mdur else None,
            "usd": {"target": usd_exposure},
            "capitalIncome": {"income": 1.0, "capital": 0.55},
        },
    }

# ---------------------------------------------------------------- non-USD bonds (from the deck)
# Instrument facts only. Taken from the desk's own non-USD idea pages.
NON_USD = [
  # issuer, ccy, ighy, ytw, dur, coupon, rank, rating, sector, country, em
  ("Banco Santander",   "EUR", "hy", 5.18, 3.99, 6.000, "Jr Subordinated", "BBB-", "Financial",        "ES", False),
  ("Electricite de France","EUR","hy", 4.70, 4.21, 4.375, "Jr Subordinated", "BB",  "Utilities",        "FR", False),
  ("BNP Paribas",       "EUR", "hy", 5.81, 5.56, 5.625, "Jr Subordinated", "BBB-", "Financial",        "FR", False),
  ("Volkswagen Intl",   "EUR", "hy", 5.46, 6.05, 5.994, "Jr Subordinated", "BBB-", "Consumer, Cyclical","NL", False),
  ("TotalEnergies SE",  "EUR", "ig", 4.50, 6.87, 4.500, "Jr Subordinated", "A-",  "Energy",            "FR", False),
  ("Barclays PLC",      "EUR", "hy", 6.15, 7.18, 6.125, "Jr Subordinated", "BB+", "Financial",        "GB", False),
  ("ING Groep NV",      "GBP", "ig", 5.31, 1.66, 6.250, "Subordinated",    "BBB+","Financial",        "NL", False),
  ("Credit Agricole SA","GBP", "ig", 5.95, 5.55, 5.375, "Subordinated",    "BBB+","Financial",        "FR", False),
  ("GlaxoSmithKline",   "GBP", "ig", 5.72, 9.08, 6.375, "Sr Unsecured",    "A",   "Consumer, Non-cyc","GB", False),
  ("Vodafone Group",    "GBP", "hy", 6.35, 4.08, 8.000, "Jr Subordinated", "BB+", "Communications",   "GB", False),
  ("Electricite de France","GBP","hy",6.21, 2.41, 5.875, "Jr Subordinated", "BB-", "Utilities",        "FR", False),
  ("Barclays PLC",      "GBP", "hy", 6.38, 2.04, 9.250, "Jr Subordinated", "BB+", "Financial",        "GB", False),
  ("Japan Tobacco",     "USD", "ig", 5.22, 6.84, 5.850, "Sr Unsecured",    "A",   "Consumer, Non-cyc","JP", False),
  ("LG Energy Solution","USD", "ig", 5.80, 7.53, 5.875, "Sr Unsecured",    "BBB", "Consumer, Cyclical","KR", True),
  ("Aust & NZ Bank",    "USD", "ig", 5.63, 6.97, 5.816, "Subordinated",    "A-",  "Financial",        "AU", False),
  ("Sumitomo Life",     "USD", "ig", 5.81, 6.11, 5.875, "Subordinated",    "A-",  "Financial",        "JP", False),
  ("Dai-ichi Life",     "USD", "ig", 5.83, 6.66, 6.200, "Subordinated",    "A-",  "Financial",        "JP", False),
]

def build_non_usd():
    return [_bond(issuer=i, ccy=c, ighy=q, ytw=y, mdur=d, coupon=cp, rank=rk,
                  rating=rt, sector=s, country=ct, em=em, source="Desk non-USD ideas")
            for (i, c, q, y, d, cp, rk, rt, s, ct, em) in NON_USD]

# ---------------------------------------------------------------- equities (desk sleeve)
EQ = [
  # ticker, name, sleeve, role, sector, region, usdExposure, riskBand(0-2)
  ("TSM",   "Taiwan Semiconductor",        "Compute",      "Foundry",                 "tech",        "em", 20, 2),
  ("NVDA",  "NVIDIA",                      "Compute",      "GPU compute",             "tech",        "g7", 100, 2),
  ("AVGO",  "Broadcom",                    "Compute",      "Custom silicon",          "tech",        "g7", 100, 2),
  ("GLW",   "Corning",                     "Compute",      "Optical",                 "industrials", "g7", 100, 1),
  ("CEG",   "Constellation Energy",        "Power",        "Nuclear PPAs",            "energy",      "g7", 100, 2),
  ("EQIX",  "Equinix",                     "Power",        "Data-centre REIT",        "industrials", "g7", 100, 1),
  ("GEV",   "GE Vernova",                  "Power",        "Power generation, grid",  "industrials", "g7", 100, 2),
  ("ETN",   "Eaton",                       "Power",        "Electrical equipment",    "industrials", "g7", 100, 1),
  ("EWY",   "iShares MSCI South Korea",    "Korea",        "Korea broad ETF",         "tech",        "em", 5,  2),
  ("SMSN",  "Samsung Electronics",         "Korea",        "HBM memory, local line",  "tech",        "em", 5,  2),
  ("DRAM",  "Memory and storage ETF",      "Korea",        "Memory cycle",            "tech",        "em", 20, 2),
  ("IAU",   "iShares Gold Trust",          "Metals",       "Gold",                    "energy",      "g7", 50, 0),
  ("CPER",  "US Copper Index Fund",        "Commodities",  "Copper, electrification", "energy",      "g7", 60, 2),
  ("PDBC",  "Optimum Yield Diversified Commodity", "Commodities", "Broad commodity basket", "energy", "g7", 60, 1),
  ("DBMF",  "Managed Futures Strategy",    "Alternatives", "Managed futures",         "financials",  "g7", 70, 1),
  ("IEF",   "iShares 7-10 Year Treasury",  "Alternatives", "Intermediate treasuries", "financials",  "g7", 100, 0),
  ("MSFT",  "Microsoft",                   "Anchor",       "Hyperscaler anchor",      "tech",        "g7", 100, 1),

  # --- European, Swiss, UK and Japanese lines, quoted in their own currency.
  #     These close the gap where a developed-market room wanting out of the
  #     dollar had nothing to buy in equities.
  ("NOVN",  "Novartis",                    "Healthcare",   "Swiss pharma, CHF",       "healthcare",  "g7", 5,  0),
  ("AZN",   "AstraZeneca",                 "Healthcare",   "UK pharma, GBP",          "healthcare",  "g7", 5,  1),
  ("NESN",  "Nestle",                      "Consumer",     "Swiss staples, CHF",      "consumer",    "g7", 5,  0),
  ("ULVR",  "Unilever",                    "Consumer",     "UK staples, GBP",         "consumer",    "g7", 5,  0),
  ("MC",    "LVMH",                        "Consumer",     "European luxury, EUR",    "consumer",    "g7", 5,  1),
  ("7203",  "Toyota Motor",                "Consumer",     "Japanese autos, JPY",     "consumer",    "g7", 5,  1),
  ("ASML",  "ASML Holding",                "Compute",      "Lithography, EUR",        "tech",        "g7", 5,  2),
  ("SAP",   "SAP SE",                      "Compute",      "Enterprise software, EUR","tech",        "g7", 5,  1),
  ("SHEL",  "Shell",                       "Power",        "Integrated oil, GBP",     "energy",      "g7", 5,  1),

  # --- US healthcare and consumer, so the sectors are covered in dollars too.
  ("LLY",   "Eli Lilly",                   "Healthcare",   "US pharma",               "healthcare",  "g7", 100, 2),
  ("UNH",   "UnitedHealth Group",          "Healthcare",   "Managed care",            "healthcare",  "g7", 100, 1),
  ("PG",    "Procter & Gamble",            "Consumer",     "US staples",              "consumer",    "g7", 100, 0),
  ("COST",  "Costco Wholesale",            "Consumer",     "US retail",               "consumer",    "g7", 100, 1),
]
SECTORS = ["tech", "financials", "healthcare", "energy", "consumer", "industrials"]

# Live prices pulled from TradingView on the asOf date. Samsung's local
# Korean line is deliberately absent rather than guessed at.
EQ_PRICE = {
  "TSM": 448.68, "NVDA": 223.80, "AVGO": 349.64, "GLW": 154.19, "CEG": 262.19,
  "EQIX": 1039.40, "GEV": 951.78, "ETN": 436.64, "EWY": 182.47, "IAU": 80.26,
  "CPER": 40.62, "PDBC": 19.71, "DBMF": 32.64, "IEF": 89.94, "MSFT": 496.39,
  # Local-currency lines: the price is in the listing's own currency, not USD.
  "NOVN": 118.96, "AZN": 12400.0, "NESN": 77.94, "ULVR": 4708.50, "MC": 397.10,
  "7203": 2969.0, "ASML": 1503.20, "SAP": 184.18, "SHEL": 3641.0,
  "LLY": 1190.24, "UNH": 374.19, "PG": 147.47, "COST": 899.32,
}
EQ_CCY = {
  "NOVN": "CHF", "NESN": "CHF", "AZN": "GBp", "ULVR": "GBp", "SHEL": "GBp",
  "MC": "EUR", "ASML": "EUR", "SAP": "EUR", "7203": "JPY", "SMSN": "KRW",
}

def build_equities():
    out = []
    for (tk, name, sleeve, role, sec, reg, usdx, risk) in EQ:
        out.append({
            "id": slug(tk, 12), "ticker": tk, "name": name,
            "data": ({"price": EQ_PRICE[tk], "currency": EQ_CCY.get(tk, "USD")}
                     if tk in EQ_PRICE else {}),
            "sleeve": sleeve, "role": role, "sector": sec, "region": reg,
            "usdExposure": usdx, "riskBand": risk, "note": f"{sleeve} · {role}",
            "fit": {
                "sector": {s: (1.0 if s == sec else 0.2) for s in SECTORS},
                "country": {"g7": 1.0 if reg == "g7" else 0.25, "em": 1.0 if reg == "em" else 0.25},
                "riskProfile": {"target": risk},
                "usd": {"target": usdx},
                "capitalIncome": ({"capital": 1.0, "income": 0.35} if sleeve in ("Compute", "Korea", "Anchor")
                                  else {"capital": 0.8, "income": 0.7}),
            },
        })
    return out

# ---------------------------------------------------------------- main
def main():
    fx    = build_fx(os.path.join(SRC, "FX_Assets.xlsx"))
    notes = build_notes(os.path.join(SRC, "next gen picks.xlsx"))
    bonds = build_bonds(os.path.join(SRC, "Securities-2026-09-24.xlsx")) + build_non_usd()
    eq    = build_equities()

    doc = {
        "$note": ("Built by tools/build_products.py from the desk's own source files. "
                  "Instrument facts only: no client-identifying material is carried over."),
        "asOf": "2026-09-24",
        "source": "Safra desk product files",
        "version": 4,

        "equities": {"shelf": eq, "selection": {
            "weights": {"riskProfile": 1.2, "sector": 1.0, "country": 1.0,
                        "usd": 1.0, "capitalIncome": 0.9},
            "topN": 6}},

        "fixedIncome": {"shelf": bonds, "selection": {
            "weights": {"credit": 1.2, "duration": 1.1, "usd": 1.0,
                        "country": 0.8, "capitalIncome": 0.7},
            "topN": 5}},

        "notes": {"shelf": notes,
            "$rule": "At least 50% of the notes allocation sits in index-linked structures.",
            "selection": {
                "weights": {"riskProfile": 1.3, "horizon": 1.0, "country": 0.9,
                            "capitalIncome": 0.8, "sector": 0.8},
                "topN": 4, "indexFloor": 0.5}},

        "fx": {"shelf": fx, "selection": {
            "weights": {"usd": 1.4, "riskProfile": 1.1, "country": 1.0,
                        "leverage": 0.8, "horizon": 0.6},
            "topN": 3}},
    }

    # drop null fits so the scorer never sees an empty axis
    for bucket in ("equities", "fixedIncome", "notes", "fx"):
        for item in doc[bucket]["shelf"]:
            item["fit"] = {k: v for k, v in item["fit"].items() if v}

    # Ids address a holding when weights are looked up, so a collision would
    # silently merge two instruments. Two bonds from one issuer can slug the
    # same way once punctuation is stripped (A and A- both become "a").
    seen = {}
    for bucket in ("equities", "fixedIncome", "notes", "fx"):
        for item in doc[bucket]["shelf"]:
            base = item["id"]
            if base in seen:
                seen[base] += 1
                item["id"] = f"{base}-{seen[base]}"
            else:
                seen[base] = 1
    assert len({i["id"] for b in doc if isinstance(doc.get(b), dict) and "shelf" in doc[b]
                for i in doc[b]["shelf"]}) == sum(
                len(doc[b]["shelf"]) for b in doc if isinstance(doc.get(b), dict) and "shelf" in doc[b]), "id collision"


    with open(OUT, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")

    for b in ("equities", "fixedIncome", "notes", "fx"):
        print(f"  {b:14} {len(doc[b]['shelf']):>3} instruments")

if __name__ == "__main__":
    main()
