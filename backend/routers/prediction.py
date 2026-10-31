from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from agents.prediction_agent import predict
from services.secrets import get_user_keys
from models import PredictionHistory, Direction, PredictionType, Market
from database import get_db
from routers.auth import get_current_user
from models import User

router = APIRouter()

@router.get("/{symbol}")
def get_prediction(
    symbol: str,
    market: str = Query("NSE"),
    type: str = Query("delivery", regex="^(intraday|delivery)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    keys = get_user_keys(db, current_user.id)
    if not keys["groq"]:
        raise HTTPException(status_code=400, detail="Groq API key not set. Add it on the API Keys page.")
    result = predict(symbol, market, type, groq_key=keys["groq"], tavily_key=keys["tavily"])

    # Save to history
    try:
        record = PredictionHistory(
            user_id=current_user.id,
            symbol=symbol.upper(),
            market=Market(market.upper()),
            prediction_type=PredictionType(type),
            direction=Direction(result["direction"]),
            confidence=result["confidence"],
            sentiment_score=result["sentiment"]["score"],
            technical_score=result["technical"]["score"],
            summary=result["reasoning"],
        )
        db.add(record)
        db.commit()
    except Exception:
        pass

    return result

@router.get("/history/me")
def prediction_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = db.query(PredictionHistory)\
        .filter(PredictionHistory.user_id == current_user.id)\
        .order_by(PredictionHistory.created_at.desc())\
        .limit(50).all()
    return records
