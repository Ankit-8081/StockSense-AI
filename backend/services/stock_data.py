import requests
import pandas as pd
import time
from datetime import datetime, timedelta

_cache = {}
CACHE_TTL = 120

def _cache_get(key):
    if key in _cache:
        data, expiry = _cache[key]
        if datetime.now() < expiry:
            return data
        del _cache[key]
    return None

def _cache_set(key, data, ttl=CACHE_TTL):
    _cache[key] = (data, datetime.now() + timedelta(seconds=ttl))

MARKET_SUFFIX = {"NSE": ".NS", "BSE": ".BO", "NYSE": "", "NASDAQ": ""}

def build_ticker(symbol: str, market: str) -> str:
    return f"{symbol.upper()}{MARKET_SUFFIX.get(market.upper(), '')}"

GROWW_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://groww.in",
    "Referer": "https://groww.in/",
}

YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json,text/html,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

# ── Groww (Indian stocks) ────────────────────────────────────────────────────

def _groww_quote(symbol: str, market: str = "NSE") -> dict | None:
    """Works for NSE and BSE — uses NSE prices (same company, ~same price)."""
    try:
        # Groww uses NSE for live prices even for BSE-listed stocks
        url = f"https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/{symbol.upper()}/latest"
        r = requests.get(url, headers=GROWW_HEADERS, timeout=10)
        if r.status_code != 200:
            return None
        d = r.json()
        price      = float(d.get("ltp", 0) or 0)
        prev_close = float(d.get("close", price) or price)
        change     = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0
        return {
            "symbol": symbol.upper(), "market": market.upper(),
            "ticker": f"{symbol}.NS",  "name": symbol.upper(),
            "price": round(price, 2),  "prev_close": round(prev_close, 2),
            "change": change,          "change_pct": change_pct,
            "volume": int(d.get("tradedVolume", 0) or 0),
            "market_cap": 0,
            "week_52_high": float(d.get("yearlyHigh", 0) or 0),
            "week_52_low":  float(d.get("yearlyLow",  0) or 0),
            "currency": "INR",
        }
    except Exception:
        return None

def _groww_intraday(symbol: str) -> list:
    """Today's session from Groww's current chart endpoint (1-minute points).
    Accepts [ts, close] (minimal) or [ts, o, h, l, c, v] rows; ts in seconds or ms."""
    try:
        url = (
            f"https://groww.in/v1/api/charting_service/v2/chart/exchange/NSE/segment/CASH/"
            f"{symbol.upper()}/daily?intervalInMinutes=1&minimal=true"
        )
        r = requests.get(url, headers=GROWW_HEADERS, timeout=10)
        if r.status_code != 200:
            return []
        records = []
        for c in r.json().get("candles", []):
            if not isinstance(c, (list, tuple)) or len(c) < 2:
                continue
            ts = c[0] / 1000 if c[0] > 1e11 else c[0]
            if len(c) >= 5:
                o, h, l, cl = (float(x) for x in c[1:5])
                vol = int(c[5]) if len(c) > 5 and c[5] else 0
            else:
                o = h = l = cl = float(c[1])
                vol = 0
            records.append({
                "time":   datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M"),
                "open":   round(o, 2), "high": round(h, 2),
                "low":    round(l, 2), "close": round(cl, 2),
                "volume": vol,
            })
        return records
    except Exception:
        return []

def _groww_indices(market: str) -> list:
    index_map = {
        "NSE": [("NIFTY50", "NIFTY 50"), ("NIFTYBANK", "BANK NIFTY")],
        "BSE": [("SENSEX",  "SENSEX")],
    }
    results = []
    for idx_sym, name in index_map.get(market, []):
        try:
            url = f"https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/{market}/segment/INDICES/{idx_sym}/latest"
            r = requests.get(url, headers=GROWW_HEADERS, timeout=8)
            if r.status_code == 200:
                d = r.json()
                price = float(d.get("ltp", 0) or 0)
                prev  = float(d.get("close", price) or price)
                results.append({
                    "name": name, "price": round(price, 2),
                    "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0,
                })
        except Exception:
            continue
    return results

# ── Yahoo Finance v8 (US stocks) ─────────────────────────────────────────────

