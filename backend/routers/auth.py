from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime, timedelta
from database import get_db
from models import User
import os
import logging
from sqlalchemy import func
from services.security import check_rate, client_ip

log = logging.getLogger("stocksense.auth")

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_PLACEHOLDERS = {"your-very-long-random-secret-key-here", "your-secret-key-here", "changeme", "secret"}
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set. Add it to Backend/.env")
if SECRET_KEY.strip().lower() in _PLACEHOLDERS:
    raise RuntimeError("SECRET_KEY is still the example value. Generate one: python -c \"import secrets; print(secrets.token_urlsafe(48))\"")
if len(SECRET_KEY) < 32:
    log.warning("SECRET_KEY is shorter than 32 characters. Use a random 48+ character value.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours by default

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

    @field_validator("password")
    @classmethod
    def password_ok(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password is too long (72 bytes maximum)")
        if v.lower() in {"password123", "1234567890", "qwertyuiop", "password1234", "0123456789"} or len(set(v)) < 4:
            raise ValueError("Password is too easy to guess")
        return v

    @field_validator("email")
    @classmethod
    def email_lower(cls, v):
        return v.lower()

class Token(BaseModel):
    access_token: str
    token_type: str

def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@router.post("/register", status_code=201)
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_rate(f"register:{client_ip(request)}", 5, 3600)
    if db.query(User).filter(func.lower(User.email) == req.email.lower()).first():
        raise HTTPException(status_code=400, detail="Could not create the account. If you already registered, sign in instead.")
    user = User(
        name=req.name.strip(),
        email=req.email.lower(),
        hashed_password=pwd_ctx.hash(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created", "user_id": user.id}

@router.post("/login", response_model=Token)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form.username.strip().lower()
    ip = client_ip(request)
    check_rate(f"login-ip:{ip}", 20, 900)            # 20 attempts / 15 min per IP
    check_rate(f"login-acct:{email}", 8, 900)        # 8 attempts / 15 min per account
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if len(form.password.encode()) > 72 or not user or not user.is_active or not pwd_ctx.verify(form.password, user.hashed_password):
        log.warning("failed login for %s from %s", email, ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": current_user.created_at
    }
