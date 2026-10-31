import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, Plus } from "lucide-react";
import { watchlistAPI, stocksAPI } from "../services/api";
import { Delta, RangeBar, Segmented, Empty, money, compact, currencyOf } from "../components/ui";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [quotes, setQuotes] = useState({});
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [addMarket, setAddMarket] = useState("NSE");
  const [error, setError] = useState("");

  useEffect(() => {
    watchlistAPI.get().then((r) => setWatchlist(r.data || [])).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    watchlist.forEach(({ symbol, market }) => {
      const key = `${symbol}-${market}`;
      if (quotes[key]) return;
      stocksAPI.quote(symbol, market)
        .then((r) => setQuotes((p) => ({ ...p, [key]: r.data })))
        .catch(() => {});
    });
  }, [watchlist]);

  const handleSearch = (q) => {
    setQuery(q);
    if (q.length < 2) { setSearchResults([]); setSearched(false); return; }
    stocksAPI.search(q)
      .then((r) => { setSearchResults(r.data || []); setSearched(true); })
      .catch(() => { setSearchResults([]); setSearched(true); });
  };

  const addStock = (symbol, market) => {
    setError("");
    watchlistAPI.add(symbol, market)
      .then((r) => { setWatchlist((p) => [...p, r.data]); setQuery(""); setSearchResults([]); setSearched(false); })
      .catch((e) => setError(e.response?.data?.detail || `Couldn't add ${symbol}. It may already be on your watchlist.`));
  };

  const removeStock = (id) => {
    watchlistAPI.remove(id).then(() => setWatchlist((p) => p.filter((w) => w.id !== id)));
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-sub">{watchlist.length === 1 ? "1 stock" : `${watchlist.length} stocks`} you follow.</p>
        </div>
      </div>

      <section className="panel" aria-label="Add a stock">
        <div className="panel-head">
          <h2 className="panel-title">Add a stock</h2>
          <Segmented value={addMarket} onChange={setAddMarket} options={["NSE", "BSE", "NYSE", "NASDAQ"]} label="Exchange" />
        </div>
        <div className="panel-body">
          <div className="search" style={{ maxWidth: "none" }}>
            <Search size={16} aria-hidden="true" />
            <input className="input" value={query} onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search by symbol or company name" placeholder={`Search ${addMarket} by symbol or company name`} />
          </div>
          {error && <div className="notice notice-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
          {searched && searchResults.length === 0 && (
            <p className="hint">No matches for “{query}”. Try the ticker symbol.</p>
          )}
        </div>
        {searchResults.length > 0 && (
          <ul className="row-list" style={{ borderTop: "1px solid var(--rule-soft)" }}>
            {searchResults.slice(0, 6).map((s, i) => (
              <li key={`${s.symbol}-${i}`}>
                <button className="pick" onClick={() => addStock(s.symbol.replace(".NS", "").replace(".BO", ""), addMarket)}>
                  <span><span className="sym">{s.symbol}</span><span className="sub">{s.name}</span></span>
                  <span className="link" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <Plus size={14} /> Add to {addMarket}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-label="Your stocks">
        {loaded && watchlist.length === 0 ? (
          <Empty title="Your watchlist is empty">
            Search above for a symbol like RELIANCE or AAPL and add it to follow its price here.
          </Empty>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Stock</th><th className="num">Price</th><th className="num">Change</th>
                  <th style={{ minWidth: 160 }}>52-week range</th><th className="num">Volume</th><th><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => {
                  const q = quotes[`${item.symbol}-${item.market}`];
                  const currency = currencyOf(item.market);
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link className="sym" to={`/stock/${item.market}/${item.symbol}`}>{item.symbol}</Link>{" "}
                        <span className="tag">{item.market}</span>
                      </td>
                      <td className="num">{q ? money(q.price, currency) : "—"}</td>
                      <td className="num"><Delta pct={q?.price > 0 ? q.change_pct : undefined} /></td>
                      <td><RangeBar low={q?.week_52_low} high={q?.week_52_high} price={q?.price} currency={currency} /></td>
                      <td className="num">{q ? compact(q.volume) : "—"}</td>
                      <td className="num">
                        <button className="btn btn-quiet btn-danger" style={{ padding: 6 }}
                          onClick={() => removeStock(item.id)} aria-label={`Remove ${item.symbol} from watchlist`}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
