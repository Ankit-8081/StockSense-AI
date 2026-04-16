from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Alert
from routers.auth import get_current_user
from models import User
from services.stock_data import build_ticker

router = APIRouter()

class AlertCreate(BaseModel):
    symbol: str
    market: str
    condition: str   # "above" | "below"
    target_price: float

@router.get("/")
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_triggered == False).all()

@router.post("/", status_code=201)
def create_alert(req: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
