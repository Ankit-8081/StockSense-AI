from langchain.schema import SystemMessage, HumanMessage
from agents.sentiment_agent import analyze_sentiment
from agents.technical_agent import compute_technical_score, compute_intraday_score
from services.news_service import fetch_stock_news
from services.stock_data import get_quote
from services.llm import ask_json
import json

PREDICTION_PROMPT = """You are an expert stock market analyst and trader.
You will receive technical indicators and news sentiment data for a stock.
Generate a prediction in JSON format with these exact keys:
- direction: "UP" | "DOWN" | "NEUTRAL"
- confidence: float 0.0 to 1.0
- reasoning: 3-4 sentence explanation for the prediction
- key_risks: list of 2-3 short risk factors
- target_range: object with "low" and "high" as % move (e.g. {"low": 0.5, "high": 2.0})
Respond ONLY with the JSON object, no markdown, no extra text."""

def _combine_scores(sentiment_score: float, technical_score: float,
                    sent_weight: float = 0.4, tech_weight: float = 0.6) -> float:
    return round(sentiment_score * sent_weight + technical_score * tech_weight, 3)

def _score_to_direction(score: float) -> str:
    if score > 0.15:
        return "UP"
    elif score < -0.15:
        return "DOWN"
    return "NEUTRAL"

def predict(symbol: str, market: str, prediction_type: str = "delivery",
            groq_key: str = None, tavily_key: str = None, google_key: str = None) -> dict:
    """
    prediction_type: 'intraday' (same day) | 'delivery' (swing, 3-10 days)
    """
    # 1. Fetch data
    quote = get_quote(symbol, market)
    articles = fetch_stock_news(symbol, quote.get("name", symbol), api_key=tavily_key, market=market)

    # 2. Sentiment analysis
    sentiment = analyze_sentiment(symbol, articles, groq_key=groq_key, google_key=google_key)

    # 3. Technical analysis
    if prediction_type == "intraday":
        technical = compute_intraday_score(symbol, market)
        horizon = "today (intraday)"
        sent_w, tech_w = 0.3, 0.7   # intraday is more technical
    else:
        technical = compute_technical_score(symbol, market)
        horizon = "next 3–10 trading days (delivery/swing)"
        sent_w, tech_w = 0.45, 0.55  # delivery balances both

    # 4. Composite score
    combined_score = _combine_scores(
        sentiment.get("sentiment_score", 0),
        technical.get("technical_score", 0),
        sent_w, tech_w
    )
    rough_direction = _score_to_direction(combined_score)

    # 5. LLM final judgement
    context = {
        "symbol": symbol,
        "market": market,
        "current_price": technical.get("current_price") or quote.get("price"),
        "prediction_type": prediction_type,
        "horizon": horizon,
        "combined_score": combined_score,
        "sentiment": {
            "score": sentiment.get("sentiment_score"),
            "label": sentiment.get("sentiment_label"),
            "key_themes": sentiment.get("key_themes"),
            "summary": sentiment.get("summary"),
        },
        "technical": {
            "score": technical.get("technical_score"),
            "signals": technical.get("signals"),
            "price_change_30d_pct": technical.get("price_change_pct_30d"),
        },
        "rough_direction": rough_direction,
    }

    messages = [
        SystemMessage(content=PREDICTION_PROMPT),
        HumanMessage(content=json.dumps(context, indent=2))
    ]

    try:
        llm_result = ask_json(messages, groq_key=groq_key, google_key=google_key, temperature=0.15)
    except Exception:
        llm_result = {
            "direction": rough_direction,
            "confidence": abs(combined_score),
            "reasoning": sentiment.get("summary", "Based on technical and sentiment analysis."),
            "key_risks": ["Market volatility", "Macroeconomic factors"],
            "target_range": {"low": 0.5, "high": 1.5},
        }

    return {
        "symbol": symbol.upper(),
        "market": market.upper(),
        "prediction_type": prediction_type,
        "current_price": technical.get("current_price") or quote.get("price"),
        "currency": quote.get("currency", "INR"),
        "direction": llm_result.get("direction", rough_direction),
        "confidence": round(min(1.0, max(0.0, float(llm_result.get("confidence", abs(combined_score))))), 2),
        "reasoning": llm_result.get("reasoning", ""),
        "key_risks": llm_result.get("key_risks", []),
        "target_range": llm_result.get("target_range", {}),
        "combined_score": combined_score,
        "sentiment": {
            "score": sentiment.get("sentiment_score"),
            "label": sentiment.get("sentiment_label"),
            "key_themes": sentiment.get("key_themes", []),
            "summary": sentiment.get("summary", ""),
        },
        "technical": {
            "score": technical.get("technical_score"),
            "signals": technical.get("signals", {}),
        },
        "news_count": len(articles),
    }
