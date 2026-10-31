"""Encrypt/decrypt per-user API keys at rest (Fernet, key derived from SECRET_KEY)."""
import os
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken


def _fernet() -> Fernet:
    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY is not set")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(value: str):
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        # SECRET_KEY was changed since the key was saved
        return None


def get_user_keys(db, user_id: int) -> dict:
    """Return {'groq': ..., 'tavily': ...}: the user's saved keys, else server .env keys."""
    from models import UserApiKeys
    row = db.query(UserApiKeys).filter(UserApiKeys.user_id == user_id).first()
    groq = decrypt(row.groq_key) if row and row.groq_key else None
    tavily = decrypt(row.tavily_key) if row and row.tavily_key else None
    return {
        "groq": groq or os.getenv("GROQ_API_KEY"),
        "tavily": tavily or os.getenv("TAVILY_API_KEY"),
    }
