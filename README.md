# ביחד — Python / Docker Compose / Nginx / MySQL

מנהל משימות זוגי בעברית. שני חשבונות סגורים, שלוש תיבות, עריכה משותפת, מועד לביצוע ושם/זמן עדכון.

## הפעלה מקומית

דרושים Docker Desktop פעיל ו־Python 3.12+. מתוך תיקיית הפרויקט:

```sh
python -m venv .venv
.venv/bin/pip install argon2-cffi==25.1.0
.venv/bin/python scripts/prepare_secrets.py
docker compose up -d --build --wait
```

ב־Windows השתמשו ב־`.venv\Scripts\python.exe` וב־`.venv\Scripts\pip.exe` במקום `bin`.

פתחו http://localhost:8080 והתחברו עם `SAGI HALILI` והסיסמה שנבחרה בזמן ההכנה. הכתובת המקומית נגישה רק מהמחשב. כניסה מהאינטרנט דורשת את תצורת HTTPS המתוארת ב־[מדריך EC2](deploy/EC2.md).

יצירת חשבון נוסף: `docker compose exec api python -m app.manage create-user --slot wife`. אין הרשמה חופשית; מקסימום שני חשבונות.

## API

- `POST /api/auth/login` — כניסה עם JSON של `username` ו־`password`.
- `GET /api/auth/me` — המשתמש המחובר ו־`csrf_token`.
- `POST /api/auth/logout` — ביטול ההתחברות.
- `GET /api/tasks` — כל המשימות המשותפות.
- `POST /api/tasks` — יצירת משימה.
- `PATCH /api/tasks` — שמירת שינויים. כולל `id` ו־`version`.
- `DELETE /api/tasks` — מחיקה. כולל `id` ו־`version`.
- `GET /api/health` — בדיקת שירות ומסד נתונים.
- `/api/docs` ו־`/api/openapi.json` — תיעוד למשתמש מחובר בלבד.

הכניסה מחזירה cookie מסוג HttpOnly ו־csrf_token. לכל שינוי יש לצרף `Origin` תואם ל־APP_ORIGIN ו־`X-CSRF-Token`; הכניסה עצמה דורשת Origin בלבד. שמרו את ה־cookie בין הקריאות. ב־Swagger התחברו קודם דרך האתר, קראו את `/api/auth/me`, והדביקו את ה־csrf_token בשדה `X-CSRF-Token` של פעולת השינוי. אין לשתף cookie או סיסמה בקוד מקור.

כאשר שני משתמשים עורכים גרסאות שונות, השרת מחזיר 409 כדי למנוע דריסה. `assignee` הוא `together`, `husband` או `wife`; `status` הוא `active`, `future` או `done`. כותרת היא חובה, יתר הפרטים אופציונליים. `due` הוא תאריך YYYY-MM-DD, ו־updated_by נקבע בשרת לפי החשבון המחובר.

## בדיקות

```sh
npm ci
npm run build
npm run typecheck
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

להרצת בדיקה דרך Nginx ו־MySQL פעילים: `python scripts/smoke_http.py` משורש הפרויקט. פרטים ודרישות פריסה ב־[deploy/EC2.md](deploy/EC2.md).

התיעוד נשען על [FastAPI Docker](https://fastapi.tiangolo.com/deployment/docker/), [Docker Compose secrets](https://docs.docker.com/reference/compose-file/secrets/) ו־[MySQL official image](https://hub.docker.com/_/mysql).
