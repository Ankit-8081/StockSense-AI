import { useState, useEffect } from "react";
import { Star, Trash2, Plus, Search } from "lucide-react";
import { watchlistAPI, stocksAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

export default function Watchlist() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [addMarket, setAddMarket] = useState("NSE");

  useEffect(() => {
    watchlistAPI.get().then((r) => setWatchlist(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) return;
    watchlist.forEach(({ symbol, market }) => {
      stocksAPI.quote(symbol, market)
        .then((r) => setQuotes((p) => ({ ...p, [`${symbol}-${market}`]: r.data })))
        .catch(() => {});
    });
  }, [watchlist]);

  const handleSearch = (q) => {
    setQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    stocksAPI.search(q).then((r) => setSearchResults(r.data || [])).catch(() => setSearchResults([]));
  };

  const addStock = (symbol, market) => {
    watchlistAPI.add(symbol, market)
      .then((r) => {
        setWatchlist((p) => [...p, r.data]);
        setQuery("");
        setSearchResults([]);
      })
      .catch(() => {});
  };

  const removeStock = (id) => {
    watchlistAPI.remove(id).then(() => setWatchlist((p) => p.filter((w) => w.id !== id)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          My Watchlist
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {watchlist.length} stocks tracked
        </p>
      </div>

      {/* Add stock */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
        dark:border-gray-700 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Add a Stock</h2>
        <div className="flex gap-2">
          {["NSE", "BSE", "NYSE", "NASDAQ"].map((m) => (
            <button key={m} onClick={() => setAddMarket(m)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                addMarket === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300")}>
              {m}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search symbol or company name…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl
              border border-transparent focus:border-blue-400 outline-none
              text-gray-900 dark:text-white placeholder-gray-400 transition-all"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-1">
            {searchResults.slice(0, 5).map((s, i) => (
              <div key={i}
                onClick={() => addStock(s.symbol.replace(".NS", "").replace(".BO", ""), addMarket)}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50
                  dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer transition-colors">
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.symbol}</p>
                  <p className="text-xs text-gray-400">{s.name}</p>
                </div>
                <Plus className="w-4 h-4 text-blue-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist table */}
      {watchlist.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Your watchlist is empty</p>
          <p className="text-sm text-gray-400">Search above to add your first stock</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200
          dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Symbol", "Market", "Price", "Change", "Volume", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold
                    text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => {
                const q = quotes[`${item.symbol}-${item.market}`];
                const isUp = q?.change_pct >= 0;
                return (
                  <tr key={item.id}
                    className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50
                      dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4 cursor-pointer"
                      onClick={() => navigate(`/stock/${item.market}/${item.symbol}`)}>
                      <p className="font-bold text-gray-900 dark:text-white hover:text-blue-600
                        dark:hover:text-blue-400 transition-colors">{item.symbol}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{item.market}</td>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      {q ? `${["NSE","BSE"].includes(item.market) ? "₹" : "$"}${q.price?.toLocaleString()}` : "—"}
                    </td>
                    <td className={clsx("px-5 py-4 font-semibold",
                      isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                      {q ? `${isUp ? "+" : ""}${q.change_pct?.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                      {q ? `${(q.volume / 1e6).toFixed(2)}M` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => removeStock(item.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950
                          text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
