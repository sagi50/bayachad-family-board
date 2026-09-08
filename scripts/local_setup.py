"""Prepare persistent local-only storage and create the first account once."""
import os
from pathlib import Path
import sqlite3
import sys
from datetime import datetime, timezone
from alembic import command
from alembic.config import Config

root = Path(__file__).resolve().parents[1]
data = root / 'local-data'
data.mkdir(exist_ok=True)
database = data / 'bayachad.sqlite3'
os.environ.update(APP_ENV='development', APP_ORIGIN='http://localhost:8080', COOKIE_SECURE='false', LOCAL_DATABASE_FILE=str(database))
os.chdir(root / 'backend')
sys.path.insert(0, str(root / 'backend'))

if database.exists():
    backup = data / 'backups'
    backup.mkdir(exist_ok=True)
    name = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '.sqlite3'
    with sqlite3.connect(database) as source, sqlite3.connect(backup / name) as target:
        source.backup(target)
command.upgrade(Config('alembic.ini'), 'head')
from app.database import SessionLocal
from app.models import User
from app.manage import create_user
from app.security import password_hash
from sqlalchemy import select
with SessionLocal() as db:
    exists = db.scalar(select(User.id).where(User.slot == 'husband'))
if not exists:
    import getpass
    password = getpass.getpass('Initial account password: ')
    create_user('SAGI HALILI','שגיא','husband',password_hash(password))
    del password
print('Local database ready. Initial account exists. No password was printed.')
