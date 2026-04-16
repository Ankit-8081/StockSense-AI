import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b0f1a",
      backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(20,184,166,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.1) 0%, transparent 50%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            background: "rgba(20,184,166,0.1)", backdropFilter: "blur(10px)",
            padding: "10px 22px", borderRadius: "50px",
            border: "1px solid rgba(20,184,166,0.25)",
          }}>
            <div style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #14b8a6, #6366f1)",
              borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TrendingUp size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "17px" }}>
              StockSense <span style={{ color: "#14b8a6" }}>AI</span>
            </span>
          </div>
          <p style={{ color: "#64748b", marginTop: "10px", fontSize: "13px" }}>
            AI-powered stock monitoring & predictions
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#131929", borderRadius: "18px", padding: "36px 32px",
          border: "1px solid #1e2d40",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>{title}</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "28px" }}>{subtitle}</p>
          {children}
        </div>

        <div style={{ textAlign: "center", marginTop: "20px", color: "#64748b", fontSize: "13px" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, show, onToggle }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px", letterSpacing: "0.3px" }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show !== undefined ? (show ? "text" : "password") : type}
          value={value} onChange={onChange} placeholder={placeholder}
          style={{
            width: "100%", padding: "11px 16px", paddingRight: onToggle ? "44px" : "16px",
            border: "1px solid #1e2d40", borderRadius: "10px",
            fontSize: "14px", color: "#e2e8f0", background: "#0f1420", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "#14b8a6"}
          onBlur={e => e.target.style.borderColor = "#1e2d40"}
        />
        {onToggle && (
          <button type="button" onClick={onToggle} style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#64748b",
            display: "flex", alignItems: "center",
          }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/"); }
    catch { setError("Invalid email or password. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your StockSense account"
      footer={<>Don't have an account? <Link to="/register" style={{ color: "#14b8a6", fontWeight: 600 }}>Create one</Link></>}>
      <form onSubmit={handleSubmit}>
        <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" show={showPass} onToggle={() => setShowPass(!showPass)} />
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "12px",
          background: loading ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #0d9488)",
          color: "#fff", border: "none", borderRadius: "10px",
          fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          boxShadow: "0 4px 20px rgba(20,184,166,0.3)",
        }}>
          {loading ? "Signing in..." : <><span>Sign in</span><ArrowRight size={15} /></>}
        </button>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try { await authAPI.register({ name, email, password }); await login(email, password); navigate("/"); }
    catch (err) { setError(err.response?.data?.detail || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start your AI-powered investing journey"
      footer={<>Already have an account? <Link to="/login" style={{ color: "#14b8a6", fontWeight: 600 }}>Sign in</Link></>}>
      <form onSubmit={handleSubmit}>
        <Field label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Ankit Sharma" />
        <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" show={showPass} onToggle={() => setShowPass(!showPass)} />
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "12px",
          background: loading ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #0d9488)",
          color: "#fff", border: "none", borderRadius: "10px",
          fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          boxShadow: "0 4px 20px rgba(20,184,166,0.3)",
        }}>
          {loading ? "Creating account..." : <><span>Create account</span><ArrowRight size={15} /></>}
        </button>
      </form>
    </AuthLayout>
  );
}