"""Technical indicators computed from daily candles (no extra data source needed)."""
from datetime import datetime
import requests
from services.stock_data import get_history, build_ticker, YF_HEADERS, _cache_get, _cache_set


def _sma(v, n):
    return sum(v[-n:]) / n if len(v) >= n else None


def _ema_series(v, n):
    if len(v) < n:
        return []
    k = 2 / (n + 1)
    out = [sum(v[:n]) / n]
    for x in v[n:]:
        out.append(x * k + out[-1] * (1 - k))
    return out


def _rsi(v, n=14):
    if len(v) <= n:
        return None
    gains = [max(v[i] - v[i - 1], 0) for i in range(1, len(v))]
    losses = [max(v[i - 1] - v[i], 0) for i in range(1, len(v))]
    ag, al = sum(gains[:n]) / n, sum(losses[:n]) / n
    for g, l in zip(gains[n:], losses[n:]):
        ag, al = (ag * (n - 1) + g) / n, (al * (n - 1) + l) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)


def _macd(v):
    e12, e26 = _ema_series(v, 12), _ema_series(v, 26)
    if not e26:
        return None
    e12 = e12[len(e12) - len(e26):]
    line = [a - b for a, b in zip(e12, e26)]
    sig = _ema_series(line, 9)
    if not sig:
        return None
    return {"macd": line[-1], "signal": sig[-1], "histogram": line[-1] - sig[-1]}


def _bollinger(v, n=20):
    if len(v) < n:
        return None
    w = v[-n:]
    m = sum(w) / n
    sd = (sum((x - m) ** 2 for x in w) / n) ** 0.5
    return {"upper": m + 2 * sd, "middle": m, "lower": m - 2 * sd}


def _r(x):
    return None if x is None else round(x, 2)


def get_technicals(symbol: str, market: str) -> dict:
    key = f"tech_{symbol}_{market}"
    hit = _cache_get(key)
    if hit:
        return hit
    candles = [c for c in get_history(symbol, market, "1y", "1d") if c.get("close", 0) > 0]
    if len(candles) < 30:
        return {"available": False}

    closes = [c["close"] for c in candles]
    price = closes[-1]
    last = candles[-1]

    mas = []
    for kind, fn, ns in (("SMA", _sma, (5, 10, 20, 50, 100, 200)),):
        for n in ns:
            val = fn(closes, n)
            if val is not None:
                mas.append({"name": f"{kind} {n}", "value": _r(val), "signal": "Bullish" if price > val else "Bearish"})
    for n in (20, 50):
        e = _ema_series(closes, n)
        if e:
            mas.append({"name": f"EMA {n}", "value": _r(e[-1]), "signal": "Bullish" if price > e[-1] else "Bearish"})

    rsi = _rsi(closes)
    macd = _macd(closes)
    bb = _bollinger(closes)

    osc = []
    if rsi is not None:
        osc.append({"name": "RSI (14)", "value": _r(rsi),
                    "signal": "Bearish" if rsi > 70 else "Bullish" if rsi < 30 else "Neutral",
                    "note": "Overbought" if rsi > 70 else "Oversold" if rsi < 30 else "Normal range"})
    if macd:
        osc.append({"name": "MACD (12, 26, 9)", "value": _r(macd["macd"]),
                    "signal": "Bullish" if macd["histogram"] > 0 else "Bearish",
                    "note": f"Signal {_r(macd['signal'])}, histogram {_r(macd['histogram'])}"})
    if bb:
        pos = (price - bb["lower"]) / (bb["upper"] - bb["lower"]) if bb["upper"] != bb["lower"] else 0.5
        osc.append({"name": "Bollinger %B", "value": _r(pos),
                    "signal": "Bearish" if pos > 1 else "Bullish" if pos < 0 else "Neutral",
                    "note": "Above upper band" if pos > 1 else "Below lower band" if pos < 0 else "Inside the bands"})

    # Classic pivot points from the previous session
    prev = candles[-2] if len(candles) > 1 else last
    p = (prev["high"] + prev["low"] + prev["close"]) / 3
    pivots = {
        "pivot": _r(p),
        "r1": _r(2 * p - prev["low"]), "r2": _r(p + (prev["high"] - prev["low"])),
        "r3": _r(prev["high"] + 2 * (p - prev["low"])),
        "s1": _r(2 * p - prev["high"]), "s2": _r(p - (prev["high"] - prev["low"])),
        "s3": _r(prev["low"] - 2 * (prev["high"] - p)),
    }

    signals = [x["signal"] for x in mas + osc]
    buy, sell, neutral = signals.count("Bullish"), signals.count("Bearish"), signals.count("Neutral")
    total = max(buy + sell + neutral, 1)
    score = (buy - sell) / total
    summary = ("Strong buy" if score > 0.6 else "Buy" if score > 0.2 else
               "Strong sell" if score < -0.6 else "Sell" if score < -0.2 else "Neutral")

    year = candles[-252:]
    result = {
        "available": True, "price": _r(price), "as_of": last["time"],
        "summary": {"verdict": summary, "bullish": buy, "bearish": sell, "neutral": neutral},
        "moving_averages": mas, "oscillators": osc, "pivots": pivots,
        "bollinger": {k: _r(x) for k, x in bb.items()} if bb else None,
        "year_high": _r(max(c["high"] or c["close"] for c in year)),
        "year_low": _r(min(c["low"] or c["close"] for c in year if (c["low"] or c["close"]) > 0)),
    }
    _cache_set(key, result, 300)
    return result


