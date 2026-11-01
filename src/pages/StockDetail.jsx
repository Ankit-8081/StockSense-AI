import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Star, Bell, Activity } from "lucide-react";
import { stocksAPI, newsAPI, predictionAPI, watchlistAPI, alertsAPI } from "../services/api";
import PriceChart from "../components/PriceChart";
import PredictionCard from "../components/PredictionCard";
import NewsCard from "../components/NewsCard";
import { Delta, RangeBar, Segmented, Empty, Skel, money, compact, currencyOf, symbolOf } from "../components/ui";

export default function StockDetail() {
  const { market, symbol } = useParams();
  const [quote, setQuote] = useState(null);
  const [news, setNews] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predError, setPredError] = useState("");
  const [predType, setPredType] = useState("delivery");
  const [loadingPred, setLoadingPred] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistId, setWatchlistId] = useState(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState("above");
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertError, setAlertError] = useState("");
  const currency = currencyOf(market);

  useEffect(() => {
    if (!symbol || !market) return;
    setQuote(null); setPrediction(null); setPredError(""); setInWatchlist(false); setWatchlistId(null);
    stocksAPI.quote(symbol, market).then((r) => setQuote(r.data)).catch(() => {});
    newsAPI.stockNews(symbol, "", market).then((r) => setNews(r.data || [])).catch(() => setNews([]));
    watchlistAPI.get().then((r) => {
      const found = r.data?.find((w) => w.symbol === symbol.toUpperCase() && w.market === market.toUpperCase());
      if (found) { setInWatchlist(true); setWatchlistId(found.id); }
    }).catch(() => {});
  }, [symbol, market]);

  const fetchPrediction = () => {
    setLoadingPred(true);
    setPrediction(null);
    setPredError("");
    predictionAPI.predict(symbol, market, predType)
      .then((r) => setPrediction(r.data))
      .catch((e) => setPredError(e.response?.data?.detail || "The prediction service didn't respond. Try again in a moment."))
      .finally(() => setLoadingPred(false));
  };

  const toggleWatchlist = () => {
    if (inWatchlist) {
      watchlistAPI.remove(watchlistId).then(() => { setInWatchlist(false); setWatchlistId(null); });
    } else {
      watchlistAPI.add(symbol, market).then((r) => { setInWatchlist(true); setWatchlistId(r.data.id); });
    }
  };

  const saveAlert = (e) => {
    e.preventDefault();
    setAlertError("");
    if (!alertPrice) return;
    alertsAPI.create({ symbol, market, condition: alertCondition, target_price: parseFloat(alertPrice) })
      .then(() => { setAlertSaved(true); setAlertPrice(""); setTimeout(() => setAlertSaved(false), 3000); })
      .catch(() => setAlertError("Couldn't save the alert. Try again."));
  };

  const priced = quote && quote.price > 0;

  return (
    <div className="stack">
      {/* Header */}
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 className="big-sym">{symbol?.toUpperCase()}</h1>
            <span className="tag">{market?.toUpperCase()}</span>
          </div>
          <p className="page-sub">{quote?.name && quote.name !== symbol.toUpperCase() ? quote.name : " "}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {quote ? (
            <>
              <div className="big-price">{priced ? money(quote.price, currency) : "—"}</div>
              {priced && (
                <div style={{ marginTop: 6, fontSize: 16 }}>
                  <Delta pct={quote.change_pct} />
                  <span className="muted" style={{ marginLeft: 8 }}>
                    {quote.change > 0 ? "+" : ""}{quote.change} today
                  </span>
                </div>
              )}
            </>
          ) : <Skel w={180} h={44} />}
        </div>
      </div>

      <div className="cols cols-detail">
        <div className="stack">
          <PriceChart symbol={symbol} market={market} currency={currency} />

          <section className="panel" aria-label="Key figures">
            <div className="stat-grid">
              <div className="stat"><div className="stat-label">Previous close</div><div className="stat-value">{priced ? money(quote.prev_close, currency) : "—"}</div></div>
              <div className="stat"><div className="stat-label">Volume</div><div className="stat-value">{priced ? compact(quote.volume) : "—"}</div></div>
              <div className="stat" style={{ gridColumn: "span 2", minWidth: 240 }}>
                <div className="stat-label" style={{ marginBottom: 12 }}>52-week range</div>
                {priced ? <RangeBar low={quote.week_52_low} high={quote.week_52_high} price={quote.price} currency={currency} showEnds /> : "—"}
              </div>
            </div>
          </section>

          <section className="panel" aria-label="News">
            <div className="panel-head"><h2 className="panel-title">News on {symbol?.toUpperCase()}</h2></div>
            {news.length === 0 ? (
              <Empty title="No news found">
                No recent headlines turned up for this stock. The news sources may be unreachable.
              </Empty>
            ) : (
              <ul className="row-list">{news.map((a, i) => <li key={i}><NewsCard article={a} /></li>)}</ul>
            )}
          </section>
        </div>

        <div className="stack">
          <button className={`btn ${inWatchlist ? "" : "btn-primary"} btn-block`} onClick={toggleWatchlist} style={{ padding: 10 }}>
            <Star size={16} fill={inWatchlist ? "var(--saffron)" : "none"} color={inWatchlist ? "var(--saffron)" : "currentColor"} />
            {inWatchlist ? "On your watchlist" : "Add to watchlist"}
          </button>

          <section className="panel" aria-label="AI prediction">
            <div className="panel-head">
              <h2 className="panel-title" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Activity size={16} color="var(--saffron)" /> AI prediction
              </h2>
            </div>
            <div className="panel-body" style={{ display: "grid", gap: 12 }}>
              <Segmented block value={predType} onChange={setPredType} label="Prediction horizon"
                options={[{ value: "intraday", label: "Intraday" }, { value: "delivery", label: "Swing" }]} />
              <p className="hint" style={{ margin: 0 }}>
                {predType === "intraday"
                  ? "Today's move, from 5-minute candles and the latest news."
                  : "The next 3–10 trading days, from daily data and news sentiment."}
              </p>
              <button className="btn btn-primary btn-block" onClick={fetchPrediction} disabled={loadingPred} style={{ padding: 10 }}>
                {loadingPred ? "Analyzing…" : prediction ? "Run again" : "Run prediction"}
              </button>
            </div>
          </section>

          <PredictionCard data={prediction} loading={loadingPred} error={predError} />

          <section className="panel" aria-label="Price alert">
            <div className="panel-head">
              <h2 className="panel-title" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Bell size={16} color="var(--saffron)" /> Price alert
              </h2>
            </div>
            <form className="panel-body" style={{ display: "grid", gap: 12 }} onSubmit={saveAlert}>
              <Segmented block value={alertCondition} onChange={setAlertCondition} label="Alert condition"
                options={[{ value: "above", label: "Goes above" }, { value: "below", label: "Falls below" }]} />
              <div>
                <label className="label" htmlFor="alert-price">Target price ({symbolOf(currency)})</label>
                <input id="alert-price" className="input" type="number" step="any" min="0"
                  value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder={priced ? String(quote.price) : "0.00"} />
              </div>
              {alertError && <div className="notice notice-error" role="alert">{alertError}</div>}
              {alertSaved && <div className="notice notice-ok" role="status">Alert saved. You'll see it in the bell when it triggers.</div>}
              <button className="btn btn-block" type="submit" disabled={!alertPrice}>Save alert</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
