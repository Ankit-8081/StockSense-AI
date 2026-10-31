import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { stocksAPI } from "../services/api";
import { Delta, RangeBar, Segmented, Empty, money, compact } from "../components/ui";

const NSE_STOCKS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","WIPRO","SBIN","BHARTIARTL",
  "HINDUNILVR","ITC","AXISBANK","MARUTI","TATAMOTORS","HCLTECH","LT",
  "BAJFINANCE","ASIANPAINT","TITAN","SUNPHARMA","DRREDDY",
].map((symbol) => ({ symbol, market: "NSE" }));

const US_STOCKS = [
  ["AAPL","NASDAQ"], ["MSFT","NASDAQ"], ["GOOGL","NASDAQ"], ["AMZN","NASDAQ"],
  ["NVDA","NASDAQ"], ["META","NASDAQ"], ["TSLA","NASDAQ"], ["JPM","NYSE"],
  ["V","NYSE"], ["UNH","NYSE"], ["JNJ","NYSE"], ["PG","NYSE"],
  ["HD","NYSE"], ["MA","NYSE"], ["BAC","NYSE"],
].map(([symbol, market]) => ({ symbol, market }));

const normalizeMarket = (m) => {
  const v = String(m || "").toUpperCase();
  if (["NSE", "BSE", "NYSE", "NASDAQ"].includes(v)) return v;
  if (["NMS", "NGM", "NCM"].includes(v)) return "NASDAQ";
  if (v === "NYQ") return "NYSE";
  return "NSE";
};

const SORTS = {
  symbol: (a, b) => a.symbol.localeCompare(b.symbol),
  price: (a, b) => a.price - b.price,
  change_pct: (a, b) => a.change_pct - b.change_pct,
  volume: (a, b) => a.volume - b.volume,
};

export default function Screener() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [market, setMarket] = useState("NSE");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState({ key: "change_pct", dir: -1 });
  const [searchQuery, setSearchQuery] = useState(params.get("q") || "");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const runSearch = (q) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    stocksAPI.search(q.trim())
      .then((r) => setSearchResults(r.data || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  };

  // Searches started from the top bar arrive as ?q=
  useEffect(() => {
    const q = params.get("q") || "";
    setSearchQuery(q);
    runSearch(q);
  }, [params]);

  const runScreener = async () => {
    setLoading(true);
    setResults([]);
    setScanned(true);
    const stocks = market === "NSE" ? NSE_STOCKS : US_STOCKS;
    const currency = market === "NSE" ? "INR" : "USD";
    const settled = await Promise.allSettled(
      stocks.map(({ symbol, market: m }) =>
        stocksAPI.quote(symbol, m).then((r) => ({ ...r.data, market: m, currency }))
      )
    );
    setResults(settled.filter((r) => r.status === "fulfilled" && r.value.price > 0).map((r) => r.value));
    setLoading(false);
  };

  const setSortKey = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "symbol" ? 1 : -1 }));

  const rows = results
    .filter((q) => filter === "all" || (filter === "up" ? q.change_pct > 0 : q.change_pct < 0))
    .sort((a, b) => SORTS[sort.key](a, b) * sort.dir);

  const SortTh = ({ k, children, num }) => (
    <th className={num ? "num" : ""} aria-sort={sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSortKey(k)}>
        {children}{sort.key === k && <span aria-hidden="true">{sort.dir > 0 ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Screener</h1>
          <p className="page-sub">Look up any stock, or scan the large caps and sort by what moved.</p>
        </div>
      </div>

      <section className="panel" aria-label="Find a stock">
        <div className="panel-head"><h2 className="panel-title">Find a stock</h2></div>
        <div className="panel-body">
          <form className="search" style={{ maxWidth: "none" }}
            onSubmit={(e) => { e.preventDefault(); runSearch(searchQuery); }} role="search">
            <Search size={16} aria-hidden="true" />
            <input className="input" value={searchQuery} aria-label="Search by symbol or company name"
              onChange={(e) => { setSearchQuery(e.target.value); runSearch(e.target.value); }}
              placeholder="Symbol or company name, e.g. TCS or Apple" />
          </form>
          {searching && <p className="hint">Searching…</p>}
          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <p className="hint">No matches for “{searchQuery.trim()}”. Check the spelling or try the ticker.</p>
          )}
        </div>
        {searchResults.length > 0 && (
          <ul className="row-list" style={{ borderTop: "1px solid var(--rule-soft)" }}>
            {searchResults.map((s, i) => {
              const m = normalizeMarket(s.market);
              const sym = s.symbol.replace(".NS", "").replace(".BO", "");
              return (
                <li key={`${s.symbol}-${i}`}>
                  <button className="pick" onClick={() => navigate(`/stock/${m}/${sym}`)}>
                    <span>
                      <span className="sym">{sym}</span>
                      <span className="sub">{s.name}</span>
                    </span>
                    <span className="tag">{m}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-label="Market scan">
        <div className="panel-head">
          <h2 className="panel-title">Market scan</h2>
          <div className="head-actions">
            <Segmented value={market} onChange={(m) => { setMarket(m); setResults([]); setScanned(false); }}
              options={["NSE", "US"]} label="Market" />
            <button className="btn btn-primary" onClick={runScreener} disabled={loading}>
              {loading ? "Scanning…" : "Scan"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule-soft)" }}>
            <Segmented value={filter} onChange={setFilter} label="Filter"
              options={[{ value: "all", label: `All (${results.length})` }, { value: "up", label: "Gainers" }, { value: "down", label: "Losers" }]} />
          </div>
        )}

        {rows.length > 0 ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <SortTh k="symbol">Stock</SortTh>
                  <SortTh k="price" num>Price</SortTh>
                  <SortTh k="change_pct" num>Change</SortTh>
                  <th style={{ minWidth: 160 }}>52-week range</th>
                  <SortTh k="volume" num>Volume</SortTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={`${q.symbol}-${q.market}`}>
                    <td>
                      <Link className="sym" to={`/stock/${q.market}/${q.symbol}`}>{q.symbol}</Link>
                      <span className="sub">{q.name !== q.symbol ? q.name : q.market}</span>
                    </td>
                    <td className="num">{money(q.price, q.currency)}</td>
                    <td className="num"><Delta pct={q.change_pct} /></td>
                    <td><RangeBar low={q.week_52_low} high={q.week_52_high} price={q.price} currency={q.currency} /></td>
                    <td className="num">{compact(q.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={loading ? "Scanning…" : scanned ? "Nothing to show" : "Scan the market"}>
            {loading ? "Fetching prices for each stock."
              : scanned ? (results.length ? "No stocks match this filter." : "Prices couldn't be loaded. Try scanning again in a minute.")
              : `Loads prices for ${market === "NSE" ? "20 large NSE stocks" : "15 large US stocks"} so you can sort and filter them.`}
          </Empty>
        )}
      </section>
    </div>
  );
}
