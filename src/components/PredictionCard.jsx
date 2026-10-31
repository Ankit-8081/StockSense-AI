import { Link } from "react-router-dom";
import { Skel, symbolOf } from "./ui";

const DIRECTION = {
  UP:      { word: "Bullish", glyph: "▲", color: "var(--up)" },
  DOWN:    { word: "Bearish", glyph: "▼", color: "var(--down)" },
  NEUTRAL: { word: "Neutral", glyph: "–", color: "var(--mute)" },
};

function ScoreBar({ label, score }) {
  const v = Math.max(-1, Math.min(1, Number(score) || 0));
  const w = Math.abs(v) * 50;
  const color = v > 0.05 ? "var(--up)" : v < -0.05 ? "var(--down)" : "var(--mute)";
  return (
    <div className="dv">
      <span>{label}</span>
      <div className="dv-track" role="img" aria-label={`${label}: ${Math.round(v * 100)} on a scale of minus 100 to 100`}>
        <div className="dv-fill" style={{ background: color, width: `${w}%`, left: v >= 0 ? "50%" : `${50 - w}%` }} />
      </div>
      <span style={{ textAlign: "right", fontWeight: 600 }}>{v > 0 ? "+" : ""}{Math.round(v * 100)}</span>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div style={{ padding: "16px", borderTop: "1px solid var(--rule-soft)" }}>
    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
    {children}
  </div>
);

const SIGNALS = [
  ["RSI (14)", "rsi"], ["MACD", "macd"], ["Bollinger position", "bb_position"],
  ["SMA 20", "sma20"], ["SMA 50", "sma50"], ["VWAP", "vwap"], ["Volume vs average", "volume_ratio"],
];

export default function PredictionCard({ data, loading, error }) {
  if (loading) {
    return (
      <div className="panel panel-body" style={{ display: "grid", gap: 14 }} aria-busy="true" aria-label="Analyzing">
        <Skel w="40%" h={14} /><Skel w="60%" h={38} /><Skel h={10} /><Skel h={80} /><Skel w="85%" />
      </div>
    );
  }

  if (error) {
    const missingKey = /api key/i.test(error);
    return (
      <div className="notice notice-error" role="alert">
        <strong>Prediction failed.</strong> {error}
        {missingKey && <> <Link className="link" to="/api-keys">Add your key</Link></>}
      </div>
    );
  }

  if (!data) return null;

  const cfg = DIRECTION[data.direction] || DIRECTION.NEUTRAL;
  const confidence = Math.round((data.confidence || 0) * 100);
  const lit = Math.round(confidence / 10);
  const signals = data.technical?.signals || {};
  const tr = data.target_range || {};
  const fmtMove = (v) => (v < 0 ? `${v}` : data.direction === "DOWN" ? `−${v}` : `+${v}`);

  return (
    <article className="panel" aria-label={`${data.symbol} prediction`}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <span className="muted">
            {data.prediction_type === "intraday" ? "Intraday signal, today" : "Swing signal, 3–10 days"}
          </span>
          <span style={{ fontWeight: 600 }}>
            {data.symbol} <span className="tag">{data.market}</span>
          </span>
        </div>

        <p className="signal-word" style={{ color: cfg.color, margin: "12px 0 14px" }}>
          <span aria-hidden="true" style={{ fontSize: "0.6em", marginRight: 8 }}>{cfg.glyph}</span>{cfg.word}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
          <span className="muted">Confidence</span>
          <strong>{confidence}%</strong>
        </div>
        <div className="ticks" style={{ "--c": cfg.color }} role="img" aria-label={`Confidence ${confidence} percent`}>
          {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < lit ? "on" : ""} />)}
        </div>

        <dl className="kv" style={{ marginTop: 16 }}>
          <dt>Price when analyzed</dt>
          <dd>{symbolOf(data.currency)}{data.current_price?.toLocaleString()}</dd>
          {tr.low !== undefined && tr.high !== undefined && (<>
            <dt>Expected move</dt>
            <dd>{fmtMove(tr.low)}% to {fmtMove(tr.high)}%</dd>
          </>)}
          <dt>News articles used</dt>
          <dd>{data.news_count}</dd>
        </dl>
      </div>

      <Section title="What drives the signal">
        <ScoreBar label="News sentiment" score={data.sentiment?.score} />
        <ScoreBar label="Technicals" score={data.technical?.score} />
        <ScoreBar label="Combined" score={data.combined_score} />
      </Section>

      {SIGNALS.some(([, k]) => signals[k] !== undefined && signals[k] !== null) && (
        <Section title="Technical readings">
          <dl className="kv">
            {SIGNALS.map(([label, k]) => signals[k] !== undefined && signals[k] !== null && (
              <div key={k} style={{ display: "contents" }}><dt>{label}</dt><dd>{signals[k]}</dd></div>
            ))}
          </dl>
        </Section>
      )}

      {data.reasoning && (
        <Section title="Why">
          <p className="prose">{data.reasoning}</p>
        </Section>
      )}

      {data.key_risks?.length > 0 && (
        <Section title="Risks to watch">
          <ul className="risk-list">{data.key_risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </Section>
      )}

      {data.sentiment?.key_themes?.length > 0 && (
        <Section title="In the news">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.sentiment.key_themes.map((t, i) => <span key={i} className="pill">{t}</span>)}
          </div>
        </Section>
      )}
    </article>
  );
}
