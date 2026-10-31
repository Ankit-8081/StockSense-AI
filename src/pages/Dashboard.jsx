import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw, Plus } from "lucide-react";
import { stocksAPI, watchlistAPI, newsAPI } from "../services/api";
import NewsCard from "../components/NewsCard";
import { useAuth } from "../context/AuthContext";
import { Delta, Segmented, Empty, Skel, money, currencyOf, isIndian } from "../components/ui";

const QUICK_STOCKS = {
  NSE: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "WIPRO", "SBIN", "BHARTIARTL"]
    .map((symbol) => ({ symbol, market: "NSE" })),
  BSE: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "WIPRO", "SBIN", "LT"]
    .map((symbol) => ({ symbol, market: "BSE" })),
  US: [["AAPL", "NASDAQ"], ["MSFT", "NASDAQ"], ["GOOGL", "NASDAQ"], ["AMZN", "NASDAQ"],
       ["NVDA", "NASDAQ"], ["META", "NASDAQ"], ["TSLA", "NASDAQ"], ["JPM", "NYSE"]]
    .map(([symbol, market]) => ({ symbol, market })),
};

// Tile tint follows today's move: stronger move, stronger color.
function tint(pct) {
  if (!pct) return "var(--panel)";
  const a = 0.12 + (Math.min(Math.abs(pct), 4) / 4) * 0.38;
  return pct > 0 ? `rgba(61, 203, 148, ${a})` : `rgba(245, 101, 122, ${a})`;
}

