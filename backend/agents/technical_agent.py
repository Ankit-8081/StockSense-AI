import pandas as pd
import ta
from services.stock_data import get_history

def compute_technical_score(symbol: str, market: str) -> dict:
    candles = get_history(symbol, market, period="3mo", interval="1d")
    if len(candles) < 20:
        return {"technical_score": 0.0, "signals": {}, "error": "Insufficient data"}

    df = pd.DataFrame(candles)
    close  = df["close"].astype(float)
    high   = df["high"].astype(float)
    low    = df["low"].astype(float)
    volume = df["volume"].astype(float)

    signals = {}
    score_components = []

    try:
        rsi = ta.momentum.RSIIndicator(close, window=14).rsi()
        latest_rsi = float(rsi.iloc[-1])
        signals["rsi"] = round(latest_rsi, 2)
        if latest_rsi < 30:
            score_components.append(0.8)
        elif latest_rsi > 70:
            score_components.append(-0.8)
        elif latest_rsi > 55:
            score_components.append(0.3)
        elif latest_rsi < 45:
            score_components.append(-0.3)
        else:
            score_components.append(0.0)
    except Exception:
        pass

    try:
        macd_ind = ta.trend.MACD(close, window_slow=26, window_fast=12, window_sign=9)
        macd_line   = float(macd_ind.macd().iloc[-1])
        signal_line = float(macd_ind.macd_signal().iloc[-1])
        histogram   = float(macd_ind.macd_diff().iloc[-1])
        signals["macd"]        = round(macd_line, 4)
        signals["macd_signal"] = round(signal_line, 4)
        signals["macd_hist"]   = round(histogram, 4)
        if macd_line > signal_line and histogram > 0:
            score_components.append(0.6)
        elif macd_line < signal_line and histogram < 0:
            score_components.append(-0.6)
        else:
            score_components.append(0.0)
    except Exception:
        pass

    try:
        bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
        upper = float(bb.bollinger_hband().iloc[-1])
        lower = float(bb.bollinger_lband().iloc[-1])
        price = float(close.iloc[-1])
        bb_position = (price - lower) / (upper - lower) if (upper - lower) > 0 else 0.5
        signals["bb_position"] = round(bb_position, 2)
        if bb_position < 0.2:
            score_components.append(0.5)
        elif bb_position > 0.8:
            score_components.append(-0.5)
        else:
            score_components.append(0.0)
    except Exception:
        pass

    try:
        sma20 = float(ta.trend.SMAIndicator(close, window=20).sma_indicator().iloc[-1])
        sma50 = float(ta.trend.SMAIndicator(close, window=50).sma_indicator().iloc[-1])
        signals["sma20"] = round(sma20, 2)
        signals["sma50"] = round(sma50, 2)
        score_components.append(0.4 if sma20 > sma50 else -0.4)
    except Exception:
        pass

    try:
        if len(df) >= 10:
            recent_vol = volume.iloc[-5:].mean()
            prev_vol   = volume.iloc[-10:-5].mean()
            vol_ratio  = recent_vol / prev_vol if prev_vol > 0 else 1.0
            signals["volume_ratio"] = round(vol_ratio, 2)
            if vol_ratio > 1.3:
                score_components.append(0.2)
            elif vol_ratio < 0.7:
                score_components.append(-0.2)
    except Exception:
        pass

    technical_score = round(sum(score_components) / len(score_components), 3) if score_components else 0.0
    technical_score = max(-1.0, min(1.0, technical_score))

    return {
        "technical_score": technical_score,
        "signals": signals,
        "current_price": round(float(close.iloc[-1]), 2),
        "price_change_pct_30d": round(
            ((float(close.iloc[-1]) - float(close.iloc[0])) / float(close.iloc[0])) * 100, 2
        )
    }


def compute_intraday_score(symbol: str, market: str) -> dict:
    candles = get_history(symbol, market, period="1d", interval="5m")
    if len(candles) < 10:
        return {"technical_score": 0.0, "signals": {}, "error": "Insufficient intraday data"}

    df = pd.DataFrame(candles)
    close  = df["close"].astype(float)
    high   = df["high"].astype(float)
    low    = df["low"].astype(float)
    volume = df["volume"].astype(float)

    score_components = []
    signals = {}

    try:
        rsi = ta.momentum.RSIIndicator(close, window=9).rsi()
        r = float(rsi.iloc[-1])
        signals["rsi_9"] = round(r, 2)
        score_components.append(0.7 if r < 35 else (-0.7 if r > 65 else 0.0))
    except Exception:
        pass

    try:
        vwap = ta.volume.VolumeWeightedAveragePrice(high, low, close, volume).volume_weighted_average_price()
        vw = float(vwap.iloc[-1])
        price = float(close.iloc[-1])
        signals["vwap"] = round(vw, 2)
        score_components.append(0.5 if price > vw else -0.5)
    except Exception:
        pass

    technical_score = round(sum(score_components) / len(score_components), 3) if score_components else 0.0
    return {
        "technical_score": max(-1.0, min(1.0, technical_score)),
        "signals": signals,
        "current_price": round(float(close.iloc[-1]), 2),
    }