import { useState } from "react";
import { Search, Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { stocksAPI, predictionAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

const NSE_STOCKS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","WIPRO","SBIN","BHARTIARTL",
  "HINDUNILVR","ITC","AXISBANK","MARUTI","TATAMOTORS","HCLTECH","LT",
  "BAJFINANCE","ASIANPAINT","TITAN","SUNPHARMA","DRREDDY",
];
const US_STOCKS = [
  "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","JPM",
  "V","UNH","JNJ","PG","HD","MA","BAC",
];

export default function Screener() {
  const navigate = useNavigate();
  const [market, setMarket] = useState("NSE");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const runScreener = async () => {
    setLoading(true);
    setResults([]);
    const symbols = market === "NSE" ? NSE_STOCKS : US_STOCKS;
    const currency = market === "NSE" ? "INR" : "USD";
    const actualMarket = market === "NSE" ? "NSE" : "NYSE";

    const settled = await Promise.allSettled(
      symbols.map((s) =>
        stocksAPI.quote(s, actualMarket).then((r) => ({ ...r.data, currency }))
      )
    );
    const quotes = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    setResults(quotes);
    setLoading(false);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    stocksAPI.search(q)
      .then((r) => setSearchResults(r.data || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  };

  const dirIcon = (pct) => {
    if (pct > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (pct < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Screener</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Search any stock or scan the market
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
        dark:border-gray-700 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Symbol Search</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search RELIANCE, AAPL, TCS…"
            className="w-full pl-10 pr-4 py-3 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl
              border border-transparent focus:border-blue-400 outline-none
              text-gray-900 dark:text-white placeholder-gray-400 transition-all"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2 pt-1">
            {searchResults.map((s, i) => (
              <div key={i}
                onClick={() => navigate(`/stock/${s.market || "NSE"}/${s.symbol}`)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50
                  dark:hover:bg-gray-800 cursor-pointer transition-colors">
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.symbol}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                    {s.market}
                  </span>
                  <span className="text-xs text-gray-400">{s.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market scan */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
        dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            Market Scan
          </h2>
          <div className="flex gap-2">
            {["NSE", "US"].map((m) => (
              <button key={m} onClick={() => setMarket(m)}
                className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  market === m
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")}>
                {m}
              </button>
            ))}
            <button onClick={runScreener} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
              {loading ? "Scanning…" : "Scan"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Symbol", "Name", "Price", "Change", "Volume", "52W High", "52W Low", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold
                      text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((q) => (
                  <tr key={q.symbol}
                    onClick={() => navigate(`/stock/${q.market}/${q.symbol}`)}
                    className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50
                      dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <td className="px-3 py-3 font-bold text-gray-900 dark:text-white">{q.symbol}</td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[140px] truncate">{q.name}</td>
                    <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">
                      {q.currency === "INR" ? "₹" : "$"}{q.price?.toLocaleString()}
                    </td>
                    <td className={clsx("px-3 py-3 font-semibold flex items-center gap-1",
                      q.change_pct > 0 ? "text-emerald-600 dark:text-emerald-400"
                        : q.change_pct < 0 ? "text-red-500 dark:text-red-400" : "text-gray-400")}>
                      {dirIcon(q.change_pct)}
                      {q.change_pct > 0 ? "+" : ""}{q.change_pct?.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {(q.volume / 1e6)?.toFixed(2)}M
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                      {q.currency === "INR" ? "₹" : "$"}{q.week_52_high?.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                      {q.currency === "INR" ? "₹" : "$"}{q.week_52_low?.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Analyze →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {results.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-400 py-8">
            Click "Scan" to load {market === "NSE" ? "NSE top 20" : "US top 15"} stocks
          </p>
        )}
      </div>
    </div>
  );
}
