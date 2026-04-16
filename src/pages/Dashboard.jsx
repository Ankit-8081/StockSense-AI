import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, RefreshCw, Plus, Activity } from "lucide-react";
import { stocksAPI, watchlistAPI, newsAPI } from "../services/api";
import StockMiniCard from "../components/StockMiniCard";
import NewsCard from "../components/NewsCard";
import { useAuth } from "../context/AuthContext";

const C = { bg: "#131929", border: "#1e2d40", teal: "#14b8a6", text: "#e2e8f0", muted: "#64748b", card: "#0f1420" };

const QUICK_STOCKS = {
  NSE: [
    { symbol: "RELIANCE",   market: "NSE" }, { symbol: "TCS",       market: "NSE" },
    { symbol: "INFY",       market: "NSE" }, { symbol: "HDFCBANK",  market: "NSE" },
    { symbol: "ICICIBANK",  market: "NSE" }, { symbol: "WIPRO",     market: "NSE" },
    { symbol: "SBIN",       market: "NSE" }, { symbol: "BHARTIARTL",market: "NSE" },
  ],
  BSE: [
    { symbol: "RELIANCE",   market: "BSE" }, { symbol: "TCS",       market: "BSE" },
    { symbol: "INFY",       market: "BSE" }, { symbol: "HDFCBANK",  market: "BSE" },
    { symbol: "ICICIBANK",  market: "BSE" }, { symbol: "WIPRO",     market: "BSE" },
    { symbol: "SBIN",       market: "BSE" }, { symbol: "LT",        market: "BSE" },
  ],
  US: [
    { symbol: "AAPL",  market: "NASDAQ" }, { symbol: "MSFT",  market: "NASDAQ" },
    { symbol: "GOOGL", market: "NASDAQ" }, { symbol: "AMZN",  market: "NASDAQ" },
    { symbol: "NVDA",  market: "NASDAQ" }, { symbol: "META",  market: "NASDAQ" },
    { symbol: "TSLA",  market: "NASDAQ" }, { symbol: "JPM",   market: "NYSE"   },
  ],
};

function StatCard({ label, value, icon: Icon, color = C.teal }) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: "14px", padding: "18px 20px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{
          width: 34, height: 34, borderRadius: "8px",
          background: `${color}18`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span className="live-dot" />
          <span style={{ fontSize: "10px", color: C.teal, fontWeight: 600, letterSpacing: "0.5px" }}>LIVE</span>
        </div>
      </div>
      <p style={{ fontSize: "22px", fontWeight: 700, color: C.text, margin: 0 }}>{value}</p>
      <p style={{ fontSize: "12px", color: C.muted, marginTop: "4px" }}>{label}</p>
    </div>
  );
}

