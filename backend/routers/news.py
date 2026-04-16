from fastapi import APIRouter, Query
from services.news_service import fetch_stock_news, fetch_market_news

router = APIRouter()

@router.get("/{symbol}")
def stock_news(symbol: str, company: str = Query(""), limit: int = Query(8)):
    return fetch_stock_news(symbol, company, limit)

@router.get("/market/{market}")
def market_news(market: str):
    return fetch_market_news(market)
