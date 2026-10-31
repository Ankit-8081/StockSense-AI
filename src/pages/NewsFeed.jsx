import { useState, useEffect } from "react";
import { newsAPI } from "../services/api";
import NewsCard from "../components/NewsCard";
import { Segmented, Empty, Skel } from "../components/ui";

export default function NewsFeed() {
  const [market, setMarket] = useState("NSE");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    newsAPI.marketNews(market)
      .then((r) => setNews(r.data || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [market]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">News</h1>
          <p className="page-sub">Latest headlines for the {market === "US" ? "US" : market} market.</p>
        </div>
        <Segmented value={market} onChange={setMarket} options={["NSE", "BSE", "US"]} label="Market" />
      </div>

      <section className="panel" style={{ maxWidth: 920 }}>
        {loading ? (
          <ul className="row-list" aria-busy="true" aria-label="Loading news">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} style={{ padding: 16, display: "grid", gap: 8 }}>
                <Skel w="22%" h={12} /><Skel w="80%" h={18} /><Skel w="60%" />
              </li>
            ))}
          </ul>
        ) : news.length === 0 ? (
          <Empty title="No headlines right now">
            News comes from Tavily. If this stays empty, check that your Tavily key is saved under API keys.
          </Empty>
        ) : (
          <ul className="row-list">{news.map((a, i) => <li key={i}><NewsCard article={a} /></li>)}</ul>
        )}
      </section>
    </div>
  );
}
