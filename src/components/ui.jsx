import { Link } from "react-router-dom";

export const isIndian = (market) => ["NSE", "BSE"].includes(String(market).toUpperCase());
export const currencyOf = (market) => (isIndian(market) ? "INR" : "USD");
export const symbolOf = (currency) => (currency === "INR" ? "₹" : "$");

export const money = (value, currency = "INR") =>
  value > 0 ? `${symbolOf(currency)}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";

export const compact = (n) => {
  if (!n) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (Number.isNaN(diff)) return "";
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/** Direction is shown by arrow + sign + color, never color alone. */
export function Delta({ pct, className = "" }) {
  if (pct === undefined || pct === null || Number.isNaN(pct)) return <span className="muted">—</span>;
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const glyph = pct > 0 ? "▲" : pct < 0 ? "▼" : "–";
  return (
    <span className={`delta ${dir} ${className}`}>
      <i aria-hidden="true">{glyph}</i>
      {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
      <span className="sr-only">{dir === "up" ? " up" : dir === "down" ? " down" : ""}</span>
    </span>
  );
}

/** Where the price sits between its 52-week low and high. */
export function RangeBar({ low, high, price, currency = "INR", showEnds = false }) {
  if (!low || !high || high <= low || !price) return <span className="muted">—</span>;
  const pos = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
  return (
    <div title={`52-week range ${symbolOf(currency)}${low.toLocaleString()} – ${symbolOf(currency)}${high.toLocaleString()}`}>
      <div className="range" role="img" aria-label={`${Math.round(pos)}% of the way from the 52-week low to the high`}>
        <i style={{ left: `${pos}%` }} />
      </div>
      {showEnds && (
        <div className="range-ends">
          <span>{money(low, currency)}</span>
          <span>{money(high, currency)}</span>
        </div>
      )}
    </div>
  );
}

export function Segmented({ value, onChange, options, block = false, label }) {
  return (
    <div className={`seg ${block ? "seg-block" : ""}`} role="group" aria-label={label}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
        );
      })}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function SymbolLink({ market, symbol, children }) {
  return (
    <Link className="sym" to={`/stock/${market}/${symbol}`}>{children || symbol}</Link>
  );
}

export const Skel = ({ w = "100%", h = 14, style }) => (
  <div className="skel" style={{ width: w, height: h, ...style }} />
);
