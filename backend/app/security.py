import hashlib
import hmac
import secrets
import time
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import config, get_db
from .models import LoginSession, User

COOKIE = 'bayachad_session'
hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(32))

def password_hash(password: str) -> str:
    if len(password) < 12 or len(password) > 128:
        raise ValueError('Password must contain between 12 and 128 characters')
    return hasher.hash(password)

def verify_password(encoded: str, password: str) -> bool:
    try:
        return hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False

def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def csrf_token(token: str) -> str:
    return hashlib.sha256(('csrf:' + token).encode()).hexdigest()

def require_origin(request: Request):
    if request.headers.get('origin') != config.origin:
        raise HTTPException(403, 'הבקשה חייבת להגיע מהאתר שלנו.')

def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE, '')
    if not token or len(token) > 128:
        raise HTTPException(401, 'יש להתחבר כדי לפתוח את הלוח הפרטי.')
    row = db.scalar(select(LoginSession).where(LoginSession.token_hash == token_hash(token), LoginSession.expires_at > int(time.time())))
    user = db.get(User, row.user_id) if row else None
    if not user:
        raise HTTPException(401, 'יש להתחבר כדי לפתוח את הלוח הפרטי.')
    return user

def require_write(request: Request, user: User = Depends(current_user), x_csrf_token: str = Header(default='', alias='X-CSRF-Token')) -> User:
    require_origin(request)
    expected = csrf_token(request.cookies[COOKIE])
    if not hmac.compare_digest(expected, x_csrf_token):
        raise HTTPException(403, 'תוקף הבקשה פג. רעננו את הדף ונסו שוב.')
    return user