def _yf_v8_quote(symbol: str, market: str, ticker: str = None, currency: str = "USD") -> dict | None:
    """Direct Yahoo Finance v8 API — bypasses yfinance package rate limits."""
    ticker = (ticker or symbol).upper()
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
        r = requests.get(url, headers=YF_HEADERS, timeout=12)
        if r.status_code != 200:
            # Try query2
            url = url.replace("query1", "query2")
            r = requests.get(url, headers=YF_HEADERS, timeout=12)
        if r.status_code != 200:
            return None
        data = r.json()
        result_data = data.get("chart", {}).get("result", [])
        if not result_data:
            return None
        meta   = result_data[0].get("meta", {})
        price      = float(meta.get("regularMarketPrice",       0) or 0)
        prev_close = float(meta.get("chartPreviousClose",       price) or
                           meta.get("previousClose",            price) or price)
        change     = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0
        return {
            "symbol": symbol.upper(), "market": market.upper(),
            "ticker": ticker, "name": meta.get("longName") or symbol.upper(),
            "price": round(price, 2), "prev_close": round(prev_close, 2),
            "change": change,         "change_pct": change_pct,
            "volume": int(meta.get("regularMarketVolume", 0) or 0),
            "market_cap": 0,
            "week_52_high": float(meta.get("fiftyTwoWeekHigh", 0) or 0),
            "week_52_low":  float(meta.get("fiftyTwoWeekLow",  0) or 0),
            "currency": currency,
        }
    except Exception:
        return None

