"""Exercise the running Compose stack through Nginx. Deletes only its own task."""
import getpass
import json
import http.cookiejar
import urllib.request
import urllib.error
from uuid import uuid4

origin = input('Site origin [http://localhost:8080]: ').strip() or 'http://localhost:8080'
origin = origin.rstrip('/')
username = input('Username: ').strip()
password = getpass.getpass('Password: ')
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
csrf = ''
def call(path, method='GET', data=None):
    headers = {'Origin':origin, 'Content-Type':'application/json', 'X-CSRF-Token':csrf}
    request = urllib.request.Request(origin+path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    with opener.open(request,timeout=30) as response:
        return json.load(response)

assert call('/api/health')['status'] == 'ok'
csrf = call('/api/auth/login','POST',{'username':username,'password':password})['csrf_token']
del password
identifier = None
try:
    identifier = call('/api/tasks','POST',{'title':'בדיקת מערכת '+uuid4().hex[:8]})['id']
    for status in ['future','done','active']:
        task = next(t for t in call('/api/tasks')['tasks'] if t['id']==identifier)
        call('/api/tasks','PATCH',{**task,'status':status,'details':'פרטי בדיקה בעברית'})
        assert next(t for t in call('/api/tasks')['tasks'] if t['id']==identifier)['status']==status
    print('Login, MySQL persistence, editing and all inbox transitions passed through Nginx.')
finally:
    if identifier:
        task = next((t for t in call('/api/tasks')['tasks'] if t['id']==identifier),None)
        if task:
            call('/api/tasks','DELETE',{'id':identifier,'version':task['version']})
    call('/api/auth/logout','POST')
    print('The test task was removed and the test session was signed out.')
