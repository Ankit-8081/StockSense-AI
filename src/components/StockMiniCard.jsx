import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const C = { bg: "#131929", border: "#1e2d40", teal: "#14b8a6", text: "#e2e8f0", muted: "#64748b" };

// "Apple Inc." -> "A", "Meta Platforms, Inc." -> "MP"; falls back to the ticker
function initials(name, symbol) {
  const words = (name || "")
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(inc|corp|corporation|co|company|ltd|limited|plc|holdings?|group|the)$/i.test(w));
  if (!words.length || name === symbol) return symbol.slice(0, 2);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function StockMiniCard({ symbol, market, name, price, change_pct, currency = "INR", onClick }) {
  const navigate  = useNavigate();
  const isUp      = change_pct > 0;
  const isDown    = change_pct < 0;
  const Icon      = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color     = isUp ? "#10b981" : isDown ? "#ef4444" : C.muted;
  const badgeBg   = isUp ? "rgba(16,185,129,0.1)" : isDown ? "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)";
  const badgeBorder = isUp ? "rgba(16,185,129,0.2)" : isDown ? "rgba(239,68,68,0.2)" : "rgba(100,116,139,0.15)";

  return (
    <div
      onClick={() => onClick ? onClick() : navigate(`/stock/${market}/${symbol}`)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderRadius: "12px",
        border: `1px solid ${C.border}`, background: C.bg,
        cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.background = "rgba(20,184,166,0.04)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "9px",
          background: "rgba(20,184,166,0.1)",
          border: "1px solid rgba(20,184,166,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "11px", color: C.teal, flexShrink: 0,
        }}>
          {initials(name, symbol)}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "14px", color: C.text, margin: 0 }}>{symbol}</p>
          <p style={{ fontSize: "11px", color: C.muted, margin: 0, maxWidth: "170px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name || market}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, fontSize: "14px", color: C.text, margin: 0 }}>
            {price > 0 ? `${currency === "INR" ? "₹" : "$"}${price.toLocaleString()}` : "—"}
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "4px 9px", borderRadius: "6px",
          background: badgeBg, border: `1px solid ${badgeBorder}`,
          fontSize: "12px", fontWeight: 600, color,
        }}>
          <Icon size={11} />
          {change_pct !== undefined && change_pct !== null
            ? `${isUp ? "+" : ""}${change_pct.toFixed(2)}%`
            : "—"}
        </div>
      </div>
    </div>
  );
}