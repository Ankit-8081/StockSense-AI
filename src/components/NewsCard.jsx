import { ExternalLink, Clock } from "lucide-react";

const C = { bg: "#131929", border: "#1e2d40", teal: "#14b8a6", text: "#e2e8f0", muted: "#64748b" };

export default function NewsCard({ article }) {
  const { title, url, content, published_date, source } = article;

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "block", textDecoration: "none",
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: "12px", padding: "14px 16px",
      transition: "all 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.background = "rgba(20,184,166,0.04)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <p style={{
          fontSize: "13px", fontWeight: 600, color: C.text,
          lineHeight: 1.5, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{title}</p>
        <ExternalLink size={14} style={{ color: C.muted, flexShrink: 0, marginTop: "2px" }} />
      </div>
      {content && (
        <p style={{
          fontSize: "12px", color: C.muted, marginTop: "6px", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{content}</p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
        {source && (
          <span style={{
            fontSize: "11px", color: C.teal,
            background: "rgba(20,184,166,0.1)",
            border: "1px solid rgba(20,184,166,0.2)",
            padding: "2px 8px", borderRadius: "4px",
          }}>{source}</span>
        )}
        {published_date && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: C.muted }}>
            <Clock size={11} />
            {timeAgo(published_date)}
          </span>
        )}
      </div>
    </a>
  );
}