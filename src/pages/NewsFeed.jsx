// NewsFeed.jsx
import { useState, useEffect } from "react";
import { newsAPI } from "../services/api";
import NewsCard from "../components/NewsCard";
import clsx from "clsx";

export default function NewsFeed() {
  const [market, setMarket] = useState("NSE");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    newsAPI.marketNews(market)
      .then((r) => setNews(r.data || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [market]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Market News</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Live news from Tavily</p>
        </div>
        <div className="flex gap-2">
          {["NSE", "BSE", "US"].map((m) => (
            <button key={m} onClick={() => setMarket(m)}
              className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-all",
                market === m
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-900 p-4 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && news.length === 0 && (
        <p className="text-center text-gray-400 py-12">No news available right now.</p>
      )}

      {!loading && news.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((article, i) => <NewsCard key={i} article={article} />)}
        </div>
      )}
    </div>
  );
}
