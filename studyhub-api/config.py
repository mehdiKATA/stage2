# ============================================================
# config.py — App configuration
# Edit DB URI to match your MySQL credentials
# ============================================================
import os

class Config:
    # ── Database ──────────────────────────────────────────
    # Format: mysql+pymysql://USER:PASSWORD@HOST:PORT/DB_NAME
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://root:KATTARINA2015m#@localhost:3306/studyhub_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Security ──────────────────────────────────────────
    SECRET_KEY = os.getenv('SECRET_KEY', 'studyhub-secret-change-in-production')

    # ── Session cookie ────────────────────────────────────
    # 'None' + Secure=False allows cookies from file:// and localhost
    SESSION_COOKIE_HTTPONLY  = True
    SESSION_COOKIE_SAMESITE  = 'None'
    SESSION_COOKIE_SECURE    = False   # set True only in HTTPS production
    PERMANENT_SESSION_LIFETIME = 86400  # session lasts 24h
