from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, stocks, news, prediction, watchlist, alerts, keys
import models  # noqa: F401 — registers all tables (incl. user_api_keys) before create_all

Base.metadata.create_all(bind=engine)

def _ensure_columns():
    """create_all doesn't alter existing tables; add columns introduced after first run."""
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "user_api_keys" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("user_api_keys")}
        if "google_key" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_api_keys ADD COLUMN google_key TEXT"))

_ensure_columns()

app = FastAPI(
    title="StockSense AI",
    description="AI-powered stock monitoring, news analysis, and prediction platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/auth",       tags=["Authentication"])
app.include_router(stocks.router,     prefix="/stocks",     tags=["Stocks"])
app.include_router(news.router,       prefix="/news",       tags=["News"])
app.include_router(prediction.router, prefix="/predict",    tags=["Prediction"])
app.include_router(watchlist.router,  prefix="/watchlist",  tags=["Watchlist"])
app.include_router(alerts.router,     prefix="/alerts",     tags=["Alerts"])
app.include_router(keys.router,       prefix="/keys",       tags=["API Keys"])

@app.get("/")
def root():
    return {"message": "StockSense AI API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}
