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

export function EventsTab({ symbol, market, currency }) {
  const { loading, data, error } = useLoad(() => stocksAPI.events(symbol, market), [symbol, market]);
  if (loading) return <section className="panel"><Loading /></section>;
  if (error || !data) {
    return <section className="panel"><Empty title="Events aren't available">The events could not be loaded. Try again in a minute.</Empty></section>;
  }
  const none = !data.dividends.length && !data.splits.length && !data.big_moves.length;
  if (none) {
    return <section className="panel"><Empty title="No events found">No dividends, splits or large price moves turned up for this stock.</Empty></section>;
  }
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Dividends</h2></div>
        {data.dividends.length === 0 ? (
          <Empty title="No dividends on record">{data.source_ok ? "This stock hasn't paid a dividend in the last 10 years." : "The dividend source didn't respond."}</Empty>
        ) : (
          <div className="tbl-wrap"><table className="tbl"><tbody>
            {data.dividends.map((d) => (
              <tr key={d.date}><td>{fmt(d.date)}<span className="sub">Ex-date</span></td><td className="num">{money(d.amount, currency)} per share</td></tr>
            ))}
          </tbody></table></div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Splits</h2></div>
        {data.splits.length === 0 ? (
          <Empty title="No splits on record">{data.source_ok ? "No stock splits in the last 10 years." : "The splits source didn't respond."}</Empty>
        ) : (
          <div className="tbl-wrap"><table className="tbl"><tbody>
            {data.splits.map((s) => (<tr key={s.date}><td>{fmt(s.date)}</td><td className="num">{s.ratio}</td></tr>))}
          </tbody></table></div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2 className="panel-title">Big price moves</h2></div>
        {data.big_moves.length === 0 ? (
          <Empty title="No big moves">No single day moved 4% or more in the last year.</Empty>
        ) : (
          <div className="tbl-wrap"><table className="tbl"><tbody>
            {data.big_moves.map((m) => (
              <tr key={m.date}>
                <td>{fmt(m.date)}<span className="sub">Daily move of 4% or more</span></td>
                <td className="num">{money(m.close, currency)}</td>
                <td className="num"><span className={`verdict ${m.change_pct > 0 ? "up" : "down"}`}>{m.change_pct > 0 ? "+" : ""}{m.change_pct}%</span></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}
