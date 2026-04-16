import { useState, useEffect } from "react";
import { Zap, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { predictionAPI, watchlistAPI } from "../services/api";
import PredictionCard from "../components/PredictionCard";
import clsx from "clsx";

const SAMPLE_STOCKS = [
  { symbol: "RELIANCE", market: "NSE" },
  { symbol: "TCS", market: "NSE" },
  { symbol: "INFY", market: "NSE" },
  { symbol: "AAPL", market: "NASDAQ" },
  { symbol: "NVDA", market: "NASDAQ" },
];

export default function Predictions() {
  const [watchlist, setWatchlist] = useState([]);
  const [predType, setPredType] = useState("delivery");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    watchlistAPI.get()
      .then((r) => setWatchlist(r.data?.length > 0 ? r.data : SAMPLE_STOCKS))
      .catch(() => setWatchlist(SAMPLE_STOCKS));
    predictionAPI.history()
      .then((r) => setHistory(r.data || []))
      .catch(() => {});
  }, []);

  const runPrediction = (symbol, market) => {
    const key = `${symbol}-${market}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    setSelected(key);
    predictionAPI.predict(symbol, market, predType)
      .then((r) => setResults((prev) => ({ ...prev, [key]: r.data })))
      .catch(() => {})
      .finally(() => setLoading((prev) => ({ ...prev, [key]: false })));
  };

  const runAll = () => {
    watchlist.forEach(({ symbol, market }) => runPrediction(symbol, market));
  };

  const dirColor = (dir) => ({
    UP: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    DOWN: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    NEUTRAL: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  }[dir] || "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Predictions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Sentiment + technical analysis combined via LLM
          </p>
        </div>
        <div className="flex gap-2">
          {["intraday", "delivery"].map((t) => (
            <button key={t} onClick={() => setPredType(t)}
              className={clsx("px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all",
                predType === t
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")}>
              {t === "intraday" ? "⚡ Intraday" : "📦 Delivery"}
            </button>
          ))}
          <button onClick={runAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
              text-white rounded-xl text-sm font-medium transition-colors">
            <Zap className="w-4 h-4" />
            Run all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Stock list */}
        <div className="lg:col-span-2 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
            Your stocks
          </h2>
          {watchlist.map(({ symbol, market }) => {
            const key = `${symbol}-${market}`;
            const result = results[key];
            const isLoading = loading[key];
            const isActive = selected === key;

            return (
              <div key={key}
                onClick={() => { setSelected(key); if (!result && !isLoading) runPrediction(symbol, market); }}
                className={clsx(
                  "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                  isActive
                    ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300"
                )}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800
                    flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                    {symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{symbol}</p>
                    <p className="text-xs text-gray-400">{market}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                  {result && !isLoading && (
                    <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", dirColor(result.direction))}>
                      {result.direction}
                    </span>
                  )}
                  {!result && !isLoading && (
                    <span className="text-xs text-gray-400">Click to analyze</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prediction detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <PredictionCard
              data={results[selected]}
              loading={loading[selected]}
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center
              bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
              <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Select a stock to see its AI prediction
              </p>
              <p className="text-xs text-gray-400">
                Or click "Run all" to analyze your entire watchlist
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Prediction history */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Recent Predictions
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Symbol", "Market", "Type", "Direction", "Confidence", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold
                      text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h) => (
                  <tr key={h.id} className="border-b border-gray-50 dark:border-gray-800
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{h.symbol}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{h.market}</td>
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{h.prediction_type}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold", dirColor(h.direction))}>
                        {h.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {Math.round(h.confidence * 100)}%
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
