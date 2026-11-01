import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Eye, EyeOff, Check, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { keysAPI } from "../services/api";
import AuthShell from "../components/AuthShell";

const FIELDS = [
  {
    id: "groq", label: "Groq API key", required: false, placeholder: "gsk_…",
    help: "Runs the sentiment analysis and predictions. Add this or a Google AI key.",
    url: "https://console.groq.com/keys",
  },
  {
    id: "google", label: "Google AI (Gemini) key", required: false, placeholder: "AIza…",
    help: "Backup AI for predictions if Groq is busy or its limit is reached. It also works on its own.",
    url: "https://aistudio.google.com/apikey",
  },
  {
    id: "tavily", label: "Tavily API key", required: false, placeholder: "tvly-…",
    help: "Adds more news results. Google News headlines are included without any key.",
    url: "https://app.tavily.com",
  },
];

export default function ApiKeys() {
  const { user } = useAuth();
  const { keys, refresh } = useOutletContext();
  const navigate = useNavigate();
  const [values, setValues] = useState({ groq: "", google: "", tavily: "" });
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSetup = !keys?.groq?.saved && !keys?.google?.saved;

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const body = {};
    if (values.groq.trim()) body.groq_key = values.groq.trim();
    if (values.google.trim()) body.google_key = values.google.trim();
    if (values.tavily.trim()) body.tavily_key = values.tavily.trim();
    if (!Object.keys(body).length) {
      setError("Enter a key to save, or skip this for now.");
      return;
    }
    setSaving(true);
    try {
      await keysAPI.save(body);
      await refresh();
      navigate("/");
    } catch {
      setError("Could not save your keys. Check your connection and try again.");
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
      setError("Could not remove that key. Try again.");
    }
  };

  const skip = () => {
    try { localStorage.setItem(`keys_skipped_${user?.id}`, "1"); } catch {}
    navigate("/");
  };

  return (
    <AuthShell
      title={isSetup ? "Add your API keys" : "API keys"}
      subtitle="Keys are encrypted and used only to run your own predictions and news."
    >
      <form onSubmit={save}>
        {FIELDS.map((f) => {
          const status = keys?.[f.id];
          return (
            <div key={f.id} className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="label" htmlFor={`key-${f.id}`}>{f.label}</label>
                <a className="link" href={f.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, display: "inline-flex", gap: 4, alignItems: "center" }}>
                  Get a key <ExternalLink size={11} />
                </a>
              </div>

              {status?.saved && (
                <div className="notice notice-ok" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <Check size={14} /> Saved ({status.preview})
                  </span>
                  <button type="button" className="btn btn-quiet btn-danger" style={{ padding: "2px 8px" }} onClick={() => remove(f.id)}>
                    Remove
                  </button>
                </div>
              )}

              <div className="input-wrap">
                <input
                  id={`key-${f.id}`} className="input" autoComplete="off"
                  type={show[f.id] ? "text" : "password"}
                  value={values[f.id]}
                  onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                  placeholder={status?.saved ? "Paste a new key to replace it" : f.placeholder}
                />
                <button type="button" onClick={() => setShow({ ...show, [f.id]: !show[f.id] })}
                  aria-label={show[f.id] ? "Hide key" : "Show key"}>
                  {show[f.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="hint">{f.help}</p>
            </div>
          );
        })}

        {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

        <button type="submit" disabled={saving} className="btn btn-primary btn-block" style={{ padding: 11 }}>
          {saving ? "Saving…" : "Save keys"}
        </button>
        <button type="button" className="btn btn-quiet btn-block" style={{ marginTop: 8 }}
          onClick={isSetup ? skip : () => navigate("/")}>
          {isSetup ? "Skip for now" : "Back to markets"}
        </button>
      </form>
    </AuthShell>
  );
}
