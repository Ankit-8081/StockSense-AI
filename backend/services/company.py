"""Company overview: fundamentals, financials, about, shareholding.

Sources (all unofficial, best effort):
  * Yahoo fundamentals-timeseries (no login needed): revenue, profit, ratios. India + US.
  * Groww company page data (Indian stocks): about, industry P/E, shareholding, ratios.
Every field is optional; the UI hides what is missing.
"""
import re
import time
from concurrent.futures import ThreadPoolExecutor
import requests
from services.stock_data import build_ticker, YF_HEADERS, GROWW_HEADERS, _cache_get, _cache_set

YF_TS = "https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{t}"
TYPES = [
    "quarterlyTotalRevenue", "quarterlyNetIncome", "annualTotalRevenue", "annualNetIncome",
    "trailingMarketCap", "trailingPeRatio", "trailingPbRatio",
    "annualTotalDebt", "annualStockholdersEquity", "annualDilutedEPS", "annualOrdinarySharesNumber",
]


def _yf_series(ticker: str, typ: str) -> list:
    now = int(time.time())
    try:
        r = requests.get(YF_TS.format(t=ticker), headers=YF_HEADERS, timeout=12,
                         params={"type": typ, "merge": "false", "period1": now - 6 * 365 * 86400, "period2": now + 86400})
        if r.status_code != 200:
            return []
        for res in r.json().get("timeseries", {}).get("result", []):
            rows = res.get(typ) or []
            out = []
            for row in rows:
                if row and row.get("reportedValue", {}).get("raw") is not None:
                    out.append((row["asOfDate"], float(row["reportedValue"]["raw"])))
            return sorted(out)
    except Exception:
        pass
    return []


def _yahoo_bundle(ticker: str) -> dict:
    with ThreadPoolExecutor(max_workers=6) as ex:
        return dict(zip(TYPES, ex.map(lambda t: _yf_series(ticker, t), TYPES)))


def _period_label(date: str, yearly: bool) -> str:
    y, m = int(date[:4]), int(date[5:7])
    mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]
    return f"FY{str(y)[2:]}" if yearly and False else f"{mon} '{str(y)[2:]}"


def _financials(b: dict) -> dict:
    out = {}
    for name, rev, prof, n in (("quarterly", "quarterlyTotalRevenue", "quarterlyNetIncome", 5),
                               ("yearly", "annualTotalRevenue", "annualNetIncome", 5)):
        profit = dict(b.get(prof) or [])
        rows = [{"date": d, "period": _period_label(d, name == "yearly"), "revenue": v, "profit": profit.get(d)}
                for d, v in (b.get(rev) or [])]
        out[name] = rows[-n:]
    return out


def _last(series):
    return series[-1][1] if series else None


# ── Groww company page ───────────────────────────────────────────────────────

def _find(obj, *names):
    """First value whose key matches one of names (case-insensitive), searched depth-first."""
    want = {n.lower() for n in names}
    stack = [obj]
    while stack:
        cur = stack.pop(0)
        if isinstance(cur, dict):
            for k, v in cur.items():
                if k.lower() in want and v not in (None, "", [], {}):
                    return v
            stack.extend(v for v in cur.values() if isinstance(v, (dict, list)))
        elif isinstance(cur, list):
            stack.extend(v for v in cur if isinstance(v, (dict, list)))
    return None