function HeatTile({ stock, quote, onOpen }) {
  const loaded = quote && quote.price > 0;
  return (
    <button className="heat-tile" style={{ background: loaded ? tint(quote.change_pct) : "var(--panel)" }}
      onClick={onOpen} aria-label={`${stock.symbol}, open details`}>
      <div>
        <div className="heat-sym">{stock.symbol}</div>
        <div className="heat-name">{quote?.name && quote.name !== stock.symbol ? quote.name : stock.market}</div>
      </div>
      {loaded ? (
        <div>
          <div className="heat-pct">
            <span aria-hidden="true" style={{ fontSize: "0.55em", marginRight: 6 }}>
              {quote.change_pct > 0 ? "▲" : quote.change_pct < 0 ? "▼" : "–"}
            </span>
            {quote.change_pct > 0 ? "+" : ""}{quote.change_pct.toFixed(2)}%
          </div>
          <div style={{ marginTop: 4, fontWeight: 500 }}>{money(quote.price, quote.currency)}</div>
        </div>
      ) : (
        <Skel w="60%" h={26} />
      )}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeMarket, setActiveMarket] = useState("NSE");
  const [indices, setIndices] = useState([]);
  const [indicesLoading, setIndicesLoading] = useState(false);
  const [quotes, setQuotes] = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [watchQuotes, setWatchQuotes] = useState({});
  const [news, setNews] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  useEffect(() => {
    setIndices([]);
    setIndicesLoading(true);
    stocksAPI.movers(activeMarket)
      .then((r) => setIndices(r.data?.indices || []))
      .catch(() => {})
      .finally(() => setIndicesLoading(false));
    newsAPI.marketNews(activeMarket).then((r) => setNews(r.data || [])).catch(() => setNews([]));
  }, [activeMarket]);

  useEffect(() => {
    watchlistAPI.get().then((r) => {
      const items = (r.data || []).slice(0, 6);
      setWatchlist(items);
      items.forEach(({ symbol, market }) =>
        stocksAPI.quote(symbol, market)
          .then((q) => setWatchQuotes((p) => ({ ...p, [`${symbol}-${market}`]: q.data })))
          .catch(() => {})
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setQuotes({});
    setLoadingQuotes(true);
    Promise.allSettled(
      (QUICK_STOCKS[activeMarket] || []).map(({ symbol, market }) =>
        stocksAPI.quote(symbol, market).then((r) => ({ key: `${symbol}-${market}`, ...r.data }))
      )
    ).then((results) => {
      const map = {};
      results.forEach((r) => { if (r.status === "fulfilled" && r.value?.key) map[r.value.key] = r.value; });
      setQuotes(map);
    }).finally(() => setLoadingQuotes(false));
  }, [activeMarket]);

  const live = Object.values(quotes).filter((q) => q.price > 0);
  const up = live.filter((q) => q.change_pct > 0).length;
  const down = live.filter((q) => q.change_pct < 0).length;
  const stocks = QUICK_STOCKS[activeMarket] || [];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Markets</h1>
          <p className="page-sub">
            {live.length
              ? `${up} up and ${down} down among ${live.length} large stocks. Hello, ${user?.name?.split(" ")[0] || "trader"}.`
              : loadingQuotes ? "Loading prices…" : "Prices are unavailable right now."}
          </p>
        </div>
        <div className="head-actions">
          {loadingQuotes && <RefreshCw size={15} className="spin muted" aria-label="Refreshing prices" />}
          <Segmented value={activeMarket} onChange={setActiveMarket} options={["NSE", "BSE", "US"]} label="Market" />
        </div>
      </div>

      {/* Indices */}
      <section className="panel idx" aria-label="Indices">
        {indicesLoading && indices.length === 0 ? (
          [0, 1, 2].map((i) => (
            <div className="idx-item" key={i}><Skel w="50%" /><Skel w="70%" h={30} style={{ margin: "8px 0" }} /><Skel w="30%" /></div>
          ))
        ) : indices.length === 0 ? (
          <div className="idx-item"><span className="muted">Index levels are unavailable right now.</span></div>
        ) : indices.map((idx) => (
          <div className="idx-item" key={idx.name}>
            <div className="idx-name">{idx.name}</div>
            <div className="idx-val">{idx.price > 0 ? idx.price.toLocaleString() : "—"}</div>
            <Delta pct={idx.change_pct} />
          </div>
        ))}
      </section>

      {/* Heat strip */}
      <section aria-label="Top stocks">
        <h2 className="section-title">{activeMarket === "US" ? "US large caps" : `${activeMarket} large caps`}</h2>
        <div className="heat">
          {stocks.map((s) => (
            <HeatTile key={`${s.symbol}-${s.market}`} stock={s} quote={quotes[`${s.symbol}-${s.market}`]}
              onOpen={() => navigate(`/stock/${s.market}/${s.symbol}`)} />
          ))}
        </div>
      </section>

      <div className="cols">
        <section className="panel" aria-label="News">
          <div className="panel-head">
            <h2 className="panel-title">Market news</h2>
            <Link className="link" to="/news">All news</Link>
          </div>
          {news.length === 0 ? (
            <Empty title="No headlines yet">
              News comes from Tavily. If this stays empty, check that your Tavily key is saved.
            </Empty>
          ) : (
            <ul className="row-list">
              {news.slice(0, 5).map((a, i) => <li key={i}><NewsCard article={a} /></li>)}
            </ul>
          )}
        </section>

        <section className="panel" aria-label="Watchlist">
          <div className="panel-head">
            <h2 className="panel-title">Watchlist</h2>
            <Link className="link" to="/watchlist">Manage</Link>
          </div>
          {watchlist.length === 0 ? (
            <Empty title="Nothing on your watchlist"
              action={<button className="btn btn-primary" onClick={() => navigate("/watchlist")}><Plus size={14} /> Add a stock</button>}>
              Follow the stocks you care about to see their prices here.
            </Empty>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <tbody>
                  {watchlist.map((item) => {
                    const q = watchQuotes[`${item.symbol}-${item.market}`];
                    return (
                      <tr key={item.id}>
                        <td>
                          <Link className="sym" to={`/stock/${item.market}/${item.symbol}`}>{item.symbol}</Link>
                          <span className="sub">{item.market}</span>
                        </td>
                        <td className="num">{q ? money(q.price, currencyOf(item.market)) : "—"}</td>
                        <td className="num"><Delta pct={q?.change_pct} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
