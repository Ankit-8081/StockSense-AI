"""Ask an LLM for JSON: Groq first, Google Gemini as the backup."""
import json
import re

GROQ_MODEL = "llama-3.3-70b-versatile"
import os

# Google retires Gemini models often. Try the newest first; override with GEMINI_MODEL in .env.
GEMINI_MODELS = [m for m in (os.getenv("GEMINI_MODEL"), "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash") if m]
_gemini_ok = None  # remembers the model that last worked


def _groq(key, temperature):
    from langchain_groq import ChatGroq
    return ChatGroq(api_key=key, model_name=GROQ_MODEL, temperature=temperature)


class _GeminiChat:
    """Calls Gemini, moving to the next model name if one has been retired (404 / not found)."""
    def __init__(self, key, temperature):
        self.key, self.temperature = key, temperature

    def invoke(self, messages):
        global _gemini_ok
        from langchain_google_genai import ChatGoogleGenerativeAI
        order = ([_gemini_ok] if _gemini_ok else []) + [m for m in GEMINI_MODELS if m != _gemini_ok]
        last = None
        for model in order:
            try:
                out = ChatGoogleGenerativeAI(model=model, google_api_key=self.key,
                                             temperature=self.temperature, max_retries=1).invoke(messages)
                _gemini_ok = model
                return out
            except Exception as e:
                last = e
                msg = str(e).lower()
                if not any(x in msg for x in ("404", "not found", "notfound", "no longer available", "not supported")):
                    raise
        raise last


def _gemini(key, temperature):
    return _GeminiChat(key, temperature)


def _text(content) -> str:
    if isinstance(content, list):  # some Gemini versions return parts
        return "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
    return str(content)


def parse_json(text: str) -> dict:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.I).strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", t, re.S)  # models sometimes wrap JSON in prose
        if m:
            return json.loads(m.group(0))
        raise


def ask_json(messages, groq_key=None, google_key=None, temperature=0.1) -> dict:
    errors = []
    for name, key, make in (("Groq", groq_key, _groq), ("Gemini", google_key, _gemini)):
        if not key:
            continue
        try:
            return parse_json(_text(make(key, temperature).invoke(messages).content))
        except Exception as e:
            msg = str(e).lower()
            if any(x in msg for x in ("prepayment", "credits are depleted", "resourceexhausted", "quota", "429", "rate limit")):
                errors.append(f"{name} has no credits or quota left. Add credits (Google AI Studio / Groq console) or use another key")
            else:
                errors.append(f"{name}: {e}")
    raise RuntimeError("; ".join(errors) or "No AI key available")
