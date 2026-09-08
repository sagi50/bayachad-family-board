"""Launch the real Python API with persistent local development data."""
import os
from pathlib import Path
import sys
import uvicorn
root = Path(__file__).resolve().parents[1]
os.environ.update(APP_ENV='development', APP_ORIGIN='http://localhost:8080', COOKIE_SECURE='false', LOCAL_DATABASE_FILE=str(root/'local-data'/'bayachad.sqlite3'))
sys.path.insert(0,str(root/'backend'))
if __name__ == '__main__':
    uvicorn.run('app.main:app',host='127.0.0.1',port=8000,access_log=False)
