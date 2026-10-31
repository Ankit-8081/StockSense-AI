from langchain_groq import ChatGroq
from langchain.schema import SystemMessage, HumanMessage
import json

SYSTEM_PROMPT = """You are a financial sentiment analysis expert.
Given a list of news articles about a stock, analyze the overall sentiment and return a JSON object with:
- sentiment_score: float from -1.0 (very bearish) to 1.0 (very bullish)
- sentiment_label: "BULLISH" | "BEARISH" | "NEUTRAL"
- confidence: float from 0.0 to 1.0
- key_themes: list of up to 4 short strings describing main news themes
- summary: 2-sentence summary of what the news means for the stock
Respond ONLY with the JSON object, no markdown, no extra text."""

def analyze_sentiment(symbol: str, articles: list, groq_key: str = None) -> dict:
    if not articles:
        return {
            "sentiment_score": 0.0,
            "sentiment_label": "NEUTRAL",
            "confidence": 0.0,
            "key_themes": [],
            "summary": "No recent news found for this stock."
        }

    news_text = "\n\n".join([
        f"Title: {a.get('title','')}\nContent: {(a.get('content') or '')[:400]}"
        for a in articles[:6]
    ])

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Stock: {symbol}\n\nNews articles:\n{news_text}")
    ]

    try:
        llm = ChatGroq(api_key=groq_key, model_name="llama-3.3-70b-versatile", temperature=0.1)
        response = llm.invoke(messages)
        raw = response.content.strip()
        result = json.loads(raw)
        return result
    except Exception as e:
        return {
            "sentiment_score": 0.0,
            "sentiment_label": "NEUTRAL",
            "confidence": 0.3,
            "key_themes": ["Data unavailable"],
            "summary": f"Could not analyze sentiment: {str(e)}"
        }
