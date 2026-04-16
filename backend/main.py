from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, stocks, news, prediction, watchlist, alerts

Base.metadata.create_all(bind=engine)

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

@app.get("/")
def root():
    return {"message": "StockSense AI API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}
