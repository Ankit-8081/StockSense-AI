from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class Market(str, enum.Enum):
    NSE = "NSE"
    BSE = "BSE"
    NYSE = "NYSE"
    NASDAQ = "NASDAQ"

class PredictionType(str, enum.Enum):
    INTRADAY = "intraday"
    DELIVERY = "delivery"

class Direction(str, enum.Enum):
    UP = "UP"
    DOWN = "DOWN"
    NEUTRAL = "NEUTRAL"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete")
    prediction_history = relationship("PredictionHistory", back_populates="user", cascade="all, delete")

class UserApiKeys(Base):
    __tablename__ = "user_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    groq_key = Column(Text, nullable=True)      # Fernet-encrypted
    tavily_key = Column(Text, nullable=True)    # Fernet-encrypted
    google_key = Column(Text, nullable=True)    # Fernet-encrypted (Gemini)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)          # e.g. RELIANCE, AAPL
    market = Column(Enum(Market), nullable=False)        # NSE / NASDAQ etc.
    yf_ticker = Column(String(20), nullable=False)       # RELIANCE.NS / AAPL
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="watchlist")

class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    symbol = Column(String(20), nullable=False)
    market = Column(Enum(Market), nullable=False)
    prediction_type = Column(Enum(PredictionType), nullable=False)
    direction = Column(Enum(Direction), nullable=False)
    confidence = Column(Float, nullable=False)           # 0.0 – 1.0
    sentiment_score = Column(Float, nullable=True)       # -1.0 to 1.0
    technical_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="prediction_history")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    yf_ticker = Column(String(20), nullable=False)
    condition = Column(String(10), nullable=False)       # "above" | "below"
    target_price = Column(Float, nullable=False)
    is_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
