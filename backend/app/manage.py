"""Server-only account management; no public registration. At most two slots."""
import argparse
import getpass
import os
from pathlib import Path
from uuid import uuid4
from sqlalchemy import delete, select
from .database import SessionLocal
from .models import LoginSession, User
from .security import password_hash

def create_user(username, display_name, slot, encoded):
    with SessionLocal() as db:
        if db.scalar(select(User).where((User.username == username.strip().casefold()) | (User.slot == slot))):
            raise ValueError('Username or family slot already exists')
        if not 1 <= len(username.strip()) <= 80 or not 1 <= len(display_name.strip()) <= 80:
            raise ValueError('Names must contain 1-80 characters')
        db.add(User(id=str(uuid4()), username=username.strip().casefold(), display_name=display_name.strip(), slot=slot, password_hash=encoded, failed_logins=0, locked_until=0))
        db.commit()

def bootstrap():
    path = Path(os.getenv('INITIAL_PASSWORD_HASH_FILE', '/run/secrets/initial_password_hash'))
    has_husband_secret = path.exists() or bool(os.getenv('INITIAL_PASSWORD'))
    has_wife_secret = bool(os.getenv('INITIAL_WIFE_USERNAME')) and bool(os.getenv('INITIAL_WIFE_PASSWORD'))
    if not has_husband_secret and not has_wife_secret:
        return

    if has_husband_secret:
        encoded = path.read_text().strip() if path.exists() else password_hash(os.environ['INITIAL_PASSWORD'])
        if not encoded.startswith('$argon2id$'):
            raise ValueError('Initial password must be an Argon2id hash')
        with SessionLocal() as db:
            husband = db.scalar(select(User).where(User.slot == 'husband'))
            if husband:
                husband.username = os.getenv('INITIAL_USERNAME', husband.username).strip().casefold()
                husband.password_hash = encoded
                husband.failed_logins = 0
                husband.locked_until = 0
                db.execute(delete(LoginSession).where(LoginSession.user_id == husband.id))
                db.commit()
            else:
                create_user(os.getenv('INITIAL_USERNAME', 'SAGI HALILI'), os.getenv('INITIAL_DISPLAY_NAME', 'שגיא'), 'husband', encoded)

    if has_wife_secret:
        with SessionLocal() as db:
            wife_exists = db.scalar(select(User.id).where(User.slot == 'wife'))
        if not wife_exists:
            create_user(os.environ['INITIAL_WIFE_USERNAME'], os.getenv('INITIAL_WIFE_DISPLAY_NAME', 'מאיה'), 'wife', password_hash(os.environ['INITIAL_WIFE_PASSWORD']))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['bootstrap','create-user','change-password'])
    parser.add_argument('--slot', choices=['husband','wife'], default='wife')
    args = parser.parse_args()
    if args.command == 'bootstrap':
        bootstrap()
        return
    username = input('Username: ').strip()
    password = getpass.getpass('Password (12-128 characters): ')
    if password != getpass.getpass('Repeat password: '):
        raise ValueError('Passwords do not match')
    encoded = password_hash(password)
    if args.command == 'create-user':
        create_user(username, input('Display name: ').strip(), args.slot, encoded)
    else:
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.username == username.casefold()))
            if not user:
                raise ValueError('Unknown user')
            user.password_hash = encoded
            user.failed_logins = 0
            user.failed_logins = 0
            user.locked_until = 0
            db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
            db.commit()
    print('Account updated successfully. Password was not stored in plaintext.')

if __name__ == '__main__':
    main()