def _num(v):
    if isinstance(v, dict):
        v = _find(v, "percent", "percentage", "value", "holding")
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _groww_company(symbol: str) -> dict | None:
    try:
        r = requests.get("https://groww.in/v1/api/search/v1/entity", headers=GROWW_HEADERS, timeout=10,
                         params={"app": "false", "page": 0, "q": symbol.upper(), "size": 6})
        if r.status_code != 200:
            return None
        hits = r.json().get("data", {}).get("content", []) or []
        hit = next((h for h in hits if str(h.get("nse_scrip_code", "")).upper() == symbol.upper()), None) \
            or next((h for h in hits if h.get("search_id")), None)
        if not hit:
            return None
        r = requests.get(f"https://groww.in/v1/api/stocks_data/v1/company/search_id/{hit['search_id']}",
                         headers=GROWW_HEADERS, timeout=12)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def _shareholding(raw) -> dict:
    """{period: {Promoters, DII, FII, Public}} with whatever categories the source gives."""
    if not raw:
        return {}
    items = raw.items() if isinstance(raw, dict) else [
        (str(_find(x, "date", "quarter", "period", "month") or i), x) for i, x in enumerate(raw)]
    out = {}
    for period, cats in items:
        if not isinstance(cats, dict):
            continue
        row = {}
        for k, v in cats.items():
            n = _num(v)
            if n is None:
                continue
            kl = k.lower()
            label = ("Promoters" if "promoter" in kl else
                     "FII" if ("foreign" in kl or kl == "fii") else
                     "DII" if ("mutual" in kl or "domestic" in kl or kl == "dii" or "insurance" in kl) else
                     "Public" if ("retail" in kl or "public" in kl or "other" in kl) else re.sub(r"([a-z])([A-Z])", r"\1 \2", k).title())
            row[label] = round(row.get(label, 0) + n, 2)
        if row:
            out[str(period)] = row
    return out


def get_company(symbol: str, market: str) -> dict:
    key = f"company_{symbol}_{market}"
    hit = _cache_get(key)
    if hit:
        return hit
    ticker = build_ticker(symbol, market)
    indian = market.upper() in ("NSE", "BSE")
    yb = _yahoo_bundle(ticker)
    fin = _financials(yb)

    equity, debt, income = _last(yb["annualStockholdersEquity"]), _last(yb["annualTotalDebt"]), _last(yb["annualNetIncome"])
    shares = _last(yb["annualOrdinarySharesNumber"])
    cap = _last(yb["trailingMarketCap"])
    fund = {
        "market_cap": cap,
        "pe": _last(yb["trailingPeRatio"]),
        "pb": _last(yb["trailingPbRatio"]),
        "industry_pe": None,
        "debt_to_equity": round(debt / equity, 2) if debt is not None and equity else None,
        "roe": round(income / equity * 100, 2) if income is not None and equity else None,
        "eps": _last(yb["annualDilutedEPS"]),
        "dividend_yield": None,
        "book_value": round(equity / shares, 2) if equity and shares else None,
        "face_value": None,
    }
    about = {"text": None, "ceo": None, "founded": None, "industry": None}
    holding, debug = {}, None

    g = _groww_company(symbol) if indian else None
    if g:
        debug = list(g.keys())[:30]
        pick = lambda *n: _num(_find(g, *n))
        mc = pick("marketCap", "market_cap")
        if mc:
            fund["market_cap"] = mc * 1e7 if mc < 1e9 else mc   # Groww may send crores
        for k, names in {"pe": ("peRatio", "pe", "peRatioTtm"), "pb": ("pbRatio", "pb"),
                         "industry_pe": ("industryPe", "industryPeRatio", "sectorPe"),
                         "roe": ("roe", "returnOnEquity"), "eps": ("epsTtm", "eps"),
                         "dividend_yield": ("divYield", "dividendYield"), "book_value": ("bookValue",),
                         "face_value": ("faceValue",), "debt_to_equity": ("debtToEquity", "debtEquityRatio")}.items():
            v = pick(*names)
            if v is not None:
                fund[k] = v
        about = {
            "text": _find(g, "aboutCompany", "about", "description", "businessSummary"),
            "ceo": _find(g, "managingDirector", "ceo", "ceoName", "chairman"),
            "founded": _find(g, "yearOfIncorporation", "foundedYear", "founded", "establishedYear"),
            "industry": (_find(g, "industryName", "industry", "sector") if not isinstance(_find(g, "industry"), dict)
                         else _find(_find(g, "industry"), "name", "industryName")),
        }
        for k in ("text", "ceo", "founded", "industry"):
            if about[k] is not None and not isinstance(about[k], (str, int)):
                about[k] = None
        holding = _shareholding(_find(g, "shareHoldingPattern", "shareholdingPattern", "shareholding"))

    result = {"fundamentals": fund, "financials": fin, "about": about, "shareholding": holding,
              "groww_keys": debug,
              "available": any(v is not None for v in fund.values()) or bool(fin["quarterly"]) or bool(holding)}
    if result["available"]:
        _cache_set(key, result, 1800)
    return result