def _yf_v8_history(symbol: str, period: str = "3mo", interval: str = "1d") -> list:
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}?interval={interval}&range={period}"
        r = requests.get(url, headers=YF_HEADERS, timeout=15)
        if r.status_code != 200:
            url = url.replace("query1", "query2")
            r = requests.get(url, headers=YF_HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        data = r.json()
        result_data = data.get("chart", {}).get("result", [])
        if not result_data:
            return []
        timestamps = result_data[0].get("timestamp", [])
        ohlcv      = result_data[0].get("indicators", {}).get("quote", [{}])[0]
        opens   = ohlcv.get("open",   [])
        highs   = ohlcv.get("high",   [])
        lows    = ohlcv.get("low",    [])
        closes  = ohlcv.get("close",  [])
        volumes = ohlcv.get("volume", [])
        records = []
        for i, ts in enumerate(timestamps):
            try:
                dt = datetime.fromtimestamp(ts)
                fmt = "%Y-%m-%d %H:%M" if interval not in ["1d", "1wk", "1mo"] else "%Y-%m-%d"
                records.append({
                    "time":   dt.strftime(fmt),
                    "open":   round(float(opens[i]   or 0), 2),
                    "high":   round(float(highs[i]   or 0), 2),
                    "low":    round(float(lows[i]    or 0), 2),
                    "close":  round(float(closes[i]  or 0), 2),
                    "volume": int(volumes[i] or 0),
                })
            except Exception:
                continue
        return records
    except Exception:
        return []

def _yf_v8_indices() -> list:
    results = []
    for sym, name in [("^GSPC", "S&P 500"), ("^IXIC", "NASDAQ"), ("^DJI", "DOW JONES")]:
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
            r = requests.get(url, headers=YF_HEADERS, timeout=10)
            if r.status_code != 200:
                continue
            meta = r.json().get("chart", {}).get("result", [{}])[0].get("meta", {})
            price = float(meta.get("regularMarketPrice", 0) or 0)
            prev  = float(meta.get("chartPreviousClose", price) or price)
            results.append({
                "name": name, "price": round(price, 2),
                "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0,
            })
            time.sleep(0.2)
        except Exception:
            continue
    return results

# ── Public API ───────────────────────────────────────────────────────────────

def get_quote(symbol: str, market: str) -> dict:
    key = f"quote_{symbol}_{market}"
    cached = _cache_get(key)
    if cached:
        return cached

    if market.upper() in ["NSE", "BSE"]:
        result = _groww_quote(symbol, market)
        if not result:
            result = _yf_v8_quote(symbol, market, ticker=build_ticker(symbol, market), currency="INR")
        if not result:
            result = {
                "symbol": symbol.upper(), "market": market.upper(),
                "ticker": f"{symbol}.NS",  "name": symbol.upper(),
                "price": 0, "prev_close": 0, "change": 0, "change_pct": 0,
                "volume": 0, "market_cap": 0,
                "week_52_high": 0, "week_52_low": 0, "currency": "INR",
            }
    else:
        result = _yf_v8_quote(symbol, market)
        if not result:
            result = {
                "symbol": symbol.upper(), "market": market.upper(),
                "ticker": symbol.upper(), "name": symbol.upper(),
                "price": 0, "prev_close": 0, "change": 0, "change_pct": 0,
                "volume": 0, "market_cap": 0,
                "week_52_high": 0, "week_52_low": 0, "currency": "USD",
            }

    if result.get("price"):  # don't cache failed lookups
        _cache_set(key, result)
    return result

def get_history(symbol: str, market: str, period: str = "3mo", interval: str = "1d") -> list:
    key = f"hist_{symbol}_{market}_{period}_{interval}"
    cached = _cache_get(key)
    if cached is not None:
        return cached

    if market.upper() in ["NSE", "BSE"]:
        records = _groww_intraday(symbol) if period == "1d" else []
        if not records:  # Groww's other ranges aren't wired up; Yahoo covers them (.NS / .BO)
            records = _yf_v8_history(build_ticker(symbol, market), period, interval)
    else:
        records = _yf_v8_history(symbol, period, interval)

    if records:  # don't cache failures, or one bad request blanks the chart for 5 minutes
        _cache_set(key, records, ttl=300)
    return records

def search_symbols(query: str) -> list:
    try:
        url = f"https://groww.in/v1/api/search/v3/query/global/search?q={query}&page=0&size=8"
        r = requests.get(url, headers=GROWW_HEADERS, timeout=8)
        if r.status_code == 200:
            stocks = r.json().get("stocks", {}).get("content", [])
            if stocks:
                return [{
                    "symbol": s.get("nseScriptCode") or s.get("bseScriptCode") or "",
                    "name":   s.get("companyName", ""),
                    "market": "NSE" if s.get("nseScriptCode") else "BSE",
                    "type":   "EQUITY",
                } for s in stocks]
    except Exception:
        pass
    # fallback: Yahoo Finance search
    try:
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=8&enableFuzzyQuery=false"
        r = requests.get(url, headers=YF_HEADERS, timeout=8)
        if r.status_code == 200:
            quotes = r.json().get("quotes", [])
            return [{
                "symbol": q.get("symbol", ""),
                "name":   q.get("longname") or q.get("shortname") or "",
                "market": "NSE" if q.get("exchange") == "NSI" else q.get("exchange", ""),
                "type":   q.get("quoteType", ""),
            } for q in quotes]
    except Exception:
        pass
    return []

def get_market_movers(market: str = "NSE") -> dict:
    key = f"movers_{market}"
    cached = _cache_get(key)
    if cached:
        return cached

    if market in ["NSE", "BSE"]:
        indices = _groww_indices(market)
    else:
        indices = _yf_v8_indices()

    result = {"market": market, "indices": indices}
    _cache_set(key, result, ttl=180)
    return result


# ── Health check ─────────────────────────────────────────────────────────────

def _probe(url: str, headers: dict, check) -> dict:
    t = time.time()
    try:
        r = requests.get(url, headers=headers, timeout=8)
        ms = int((time.time() - t) * 1000)
        if r.status_code != 200:
            return {"ok": False, "ms": ms, "detail": f"HTTP {r.status_code}"}
        ok, detail = check(r.json())
        return {"ok": ok, "ms": ms, "detail": detail}
    except Exception as e:
        return {"ok": False, "ms": int((time.time() - t) * 1000), "detail": type(e).__name__}

def check_sources() -> dict:
    """Live-test each upstream price source. Cached for a minute so it can't hammer them."""
    cached = _cache_get("source_status")
    if cached:
        return cached

    result = {
        "groww_prices": _probe(
            "https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/RELIANCE/latest",
            GROWW_HEADERS,
            lambda d: (float(d.get("ltp", 0) or 0) > 0, "no price in response" if not d.get("ltp") else "ok"),
        ),
        "groww_history": _probe(
            "https://groww.in/v1/api/charting_service/v2/chart/exchange/NSE/segment/CASH/RELIANCE"
            "/daily?intervalInMinutes=1&minimal=true",
            GROWW_HEADERS,
            lambda d: (bool(d.get("candles")), "no candles in response" if not d.get("candles") else "ok"),
        ),
        "yahoo_india": _probe(
            "https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?interval=1d&range=5d",
            YF_HEADERS,
            lambda d: (bool(d.get("chart", {}).get("result")), "no data in response"),
        ),
        "yahoo_us": _probe(
            "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5d",
            YF_HEADERS,
            lambda d: (bool(d.get("chart", {}).get("result")), "no data in response"),
        ),
    }
    _cache_set("source_status", result, ttl=60)
    return result
