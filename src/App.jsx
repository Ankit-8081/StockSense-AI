import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/watchlist" element={<ProtectedRoute><AppLayout><Watchlist /></AppLayout></ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><AppLayout><Predictions /></AppLayout></ProtectedRoute>} />
      <Route path="/screener" element={<ProtectedRoute><AppLayout><Screener /></AppLayout></ProtectedRoute>} />
      <Route path="/news" element={<ProtectedRoute><AppLayout><NewsFeed /></AppLayout></ProtectedRoute>} />
      <Route path="/stock/:market/:symbol" element={<ProtectedRoute><AppLayout><StockDetail /></AppLayout></ProtectedRoute>} />
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