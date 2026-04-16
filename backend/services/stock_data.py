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

def _groww_history(symbol: str, days: int = 90, interval_min: int = 1440) -> list:
    try:
        end_ms   = int(datetime.now().timestamp() * 1000)
        start_ms = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
        url = (
            f"https://groww.in/v1/api/charting_service/v2/chart/exchange/NSE"
            f"/segment/CASH/{symbol.upper()}"
            f"?startTimeInMs={start_ms}&endTimeInMs={end_ms}&intervalInMinutes={interval_min}"
        )
        r = requests.get(url, headers=GROWW_HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        candles = r.json().get("candles", [])
        records = []
        for c in candles:
            if len(c) < 5:
                continue
            ts = datetime.fromtimestamp(c[0] / 1000)
            fmt = "%Y-%m-%d %H:%M" if interval_min < 1440 else "%Y-%m-%d"
            records.append({
                "time":   ts.strftime(fmt),
                "open":   round(float(c[1]), 2),
                "high":   round(float(c[2]), 2),
                "low":    round(float(c[3]), 2),
                "close":  round(float(c[4]), 2),
                "volume": int(c[5]) if len(c) > 5 else 0,
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

def _yf_v8_quote(symbol: str, market: str) -> dict | None:
    """Direct Yahoo Finance v8 API — bypasses yfinance package rate limits."""
    currency = "USD"
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}?interval=1d&range=5d"
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
            "ticker": symbol.upper(), "name": meta.get("longName") or symbol.upper(),
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

    _cache_set(key, result)
    return result

def get_history(symbol: str, market: str, period: str = "3mo", interval: str = "1d") -> list:
    key = f"hist_{symbol}_{market}_{period}_{interval}"
    cached = _cache_get(key)
    if cached is not None:
        return cached

    if market.upper() in ["NSE", "BSE"]:
        interval_min_map = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "1d": 1440}
        days_map = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        interval_min = interval_min_map.get(interval, 1440)
        days = days_map.get(period, 90)
        records = _groww_history(symbol, days, interval_min)
    else:
        records = _yf_v8_history(symbol, period, interval)

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