from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Watchlist, Market
from routers.auth import get_current_user
from models import User
from services.stock_data import build_ticker

router = APIRouter()

class WatchlistAdd(BaseModel):
    symbol: str
    market: str

@router.get("/")
def get_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()

@router.post("/", status_code=201)
def add_to_watchlist(req: WatchlistAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.symbol == req.symbol.upper(),
        Watchlist.market == req.market.upper()
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    item = Watchlist(
        user_id=current_user.id,
        symbol=req.symbol.upper(),
        market=Market(req.market.upper()),
        yf_ticker=build_ticker(req.symbol, req.market),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def remove_from_watchlist(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Watchlist).filter(Watchlist.id == item_id, Watchlist.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"message": "Removed"}
