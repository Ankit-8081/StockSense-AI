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
    if not keys["groq"] and not keys["google"]:
        raise HTTPException(status_code=400, detail="No AI API key set. Add a Groq or Google AI key on the API Keys page.")
    result = predict(symbol, market, type, groq_key=keys["groq"], tavily_key=keys["tavily"], google_key=keys["google"])

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


_insight_cache = {}

@router.get("/insights/{symbol}")
def get_insights(
    symbol: str,
    market: str = Query("NSE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Two short AI takeaways (financials, news) shown at the top of the stock page."""
    import time
    from langchain.schema import HumanMessage
    from services.llm import ask_json
    from services.company import get_company
    from services.news_service import fetch_stock_news

    keys = get_user_keys(db, current_user.id)
    if not keys["groq"] and not keys["google"]:
        return {"available": False, "reason": "no_key", "insights": []}
    ck = (symbol.upper(), market.upper())
    hit = _insight_cache.get(ck)
    if hit and time.time() - hit[0] < 1800:
        return hit[1]

    co = get_company(symbol, market)
    q = co["financials"]["quarterly"]
    fin_lines = [f"{r['period']}: revenue {r['revenue']:.3g}, profit {r['profit'] if r['profit'] is None else format(r['profit'], '.3g')}" for r in q]
    news = fetch_stock_news(symbol, "", 8, keys["tavily"], market)
    heads = [f"- {a.get('title', '')}" for a in news[:8]]
    if not fin_lines and not heads:
        return {"available": False, "reason": "no_data", "insights": []}

    prompt = (
        f"Stock: {symbol.upper()} ({market}).\nQuarterly results (oldest first):\n" + ("\n".join(fin_lines) or "none") +
        f"\nFundamentals: {co['fundamentals']}\nRecent headlines:\n" + ("\n".join(heads) or "none") +
        '\n\nWrite two plain-English takeaways for an investor, each ONE sentence under 30 words, using only the data above. '
        'Return JSON: {"financial": {"text": "...", "tone": "up|down|flat"}, "news": {"text": "...", "tone": "up|down|flat"}}. '
        'If there is no data for one, set its text to "". Do not give buy or sell advice.'
    )
    try:
        out = ask_json([HumanMessage(content=prompt)], groq_key=keys["groq"], google_key=keys["google"], temperature=0.2)
    except Exception:
        return {"available": False, "reason": "ai_failed", "insights": []}
    insights = []
    for k, label in (("financial", "Financial"), ("news", "News")):
        v = out.get(k) or {}
        if isinstance(v, dict) and v.get("text"):
            insights.append({"label": label, "text": v["text"], "tone": v.get("tone", "flat")})
    res = {"available": bool(insights), "insights": insights}
    if insights:
        _insight_cache[ck] = (time.time(), res)
    return res
