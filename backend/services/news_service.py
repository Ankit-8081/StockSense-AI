import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus
from tavily import TavilyClient

_EDITIONS = {
    "IN": "hl=en-IN&gl=IN&ceid=IN:en",
    "US": "hl=en-US&gl=US&ceid=US:en",
}
_EPOCH = datetime.fromtimestamp(0, tz=timezone.utc)


def _edition(market: str) -> str:
    return _EDITIONS["IN" if str(market).upper() in ("NSE", "BSE", "IN") else "US"]


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


def _google_news(query: str, market: str, limit: int = 10) -> list:
    """Google News RSS: no API key needed."""
    url = f"https://news.google.com/rss/search?q={quote_plus(query)}&{_edition(market)}"
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=8)
        if r.status_code != 200:
            return []
        items = []
        for it in ET.fromstring(r.content).iter("item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            if not title or not link:
                continue
            src = it.find("source")
            source = (src.text or "").strip() if src is not None else ""
            if source and title.endswith(f" - {source}"):  # Google appends the publisher to the title
                title = title[: -(len(source) + 3)]
            pub = it.findtext("pubDate")
            try:
                published = parsedate_to_datetime(pub).astimezone(timezone.utc).isoformat() if pub else None
            except Exception:
                published = None
            items.append({
                "title": title, "url": link, "content": "",
                "published_date": published, "source": source or "news.google.com",
            })
            if len(items) >= limit:
                break
        return items
    except Exception:
        return []


def _tavily(query: str, api_key: str, max_results: int) -> list:
    if not api_key:
        return []
    try:
        response = TavilyClient(api_key=api_key).search(
            query=query, search_depth="basic", max_results=max_results,
            include_answer=False, topic="news",
        )
        return _format(response.get("results", []))
    except Exception:
        return []


def _when(article: dict) -> datetime:
    d = article.get("published_date")
    if not d:
        return _EPOCH
    for parse in (parsedate_to_datetime, datetime.fromisoformat):
        try:
            dt = parse(d)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
    return _EPOCH


def _merge(*lists, cap: int) -> list:
    """Combine sources, drop near-duplicate headlines, newest first."""
    seen, merged = set(), []
    for article in (a for lst in lists for a in lst):
        key = re.sub(r"[^a-z0-9]", "", (article.get("title") or "").lower())[:60]
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(article)
    merged.sort(key=_when, reverse=True)
    return merged[:cap]


def fetch_stock_news(symbol: str, company_name: str = "", max_results: int = 8,
                     api_key: str = None, market: str = "NSE") -> list:
    name = company_name or symbol
    return _merge(
        _tavily(f"{name} stock news analysis", api_key, max_results),
        _google_news(f"{name} stock", market, 12),
        cap=max(max_results, 16),
    )


def fetch_market_news(market: str = "NSE", api_key: str = None) -> list:
    if market in ("NSE", "BSE"):
        tavily_q, google_q = "Indian stock market NSE BSE today", "Sensex Nifty stock market India"
    else:
        tavily_q, google_q = "US stock market NYSE NASDAQ today", "Wall Street stock market"
    return _merge(
        _tavily(tavily_q, api_key, 6),
        _google_news(google_q, market, 15),
        cap=20,
    )
