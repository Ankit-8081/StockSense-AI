from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from routers.auth import get_current_user
from services.security import valid_symbol, valid_market, check_rate
from services.news_service import fetch_stock_news, fetch_market_news
from services.secrets import get_user_keys

router = APIRouter()

@router.get("/{symbol}")
def stock_news(symbol: str, company: str = Query("", max_length=80), limit: int = Query(8, ge=1, le=20), market: str = Query("NSE"),
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    valid_symbol(symbol); market = valid_market(market); check_rate(f"news:{current_user.id}", 60, 60)
    keys = get_user_keys(db, current_user.id)
    return fetch_stock_news(symbol, company, limit, api_key=keys["tavily"], market=market)

@router.get("/market/{market}")
def market_news(market: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    market = valid_market(market); check_rate(f"news:{current_user.id}", 60, 60)
    keys = get_user_keys(db, current_user.id)
    return fetch_market_news(market, api_key=keys["tavily"])
