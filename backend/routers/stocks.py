from fastapi import APIRouter, Query, Depends, HTTPException
from services.stock_data import get_quote, get_history, search_symbols, get_market_movers, check_sources

from routers.auth import get_current_user
from services.security import valid_symbol, valid_market, check_rate
from models import User


def _guard(user: User = Depends(get_current_user)):
    """Every /stocks route needs a login and is limited per user (these calls fan out to Yahoo/Groww)."""
    check_rate(f"stocks:{user.id}", 240, 60)


router = APIRouter(dependencies=[Depends(_guard)])

_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"}
_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo"}


@router.get("/quote/{symbol}")
def quote(symbol: str, market: str = Query("NSE"), detail: bool = Query(False)):
    valid_symbol(symbol); market = valid_market(market)
    q = get_quote(symbol, market)
    if detail and q.get("price"):
        from services.stock_data import _fill_ranges
        q = dict(q)
        _fill_ranges(q, symbol, market)   # derive 52-week / day range from candles if the source omitted them
    return q

@router.get("/history/{symbol}")
def history(
    symbol: str,
    market: str = Query("NSE"),
    period: str = Query("3mo"),
    interval: str = Query("1d")
):
    valid_symbol(symbol); market = valid_market(market)
    if period not in _PERIODS or interval not in _INTERVALS:
        raise HTTPException(status_code=422, detail="Invalid period or interval")
    return {"symbol": symbol, "market": market, "candles": get_history(symbol, market, period, interval)}

@router.get("/search")
def search(q: str = Query(..., min_length=1, max_length=40)):
    return search_symbols(q)

@router.get("/movers")
def movers(market: str = Query("NSE")):
    return get_market_movers(valid_market(market))


@router.get("/status")
def status():
    """Is each upstream price source (Groww, Yahoo) reachable and returning data?"""
    return check_sources()


@router.get("/technicals/{symbol}")
def technicals(symbol: str, market: str = Query("NSE")):
    valid_symbol(symbol); market = valid_market(market)
    from services.technicals import get_technicals
    return get_technicals(symbol, market)


@router.get("/events/{symbol}")
def events(symbol: str, market: str = Query("NSE")):
    valid_symbol(symbol); market = valid_market(market)
    from services.technicals import get_events
    return get_events(symbol, market)


@router.get("/company/{symbol}")
def company(symbol: str, market: str = Query("NSE")):
    valid_symbol(symbol); market = valid_market(market)
    from services.company import get_company
    return get_company(symbol, market)
