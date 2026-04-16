from fastapi import APIRouter, Query
from services.stock_data import get_quote, get_history, search_symbols, get_market_movers

router = APIRouter()

@router.get("/quote/{symbol}")
def quote(symbol: str, market: str = Query("NSE")):
    return get_quote(symbol, market)

@router.get("/history/{symbol}")
def history(
    symbol: str,
    market: str = Query("NSE"),
    period: str = Query("3mo"),
    interval: str = Query("1d")
):
    return {"symbol": symbol, "market": market, "candles": get_history(symbol, market, period, interval)}

@router.get("/search")
def search(q: str = Query(..., min_length=1)):
    return search_symbols(q)

@router.get("/movers")
def movers(market: str = Query("NSE")):
    return get_market_movers(market)
