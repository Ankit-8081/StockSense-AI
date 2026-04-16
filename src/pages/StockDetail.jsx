import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Star, StarOff, TrendingUp, TrendingDown, Bell, Activity } from "lucide-react";
import { stocksAPI, newsAPI, predictionAPI, watchlistAPI, alertsAPI } from "../services/api";
import PriceChart from "../components/PriceChart";
import PredictionCard from "../components/PredictionCard";
import NewsCard from "../components/NewsCard";
import clsx from "clsx";

export default function StockDetail() {
  const { market, symbol } = useParams();
  const [quote, setQuote] = useState(null);
  const [news, setNews] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predType, setPredType] = useState("delivery");
  const [loadingPred, setLoadingPred] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistId, setWatchlistId] = useState(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState("above");
  const [alertSaved, setAlertSaved] = useState(false);
  const currency = ["NSE", "BSE"].includes(market?.toUpperCase()) ? "INR" : "USD";

  useEffect(() => {
    if (!symbol || !market) return;
    // Quote
    stocksAPI.quote(symbol, market).then((r) => setQuote(r.data)).catch(() => {});
    // News
    newsAPI.stockNews(symbol).then((r) => setNews(r.data || [])).catch(() => {});
    // Watchlist check
    watchlistAPI.get().then((r) => {
      const found = r.data?.find(
        (w) => w.symbol === symbol.toUpperCase() && w.market === market.toUpperCase()
      );
      if (found) { setInWatchlist(true); setWatchlistId(found.id); }
    }).catch(() => {});
  }, [symbol, market]);

  const fetchPrediction = () => {
    setLoadingPred(true);
    setPrediction(null);
    predictionAPI.predict(symbol, market, predType)
      .then((r) => setPrediction(r.data))
      .catch(() => {})
      .finally(() => setLoadingPred(false));
  };

  const toggleWatchlist = () => {
    if (inWatchlist) {
      watchlistAPI.remove(watchlistId).then(() => { setInWatchlist(false); setWatchlistId(null); });
    } else {
      watchlistAPI.add(symbol, market).then((r) => { setInWatchlist(true); setWatchlistId(r.data.id); });
    }
  };

  const saveAlert = () => {
    if (!alertPrice) return;
    alertsAPI.create({ symbol, market, condition: alertCondition, target_price: parseFloat(alertPrice) })
      .then(() => { setAlertSaved(true); setAlertPrice(""); setTimeout(() => setAlertSaved(false), 3000); })
      .catch(() => {});
  };

  const isUp = quote && quote.change_pct >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
        dark:border-gray-700 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{symbol?.toUpperCase()}</h1>
              <span className="text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700
                dark:text-blue-300 px-2.5 py-1 rounded-full">{market?.toUpperCase()}</span>
            </div>
            {quote?.name && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{quote.name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-gray-900 dark:text-white">
              {currency === "INR" ? "₹" : "$"}{quote?.price?.toLocaleString() || "—"}
            </p>
            {quote && (
              <p className={clsx("flex items-center gap-1 justify-end text-lg font-semibold mt-1",
                isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {isUp ? "+" : ""}{quote.change} ({isUp ? "+" : ""}{quote.change_pct}%)
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        {quote && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5
            border-t border-gray-100 dark:border-gray-800">
            {[
              ["Prev Close", `${currency === "INR" ? "₹" : "$"}${quote.prev_close?.toLocaleString()}`],
              ["Volume", (quote.volume / 1e6).toFixed(2) + "M"],
              ["52W High", `${currency === "INR" ? "₹" : "$"}${quote.week_52_high?.toLocaleString()}`],
              ["52W Low", `${currency === "INR" ? "₹" : "$"}${quote.week_52_low?.toLocaleString()}`],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={toggleWatchlist}
            className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              inWatchlist
                ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-yellow-300")}>
            {inWatchlist ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-4 h-4" />}
            {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: chart + news */}
        <div className="lg:col-span-3 space-y-6">
          <PriceChart symbol={symbol} market={market} currency={currency} />

          {/* News */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Latest News</h2>
            {news.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No news found for this stock.</p>
            ) : (
              news.map((a, i) => <NewsCard key={i} article={a} />)
            )}
          </div>
        </div>

        {/* Right: prediction + alert */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prediction controls */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
            dark:border-gray-700 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              AI Prediction
            </h2>
            <div className="flex gap-2">
              {["intraday", "delivery"].map((t) => (
                <button key={t} onClick={() => setPredType(t)}
                  className={clsx("flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all",
                    predType === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300")}>
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {predType === "intraday"
                ? "Same-day prediction using 5-min candles + news"
                : "3–10 day swing prediction using daily data + news sentiment"}
            </p>
            <button onClick={fetchPrediction}
              disabled={loadingPred}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                text-white font-semibold rounded-xl transition-colors">
              {loadingPred ? "Analyzing…" : "Run Prediction"}
            </button>
          </div>

          <PredictionCard data={prediction} loading={loadingPred} />

          {/* Price Alert */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
            dark:border-gray-700 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Set Price Alert
            </h2>
            <div className="flex gap-2">
              {["above", "below"].map((c) => (
                <button key={c} onClick={() => setAlertCondition(c)}
                  className={clsx("flex-1 py-1.5 rounded-lg text-sm capitalize transition-all",
                    alertCondition === c
                      ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 font-medium"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500")}>
                  {c}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              placeholder={`Target price (${currency === "INR" ? "₹" : "$"})`}
              className="w-full px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl
                border border-transparent focus:border-yellow-400 outline-none
                text-gray-900 dark:text-white placeholder-gray-400 transition-all"
            />
            <button onClick={saveAlert}
              className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white
                font-semibold rounded-xl transition-colors">
              {alertSaved ? "Alert saved!" : "Save Alert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
