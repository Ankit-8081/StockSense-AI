import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { KeyRound, Eye, EyeOff, Check, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { keysAPI } from "../services/api";

const FIELDS = [
  {
    id: "groq", label: "Groq API key", required: true, placeholder: "gsk_…",
    help: "Powers sentiment analysis and predictions.",
    url: "https://console.groq.com/keys",
  },
  {
    id: "tavily", label: "Tavily API key", required: false, placeholder: "tvly-…",
    help: "Fetches the news used for sentiment. Without it, predictions rely on technicals only.",
    url: "https://app.tavily.com",
  },
];

export default function ApiKeys() {
  const { user } = useAuth();
  const { keys, refresh } = useOutletContext();
  const navigate = useNavigate();
  const [values, setValues] = useState({ groq: "", tavily: "" });
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSetup = !keys?.groq?.saved;

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const body = {};
    if (values.groq.trim()) body.groq_key = values.groq.trim();
    if (values.tavily.trim()) body.tavily_key = values.tavily.trim();
    if (!Object.keys(body).length) {
      setError("Enter at least one key to save.");
      return;
    }
    setSaving(true);
    try {
      await keysAPI.save(body);
      await refresh();
      navigate("/");
    } catch {
      setError("Could not save your keys. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setError("");
    try {
      await keysAPI.save({ [`${id}_key`]: "" });
      await refresh();
    } catch {
      setError("Could not remove the key.");
    }
  };

  const skip = () => {
    try { localStorage.setItem(`keys_skipped_${user?.id}`, "1"); } catch {}
    navigate("/");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0b0f1a",
      backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(20,184,166,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.1) 0%, transparent 50%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <form onSubmit={save} style={{
        width: "100%", maxWidth: "480px", background: "#131929", borderRadius: "18px",
        padding: "36px 32px", border: "1px solid #1e2d40", boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "12px", marginBottom: "16px",
          background: "linear-gradient(135deg, #14b8a6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <KeyRound size={22} color="#fff" />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>
          {isSetup ? "Add your API keys" : "API keys"}
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
          Your keys are encrypted and only used to run your own predictions and news.
        </p>

        {FIELDS.map((f) => {
          const status = keys?.[f.id];
          return (
            <div key={f.id} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8", letterSpacing: "0.3px" }}>
                  {f.label.toUpperCase()}{f.required ? " *" : " (OPTIONAL)"}
                </label>
                <a href={f.url} target="_blank" rel="noreferrer" style={{
                  fontSize: "12px", color: "#14b8a6", display: "flex", alignItems: "center", gap: "4px",
                }}>
                  Get a key <ExternalLink size={11} />
                </a>
              </div>

              {status?.saved && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.25)",
                  borderRadius: "8px", padding: "8px 12px", marginBottom: "8px",
                  fontSize: "12px", color: "#14b8a6",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Check size={13} /> Saved ({status.preview})
                  </span>
                  <button type="button" onClick={() => remove(f.id)} style={{
                    background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer",
                  }}>Remove</button>
                </div>
              )}

              <div style={{ position: "relative" }}>
                <input
                  type={show[f.id] ? "text" : "password"}
                  value={values[f.id]}
                  onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                  placeholder={status?.saved ? "Enter a new key to replace it" : f.placeholder}
                  autoComplete="off"
                  style={{
                    width: "100%", padding: "11px 44px 11px 16px", border: "1px solid #1e2d40",
                    borderRadius: "10px", fontSize: "14px", color: "#e2e8f0",
                    background: "#0f1420", outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#14b8a6")}
                  onBlur={(e) => (e.target.style.borderColor = "#1e2d40")}
                />
                <button type="button" onClick={() => setShow({ ...show, [f.id]: !show[f.id] })} style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex",
                }}>
                  {show[f.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>{f.help}</p>
            </div>
          );
        })}

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#ef4444", marginBottom: "16px",
          }}>{error}</div>
        )}

        <button type="submit" disabled={saving} style={{
          width: "100%", padding: "12px",
          background: saving ? "rgba(20,184,166,0.4)" : "linear-gradient(135deg, #14b8a6, #0d9488)",
          color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 20px rgba(20,184,166,0.3)",
        }}>
          {saving ? "Saving…" : "Save and continue"}
        </button>

        <button type="button" onClick={isSetup ? skip : () => navigate("/")} style={{
          width: "100%", marginTop: "10px", padding: "10px", background: "none",
          border: "none", color: "#64748b", fontSize: "13px", cursor: "pointer",
        }}>
          {isSetup ? "Skip for now" : "Back to dashboard"}
        </button>
      </form>
    </div>
  );
}
