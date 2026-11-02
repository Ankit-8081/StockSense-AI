import { useState, useEffect } from "react";
import { stocksAPI } from "../services/api";
import { Empty, Skel, money } from "./ui";

export const TABS = ["Overview", "Technicals", "News", "Events"];

export function TabBar({ value, onChange }) {
  return (
    <div className="tabs" role="tablist" aria-label="Stock sections">
      {TABS.map((t) => (
        <button key={t} role="tab" className="tab" aria-selected={value === t} onClick={() => onChange(t)}>{t}</button>
      ))}
    </div>
  );
}

const tone = (s) => (s === "Bullish" ? "up" : s === "Bearish" ? "down" : "flat");
const verdictTone = (v) => (/buy/i.test(v) ? "up" : /sell/i.test(v) ? "down" : "flat");

function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: false });
  useEffect(() => {
    let live = true;
    setState({ loading: true, data: null, error: false });
    fn().then((r) => live && setState({ loading: false, data: r.data, error: false }))
      .catch(() => live && setState({ loading: false, data: null, error: true }));
    return () => { live = false; };
  }, deps);
  return state;
}

function Loading() {
  return <div className="panel-body" style={{ display: "grid", gap: 10 }} aria-busy="true"><Skel h={20} w="40%" /><Skel h={120} /><Skel h={120} /></div>;
}

function IndicatorTable({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <section className="panel">
      <div className="panel-head"><h2 className="panel-title">{title}</h2></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td><span className="sym" style={{ fontWeight: 500 }}>{r.name}</span>{r.note && <span className="sub">{r.note}</span>}</td>
                <td className="num">{r.value?.toLocaleString()}</td>
                <td className="num"><span className={`verdict ${tone(r.signal)}`}>{r.signal}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TechnicalsTab({ symbol, market, currency }) {
  const { loading, data, error } = useLoad(() => stocksAPI.technicals(symbol, market), [symbol, market]);
  if (loading) return <section className="panel"><Loading /></section>;
  if (error || !data?.available) {
    return (
      <section className="panel">
        <Empty title="Technicals aren't available">Not enough price history came back for this stock. The price source may be busy, so try again in a minute.</Empty>
      </section>
    );
  }
  const { summary: s, pivots: p } = data;
  const total = s.bullish + s.bearish + s.neutral || 1;
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Summary</h2>
          <span className={`verdict ${verdictTone(s.verdict)}`}>{s.verdict}</span>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          <div className="gauge" role="img" aria-label={`${s.bullish} bullish, ${s.neutral} neutral, ${s.bearish} bearish`}>
            <span style={{ width: `${(s.bullish / total) * 100}%`, background: "var(--up)" }} />
            <span style={{ width: `${(s.neutral / total) * 100}%`, background: "var(--mute)", opacity: 0.5 }} />
            <span style={{ width: `${(s.bearish / total) * 100}%`, background: "var(--down)" }} />
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {s.bullish} bullish · {s.neutral} neutral · {s.bearish} bearish, based on daily candles up to {data.as_of?.slice(0, 10)}. Indicators are not advice.
          </div>
        </div>
      </section>

      <IndicatorTable title="Moving averages" rows={data.moving_averages} />
      <IndicatorTable title="Oscillators" rows={data.oscillators} />

      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Support and resistance</h2></div>
        <div className="panel-body">
          <div className="stat-grid">
            {[["S3", p.s3], ["S2", p.s2], ["S1", p.s1], ["Pivot", p.pivot], ["R1", p.r1], ["R2", p.r2], ["R3", p.r3]].map(([k, v]) => (
              <div className="stat" key={k}><div className="stat-label">{k}</div><div className="stat-value">{money(v, currency)}</div></div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 12 }}>Classic pivot points from the previous trading day.</p>
        </div>
      </section>
    </div>
  );
}

const EVENT_FILTERS = [["all", "All"], ["result", "Results"], ["dividend", "Dividends"], ["split", "Splits"], ["move", "Big moves"]];

export function EventsTab({ symbol, market, currency, onOpenFinancials }) {
  const { loading, data, error } = useLoad(() => stocksAPI.events(symbol, market), [symbol, market]);
  const [filter, setFilter] = useState("all");
  if (loading) return <section className="panel"><Loading /></section>;
  if (error || !data) {
    return <section className="panel"><Empty title="Events aren't available">The events could not be loaded. Try again in a minute.</Empty></section>;
  }
  const events = data.events || [];
  if (!events.length) {
    return <section className="panel"><Empty title="No events found">No results, dividends, splits or large price moves turned up for this stock.</Empty></section>;
  }
  const shown = events.filter((e) => filter === "all" || e.type === filter);
  const years = [...new Set(shown.map((e) => e.date.slice(0, 4)))];
  const present = new Set(events.map((e) => e.type));
  return (
    <div className="ev">
      <div className="ov-chips">
        {EVENT_FILTERS.filter(([k]) => k === "all" || present.has(k)).map(([k, label]) => (
          <button key={k} className="ov-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      {years.map((y) => (
        <section key={y} aria-label={y}>
          <h2 className="ev-year">{y}</h2>
          <ul className="ev-list">
            {shown.filter((e) => e.date.startsWith(y)).map((e, i) => {
              const d = new Date(e.date + "T00:00:00");
              return (
                <li className="ev-card" key={`${e.type}-${e.date}-${i}`}>
                  <div className="ev-date"><b>{d.getDate()}</b><span>{d.toLocaleDateString("en-IN", { month: "short" })}</span></div>
                  <div className="ev-main">
                    <div className="ev-title">{e.title}</div>
                    <div className="ev-sub">{e.sub}</div>
                  </div>
                  <div className="ev-side">
                    {e.type === "result" && <button className="link" onClick={onOpenFinancials}>Check latest financial ›</button>}
                    {e.type === "dividend" && <><b>{money(e.amount, currency)}</b><span>per share</span></>}
                    {e.type === "split" && <><b>{e.ratio}</b><span>split ratio</span></>}
                    {e.type === "move" && <><b className={e.change_pct > 0 ? "pos" : "neg"}>{e.change_pct > 0 ? "+" : ""}{e.change_pct}%</b><span>closed {money(e.close, currency)}</span></>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="hint">Results show the quarter-end date when the source has no release date. Dividends are listed by ex-date.</p>
    </div>
  );
}
