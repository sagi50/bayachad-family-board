import secrets
import time
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select, text, update
from sqlalchemy.orm import Session
from .database import config, get_db
from .models import LoginSession, Task, User
from .schemas import LoginInput, TaskEdit, TaskInput, TaskReference
from .security import COOKIE, DUMMY_HASH, csrf_token, current_user, hasher, require_origin, require_write, token_hash, verify_password

app = FastAPI(title='ביחד — API', version='1.0.0', docs_url=None, redoc_url=None, openapi_url=None)

@app.middleware('http')
async def private_responses(request: Request, call_next):
    try:
        length = int(request.headers.get('content-length', '0') or '0')
    except ValueError:
        return JSONResponse({'error': 'הבקשה אינה תקינה.'}, 400)
    if length > 65536:
        return JSONResponse({'error': 'הבקשה ארוכה מדי.'}, 413)
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse({'error': exc.detail}, exc.status_code, headers=exc.headers)

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse({'error': 'פרטי הבקשה אינם תקינים. בדקו כותרת, מועד ושדות חובה.'}, 422)

@app.get('/api/health', tags=['health'])
def health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok'}

@app.post('/api/auth/login', tags=['authentication'])
def login(body: LoginInput, response: Response, request: Request, db: Session = Depends(get_db)):
    require_origin(request)
    now = int(time.time())
    user = db.scalar(select(User).where(User.username == body.username.strip().casefold()).with_for_update())
    if user and user.locked_until > now:
        raise HTTPException(429, 'בוצעו יותר מדי ניסיונות כניסה. נסו שוב בעוד 15 דקות.')
    valid = verify_password(user.password_hash if user else DUMMY_HASH, body.password)
    if not user or not valid:
        if user:
            user.failed_logins = (0 if user.locked_until and user.locked_until <= now else user.failed_logins) + 1
            if user.failed_logins >= 5:
                user.locked_until = now + 900
            db.commit()
        raise HTTPException(401, 'שם המשתמש או הסיסמה אינם נכונים.')
    user.failed_logins = 0
    user.locked_until = 0
    if hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hasher.hash(body.password)
    db.execute(delete(LoginSession).where(LoginSession.expires_at <= now))
    token = secrets.token_urlsafe(32)
    db.add(LoginSession(token_hash=token_hash(token), user_id=user.id, expires_at=now + config.session_seconds))
    db.commit()
    response.set_cookie(COOKIE, token, max_age=config.session_seconds, httponly=True, secure=config.cookie_secure, samesite='strict', path='/')
    return {'user': user.display_name, 'slot': user.slot, 'csrf_token': csrf_token(token)}

@app.get('/api/auth/me', tags=['authentication'])
def me(request: Request, user: User = Depends(current_user)):
    return {'user': user.display_name, 'slot': user.slot, 'csrf_token': csrf_token(request.cookies[COOKIE])}

@app.post('/api/auth/logout', tags=['authentication'])
def logout(request: Request, response: Response, user: User = Depends(require_write), db: Session = Depends(get_db)):
    db.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(request.cookies[COOKIE])))
    db.commit()
    response.delete_cookie(COOKIE, path='/', secure=config.cookie_secure, httponly=True, samesite='strict')
    return {'ok': True}

def serialized(task: Task):
    return {key: getattr(task, key) for key in ('id','title','details','topic','due','assignee','status','updated_at','updated_by','version')}

@app.get('/api/tasks', tags=['tasks'])
def tasks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Task).order_by(Task.due == '', Task.due, Task.updated_at.desc())).all()
    members = {member.slot: member.display_name for member in db.scalars(select(User)).all()}
    return {'tasks': [serialized(t) for t in rows], 'user': user.display_name, 'members': members, 'local': config.environment != 'production'}

@app.post('/api/tasks', status_code=201, tags=['tasks'])
def create_task(body: TaskInput, user: User = Depends(require_write), db: Session = Depends(get_db)):
    task = Task(id=str(uuid4()), **body.model_dump(), updated_at=datetime.now(timezone.utc).isoformat(timespec='milliseconds'), updated_by=user.display_name, updated_user_id=user.id, version=1)
    db.add(task)
    db.commit()
    return {'ok': True, 'id': task.id}

CONFLICT = 'המשימה השתנתה או נמחקה מאז שפתחתם אותה. פתחו אותה מחדש. הטקסט שהקלדתם נשאר בחלון להעתקה.'

@app.patch('/api/tasks', tags=['tasks'])
def edit_task(body: TaskEdit, user: User = Depends(require_write), db: Session = Depends(get_db)):
    values = body.model_dump(exclude={'id','version'})
    values.update(updated_at=datetime.now(timezone.utc).isoformat(timespec='milliseconds'), updated_by=user.display_name, updated_user_id=user.id, version=body.version + 1)
    result = db.execute(update(Task).where(Task.id == str(body.id), Task.version == body.version).values(**values))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, CONFLICT)
    db.commit()
    return {'ok': True, 'id': str(body.id)}

@app.delete('/api/tasks', tags=['tasks'])
def delete_task(body: TaskReference, user: User = Depends(require_write), db: Session = Depends(get_db)):
    result = db.execute(delete(Task).where(Task.id == str(body.id), Task.version == body.version))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, CONFLICT)
    db.commit()
    return {'ok': True}

@app.get('/api/openapi.json', include_in_schema=False)
def openapi(user: User = Depends(current_user)):
    return app.openapi()

@app.get('/api/docs', include_in_schema=False)
def docs(user: User = Depends(current_user)):
    return get_swagger_ui_html(openapi_url='/api/openapi.json', title='Bayachad API')
