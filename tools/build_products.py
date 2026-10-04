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
    """Spreadsheet cells arrive as numbers OR as strings like "2" or "11.5%".
    The earlier version only accepted the former and silently returned the
    default for the latter, which collapsed every note tenor to 3 years."""
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r"-?\d+(?:\.\d+)?", str(v or ""))
    return float(m.group()) if m else default

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

# Year-to-date move of each pair, from TradingView on the asOf date.
FX_YTD = {"XAUUSD": -1.26, "USDJPY": 1.35, "EURUSD": -3.23,
          "USDBRL": -5.28, "USDMXN": -1.71}

def _fx_ytd(name, kind):
    """Signed return of holding the position, or None when it cannot be
    read off the pair. An option's payoff is not linear in the underlying,
    so those are excluded from the backtest rather than approximated."""
    if kind in ("option", "option structure"):
        return None, None
    m = re.search(r"([A-Z]{3})/([A-Z]{3})", str(name).upper())
    if not m:
        return None, None
    pair = m.group(1) + m.group(2)
    if pair not in FX_YTD:
        return None, None
    move = FX_YTD[pair]
    short = str(name).upper().startswith("SHORT")
    return (-move if short else move), pair

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
        kind = _fx_kind(name)
        ytd, pair = _fx_ytd(name, kind)
        out.append({
            "id": slug(name), "ticker": _fx_ticker(name, kind),
            "name": str(name).title(),
            "kind": kind, "note": _fx_note(name), "fit": fit,
            "group": (pair or slug(name, 12)),
            "data": ({"ytd": ytd, "pair": pair} if ytd is not None
                     else {"ytdExcluded": "option payoff is not linear in the pair"}),
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

# The desk marks its preferred notes by highlighting the row. That
# highlight is the source of truth for the core allocation, not anything
# inferred from the underlying, so it is read off the cell fill.
PROTECTED = re.compile(r"protect", re.I)
HIGHLIGHT = "FFFFFF00"

def row_is_highlighted(ws, r):
    for c in range(2, 13):
        f = ws.cell(r, c).fill
        if f and f.fill_type == "solid":
            rgb = getattr(f.start_color, "rgb", None)
            if rgb and str(rgb).upper() == HIGHLIGHT:
                return True
    return False

def build_notes(path):
    # Values and styles need separate loads: data_only drops the fills.
    ws = openpyxl.load_workbook(path, data_only=True)["Sheet1"]
    ws_style = openpyxl.load_workbook(path)["Sheet1"]
    out = []
    for r in range(3, ws.max_row + 1):
        under = ws.cell(r, 3).value
        if not under:
            continue
        typ = str(ws.cell(r, 4).value or "").strip()
        typ_full = NOTE_TYPE.get(typ, typ)
        tenor = str(ws.cell(r, 5).value or "").strip()
        barrier = str(ws.cell(r, 6).value or "").strip()
        coupon = ws.cell(r, 7).value
        risk = num(ws.cell(r, 9).value, 2)          # 1..3
        sector = str(ws.cell(r, 10).value or "").strip()
        capinc = str(ws.cell(r, 11).value or "income").strip().lower()
        country = str(ws.cell(r, 12).value or "US").strip().lower()

        yrs = num(tenor, 3) or 3
        sec = NOTE_SECTOR.get(sector, None)

        # A note's risk is not the desk's 1-3 band alone. Two autocalls can
        # share a band and be very different trades: a 50% barrier on three
        # indices is not a 70% barrier on one semiconductor name. Barrier
        # depth, coupon and how concentrated the basket is all move it, so
        # they are read off the term sheet rather than rounded away. Without
        # this the 26 notes collapsed into three score classes and the room's
        # answers could not move the book off the same six lines.
        barr = num(barrier.split("/")[-1], None)     # protection leg
        cpn = num(coupon, None)
        names = len(str(under).split())
        risk_c = (risk - 1)                               # 0..2 from the desk
        if barr:
            risk_c += (barr - 55) / 90.0                  # 70/70 riskier than 50/50
        if cpn:
            risk_c += (cpn - 10) / 45.0                   # the coupon prices the risk
        if PROTECTED.search(typ_full):
            risk_c -= 0.75                                # principal back at maturity
        risk_c += 0.18 if names <= 1 else (-0.22 if names >= 3 else 0)
        risk_c = max(0.0, min(2.0, risk_c))

        fit = {
            "riskProfile": {"target": round(risk_c, 2)},
            "horizon": {"target": max(1, round(yrs))},
            "capitalIncome": ({"capital": 1.0, "income": 0.3} if capinc == "capital"
                              else {"income": 1.0, "capital": 0.4}),
            "country": ({"em": 1.0, "g7": 0.3} if country == "em" else {"g7": 1.0, "em": 0.3}),
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
            "group": slug(str(under) + "-" + typ, 26),
            "isCore": row_is_highlighted(ws_style, r),
            "data": {"ytdExcluded": "a structured note has no public price history"},
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

# Individual bonds have no price history in the feed, so the backtest uses
# a matched ETF as a stand-in. The pairing is on currency and credit, and
# is shown on the validation page so the approximation is visible.
BOND_PROXY = {
    ("USD", "ig"):  ("LQD",  -6.24, "USD investment grade"),
    ("USD", "hy"):  ("HYG",  -3.45, "USD high yield"),
    ("EUR", "ig"):  ("IGOV", -3.84, "unhedged international sovereign"),
    ("EUR", "hy"):  ("IGOV", -3.84, "unhedged international sovereign"),
    ("GBP", "ig"):  ("IGOV", -3.84, "unhedged international sovereign"),
    ("GBP", "hy"):  ("IGOV", -3.84, "unhedged international sovereign"),
}
BOND_PROXY_EM = ("EMB", -4.28, "USD emerging market sovereign")

# The export carries a full composite rating for every line, and the earlier
# build threw all of it away, scoring 39 bonds on a single IG/HY flag. That
# left four-deep ties at identical scores, so the order fell through to the
# sheet and the same issuers came up every time. A rating ladder restores the
# resolution that was already in the data.
RATING_LADDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-",
                 "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "D"]
IG_FLOOR = 9  # BBB-

def _notch(rating):
    r = re.sub(r"[^A-Za-z+-]", "", str(rating or "")).upper()
    return RATING_LADDER.index(r) if r in RATING_LADDER else None

def _credit_fit(ighy, notch):
    if notch is None:
        return {"ig": 1.0 if ighy == "ig" else 0.25, "hy": 1.0 if ighy == "hy" else 0.3}
    if notch <= IG_FLOOR:                       # investment grade
        deep = (IG_FLOOR - notch) / float(IG_FLOOR)   # 1.0 at AAA, 0 at BBB-
        return {"ig": round(0.72 + 0.28 * deep, 3),
                "hy": round(max(0.15, 0.45 - 0.30 * deep), 3)}
    over = min(1.0, (notch - IG_FLOOR) / 6.0)   # 0 just below IG, 1 deep in HY
    return {"hy": round(1.0 - 0.25 * max(0.0, over - 0.5) * 2, 3),
            "ig": round(max(0.12, 0.42 - 0.30 * over), 3)}

def _bond_risk(notch, ighy, rank, ytw):
    """0..2 on the same scale the room answers risk on."""
    if notch is None:
        base = 1.4 if ighy == "hy" else 0.5
    else:
        base = notch / 8.0                      # AAA 0, BBB- ~1.1, B ~1.8
    if re.search(r"sub|junior|tier|perp", str(rank or ""), re.I):
        base += 0.3                             # subordinated ranks behind
    if ytw:
        base += max(-0.2, min(0.4, (ytw - 5.0) / 12.0))
    return round(max(0.0, min(2.0, base)), 2)

def _bond(issuer, ccy, ighy, ytw, mdur, coupon, rank, rating, sector, country, em, isin="", source=""):
    usd_exposure = 100 if ccy == "USD" else 5
    if em and ccy == "USD":
        proxy = BOND_PROXY_EM
    else:
        proxy = BOND_PROXY.get((ccy, ighy), ("LQD", -6.24, "USD investment grade"))
    return {
        "id": slug(f"{issuer}-{ccy}-{rating}", 34),
        # Bonds have no ticker; show a short issuer code plus the currency so
        # two lines from the same issuer stay distinguishable.
        "ticker": (re.sub(r"[^A-Za-z]", "", issuer)[:4].upper() + "." + ccy),
        "name": issuer, "isin": isin,
        "currency": ccy, "credit": ighy, "rating": rating, "rank": rank,
        "sector": sector, "country": country, "usdExposure": usd_exposure,
        "group": slug(issuer, 20) + "-" + ccy,
        "source": source,
        "data": {"ytw": ytw, "duration": mdur, "coupon": coupon,
                 "ytd": proxy[1], "ytdProxy": proxy[0], "ytdProxyNote": proxy[2]},
        "note": f"{rating or ighy.upper()} · {rank or 'Sr Unsecured'} · {country}",
        "fit": {
            # Graded off the rating rather than the IG/HY flag: a room asking
            # for investment grade should prefer AA to BBB-, and one asking
            # for yield should prefer BB to CCC rather than treating every
            # sub-IG line as interchangeable.
            "credit": _credit_fit(ighy, _notch(rating)),
            # Without this the room's risk answer did not reach the bond
            # sleeve at all: every room got the same bonds for a given
            # currency and credit flag.
            "riskProfile": {"target": _bond_risk(_notch(rating), ighy, rank, ytw)},
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
# Equities are ETFs only: no single names. Each line is a large, liquid,
# low-fee fund, chosen so the six sectors, both regions, the currency
# spectrum and the defensive-to-aggressive range are all reachable.
#
# ytd / perf1y / beta / vol / fee are a TradingView snapshot on the asOf
# date. ytd is a PRICE return: it excludes dividends.
EQ = [
  # ticker, exch, name, sleeve, sector, region, usdExp, risk, price, ytd, perf1y, beta, vol, fee
  ("IVV",  "AMEX", "iShares Core S&P 500",              "Core",       "core",        "g7", 100, 1, 770.69, 11.90, 15.42, 1.018, 0.66, 0.03),
  ("USMV", "CBOE", "iShares MSCI USA Min Volatility",   "Defensive",  "core",        "g7", 100, 0,  98.45,  4.37,  4.61, 0.398, 0.60, 0.15),
  ("SCHD", "AMEX", "Schwab US Dividend Equity",         "Income",     "core",        "g7", 100, 0,  33.17, 20.60, 22.04, 0.260, 0.77, 0.06),
  ("VYM",  "AMEX", "Vanguard High Dividend Yield",      "Income",     "core",        "g7", 100, 0, 157.05,  9.05, 11.60, 0.552, 0.66, 0.04),
  ("XLK",  "AMEX", "Technology Select Sector SPDR",     "Sector",     "tech",        "g7", 100, 2, 194.39, 33.48, 38.37, 1.690, 1.31, 0.08),
  ("XLF",  "AMEX", "Financial Select Sector SPDR",      "Sector",     "financials",  "g7", 100, 1,  54.47, -0.65,  1.19, 0.665, 1.17, 0.08),
  ("XLV",  "AMEX", "Health Care Select Sector SPDR",    "Sector",     "healthcare",  "g7", 100, 0, 170.14,  9.86, 24.35, 0.187, 1.13, 0.08),
  ("XLE",  "AMEX", "Energy Select Sector SPDR",         "Sector",     "energy",      "g7", 100, 2,  62.69, 40.17, 39.59, -0.786, 1.81, 0.08),
  ("XLP",  "AMEX", "Consumer Staples Select Sector SPDR","Defensive", "consumer",    "g7", 100, 0,  82.18,  5.75,  4.92, 0.082, 0.81, 0.08),
  ("XLY",  "AMEX", "Consumer Discretionary Select SPDR","Sector",     "consumer",    "g7", 100, 2, 110.50, -7.98, -7.53, 1.270, 1.09, 0.08),
  ("XLI",  "AMEX", "Industrial Select Sector SPDR",     "Sector",     "industrials", "g7", 100, 1, 168.99,  8.59, 10.18, 0.703, 1.19, 0.08),
  ("IXJ",  "AMEX", "iShares Global Healthcare",         "Sector",     "healthcare",  "g7",  60, 0, 103.55,  6.16, 18.56, 0.275, 0.95, 0.38),
  ("IXN",  "AMEX", "iShares Global Tech",               "Sector",     "tech",        "g7",  70, 2, 146.96, 38.03, 43.32, 1.740, 1.30, 0.37),
  ("VGK",  "AMEX", "Vanguard FTSE Europe",              "Non-USD",    "core",        "g7",   5, 1,  88.08,  4.34, 11.58, 0.864, 0.77, 0.06),
  ("EWJ",  "AMEX", "iShares MSCI Japan",                "Non-USD",    "core",        "g7",   5, 1,  95.70, 17.41, 17.96, 1.055, 0.99, 0.49),
  ("EWU",  "AMEX", "iShares MSCI United Kingdom",       "Non-USD",    "core",        "g7",   5, 0,  47.16,  6.13, 14.04, 0.538, 0.73, 0.50),
  ("EFA",  "AMEX", "iShares MSCI EAFE",                 "Non-USD",    "core",        "g7",  15, 1, 104.50,  7.70, 12.74, 0.868, 0.76, 0.32),
  ("EEM",  "AMEX", "iShares MSCI Emerging Markets",     "EM",         "core",        "em",  20, 2,  67.22, 20.26, 26.20, 1.292, 1.01, 0.72),
  ("EWZ",  "AMEX", "iShares MSCI Brazil",               "EM",         "core",        "em",   5, 2,  36.98, 14.49, 18.74, 0.540, 1.95, 0.59),
  ("EWY",  "AMEX", "iShares MSCI South Korea",          "EM",         "tech",        "em",   5, 2, 182.34, 80.53,126.31, 2.437, 2.21, 0.59),
  ("FXI",  "BATS", "iShares China Large-Cap",           "EM",         "core",        "em",  10, 2,  34.22,-13.27,-15.64, 0.737, 0.78, 0.74),
  ("IAU",  "AMEX", "iShares Gold Trust",                "Real asset", "energy",      "g7",  50, 1,  80.31, -2.36, 13.11, 0.774, 1.35, 0.25),

  # --- Semiconductors, broader tech and the high-volatility end. These are
  #     the lines a risk-seeking room should be able to reach; SOXX and XBI
  #     carry the highest beta and volatility on the shelf.
  ("SOXX", "NASDAQ","iShares Semiconductor",            "Semis",      "tech",        "g7", 100, 2, 565.12, 83.15,110.28, 2.197, 2.20, 0.33),
  ("SMH",  "NASDAQ","VanEck Semiconductor",             "Semis",      "tech",        "g7", 100, 2, 599.90, 62.60, 86.66, 2.013, 1.98, 0.35),
  ("QQQ",  "NASDAQ","Invesco QQQ Trust",                "Growth",     "tech",        "g7", 100, 2, 741.66, 19.61, 23.70, 1.409, 1.01, 0.18),
  ("VGT",  "AMEX", "Vanguard Information Technology",   "Growth",     "tech",        "g7", 100, 2, 125.33, 31.59, 34.24, 1.614, 1.26, 0.09),
  ("IGV",  "CBOE", "iShares Expanded Tech-Software",    "Growth",     "tech",        "g7", 100, 2, 107.67,  1.11, -7.80, 1.470, 2.29, 0.38),
  ("ARKK", "CBOE", "ARK Innovation",                    "High beta",  "tech",        "g7", 100, 2,  91.49, 17.08,  8.46, 2.020, 2.19, 0.75),
  ("XBI",  "AMEX", "SPDR S&P Biotech",                  "High beta",  "healthcare",  "g7", 100, 2, 156.75, 28.20, 61.16, 0.970, 2.35, 0.35),
  ("XLU",  "AMEX", "Utilities Select Sector SPDR",      "Defensive",  "energy",      "g7", 100, 0,  39.48, -7.95, -7.97, -0.100, 1.31, 0.08),

  # Added from the desk's blended list (NexGen vectors EQ alloc securities).
  # Prices and performance read live from TradingView on 2026-09-30.
  ("SPY",  "AMEX", "SPDR S&P 500 ETF Trust",            "Core",       "core",        "g7", 100, 1, 767.02, 11.86, 15.70, 1.011, 0.68, 0.09),
  ("VT",   "AMEX", "Vanguard Total World Stock",        "Core",       "core",        "g7",  60, 1, 158.49, 11.41, 15.48, 1.004, 0.49, 0.06),
  ("QUAL", "CBOE", "iShares MSCI USA Quality Factor",   "Core",       "core",        "g7", 100, 1, 223.63, 11.88, 15.84, 0.870, 0.51, 0.15),
  ("IEMG", "AMEX", "iShares Core MSCI Emerging Markets","Regional",   "core",        "em",  20, 2,  81.10, 18.18, 23.08, 1.282, 1.08, 0.09),
  ("ITA",  "CBOE", "iShares U.S. Aerospace & Defense",  "Sector",     "industrials", "g7", 100, 2, 208.36, -3.32,  1.38, 1.062, 1.44, 0.37),
  ("PICK", "CBOE", "iShares Global Metals & Mining",    "Sector",     "energy",      "g7",  35, 2,  60.25, 15.31, 35.00, 1.431, 2.28, 0.39),
  ("DBC",  "AMEX", "Invesco DB Commodity Index",        "Real asset", "energy",      "g7",  50, 2,  32.43, 44.84, 44.13, -0.322, 1.90, 0.84),
  ("IALT", "NASDAQ","iShares Systematic Alternatives",  "Real asset", "core",        "g7", 100, 1,  29.87, 17.60, 18.86, 0.036, 0.61, 0.99),
]
SECTORS = ["tech", "financials", "healthcare", "energy", "consumer", "industrials"]

# Scoring a sector fund as 1.0 for its own sector and 0.2 for every other one
# says energy and utilities are equally wrong for a room that asked for
# healthcare. They are not, and the flat 0.2 left thirteen funds tied on the
# same score, so the order fell through to the ticker and the same names came
# up every time. These are rough economic adjacencies, not a factor model:
# enough to rank the near-misses ahead of the unrelated.
SECTOR_NEAR = {
  "tech":        {"tech": 1.0, "industrials": .35, "consumer": .30, "healthcare": .22, "financials": .20, "energy": .10},
  "financials":  {"financials": 1.0, "industrials": .32, "energy": .26, "consumer": .22, "tech": .20, "healthcare": .15},
  "healthcare":  {"healthcare": 1.0, "consumer": .34, "tech": .24, "industrials": .16, "financials": .15, "energy": .10},
  "energy":      {"energy": 1.0, "industrials": .40, "financials": .26, "consumer": .16, "tech": .10, "healthcare": .10},
  "consumer":    {"consumer": 1.0, "healthcare": .32, "industrials": .30, "tech": .28, "financials": .20, "energy": .15},
  "industrials": {"industrials": 1.0, "energy": .40, "tech": .34, "financials": .30, "consumer": .30, "healthcare": .16},
}

# Two funds in the same group hold substantially the same thing. Selection
# treats them as substitutes so a sleeve does not end up as five versions
# of one exposure.
EQ_GROUP = {
  "IVV": "us-core", "USMV": "us-lowvol", "SCHD": "us-dividend", "VYM": "us-dividend",
  "XLK": "us-tech-large", "IXN": "us-tech-large", "VGT": "us-tech-large", "QQQ": "us-tech-large",
  "SOXX": "semis", "SMH": "semis", "IGV": "us-software", "ARKK": "thematic-growth",
  "XLF": "financials", "XLV": "healthcare", "IXJ": "healthcare", "XBI": "biotech",
  "XLE": "energy", "XLU": "utilities", "XLP": "staples", "XLY": "discretionary",
  "XLI": "industrials", "VGK": "europe", "EWJ": "japan", "EWU": "uk",
  "EFA": "dev-intl", "EEM": "em-broad", "EWZ": "brazil", "EWY": "korea",
  "FXI": "china", "IAU": "gold",
  # SPY and IVV are the same index, IEMG and EEM the same market: grouping
  # them keeps the sleeve from buying one exposure twice.
  "SPY": "us-core", "VT": "world-core", "QUAL": "us-quality",
  "IEMG": "em-broad", "ITA": "aerospace-defence", "PICK": "metals-mining",
  "DBC": "commodities", "IALT": "liquid-alts",
}

# Live prices pulled from TradingView on the asOf date. Samsung's local
# Korean line is deliberately absent rather than guessed at.
def build_equities():
    out = []
    for (tk, ex, name, sleeve, sec, reg, usdx, risk, px, ytd, p1y, beta, vol, fee) in EQ:
        sfit = ({s: 0.5 for s in SECTORS} if sec == "core"
                else SECTOR_NEAR.get(sec, {s: (1.0 if s == sec else 0.2) for s in SECTORS}))

        # The desk's 0/1/2 band is only three values across thirty funds, so
        # most of the shelf scored identically on risk. The feed already
        # carries each fund's beta and realised volatility; blend them with
        # the band so the axis can actually separate USMV from ARKK instead
        # of calling both "2".
        derived = 0.62 * num(beta, 1.0) + 0.38 * ((num(vol, 1.2) - 0.8) / 0.8)
        risk_c = max(0.0, min(2.0, 0.45 * risk + 0.55 * derived))
        out.append({
            "id": slug(tk, 12), "ticker": tk, "exchange": ex, "name": name,
            "sleeve": sleeve, "sector": sec, "region": reg,
            "group": EQ_GROUP.get(tk, "eq-" + tk.lower()),
            "usdExposure": usdx, "riskBand": risk, "note": sleeve,
            "data": {"price": px, "currency": "USD", "ytd": ytd, "perf1y": p1y,
                     "beta1y": beta, "volatility": vol, "expenseRatio": fee},
            "fit": {
                "sector": sfit,
                "country": {"g7": 1.0 if reg == "g7" else 0.25,
                            "em": 1.0 if reg == "em" else 0.25},
                "riskProfile": {"target": round(risk_c, 2)},
                "usd": {"target": usdx},
                "capitalIncome": ({"income": 1.0, "capital": 0.45} if sleeve == "Income"
                                  else {"capital": 1.0, "income": 0.5}),
            },
        })
    return out

# ------------------------------------------------- fixed income portfolios
#
# The desk does not want the fixed income sleeve assembled bond by bond any
# more. It has built five finished books, and the room's answers choose
# between them rather than picking lines out of a universe.
#
# The five order themselves cleanly by yield to worst, which is the market's
# own pricing of their risk, and that ordering is what the five risk bands
# map onto:
#
#   Conservative            DM Short    YTW 5.36%  dur 3.40  developed, all IG
#   Conservative-Moderate   EM Short    YTW 5.75%  dur 2.83  emerging, short
#   Moderate                Balanced    YTW 6.39%  dur 5.19  both, mid
#   Moderate-Aggressive     DM Long     YTW 6.89%  dur 6.86  developed, long
#   Aggressive              EM Long     YTW 8.16%  dur 6.41  emerging, long
#
# Every characteristic below is computed from the holdings themselves, not
# asserted: region from each bond's country of risk, credit from the IG/HY
# flag, duration and yield weighted by position. If the desk swaps a bond,
# the fit moves with it.
FI_BOOKS = [
    # (sheet block, display name, risk band 0-4)
    ("DM Short Duration", "Developed Markets · Short Duration", 0),
    ("EM Short Duration", "Emerging Markets · Short Duration", 1),
    ("Balanced",          "Balanced",                           2),
    ("DM Long Duration",  "Developed Markets · Long Duration",  3),
    ("EM Long Duration",  "Emerging Markets · Long Duration",   4),
]

# The workbook writes two of the block headers with a typo.
FI_BLOCK_ALIAS = {"DM Long Duration": "DM Long Durantion",
                  "EM Long Duration": "EM Long Durantion"}

DM_COUNTRIES = {"US", "GB", "FR", "DE", "NL", "ES", "IT", "JP", "AU", "CA",
                "CH", "SE", "NO", "DK", "FI", "BE", "AT", "IE", "NZ", "SG"}

def _risk01_bond(l):
    """0-1 risk proxy on the same scale every other product uses."""
    r = _bond_risk(_notch(l.get("rating")), l.get("credit"),
                   l.get("rank"), l.get("ytw"))
    return round(max(0.0, min(1.0, r / 2.0)), 4)

def build_fi_books(path):
    ws = openpyxl.load_workbook(path, data_only=True)["Securities"]
    hdr = {ws.cell(3, c).value: c for c in range(1, ws.max_column + 1)
           if ws.cell(3, c).value}

    # find each block by its header row
    starts = {}
    for r in range(1, ws.max_row + 1):
        a, b = ws.cell(r, 1).value, ws.cell(r, 2).value
        if a and not b and str(a).strip() != "ISIN":
            starts[str(a).strip()] = r
    ordered = sorted(starts.items(), key=lambda kv: kv[1])

    books = []
    for block, label, band in FI_BOOKS:
        key = FI_BLOCK_ALIAS.get(block, block)
        if key not in starts:
            print(f"  ! fixed income: block '{key}' not in the workbook; skipped")
            continue
        r0 = starts[key]
        after = [rr for _, rr in ordered if rr > r0]
        r1 = min(after) if after else ws.max_row + 1

        lines = []
        for rr in range(r0 + 2, r1):
            if not ws.cell(rr, 1).value:
                continue
            g = lambda k: ws.cell(rr, hdr[k]).value if k in hdr else None
            ctry = str(g("Country of Risk") or "").upper()
            lines.append({
                "isin": str(g("ISIN") or ""),
                "ticker": str(g("Ticker") or ""),
                "name": str(g("Security") or ""),
                "maturity": str(g("Maturity") or "")[:10],
                "ytw": num(g("Ask YTW")), "duration": num(g("Ask MDur")),
                "coupon": num(g("Coupon %")),
                "rating": str(g("BBG Composite Rating") or g("Rating") or "") or None,
                "credit": "hy" if str(g("Bloomberg HY or IG") or "").upper() == "HY" else "ig",
                "rank": str(g("Payment Rank") or ""),
                "currency": str(g("Crncy") or "USD"),
                "sector": str(g("Industry Sector") or ""),
                "country": ctry,
                "region": "g7" if ctry in DM_COUNTRIES else "em",
            })
        if not lines:
            continue

        # Equal weighted, which is how the desk's own sheets size them.
        w = round(100.0 / len(lines), 4)
        for l in lines:
            l["weight"] = w
            # A holding inside a book is still a product, and everything
            # downstream — the validator's integrity check, the weighted
            # duration and credit figures, the presenter — reads it as one.
            # Without an id and an analytics block it is an unidentified line
            # carrying no characteristics, which is exactly what the
            # validation layer flagged.
            l["id"] = slug((l["isin"] or (l["ticker"] + "-" + l["maturity"])), 34)
            l["usdExposure"] = 100 if (l["currency"] or "USD").upper() == "USD" else 5
            l["analytics"] = {
                "sleeve": "fixedIncome",
                "region": l["region"],
                "sector": None,            # Bloomberg industry, not a questionnaire sector
                "riskScore": _risk01_bond(l),
                "expressesLeverage": False,
                "incomeProducing": True,
                "usdExposure": l["usdExposure"],
                "duration": l["duration"],
                "creditClass": l["credit"],
                "rating": l["rating"],
                "yieldToWorst": l["ytw"],
            }

        def wavg(k):
            vals = [(l[k], l["weight"]) for l in lines if l.get(k) is not None]
            return round(sum(v * x for v, x in vals) / sum(x for _, x in vals), 3) if vals else None

        em = round(sum(l["weight"] for l in lines if l["region"] == "em"), 2)
        hy = round(sum(l["weight"] for l in lines if l["credit"] == "hy"), 2)
        dur = wavg("duration")

        books.append({
            "id": slug(block, 24),
            "name": label,
            "riskBand": band,
            "holdings": lines,
            "stats": {"count": len(lines), "ytw": wavg("ytw"), "duration": dur,
                      "coupon": wavg("coupon"), "emWeight": em, "hyWeight": hy,
                      "igWeight": round(100 - hy, 2)},
            # Scored by the same machinery as every other sleeve, so the book
            # the room gets is chosen the same way its products are.
            "fit": {
                "riskProfile": {"target": round(band / 2.0, 3)},
                "country": {"em": round(0.15 + 0.85 * (em / 100.0), 3),
                            "g7": round(0.15 + 0.85 * (1 - em / 100.0), 3)},
                "duration": {"target": dur},
                "credit": {"hy": round(0.15 + 0.85 * (hy / 100.0), 3),
                           "ig": round(0.15 + 0.85 * (1 - hy / 100.0), 3)},
            },
        })
    return books

# ---------------------------------------------------------------- options
#
# The desk marked six names on the blended list as option-eligible and gave
# a moneyness for each of four structures. Moneyness is quoted against spot:
# a 0.95 long call is struck 5% below the market, a 1.04 covered call 4%
# above it. Those numbers are the desk's, not this file's.
#
# Options are how the book expresses leverage and how it manufactures income,
# which is why the fits below key off the leverage answer, the market view
# and the capital-or-income answer rather than off sector alone.
OPT_UNDERLYING = {
  # ticker: (long call 120d, covered call 30d, short put 30d, long put 120d)
  "SPY":  (0.95, 1.04, 0.91, 0.95),
  "QQQ":  (0.95, 1.04, 0.91, 0.95),
  "EWZ":  (0.94, 1.07, 0.85, 0.92),
  "XLF":  (0.94, 1.07, 0.85, 0.92),
  "SMH":  (0.94, 1.07, 0.85, 0.92),
  "XLE":  (0.94, 1.07, 0.85, 0.92),
}

OPT_STRATEGY = [
  # key, label, tenor, index into the moneyness tuple, what it is for
  ("lc", "Long call",   "120d", 0, "gearing without margin"),
  ("cc", "Covered call", "30d", 1, "sells upside for premium"),
  ("sp", "Short put",    "30d", 2, "paid to bid below the market"),
  ("lp", "Long put",    "120d", 3, "downside cover"),
]

# marketView is a 0-2 scale: 0 bearish, 1 neutral, 2 bullish. A long call
# wants a bullish room; a long put wants the opposite.
# A long call is the leveraged structure; a short put is an income trade that
# merely tolerates a leveraged room. The first cut had the long call punished
# so hard for a "no" (0.12) that any mixed room pushed it below the short put:
# at 67% of the room wanting leverage the call scored 0.71 and the put 0.78,
# so a bullish, leverage-seeking room was sold four short puts. The crossover
# now sits where it belongs, with the call ahead whenever most of the room
# wants gearing and the put ahead when it does not. The call can carry a hard
# penalty for "no" precisely because the put no longer competes for the
# leverage vote: a room that unanimously declines gearing must not be sold
# calls just because it is bullish.
OPT_FIT = {
  "lc": {"leverage": {"yes": 1.0, "no": 0.10}, "marketView": [0.10, 0.50, 1.0],
         "riskProfile": 1.80, "capitalIncome": {"capital": 1.0, "income": 0.20}},
  "cc": {"leverage": {"no": 1.0, "yes": 0.45}, "marketView": [0.50, 1.0, 0.60],
         "riskProfile": 0.70, "capitalIncome": {"income": 1.0, "capital": 0.25}},
  "sp": {"leverage": {"yes": 0.60, "no": 0.75}, "marketView": [0.15, 0.80, 1.0],
         "riskProfile": 1.35, "capitalIncome": {"income": 1.0, "capital": 0.35}},
  "lp": {"leverage": {"no": 1.0, "yes": 0.40}, "marketView": [1.0, 0.50, 0.15],
         "riskProfile": 0.50, "capitalIncome": {"capital": 0.70, "income": 0.35}},
}

# Live mid prices off the OPRA chains, read through TradingView on
# 2026-09-30 while the market was open. A premium is a snapshot, not a
# property of the instrument: these move every day and are here so the desk
# can see what the structures actually cost, not as a quote.
#
# Two things the chains settled that the spreadsheet could not:
#   - "120d" is not a listed expiry. Only SPY has one near it (2027-01-29,
#     121 days); the rest price off 2027-01-15, which is 107 days.
#   - the desk's moneyness does not always land on a listed strike, so the
#     nearest one is used and its true moneyness recorded alongside.
#
# ticker: {strategy: (expiry, days, strike, true moneyness, mid, % of spot, delta, iv)}
OPT_QUOTE = {
  "SPY": {"lc": ("2027-01-29", 121, 729.0, 0.950, 59.250, 7.721, 0.736, 16.3),
          "lp": ("2027-01-29", 121, 729.0, 0.950, 12.090, 1.576, -0.264, 16.3),
          "cc": ("2026-10-30",  30, 798.0, 1.040,  1.810, 0.236, 0.137, 11.9),
          "sp": ("2026-10-30",  30, 698.0, 0.910,  1.195, 0.156, -0.058, 21.6)},
  "QQQ": {"lc": ("2027-01-15", 107, 705.0, 0.949, 64.360, 8.660, 0.707, 21.4),
          "lp": ("2027-01-15", 107, 705.0, 0.949, 16.910, 2.275, -0.293, 21.4),
          "cc": ("2026-10-30",  30, 773.0, 1.040,  5.330, 0.717, 0.241, 18.0),
          "sp": ("2026-10-30",  30, 676.0, 0.910,  2.450, 0.330, -0.092, 26.0)},
  "EWZ": {"lc": ("2027-01-15", 107,  35.0, 0.936,  4.550, 12.172, 0.663, 42.5),
          "lp": ("2027-01-15", 107,  34.0, 0.910,  1.805, 4.829, -0.293, 42.7),
          "cc": ("2026-10-30",  30,  40.0, 1.070,  1.555, 4.160, 0.382, 59.2),
          "sp": ("2026-10-30",  30,  32.0, 0.856,  0.555, 1.485, -0.154, 58.9)},
  "XLF": {"lc": ("2027-01-15", 107,  50.0, 0.933,  4.750, 8.860, 0.786, 18.2),
          "lp": ("2027-01-15", 107,  49.0, 0.914,  0.535, 0.998, -0.171, 19.2),
          "cc": ("2026-10-30",  30,  57.5, 1.073,  0.120, 0.224, 0.090, 17.6),
          "sp": ("2026-10-30",  30,  45.0, 0.839,  0.050, 0.093, -0.026, 32.3)},
  "SMH": {"lc": ("2027-01-15", 107, 570.0, 0.937, 73.625, 12.097, 0.674, 36.5),
          "lp": ("2027-01-15", 107, 560.0, 0.920, 25.575, 4.202, -0.296, 36.9),
          "cc": ("2026-10-30",  30, 650.0, 1.068,  9.975, 1.639, 0.279, 34.8),
          "sp": ("2026-10-30",  30, 520.0, 0.854,  2.585, 0.425, -0.078, 41.0)},
  "XLE": {"lc": ("2027-01-15", 107,  57.5, 0.927,  6.375, 10.274, 0.740, 25.4),
          "lp": ("2027-01-15", 107,  57.5, 0.927,  1.440, 2.321, -0.260, 25.4),
          "cc": ("2026-10-30",  30,  66.0, 1.064,  0.555, 0.894, 0.218, 25.9),
          "sp": ("2026-10-30",  30,  53.0, 0.854,  0.080, 0.129, -0.035, 31.2)},
}
OPT_QUOTE_ASOF = "2026-09-30"

def build_options(equities):
    by_tk = {e["ticker"]: e for e in equities}
    out = []
    for tk, money in OPT_UNDERLYING.items():
        u = by_tk.get(tk)
        if not u:
            print(f"  ! options: {tk} is not on the equity shelf; skipped")
            continue
        for key, label, tenor, idx, purpose in OPT_STRATEGY:
            f = OPT_FIT[key]
            q = OPT_QUOTE.get(tk, {}).get(key)
            if q:
                expiry, days, strike, m, mid, pct, delta, iv = q
            else:
                m = money[idx]
                strike = round(u["data"]["price"] * m, 2)
                expiry = days = mid = pct = delta = iv = None
            out.append({
                "id": slug(f"{tk}-{key}-{tenor}", 24),
                "ticker": tk + " " + label.split()[0][0].upper() + label.split()[-1][0].upper(),
                "name": f"{label} on {tk}",
                "underlying": tk, "strategy": label, "tenor": tenor,
                "moneyness": m,
                "strike": strike,
                "expiry": expiry, "days": days,
                # what it costs, as a share of the underlying's own price:
                # the only figure that compares across a $37 ETF and a $767 one
                "premiumPct": pct, "premium": mid, "delta": delta, "iv": iv,
                "quoteAsOf": OPT_QUOTE_ASOF if q else None,
                # Inherited so a room that asked for technology gets its
                # gearing on QQQ or SMH rather than on energy.
                "sector": u.get("sector"), "region": u.get("region"),
                "group": "opt-" + tk.lower(),
                "note": (f"{days}d · {int(round(m * 100))}% of spot · "
                         f"{pct:.2f}% of notional · {purpose}") if q
                        else f"{tenor} · {int(round(m * 100))}% of spot · {purpose}",
                "data": {"underlyingPrice": u["data"]["price"], "strike": strike,
                         "premiumPct": pct, "iv": iv,
                         "ytdExcluded": "an option struck today has no year-to-date"},
                "fit": {
                    "leverage": f["leverage"],
                    "marketView": f["marketView"],
                    "riskProfile": {"target": f["riskProfile"]},
                    "capitalIncome": f["capitalIncome"],
                    "sector": u["fit"].get("sector"),
                    "country": u["fit"].get("country"),
                },
            })
    return out

# ---------------------------------------------------------------- main
def main():
    fx    = build_fx(os.path.join(SRC, "FX_Assets.xlsx"))
    notes = build_notes(os.path.join(SRC, "next gen picks.xlsx"))
    bonds = build_bonds(os.path.join(SRC, "Securities-2026-09-24.xlsx")) + build_non_usd()
    fi_books = build_fi_books(os.path.join(SRC, "FI Portfolio Securities NextGEN.xlsx"))
    eq    = build_equities()
    options = build_options(eq)

    doc = {
        "$note": ("Built by tools/build_products.py from the desk's own source files. "
                  "Instrument facts only: no client-identifying material is carried over."),
        "asOf": "2026-09-30",
        "source": "Safra desk product files",
        "version": 4,

        "equities": {"shelf": eq, "selection": {
            # riskProfile is deliberately the lighter vote here. It has
            # already had its say once, in the allocation: it is the main
            # driver of how big the equity sleeve is. Letting it also dominate
            # WHICH equities get bought counts the same answer twice, and it
            # showed — a room that asked for energy and nothing else was
            # handed a tech-led sleeve with energy last and smallest, because
            # high-beta semiconductors matched "aggressive" better than an
            # energy fund did. A named sector is a direct instruction; a risk
            # level is a disposition, and it is already reflected elsewhere.
            "weights": {"riskProfile": 0.8, "sector": 1.8, "country": 1.0,
                        "usd": 1.0, "capitalIncome": 0.9},
            "relative": 0.86,
            "diversify": 0.55, "conviction": 7,
            "maxLineWeight": 12, "sizing": {"pctPerLine": 8, "minN": 3, "maxN": 7, "disperseTo": 2}}},

        "fixedIncome": {"shelf": bonds, "portfolios": fi_books, "selection": {
            # The sleeve is no longer assembled bond by bond: the room picks
            # one of the desk's five finished books. The per-bond shelf stays
            # for the validation page, which still audits the universe.
            "mode": "portfolio",
            # Risk leads, because that is what the five books are ordered by.
            # Duration and region separate the pairs; credit breaks the tie
            # between a book's own IG and HY halves.
            "portfolioWeights": {"riskProfile": 2.0, "duration": 1.2,
                                 "country": 1.0, "credit": 1.0},
            "weights": {"credit": 1.2, "duration": 1.1, "usd": 1.0,
                        "riskProfile": 0.9, "country": 0.8, "capitalIncome": 0.7},
            "relative": 0.92,
            "diversify": 0.35, "conviction": 5,
            "maxLineWeight": 10, "sizing": {"pctPerLine": 6, "minN": 3, "maxN": 8, "disperseTo": 2}}},

        "notes": {"shelf": notes,
            "$rule": "At least 50% of the notes allocation sits in the desk's highlighted core picks.",
            "selection": {
                "weights": {"riskProfile": 1.3, "horizon": 1.0, "country": 0.9,
                            "capitalIncome": 0.8, "sector": 0.8},
                "relative": 0.88, "coreFloor": 0.5,
                "diversify": 0.55, "conviction": 7,
                "maxLineWeight": 10, "sizing": {"pctPerLine": 7, "minN": 2, "maxN": 6, "disperseTo": 2}}},

        "options": {"shelf": options, "selection": {
            "weights": {"leverage": 1.4, "marketView": 1.2, "capitalIncome": 1.1,
                        "riskProfile": 0.9, "sector": 0.8, "country": 0.6},
            "relative": 0.80,
            "diversify": 0.50, "conviction": 5, "sectorCap": 0.7,
            "maxLineWeight": 8, "sizing": {"pctPerLine": 4, "minN": 1, "maxN": 4, "disperseTo": 1}}},

        "fx": {"shelf": fx, "selection": {
            "weights": {"usd": 1.4, "riskProfile": 1.1, "country": 1.0,
                        "leverage": 0.8, "horizon": 0.6},
            "relative": 0.82,
            "diversify": 0.40, "conviction": 5,
            "maxLineWeight": 12, "sizing": {"pctPerLine": 5, "minN": 2, "maxN": 4, "disperseTo": 1}}},
    }

    # drop null fits so the scorer never sees an empty axis
    for bucket in ("equities", "fixedIncome", "notes", "fx", "options"):
        for item in doc[bucket]["shelf"]:
            item["fit"] = {k: v for k, v in item["fit"].items() if v}

    # ---- analytics ----------------------------------------------------
    #
    # Portfolio-level validation needs to read an instrument's characteristics
    # without parsing display strings or re-deriving them differently from the
    # scorer. Everything here comes from fields already built above, and where
    # a characteristic also drives scoring it is taken from the SAME source the
    # scorer uses, so the validator can never disagree with the engine about
    # what an instrument is.
    #
    #   region       from fit.country, which is what the scorer reads
    #   riskScore    from fit.riskProfile, rebased 0..1
    #                (equities: beta + realised vol; bonds: rating notch,
    #                 payment rank and yield; notes: barrier, coupon, tenor
    #                 and basket breadth; options: the structure itself)
    #   usdExposure  the instrument's own field where it has one, else the
    #                settlement currency of the sleeve
    #
    # riskScore is a PROXY on a 0-1 scale, not a volatility or a VaR. It is
    # the same number the room is scored against, which is the point: it makes
    # "did the room get the risk it asked for" answerable in one unit.
    def _region(item):
        c = (item.get("fit") or {}).get("country")
        if not isinstance(c, dict):
            return None
        return "em" if c.get("em", 0) > c.get("g7", 0) else "g7"

    def _risk01(item):
        r = (item.get("fit") or {}).get("riskProfile")
        if not isinstance(r, dict) or r.get("target") is None:
            return None
        return round(max(0.0, min(1.0, r["target"] / 2.0)), 4)

    # Whether a product expresses leverage is a fact about the structure, not
    # about which room scores it well. A short put fits a leverage-tolerant
    # room slightly better than a cautious one, so a fit-ratio rule marked it
    # as leverage and made a no-leverage room look mis-built when it had in
    # fact bought income. Options are classified by strategy; everything else
    # still falls back to the fit, which is right for FX.
    LEVERAGED_STRATEGY = ("long call",)
    def _expresses_leverage(item):
        st = (item.get("strategy") or "").lower()
        if st:
            return st in LEVERAGED_STRATEGY
        lv = (item.get("fit") or {}).get("leverage")
        if isinstance(lv, dict):
            return lv.get("yes", 0) > lv.get("no", 0)
        return False

    # The questionnaire's six sectors. A bond's "sector" is a Bloomberg
    # industry string from the export ("Consumer, Non-cyclical") and is NOT
    # one of these, so it must never be aggregated into equity sector
    # exposure. Only a value on this list is carried into analytics.
    Q_SECTORS = set(SECTORS)

    def _sector(item):
        s0 = item.get("sector")
        if s0 in Q_SECTORS or s0 == "core":
            return s0
        f = (item.get("fit") or {}).get("sector")
        if isinstance(f, dict):
            best = max(f.items(), key=lambda kv: kv[1])
            if best[1] >= 1.0 and best[0] in Q_SECTORS:
                return best[0]
        return None

    def _income(item):
        ci = (item.get("fit") or {}).get("capitalIncome")
        if isinstance(ci, dict):
            return ci.get("income", 0) >= ci.get("capital", 0)
        return False

    for bucket in ("equities", "fixedIncome", "notes", "fx", "options"):
        for item in doc[bucket]["shelf"]:
            d = item.get("data") or {}
            a = {
                "sleeve": bucket,
                "region": _region(item),
                "sector": _sector(item),
                "riskScore": _risk01(item),
                "expressesLeverage": _expresses_leverage(item),
                "incomeProducing": _income(item) or bucket == "fixedIncome",
            }

            if bucket == "equities":
                a["usdExposure"] = item.get("usdExposure")
                a["beta"] = d.get("beta1y")
                a["volatility"] = d.get("volatility")
            elif bucket == "fixedIncome":
                a["usdExposure"] = item.get("usdExposure")
                a["duration"] = d.get("duration")
                a["creditClass"] = item.get("credit")
                a["rating"] = item.get("rating") or None
                a["yieldToWorst"] = d.get("ytw")
            elif bucket == "notes":
                # The source sheet is USD-settled throughout, which is why the
                # usd axis was dropped from this shelf as constant.
                a["usdExposure"] = 100
                a["tenorYears"] = num(item.get("tenor"), None)
                a["principalProtected"] = bool(PROTECTED.search(item.get("type") or ""))
                # A barrier note is geared on the downside even when the room
                # did not ask for leverage; that is what the barrier is.
                a["geared"] = not a["principalProtected"]
            elif bucket == "fx":
                u = (item.get("fit") or {}).get("usd") or {}
                a["usdExposure"] = u.get("target")
                a["kind"] = item.get("kind")
            elif bucket == "options":
                # Every listed underlying here is a USD-denominated US ETF.
                a["usdExposure"] = 100
                a["strategy"] = item.get("strategy")
                a["delta"] = item.get("delta")
                a["premiumPct"] = item.get("premiumPct")
                a["long"] = (item.get("strategy") or "").lower().startswith("long")

            item["analytics"] = a

    # An axis every instrument on a shelf answers identically cannot separate
    # them: it adds the same number to every score and dilutes the axes that
    # do discriminate. All 26 notes were USD-settled, so "usd" was pure noise
    # in that sleeve. Drop those, and report what is left, so the shelf's real
    # resolving power is visible rather than assumed.
    for bucket in ("equities", "fixedIncome", "notes", "fx", "options"):
        shelf = doc[bucket]["shelf"]
        axes = {k for i in shelf for k in i["fit"]}
        dropped, kept = [], {}
        for ax in sorted(axes):
            vals = {json.dumps(i["fit"].get(ax), sort_keys=True) for i in shelf}
            if len(vals) <= 1:
                dropped.append(ax)
                for i in shelf:
                    i["fit"].pop(ax, None)
            else:
                kept[ax] = len(vals)
        w = doc[bucket]["selection"]["weights"]
        for ax in dropped:
            w.pop(ax, None)
        print(f"  {bucket:<13} {len(shelf):>3} instruments  "
              f"distinct fit values: {kept}"
              + (f"  dropped (constant): {dropped}" if dropped else ""))

    # Ids address a holding when weights are looked up, so a collision would
    # silently merge two instruments. Two bonds from one issuer can slug the
    # same way once punctuation is stripped (A and A- both become "a").
    seen = {}
    for bucket in ("equities", "fixedIncome", "notes", "fx", "options"):
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

    for b in ("equities", "fixedIncome", "notes", "fx", "options"):
        print(f"  {b:14} {len(doc[b]['shelf']):>3} instruments")

if __name__ == "__main__":
    main()
