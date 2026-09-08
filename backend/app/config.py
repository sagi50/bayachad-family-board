import os
from dataclasses import dataclass
from pathlib import Path
from sqlalchemy.engine import URL

@dataclass(frozen=True)
class Settings:
    environment: str
    origin: str
    cookie_secure: bool
    database_url: str | URL
    session_seconds: int = 7200

def settings() -> Settings:
    environment = os.getenv('APP_ENV', 'production')
    origin = os.getenv('APP_ORIGIN', 'http://localhost:8080').rstrip('/')
    secure = os.getenv('COOKIE_SECURE', 'true').lower() == 'true'
    if environment == 'production' and (not secure or not origin.startswith('https://')):
        raise RuntimeError('Production requires HTTPS APP_ORIGIN and COOKIE_SECURE=true')
    test_url = os.getenv('TEST_DATABASE_URL')
    local_file = os.getenv('LOCAL_DATABASE_FILE')
    external_url = os.getenv('DATABASE_URL')
    if test_url:
        if environment != 'test':
            raise RuntimeError('TEST_DATABASE_URL is restricted to test runs')
        database_url = test_url
    elif local_file:
        if environment != 'development':
            raise RuntimeError('Local file storage is restricted to development')
        location = Path(local_file).resolve()
        location.parent.mkdir(parents=True, exist_ok=True)
        database_url = URL.create('sqlite', database=str(location))
    elif external_url:
        database_url = external_url.replace('postgres://', 'postgresql+psycopg://', 1).replace('postgresql://', 'postgresql+psycopg://', 1)
    else:
        password = Path(os.getenv('DB_PASSWORD_FILE', '/run/secrets/db_password')).read_text().strip()
        database_url = URL.create('mysql+pymysql', username=os.getenv('DB_USER', 'bayachad'), password=password,
                                  host=os.getenv('DB_HOST', 'mysql'), port=3306,
                                  database=os.getenv('DB_NAME', 'bayachad'), query={'charset': 'utf8mb4'})
    return Settings(environment, origin, secure, database_url)
