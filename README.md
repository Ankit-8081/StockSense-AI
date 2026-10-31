# 📈 StockSense AI

> AI-powered stock monitoring and prediction platform for Indian (NSE/BSE) and US (NYSE/NASDAQ) markets.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)
![LangChain](https://img.shields.io/badge/LangChain-0.2-orange?style=flat-square)

---

## 🚀 What is StockSense AI?

StockSense AI combines **real-time stock data**, **live news sentiment analysis**, and **technical indicators** to predict whether a stock will go **UP ↑** or **DOWN ↓** — for both **intraday** and **delivery/swing** timeframes.

---

## ✨ Features

- 📊 **Real-time quotes** — NSE, BSE via Groww API · NYSE, NASDAQ via Yahoo Finance
- 🤖 **AI Predictions** — Groq LLM (llama3-70b) combines sentiment + technical signals
- 📰 **News Sentiment** — Tavily fetches live news and scores it bullish/bearish
- 📉 **Technical Analysis** — RSI, MACD, Bollinger Bands, SMA crossover, VWAP, Volume
- ⚡ **Intraday mode** — 5-min candles, VWAP + RSI(9) weighted 70% technical
- 📦 **Delivery mode** — daily candles, full indicator suite, 55% technical / 45% sentiment
- ⭐ **Watchlist** — track your favorite stocks with live prices
- 🔔 **Price Alerts** — get notified when a stock crosses your target
- 🔍 **Screener** — scan NSE top 20 or US top 15 stocks at once
- 🔐 **Auth** — JWT-based register/login with bcrypt password hashing

---

## 🧠 How Predictions Work

```
News (Tavily) → Sentiment Agent (Groq LLM) → sentiment_score
OHLCV (Groww/YFinance) → Technical Agent → RSI, MACD, BB, SMA, VWAP → technical_score

Combined Score = (sentiment × weight) + (technical × weight)
     ↓
Prediction Agent (Groq LLM)
     ↓
direction: UP | DOWN | NEUTRAL
confidence: 0.0 – 1.0
reasoning + key_risks + target_range
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Database | SQLite (local) / PostgreSQL Neon (production) |
| Auth | JWT + bcrypt |
| AI | LangChain + Groq (llama3-70b) |
| News | Tavily Search API |
| Indian Market Data | Groww Public API |
| US Market Data | Yahoo Finance v8 API |
| Charts | Recharts |
| Deployment | Vercel (frontend) + Render (backend) |

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys: [Groq](https://console.groq.com) · [Tavily](https://tavily.com) · [Google Gemini](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/Ankit-8081/StockSense-AI.git
cd StockSense-AI
```

### 2. Backend
```bash
cd Backend
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate    # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Fill in your API keys in .env

python setup_db.py
uvicorn main:app --reload
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 3. Frontend
```bash
cd ..
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8000

npm install
npm run dev
# App running at http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (`Backend/.env`)
```env
DATABASE_URL=sqlite:///./stocksense.db
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaxxxxxxxxxxxxxxxxxx
SECRET_KEY=your-secret-key-here
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📁 Project Structure

```
StockSense-AI/
├── Backend/
│   ├── agents/
│   │   ├── prediction_agent.py   ← Main AI pipeline
│   │   ├── sentiment_agent.py    ← News → sentiment score
│   │   └── technical_agent.py   ← RSI, MACD, BB, SMA, VWAP
│   ├── routers/
│   │   ├── auth.py               ← JWT auth
│   │   ├── stocks.py             ← Quotes, history, search
│   │   ├── news.py               ← Tavily news
│   │   ├── prediction.py         ← AI predictions
│   │   ├── watchlist.py          ← Watchlist CRUD
│   │   └── alerts.py             ← Price alerts
│   ├── services/
│   │   ├── stock_data.py         ← Groww + YF APIs
│   │   └── news_service.py       ← Tavily wrapper
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── requirements.txt
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── PredictionCard.jsx
│   │   ├── PriceChart.jsx
│   │   ├── NewsCard.jsx
│   │   └── StockMiniCard.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── StockDetail.jsx
│   │   ├── Predictions.jsx
│   │   ├── Screener.jsx
│   │   ├── NewsFeed.jsx
│   │   ├── Watchlist.jsx
│   │   └── Auth.jsx
│   └── App.jsx
├── index.html
├── package.json
└── vite.config.js
```

---

## ☁️ Deployment

### Backend → Render
- Root directory: `Backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add all env variables

### Frontend → Vercel
- Framework: Vite
- Set `VITE_API_BASE_URL=https://your-app.onrender.com`

---

## 👤 Author

**Ankit** — B.Tech CSE · AI Engineer
[GitHub](https://github.com/Ankit-8081) · [LinkedIn](https://linkedin.com/in/ankit-8081)

---

## 📄 License
Licensed under the [PPL License](./License).