function IndexCard({ name, price, change_pct }) {
  const isUp = change_pct >= 0;
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: "12px", padding: "14px 16px",
    }}>
      <p style={{ fontSize: "11px", color: C.muted, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>{name}</p>
      <p style={{ fontSize: "18px", fontWeight: 700, color: C.text, margin: "0 0 4px 0" }}>
        {price > 0 ? price.toLocaleString() : "—"}
      </p>
      <p style={{
        fontSize: "12px", fontWeight: 600, margin: 0,
        color: isUp ? "#10b981" : "#ef4444",
        display: "flex", alignItems: "center", gap: "3px",
      }}>
        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {isUp ? "+" : ""}{change_pct?.toFixed(2)}%
      </p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [activeMarket, setActiveMarket] = useState("NSE");
  const [indices, setIndices]   = useState([]);
  const [quotes, setQuotes]     = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [news, setNews]         = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  useEffect(() => {
    setIndices([]);
    stocksAPI.movers(activeMarket === "US" ? "US" : activeMarket)
      .then(r => setIndices(r.data?.indices || [])).catch(() => {});
  }, [activeMarket]);

  useEffect(() => {
    watchlistAPI.get().then(r => setWatchlist(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    newsAPI.marketNews(activeMarket).then(r => setNews(r.data || [])).catch(() => {});
  }, [activeMarket]);

  useEffect(() => {
    setQuotes({});
    setLoadingQuotes(true);
    const stocks = QUICK_STOCKS[activeMarket] || [];
    Promise.allSettled(
      stocks.map(({ symbol, market }) =>
        stocksAPI.quote(symbol, market).then(r => ({ key: `${symbol}-${market}`, ...r.data }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { if (r.status === "fulfilled" && r.value?.key) map[r.value.key] = r.value; });
      setQuotes(map);
    }).finally(() => setLoadingQuotes(false));
  }, [activeMarket]);

  const currency = activeMarket === "US" ? "USD" : "INR";
  const totalStocks = Object.values(quotes).filter(q => q.price > 0).length;
  const gainers = Object.values(quotes).filter(q => q.change_pct > 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.5px" }}>
            Welcome back, <span style={{ color: C.teal }}>{user?.name?.split(" ")[0] || "Trader"}</span>
          </h1>
          <p style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>
            Real-time market data · AI-powered signals
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["NSE", "BSE", "US"].map(m => (
            <button key={m} onClick={() => setActiveMarket(m)} style={{
              padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s", border: "1px solid",
              borderColor: activeMarket === m ? C.teal : C.border,
              background: activeMarket === m ? "rgba(20,184,166,0.15)" : C.bg,
              color: activeMarket === m ? C.teal : C.muted,
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" }}>
        <StatCard label="Live stocks" value={totalStocks || "—"} icon={Activity} color={C.teal} />
        <StatCard label="Gainers today" value={gainers || "—"} icon={TrendingUp} color="#10b981" />
        <StatCard label="Losers today" value={(totalStocks - gainers) || "—"} icon={TrendingDown} color="#ef4444" />
        <StatCard label="Market" value={activeMarket} icon={BarChart2} color="#6366f1" />
      </div>

      {/* Indices */}
      {indices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {indices.map((idx, i) => <IndexCard key={i} {...idx} />)}
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }} className="dashboard-grid">
        {/* Stocks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>
              {activeMarket === "US" ? "US Markets" : `${activeMarket} Top Stocks`}
            </h2>
            {loadingQuotes && <RefreshCw size={15} color={C.teal} style={{ animation: "spin 1s linear infinite" }} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {(QUICK_STOCKS[activeMarket] || []).map(({ symbol, market }) => {
              const key = `${symbol}-${market}`;
              const q = quotes[key];
              return (
                <StockMiniCard key={key} symbol={symbol} market={market}
                  name={q?.name || symbol} price={q?.price} change_pct={q?.change_pct}
                  currency={currency} onClick={() => navigate(`/stock/${market}/${symbol}`)} />
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Watchlist */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: 0 }}>My Watchlist</h2>
              <button onClick={() => navigate("/watchlist")} style={{
                fontSize: "12px", color: C.teal, background: "none", border: "none", cursor: "pointer",
              }}>Manage →</button>
            </div>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: "13px", color: C.muted, marginBottom: "10px" }}>No stocks added yet</p>
                <button onClick={() => navigate("/watchlist")} style={{
                  fontSize: "12px", color: C.teal, background: "rgba(20,184,166,0.1)",
                  border: "1px solid rgba(20,184,166,0.2)", borderRadius: "6px",
                  padding: "6px 14px", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: "4px",
                }}>
                  <Plus size={12} /> Add stocks
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {watchlist.slice(0, 5).map(item => (
                  <StockMiniCard key={item.id} symbol={item.symbol} market={item.market}
                    currency={["NSE","BSE"].includes(item.market) ? "INR" : "USD"}
                    onClick={() => navigate(`/stock/${item.market}/${item.symbol}`)} />
                ))}
              </div>
            )}
          </div>

          {/* News */}
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 10px 4px" }}>Market News</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {news.slice(0, 4).map((article, i) => <NewsCard key={i} article={article} />)}
            </div>
            <button onClick={() => navigate("/news")} style={{
              width: "100%", marginTop: "10px", padding: "9px",
              background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)",
              borderRadius: "8px", fontSize: "13px", color: C.teal, cursor: "pointer",
            }}>
              View all news →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function BarChart2({ size, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}