from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserApiKeys
from routers.auth import get_current_user
from services.secrets import encrypt, decrypt

router = APIRouter()


class KeysIn(BaseModel):
    # None = leave unchanged, "" = remove, anything else = save
    groq_key: Optional[str] = None
    tavily_key: Optional[str] = None
    google_key: Optional[str] = None


def _preview(stored: Optional[str]) -> dict:
    plain = decrypt(stored) if stored else None
    if not plain:
        return {"saved": False, "preview": None}
    return {"saved": True, "preview": f"{plain[:4]}…{plain[-4:]}" if len(plain) > 10 else "••••"}


@router.get("/")
def get_keys(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.query(UserApiKeys).filter(UserApiKeys.user_id == current_user.id).first()
    return {
        "groq": _preview(row.groq_key if row else None),
        "tavily": _preview(row.tavily_key if row else None),
        "google": _preview(row.google_key if row else None),
    }


@router.put("/")
def save_keys(req: KeysIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.query(UserApiKeys).filter(UserApiKeys.user_id == current_user.id).first()
    if not row:
        row = UserApiKeys(user_id=current_user.id)
        db.add(row)

    if req.groq_key is not None:
        v = req.groq_key.strip()
        row.groq_key = encrypt(v) if v else None
    if req.tavily_key is not None:
        v = req.tavily_key.strip()
        row.tavily_key = encrypt(v) if v else None
    if req.google_key is not None:
        v = req.google_key.strip()
        row.google_key = encrypt(v) if v else None

    db.commit()
    db.refresh(row)
    return {"groq": _preview(row.groq_key), "tavily": _preview(row.tavily_key), "google": _preview(row.google_key)}
