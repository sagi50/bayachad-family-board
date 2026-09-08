import os
import tempfile
from pathlib import Path

test_directory = tempfile.TemporaryDirectory(prefix='bayachad-test-')
os.environ['APP_ENV'] = 'test'
os.environ['COOKIE_SECURE'] = 'false'
os.environ['APP_ORIGIN'] = 'http://testserver'
os.environ['TEST_DATABASE_URL'] = 'sqlite:///' + str(Path(test_directory.name) / 'test.sqlite3').replace('\\','/')

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import delete
from app.database import SessionLocal, engine
from app.main import app
from app.manage import create_user
from app.models import Task, User, LoginSession
from app.security import password_hash

PASSWORD = 'Only-a-test-password-123!'

@pytest.fixture(scope='session', autouse=True)
def schema():
    command.upgrade(Config('alembic.ini'), 'head')
    yield
    engine.dispose()
    test_directory.cleanup()

@pytest.fixture(autouse=True)
def users(schema):
    with SessionLocal() as db:
        db.execute(delete(Task)); db.execute(delete(LoginSession)); db.execute(delete(User)); db.commit()
    encoded = password_hash(PASSWORD)
    create_user('sagi halili', 'שגיא', 'husband', encoded)
    create_user('partner', 'בת הזוג', 'wife', encoded)

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client

def login(client, username='sagi halili'):
    response = client.post('/api/auth/login', json={'username':username,'password':PASSWORD}, headers={'Origin':'http://testserver'})
    assert response.status_code == 200, response.text
    return {'Origin':'http://testserver','X-CSRF-Token':response.json()['csrf_token']}
