"""Ask an LLM for JSON: Groq first, Google Gemini as the backup."""
import json
import re

GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-2.5-flash"


def _groq(key, temperature):
    from langchain_groq import ChatGroq
    return ChatGroq(api_key=key, model_name=GROQ_MODEL, temperature=temperature)


def _gemini(key, temperature):
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(model=GEMINI_MODEL, google_api_key=key, temperature=temperature)


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
            errors.append(f"{name}: {e}")
    raise RuntimeError("; ".join(errors) or "No AI key available")
