import os
from datetime import timedelta

basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-dev-secret-change-in-production")
    
    # 1. အွန်လိုင်း Environment က DATABASE_URL ကို အရင်လှမ်းဖတ်မယ်
    db_url = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'pos.db')}")
    
    # 2. Render ရဲ့ postgres:// ဖြစ်နေရင် postgresql:// သို့ ပြောင်းပေးမယ်
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    # 3. အမှန်ပြင်ပြီးသား URL ကိုမှ SQLAlchemy ထဲ ထည့်ပေးမယ်
    SQLALCHEMY_DATABASE_URI = db_url
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
