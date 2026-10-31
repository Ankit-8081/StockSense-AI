from tavily import TavilyClient


def _format(results: list) -> list:
    return [
        {
            "title": r.get("title"),
            "url": r.get("url"),
            "content": r.get("content"),
            "published_date": r.get("published_date"),
            "source": r.get("url", "").split("/")[2] if r.get("url") else "",
        }
        for r in results
    ]

def fetch_stock_news(symbol: str, company_name: str = "", max_results: int = 8, api_key: str = None) -> list:
    if not api_key:
        return []
    query = f"{company_name or symbol} stock news analysis"
    try:
        response = TavilyClient(api_key=api_key).search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=False,
            topic="news"
        )
        return _format(response.get("results", []))
    except Exception:
        return []

def fetch_market_news(market: str = "NSE", api_key: str = None) -> list:
    if not api_key:
        return []
    query = "Indian stock market NSE BSE today" if market in ["NSE", "BSE"] else "US stock market NYSE NASDAQ today"
    try:
        response = TavilyClient(api_key=api_key).search(
            query=query, search_depth="basic", max_results=6, topic="news"
        )
        return _format(response.get("results", []))
    except Exception:
        return []
