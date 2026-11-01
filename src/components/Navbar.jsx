import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Star, Activity, Filter, Newspaper, Search, Bell, KeyRound, LogOut, ChevronDown, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { alertsAPI, stocksAPI } from "../services/api";
import { useTheme } from "../theme";
import { symbolOf, Segmented } from "./ui";

const SOURCE_LABELS = {
  groww_prices: "Groww prices (India)",
  groww_history: "Groww charts (India)",
  yahoo_india: "Yahoo fallback (India)",
  yahoo_us: "Yahoo (US)",
};

const NAV = [
  { to: "/",            icon: LayoutDashboard, label: "Markets",     end: true },
  { to: "/watchlist",   icon: Star,            label: "Watchlist" },
  { to: "/predictions", icon: Activity,        label: "Predictions" },
  { to: "/screener",    icon: Filter,          label: "Screener" },
  { to: "/news",        icon: Newspaper,       label: "News" },
];

const ALERT_POLL_MS = 60000;

export function Rail() {
  return (
    <nav className="rail" aria-label="Main">
      <Link to="/" className="rail-brand" aria-label="StockSense AI home">S</Link>
      {NAV.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className="rail-link">
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
}

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [fired, setFired] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [themePref, setThemePref, resolvedTheme] = useTheme();
  const [sources, setSources] = useState(null);
  const alertsRef = useRef(null);
  const accountRef = useRef(null);

  useDismiss(alertsRef, alertsOpen, () => setAlertsOpen(false));
  useDismiss(accountRef, accountOpen, () => setAccountOpen(false));

  // Poll the backend for triggered price alerts
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      alertsAPI.check()
        .then((r) => { if (!cancelled && r.data?.length) setFired((prev) => [...r.data, ...prev]); })
        .catch(() => {});
    check();
    const id = setInterval(check, ALERT_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Check the price sources each time the account menu opens
  useEffect(() => {
    if (!accountOpen) return;
    setSources(null);
    stocksAPI.status().then((r) => setSources(r.data)).catch(() => setSources({ error: true }));
  }, [accountOpen]);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) { navigate(`/screener?q=${encodeURIComponent(q)}`); setQuery(""); }
  };

  return (
    <header className="topbar">
      <form className="search" onSubmit={submit} role="search">
        <Search size={16} aria-hidden="true" />
        <input
          className="input" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks, e.g. TCS" aria-label="Search stocks"
        />
      </form>
      <div className="topbar-spacer" />

      <button className="icon-btn" onClick={() => setThemePref(resolvedTheme === "light" ? "dark" : "light")}
        aria-label={resolvedTheme === "light" ? "Switch to dark theme" : "Switch to light theme"}>
        {resolvedTheme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      <div ref={alertsRef} style={{ position: "relative" }}>
        <button
          className="icon-btn" onClick={() => setAlertsOpen((o) => !o)}
          aria-label={fired.length ? `${fired.length} triggered price alerts` : "Price alerts"}
          aria-expanded={alertsOpen}
        >
          <Bell size={17} />
          {fired.length > 0 && <span className="badge-count">{fired.length}</span>}
        </button>
        {alertsOpen && (
          <div className="menu" role="dialog" aria-label="Price alerts">
            <div className="menu-head" style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Price alerts</strong>
              {fired.length > 0 && (
                <button className="link" onClick={() => setFired([])}>Clear</button>
              )}
            </div>
            {fired.length === 0 ? (
              <p className="muted menu-head">No alerts have triggered. Set one from any stock page.</p>
            ) : fired.map((a) => (
              <Link key={a.id} className="menu-item" to={`/stock/NSE/${a.symbol}`} onClick={() => setAlertsOpen(false)}>
                <span>
                  <strong>{a.symbol}</strong> went {a.condition} {symbolOf(a.currency)}{a.target_price}
                  <span className="sub">Now {symbolOf(a.currency)}{a.price?.toLocaleString()}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div ref={accountRef} style={{ position: "relative" }}>
        <button className="btn" onClick={() => setAccountOpen((o) => !o)} aria-expanded={accountOpen}>
          {user?.name?.split(" ")[0] || "Account"}
          <ChevronDown size={14} />
        </button>
        {accountOpen && (
          <div className="menu" style={{ width: 290 }}>
            <div className="menu-head">
              <strong>{user?.name}</strong>
              <span className="sub">{user?.email}</span>
            </div>
            <div className="menu-sep" />
            <Link className="menu-item" to="/api-keys" onClick={() => setAccountOpen(false)}>
              <KeyRound size={16} /> API keys
            </Link>
            <button className="menu-item" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
            <div className="menu-sep" />
            <div className="menu-head">
              <strong style={{ display: "block", marginBottom: 8 }}>Theme</strong>
              <Segmented block value={themePref} onChange={setThemePref} label="Theme"
                options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
            </div>
            <div className="menu-sep" />
            <div className="menu-head">
              <strong style={{ display: "block", marginBottom: 6 }}>Data sources</strong>
              {sources === null ? <span className="muted">Checking…</span>
                : sources.error ? <span className="muted">Couldn't check. Is the backend running?</span>
                : Object.entries(sources).map(([k, v]) => (
                  <div className="src-row" key={k}>
                    <span>{SOURCE_LABELS[k] || k}</span>
                    <span className={`delta ${v.ok ? "up" : "down"}`}>
                      {v.ok ? "Working" : "Down"}
                      <span className="muted" style={{ fontWeight: 400 }}>{v.ok ? `${v.ms} ms` : v.detail}</span>
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
