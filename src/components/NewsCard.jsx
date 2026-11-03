import { ExternalLink } from "lucide-react";
import { timeAgo } from "./ui";

// Only http(s) links are allowed; anything else (javascript:, data:) is dropped.
const safeUrl = (u) => {
  try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:" ? p.href : undefined; }
  catch { return undefined; }
};

export default function NewsCard({ article }) {
  const { title, content, published_date, source } = article;
  const url = safeUrl(article.url);
  return (
    <a className="news-row" href={url} target="_blank" rel="noopener noreferrer">
      <div className="news-meta">
        {source && <span>{source}</span>}
        {source && published_date && <span aria-hidden="true">·</span>}
        {published_date && <span>{timeAgo(published_date)}</span>}
        <ExternalLink size={12} style={{ marginLeft: "auto" }} aria-label="Opens in a new tab" />
      </div>
      <p className="news-title">{title}</p>
      {content && <p className="news-body clamp-2">{content}</p>}
    </a>
  );
}
