"""Encrypt/decrypt per-user API keys at rest (Fernet, key derived from SECRET_KEY)."""
import os
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def _fernet() -> MultiFernet:
    """New keys use a purpose-bound HKDF key; keys saved by older versions (plain SHA-256) still decrypt."""
    secret = os.getenv("ENCRYPTION_KEY") or os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY is not set")
    new = base64.urlsafe_b64encode(
        HKDF(algorithm=hashes.SHA256(), length=32, salt=b"stocksense-api-keys-v2", info=b"fernet-user-api-keys").derive(secret.encode()))
    legacy = base64.urlsafe_b64encode(hashlib.sha256((os.getenv("SECRET_KEY") or secret).encode()).digest())
    return MultiFernet([Fernet(new), Fernet(legacy)])


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(value: str):
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        # SECRET_KEY was changed since the key was saved
        return None


def get_user_keys(db, user_id: int) -> dict:
    """Return {'groq': ..., 'tavily': ..., 'google': ...}: the user's saved keys, else server .env keys."""
    from models import UserApiKeys
    row = db.query(UserApiKeys).filter(UserApiKeys.user_id == user_id).first()
    groq = decrypt(row.groq_key) if row and row.groq_key else None
    tavily = decrypt(row.tavily_key) if row and row.tavily_key else None
    google = decrypt(row.google_key) if row and row.google_key else None
    # Server-owned keys are shared by every account, so they are only used when the owner opts in.
    if os.getenv("ALLOW_SERVER_KEYS", "").lower() in ("1", "true", "yes"):
        groq = groq or os.getenv("GROQ_API_KEY")
        tavily = tavily or os.getenv("TAVILY_API_KEY")
        google = google or os.getenv("GOOGLE_API_KEY")
    return {"groq": groq, "tavily": tavily, "google": google}