def get_events(symbol: str, market: str) -> dict:
    """Dividends and splits from Yahoo, plus the biggest one-day price moves."""
    key = f"events_{symbol}_{market}"
    hit = _cache_get(key)
    if hit:
        return hit
    ticker = build_ticker(symbol, market)
    dividends, splits, earnings = [], [], []
    ok = False
    for host in ("query1", "query2"):
        try:
            r = requests.get(
                f"https://{host}.finance.yahoo.com/v8/finance/chart/{ticker}?range=10y&interval=3mo&events=div%2Csplits%2Cearn",
                headers=YF_HEADERS, timeout=15)
            if r.status_code != 200:
                continue
            ev = (r.json().get("chart", {}).get("result") or [{}])[0].get("events") or {}
            ok = True
            for d in (ev.get("dividends") or {}).values():
                dividends.append({"date": datetime.fromtimestamp(d["date"]).strftime("%Y-%m-%d"),
                                  "amount": round(float(d["amount"]), 2)})
            for s in (ev.get("splits") or {}).values():
                splits.append({"date": datetime.fromtimestamp(s["date"]).strftime("%Y-%m-%d"),
                               "ratio": s.get("splitRatio") or f"{s.get('numerator')}:{s.get('denominator')}"})
            for e in (ev.get("earnings") or {}).values():
                if e.get("date"):
                    earnings.append(datetime.fromtimestamp(e["date"]).strftime("%Y-%m-%d"))
            break
        except Exception:
            continue
    dividends.sort(key=lambda x: x["date"], reverse=True)
    splits.sort(key=lambda x: x["date"], reverse=True)

    moves = []
    candles = [c for c in get_history(symbol, market, "1y", "1d") if c.get("close", 0) > 0]
    for a, b in zip(candles, candles[1:]):
        pct = (b["close"] - a["close"]) / a["close"] * 100
        if abs(pct) >= 4:
            moves.append({"date": b["time"][:10], "change_pct": round(pct, 2), "close": b["close"]})
    moves.sort(key=lambda x: x["date"], reverse=True)

    # One unified, newest-first timeline for the Events tab.
    timeline = []
    if earnings:
        for d in earnings:
            timeline.append({"date": d, "type": "result", "title": "Quarterly Result", "sub": "Release date"})
    else:
        # No release dates from the source: show the quarters that were reported (period-end dates).
        try:
            from services.company import get_company
            for r in get_company(symbol, market)["financials"]["quarterly"]:
                timeline.append({"date": r["date"], "type": "result", "title": "Quarterly Result", "sub": "Quarter ended"})
        except Exception:
            pass
    for d in dividends:
        timeline.append({"date": d["date"], "type": "dividend", "title": "Dividend", "sub": "Ex date", "amount": d["amount"]})
    for sp in splits:
        timeline.append({"date": sp["date"], "type": "split", "title": "Stock Split", "sub": "Ex date", "ratio": sp["ratio"]})
    for m in moves:
        timeline.append({"date": m["date"], "type": "move", "title": "Big price move", "sub": "Daily move of 4% or more",
                         "change_pct": m["change_pct"], "close": m["close"]})
    timeline.sort(key=lambda x: x["date"], reverse=True)

    result = {"events": timeline, "dividends": dividends[:12], "splits": splits[:6], "big_moves": moves[:10], "source_ok": ok}
    if timeline:
        _cache_set(key, result, 3600)
    return result
