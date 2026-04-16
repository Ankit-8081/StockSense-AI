import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Star, Newspaper, BarChart2, TrendingUp, LogOut, Menu, X, Search, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { path: "/",            icon: LayoutDashboard, label: "Dashboard"   },
  { path: "/watchlist",   icon: Star,             label: "Watchlist"   },
  { path: "/predictions", icon: TrendingUp,        label: "Predictions" },
  { path: "/screener",    icon: BarChart2,         label: "Screener"   },
  { path: "/news",        icon: Newspaper,         label: "News"       },
];

const C = {
  bg:      "#0f1420",
  border:  "#1e2d40",
  teal:    "#14b8a6",
  text:    "#e2e8f0",
  muted:   "#64748b",
  card:    "#131929",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) { navigate(`/screener?q=${encodeURIComponent(query.trim())}`); setQuery(""); }
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        height: "64px", display: "flex", alignItems: "center",
        padding: "0 20px", gap: "16px",
        boxShadow: "0 1px 20px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: "flex", alignItems: "center", gap: "10px",
          textDecoration: "none", flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg, #14b8a6, #6366f1)",
            borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ color: C.text, fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>
            StockSense <span style={{ color: C.teal }}>AI</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: "2px", flex: 1 }} className="hide-mobile">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 13px", borderRadius: "8px",
                fontSize: "13px", fontWeight: active ? 600 : 400,
                color: active ? C.teal : C.muted,
                background: active ? "rgba(20,184,166,0.1)" : "transparent",
                border: active ? "1px solid rgba(20,184,166,0.2)" : "1px solid transparent",
                textDecoration: "none", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = C.text; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "transparent"; }}}>
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: "260px", display: "flex" }} className="hide-mobile">
          <div style={{ position: "relative", width: "100%" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }} size={14} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search stocks…"
              style={{
                width: "100%", paddingLeft: "32px", paddingRight: "12px",
                paddingTop: "8px", paddingBottom: "8px",
                border: `1px solid ${C.border}`, borderRadius: "8px",
                fontSize: "13px", background: "#131929", color: C.text, outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = C.teal}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
        </form>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <button style={{
            width: 34, height: 34, borderRadius: "8px",
            border: `1px solid ${C.border}`, background: "#131929",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: C.muted,
          }}>
            <Bell size={15} />
          </button>

          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="hide-mobile">
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #14b8a6, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: "12px",
              }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: "13px", color: C.text, fontWeight: 500 }}>
                {user.name?.split(" ")[0]}
              </span>
            </div>
          )}

          <button onClick={logout} style={{
            width: 34, height: 34, borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#ef4444",
          }}>
            <LogOut size={15} />
          </button>

          <button onClick={() => setOpen(!open)} style={{
            width: 34, height: 34, borderRadius: "8px",
            border: `1px solid ${C.border}`, background: "#131929",
            cursor: "pointer", alignItems: "center", justifyContent: "center",
            color: C.muted, display: "none",
          }} className="show-mobile">
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      {open && (
        <div style={{
          position: "fixed", top: "64px", left: 0, right: 0, zIndex: 40,
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
        }}>
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} onClick={() => setOpen(false)} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "11px 14px", borderRadius: "8px", marginBottom: "4px",
                fontSize: "14px", fontWeight: active ? 600 : 400,
                color: active ? C.teal : C.text,
                background: active ? "rgba(20,184,166,0.1)" : "transparent",
                textDecoration: "none",
              }}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </>
  );
}