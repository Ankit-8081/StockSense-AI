from tavily import TavilyClient
import os

client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def fetch_stock_news(symbol: str, company_name: str = "", max_results: int = 8) -> list:
    query = f"{company_name or symbol} stock news analysis"
    try:
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=False,
            topic="news"
        )
        articles = []
        for r in response.get("results", []):
            articles.append({
                "title": r.get("title"),
                "url": r.get("url"),
                "content": r.get("content"),
                "published_date": r.get("published_date"),
                "source": r.get("url", "").split("/")[2] if r.get("url") else "",
            })
        return articles
    except Exception as e:
        return []

def fetch_market_news(market: str = "NSE") -> list:
    query = "Indian stock market NSE BSE today" if market in ["NSE", "BSE"] else "US stock market NYSE NASDAQ today"
    try:
        response = client.search(query=query, search_depth="basic", max_results=6, topic="news")
        return [
            {
                "title": r.get("title"),
                "url": r.get("url"),
                "content": r.get("content"),
                "published_date": r.get("published_date"),
                "source": r.get("url", "").split("/")[2] if r.get("url") else "",
            }
            for r in response.get("results", [])
        ]
    except Exception:
        return []
