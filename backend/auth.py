"""Authentication & Credential Check Module for Orb."""

import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from backend.database import get_connection

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class PinLoginRequest(BaseModel):
    pin: str


class GoogleLoginRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None


class AuthResponse(BaseModel):
    status: str
    token: str
    user: UserResponse


def create_session(user_id: int) -> str:
    """Generates a secure session token valid for 30 days."""
    token = secrets.token_hex(32)
    now = datetime.now()
    expires_at = (now + timedelta(days=30)).isoformat()
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO user_sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
    """, (token, user_id, now.isoformat(), expires_at))
    conn.commit()
    conn.close()
    return token


def get_user_from_token(token: str) -> Optional[dict]:
    """Retrieves user associated with an unexpired session token."""
    if not token:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT u.id, u.username, u.email, s.expires_at
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at < datetime.now():
        return None
        
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"]
    }


def require_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency for protected endpoints."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token autentikasi tidak ditemukan")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Sesi telah kedaluwarsa atau tidak valid")
    return user


@router.post("/pin", response_model=AuthResponse)
def login_with_pin(body: PinLoginRequest):
    """Verifies PIN credential (standard default PIN: 1607)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, pin FROM users WHERE id = 1")
    user_row = cursor.fetchone()
    conn.close()

    if not user_row:
        raise HTTPException(status_code=404, detail="Akun pengguna tidak ditemukan")

    # Match PIN
    if str(body.pin).strip() != str(user_row["pin"]):
        raise HTTPException(status_code=401, detail="PIN salah. Silakan coba lagi.")

    token = create_session(user_row["id"])
    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user_row["id"],
            "username": user_row["username"],
            "email": user_row["email"]
        }
    }


@router.post("/google", response_model=AuthResponse)
def login_with_google(body: GoogleLoginRequest):
    """Handles Google login or simulation."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users WHERE id = 1")
    user_row = cursor.fetchone()
    
    if not user_row:
        now = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO users (id, username, email, pin, google_id, created_at)
        VALUES (1, 'ferdy', ?, '1607', ?, ?)
        """, (body.email or "ferdy@krftworks.my.id", "google-sub", now))
        conn.commit()
        user_id = 1
        username = "ferdy"
        email = body.email or "ferdy@krftworks.my.id"
    else:
        user_id = user_row["id"]
        username = user_row["username"]
        email = body.email or user_row["email"]
        if body.email and body.email != user_row["email"]:
            cursor.execute("UPDATE users SET email = ? WHERE id = ?", (body.email, user_id))
            conn.commit()
            
    conn.close()

    token = create_session(user_id)
    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "email": email
        }
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: dict = Depends(require_current_user)):
    """Returns authenticated user profile."""
    return user


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Invalidates current session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"status": "logged_out"}
