"""Shared security helpers: rate limiting and input validation."""
import re
import time
import threading
from collections import defaultdict, deque
from fastapi import HTTPException, Request

_lock = threading.Lock()
_hits: dict = defaultdict(deque)
_MAX_KEYS = 20000

SYMBOL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.&_-]{0,19}$")
MARKETS = {"NSE", "BSE", "NYSE", "NASDAQ", "US"}


def client_ip(request: Request) -> str:
    # Behind a trusted proxy (Vercel/Render/Nginx) put it in front with --proxy-headers so request.client is the real IP.
    return request.client.host if request.client else "unknown"


def check_rate(key: str, limit: int, window: int) -> None:
    """Allow `limit` calls per `window` seconds for `key`, else raise 429."""
    now = time.time()
    with _lock:
        if len(_hits) > _MAX_KEYS:                       # bound memory
            for k in [k for k, q in _hits.items() if not q or now - q[-1] > window]:
                _hits.pop(k, None)
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            retry = int(window - (now - q[0])) + 1
            raise HTTPException(status_code=429, detail="Too many requests. Please slow down and try again later.",
                                headers={"Retry-After": str(retry)})
        q.append(now)


def rate_limit_ip(name: str, limit: int, window: int):
    def dep(request: Request):
        check_rate(f"{name}:{client_ip(request)}", limit, window)
    return dep


def valid_symbol(symbol: str) -> str:
    if not SYMBOL_RE.match(symbol or ""):
        raise HTTPException(status_code=422, detail="Invalid symbol")
    return symbol


def valid_market(market: str) -> str:
    m = (market or "").upper()
    if m not in MARKETS:
        raise HTTPException(status_code=422, detail="Invalid market")
    return m
