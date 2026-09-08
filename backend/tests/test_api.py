import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal
from app.main import app
from app.manage import create_user
from app.models import LoginSession, User
from app.security import COOKIE, password_hash
from conftest import login

def task(**changes):
    return {'title':'קביעת תור','details':'לבדוק זמינות ביום שני','topic':'משפחה','due':'2026-10-12','assignee':'together','status':'active',**changes}

def test_anonymous_cannot_access_private_data(client):
    for path in ['/api/tasks','/api/auth/me','/api/docs','/api/openapi.json']:
        assert client.get(path).status_code == 401
    for method in ['post','patch','delete']:
        assert client.request(method,'/api/tasks',json=task()).status_code == 401

def test_shared_board_edit_completion_reopen_delete_and_version_conflict(client):
    first = login(client, 'SAGI HALILI')
    response = client.post('/api/tasks', json=task(updated_by='forged name'), headers=first)
    assert response.status_code == 201
    identifier = response.json()['id']
    original = client.get('/api/tasks').json()['tasks'][0]
    assert original['updated_by'] == 'שגיא'
    with TestClient(app) as partner:
        second = login(partner, 'partner')
        assert partner.get('/api/tasks').json()['tasks'][0]['id'] == identifier
        changed = partner.patch('/api/tasks',json={**original,'details':'נוספו פרטים בלי למחוק','status':'future'},headers=second)
        assert changed.status_code == 200
        latest = client.get('/api/tasks').json()['tasks'][0]
        assert latest['details'] == 'נוספו פרטים בלי למחוק'
        assert latest['updated_by'] == 'בת הזוג' and latest['version'] == 2
        assert client.patch('/api/tasks',json={**original,'title':'stale'},headers=first).status_code == 409
        assert client.request('DELETE','/api/tasks',json={'id':identifier,'version':1},headers=first).status_code == 409
        for status in ['done','active']:
            assert client.patch('/api/tasks',json={**latest,'status':status},headers=first).status_code == 200
            latest = partner.get('/api/tasks').json()['tasks'][0]
            assert latest['status'] == status
        assert partner.request('DELETE','/api/tasks',json={'id':identifier,'version':latest['version']},headers=second).status_code == 200
        assert client.get('/api/tasks').json()['tasks'] == []

def test_csrf_and_origin_are_required(client):
    headers = login(client)
    assert client.post('/api/tasks',json=task()).status_code == 403
    assert client.post('/api/tasks',json=task(),headers={'Origin':'http://testserver'}).status_code == 403
    assert client.post('/api/tasks',json=task(),headers={**headers,'Origin':'https://evil.example'}).status_code == 403
    assert client.post('/api/tasks',json=task(),headers={**headers,'X-CSRF-Token':'invalid'}).status_code == 403
    assert client.get('/api/tasks').json()['tasks'] == []

@pytest.mark.parametrize('changes',[{'title':'   '},{'due':'2026-02-30'},{'due':'20261001'},{'status':'unknown'},{'assignee':'stranger'},{'details':'x'*10001}])
def test_invalid_task_is_not_saved(client, changes):
    headers = login(client)
    assert client.post('/api/tasks',json=task(**changes),headers=headers).status_code == 422
    assert client.get('/api/tasks').json()['tasks'] == []

def test_logout_revokes_cookie_and_session(client):
    headers = login(client)
    token = client.cookies.get(COOKIE)
    assert client.post('/api/auth/logout',headers=headers).status_code == 200
    client.cookies.set(COOKIE,token)
    assert client.get('/api/tasks').status_code == 401

def test_expired_session_rejected(client):
    login(client)
    with SessionLocal() as db:
        db.execute(update(LoginSession).values(expires_at=int(time.time())-1)); db.commit()
    assert client.get('/api/tasks').status_code == 401

def test_failed_login_throttle(client):
    for _ in range(5):
        assert client.post('/api/auth/login',json={'username':'sagi halili','password':'wrong'},headers={'Origin':'http://testserver'}).status_code == 401
    assert client.post('/api/auth/login',json={'username':'sagi halili','password':'wrong'},headers={'Origin':'http://testserver'}).status_code == 429

def test_no_registration_or_third_member(client):
    assert client.post('/api/auth/register',json={}).status_code == 404
    with pytest.raises(ValueError):
        create_user('third','Third','wife',password_hash('another-test-pass'))
    with SessionLocal() as db:
        assert len(db.scalars(select(User)).all()) == 2

def test_authenticated_docs_and_cookie_flags(client):
    response = client.post('/api/auth/login',json={'username':'sagi halili','password':'Only-a-test-password-123!'},headers={'Origin':'http://testserver'})
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'SameSite=strict' in response.headers['set-cookie']
    assert 'no-store' in response.headers['cache-control']
    schema = client.get('/api/openapi.json')
    assert schema.status_code == 200
    assert set(schema.json()['paths']['/api/tasks']) == {'get','post','patch','delete'}
