import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { keysAPI } from "./services/api";
import ApiKeys from "./pages/ApiKeys";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import StockDetail from "./pages/StockDetail";
import Predictions from "./pages/Predictions";
import Screener from "./pages/Screener";
import NewsFeed from "./pages/NewsFeed";
import Watchlist from "./pages/Watchlist";
import { Login, Register } from "./pages/Auth";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0b0f1a",
        flexDirection: "column", gap: "16px",
      }}>
        <div style={{
          width: "44px", height: "44px",
          border: "3px solid #1e293b", borderTopColor: "#14b8a6",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Loading StockSense AI...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// After login: send the user to /api-keys until they've saved a Groq key or skipped.
function KeysGate() {
  const { user } = useAuth();
  const location = useLocation();
  const [keys, setKeys] = useState(undefined); // undefined = still loading

  const refresh = () =>
    keysAPI.get().then((r) => setKeys(r.data)).catch(() => setKeys(null));

  useEffect(() => { refresh(); }, []);

  if (keys === undefined) return null;

  let skipped = false;
  try { skipped = localStorage.getItem(`keys_skipped_${user?.id}`) === "1"; } catch {}

  const needsSetup = keys && !keys.groq.saved && !skipped;
  if (needsSetup && location.pathname !== "/api-keys") {
    return <Navigate to="/api-keys" replace />;
  }
  return <Outlet context={{ keys, refresh }} />;
}

function AppLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <Navbar />
      <main style={{ paddingTop: "64px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 20px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><KeysGate /></ProtectedRoute>}>
        <Route path="/api-keys" element={<ApiKeys />} />
        <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/watchlist" element={<AppLayout><Watchlist /></AppLayout>} />
        <Route path="/predictions" element={<AppLayout><Predictions /></AppLayout>} />
        <Route path="/screener" element={<AppLayout><Screener /></AppLayout>} />
        <Route path="/news" element={<AppLayout><NewsFeed /></AppLayout>} />
        <Route path="/stock/:market/:symbol" element={<AppLayout><StockDetail /></AppLayout>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}