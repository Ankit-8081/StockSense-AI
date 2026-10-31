import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import AuthShell from "../components/AuthShell";

function Field({ id, label, type = "text", value, onChange, placeholder, autoComplete, secret }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <div className={secret ? "input-wrap" : undefined}>
        <input
          id={id} className="input" required
          type={secret ? (show ? "text" : "password") : type}
          value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
        />
        {secret && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/"); }
    catch { setError("Email or password is incorrect."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell
      title="Sign in" subtitle="Use your StockSense account."
      footer={<>New here? <Link className="link" to="/register">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit}>
        <Field id="email" label="Email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field id="password" label="Password" secret autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: 11 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (password.length < 6) { setError("Use a password with at least 6 characters."); return; }
    setLoading(true);
    try { await authAPI.register({ name, email, password }); await login(email, password); navigate("/"); }
    catch (err) { setError(err.response?.data?.detail || "Could not create your account. Check your details and try again."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell
      title="Create your account" subtitle="It takes a minute. You'll add your API keys next."
      footer={<>Already have an account? <Link className="link" to="/login">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit}>
        <Field id="name" label="Full name" autoComplete="name" value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Ankit Sharma" />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field id="password" label="Password" secret autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: 11 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
