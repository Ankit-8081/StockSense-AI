from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Literal
from pydantic import BaseModel, Field
from database import get_db
from models import Alert
from routers.auth import get_current_user
from models import User
from services.stock_data import build_ticker, get_quote

router = APIRouter()

class AlertCreate(BaseModel):
    symbol: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9.&_-]{0,19}$")
    market: Literal["NSE", "BSE", "NYSE", "NASDAQ"]
    condition: Literal["above", "below"]
    target_price: float = Field(gt=0, lt=1e9, allow_inf_nan=False)

def _market_from_ticker(yf_ticker: str) -> str:
    if yf_ticker.endswith(".NS"):
        return "NSE"
    if yf_ticker.endswith(".BO"):
        return "BSE"
    return "NASDAQ"

@router.get("/")
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_triggered == False).all()

@router.get("/check")
def check_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Evaluate the user's pending alerts against live prices; mark and return any that fired."""
    pending = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_triggered == False).all()
    fired = []
    for a in pending:
        quote = get_quote(a.symbol, _market_from_ticker(a.yf_ticker))
        price = quote.get("price") or 0
        if price <= 0:
            continue
        hit = (a.condition == "above" and price >= a.target_price) or \
              (a.condition == "below" and price <= a.target_price)
        if hit:
            a.is_triggered = True
            fired.append({
                "id": a.id, "symbol": a.symbol, "condition": a.condition,
                "target_price": a.target_price, "price": price,
                "currency": quote.get("currency", "INR"),
            })
    if fired:
        db.commit()
    return fired

@router.post("/", status_code=201)
def create_alert(req: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.condition not in ("above", "below"):
        raise HTTPException(status_code=400, detail="condition must be 'above' or 'below'")
    alert = Alert(
        user_id=current_user.id,
        symbol=req.symbol.upper(),
        yf_ticker=build_ticker(req.symbol, req.market),
        condition=req.condition,
        target_price=req.target_price,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(alert)
    db.commit()
    return {"message": "Deleted"}
