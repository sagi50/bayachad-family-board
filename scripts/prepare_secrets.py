"""Run on the destination machine before Compose. Never prints passwords."""
import getpass
import os
from pathlib import Path
import secrets
from argon2 import PasswordHasher

root = Path(__file__).resolve().parents[1]
directory = root / '.secrets'
directory.mkdir(mode=0o700, exist_ok=True)
os.chmod(directory,0o700)
for name in ['db_password','db_root_password']:
    destination = directory / name
    if not destination.exists():
        with destination.open('x',encoding='utf-8') as file:
            file.write(secrets.token_urlsafe(36))
        # Docker Compose mounts these files to non-root container users.
        # The parent directory is owner-only on the host.
        os.chmod(destination,0o644)
destination = directory / 'initial_password_hash'
if not destination.exists():
    password = getpass.getpass('Password for SAGI HALILI (12-128 characters): ')
    if len(password) < 12 or len(password) > 128:
        raise SystemExit('Password must contain 12-128 characters')
    if password != getpass.getpass('Repeat password: '):
        raise SystemExit('Passwords do not match')
    encoded = PasswordHasher(time_cost=3,memory_cost=65536,parallelism=2).hash(password)
    with destination.open('x',encoding='utf-8') as file:
        file.write(encoded)
    os.chmod(destination,0o644)
print('Secrets prepared. Existing credentials were preserved; passwords were not printed.')
