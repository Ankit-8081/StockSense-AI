import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, RefreshCw } from "lucide-react";
import { predictionAPI, watchlistAPI } from "../services/api";
import PredictionCard from "../components/PredictionCard";
import { Segmented, Empty } from "../components/ui";

const SAMPLE_STOCKS = [
  { symbol: "RELIANCE", market: "NSE" },
  { symbol: "TCS", market: "NSE" },
  { symbol: "INFY", market: "NSE" },
  { symbol: "AAPL", market: "NASDAQ" },
  { symbol: "NVDA", market: "NASDAQ" },
];

const WORD = { UP: "Bullish", DOWN: "Bearish", NEUTRAL: "Neutral" };
const GLYPH = { UP: "▲", DOWN: "▼", NEUTRAL: "–" };
const CLASS = { UP: "up", DOWN: "down", NEUTRAL: "" };

const DirPill = ({ dir }) => (
  <span className={`pill ${CLASS[dir] || ""}`}>
    <span aria-hidden="true" style={{ fontSize: "0.7em" }}>{GLYPH[dir]}</span>{WORD[dir] || dir}
  </span>
);

export default function Predictions() {
  const [watchlist, setWatchlist] = useState([]);
  const [usingSamples, setUsingSamples] = useState(false);
  const [predType, setPredType] = useState("delivery");
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState({});
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    watchlistAPI.get()
      .then((r) => {
        const list = r.data?.length > 0 ? r.data : SAMPLE_STOCKS;
        setUsingSamples(!(r.data?.length > 0));
        setWatchlist(list);
      })
      .catch(() => { setUsingSamples(true); setWatchlist(SAMPLE_STOCKS); });
    predictionAPI.history().then((r) => setHistory(r.data || [])).catch(() => {});
  }, []);

  // Results belong to the horizon they were run with
  useEffect(() => { setResults({}); setErrors({}); }, [predType]);

  const runPrediction = (symbol, market) => {
    const key = `${symbol}-${market}`;
    setLoading((p) => ({ ...p, [key]: true }));
    setErrors((p) => ({ ...p, [key]: "" }));
    setSelected(key);
    predictionAPI.predict(symbol, market, predType)
      .then((r) => setResults((p) => ({ ...p, [key]: r.data })))
      .catch((e) => setErrors((p) => ({
        ...p, [key]: e.response?.data?.detail || "The prediction service didn't respond. Try again in a moment.",
      })))
      .finally(() => setLoading((p) => ({ ...p, [key]: false })));
  };

  const runAll = () => watchlist.forEach(({ symbol, market }) => runPrediction(symbol, market));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Predictions</h1>
          <p className="page-sub">News sentiment and technical indicators, combined by an AI model.</p>
        </div>
        <div className="head-actions">
          <Segmented value={predType} onChange={setPredType} label="Prediction horizon"
            options={[{ value: "intraday", label: "Intraday" }, { value: "delivery", label: "Swing" }]} />
          <button className="btn btn-primary" onClick={runAll}><Zap size={14} /> Run all</button>
        </div>
      </div>

      <div className="cols cols-even">
        <section className="panel" aria-label="Stocks">
          <div className="panel-head">
            <h2 className="panel-title">{usingSamples ? "Sample stocks" : "Your watchlist"}</h2>
            {usingSamples && <Link className="link" to="/watchlist">Add your own</Link>}
          </div>
          <ul className="row-list">
            {watchlist.map(({ symbol, market }) => {
              const key = `${symbol}-${market}`;
              const result = results[key];
              return (
                <li key={key}>
                  <button className="pick" aria-pressed={selected === key}
                    onClick={() => { setSelected(key); if (!result && !loading[key]) runPrediction(symbol, market); }}>
                    <span>
                      <span className="sym">{symbol}</span>{" "}
                      <span className="tag">{market}</span>
                    </span>
                    {loading[key] ? <RefreshCw size={15} className="spin muted" aria-label="Analyzing" />
                      : errors[key] ? <span className="pill down">Failed</span>
                      : result ? <DirPill dir={result.direction} />
                      : <span className="muted" style={{ fontSize: 13 }}>Run prediction</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div>
          {selected ? (
            <PredictionCard data={results[selected]} loading={loading[selected]} error={errors[selected]} />
          ) : (
            <section className="panel">
              <Empty title="Pick a stock to see its prediction">
                Select one from the list, or run all of them at once.
              </Empty>
            </section>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <section className="panel" aria-label="Recent predictions">
          <div className="panel-head"><h2 className="panel-title">Recent predictions</h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Stock</th><th>Horizon</th><th>Signal</th><th className="num">Confidence</th><th className="num">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h) => (
                  <tr key={h.id}>
                    <td><Link className="sym" to={`/stock/${h.market}/${h.symbol}`}>{h.symbol}</Link> <span className="tag">{h.market}</span></td>
                    <td>{h.prediction_type === "intraday" ? "Intraday" : "Swing"}</td>
                    <td><DirPill dir={h.direction} /></td>
                    <td className="num">{Math.round(h.confidence * 100)}%</td>
                    <td className="num muted">{new Date(h.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
