import { ExternalLink } from "lucide-react";
import { timeAgo } from "./ui";

export default function NewsCard({ article }) {
  const { title, url, content, published_date, source } = article;
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
