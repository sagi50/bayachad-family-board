# פריסה של ״ביחד״ ב־Amazon EC2

הקוד מוכן לפריסה; שרת AWS ודומיין עדיין לא חוברו. התצורה מיועדת לשרת Linux יחיד עם Docker Compose. הקמת משאבי AWS עשויה להיות כרוכה בתשלום — יש לבדוק את הזכאות והתמחור בחשבון לפני הקמה.

## המבנה

הדפדפן → Nginx ב־HTTPS → FastAPI ב־Python → MySQL 8.4.

Nginx מגיש את ממשק React ואת `/api`. שירותי Python ו־MySQL אינם מפרסמים פורטים למחשב המארח. הנתונים נמצאים ב־Docker volume קבוע. מסד הנתונים משתמש ב־utf8mb4 עבור עברית.

## הכנת שרת

1. להכין EC2 עם Ubuntu 24.04 LTS, אחסון EBS מוצפן ומקום פנוי למסד ולגיבויים. להתאים את גודל השרת לאחר בדיקת צריכת הזיכרון של שלושת השירותים; אין כאן יצירה אוטומטית של משאבים בתשלום.
2. להתקין Docker Engine ו־Compose לפי [הוראות Docker ל־Ubuntu](https://docs.docker.com/engine/install/ubuntu/). נדרש Compose 2.24.4 ומעלה.
3. להשתמש בכתובת IP קבועה ולכוון אליה רשומת A של הדומיין. לא להגדיר רשומת AAAA ללא IPv6 עובד.
4. ב־Security Group לפתוח 80 ו־443 למשתמשי האתר, ו־22 רק לכתובת ה־IP של המנהל. לא לפתוח 3306 או 8000. [הנחיות AWS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html).
5. להעביר את תיקיית הפרויקט אל `/opt/bayachad` באמצעות SSH/SCP, ללא `node_modules`, `.git`, `.secrets` ונתוני בדיקות. לא להעלות מפתח SSH אל הפרויקט.

## הכנת פרטי כניסה

כל הפקודות מכאן מופעלות בתיקיית הפרויקט בשרת.

```sh
cp .env.example .env
python3 -m venv .venv
.venv/bin/pip install argon2-cffi==25.1.0
.venv/bin/python scripts/prepare_secrets.py
```

הסקריפט מבקש את הסיסמה בלי להציג אותה, ושומר רק Argon2id עבור המשתמש הראשון. סיסמאות MySQL אקראיות נשמרות ב־`.secrets`, מחוץ ל־Git ולתמונת Docker. יש להגביל גישה לתיקייה הזאת למנהל השרת. Docker Compose secrets הם קבצים מקומיים המוצמדים לשירותים, לא כספת מוצפנת בפני מנהל השרת.

ערכו את `.env`: השאירו `INITIAL_USERNAME=SAGI HALILI` או בחרו שם אחר, וקבעו `DOMAIN` לדומיין האמיתי. אל תשימו סיסמאות בקובץ זה. הגדרת הסיסמה הראשונית נצרכת רק כאשר החשבון הראשון עדיין לא קיים, ואינה מאפסת חשבונות קיימים.

## תעודת HTTPS ופרסום

לפני הפעלת Nginx בפעם הראשונה, קבלו תעודה. הדומיין חייב להצביע לשרת, ופורט 80 צריך להיות פנוי ונגיש.

```sh
sudo apt-get update
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d YOUR_REAL_DOMAIN
docker compose -f compose.yaml -f compose.production.yaml config --quiet
docker compose -f compose.yaml -f compose.production.yaml up -d --build --wait
```

החליפו `YOUR_REAL_DOMAIN` בדומיין שלכם, הזהה ל־`DOMAIN` ב־`.env`. האתר יהיה ב־`https://YOUR_REAL_DOMAIN`. גרסת הפרסום מסרבת לפעול עם Cookie לא מאובטח או origin שאינו HTTPS.

## יצירת המשתמש השני

```sh
docker compose exec api python -m app.manage create-user --slot wife
```

שם המשתמש, השם לתצוגה והסיסמה מוזנים באופן אינטראקטיבי. קיימים רק שני מקומות לחשבונות, ואין הרשמה פתוחה. שני החשבונות רואים ועורכים את אותו הלוח. לצורך שינוי סיסמה וביטול כל ההתחברויות הקודמות של אותו משתמש:

```sh
docker compose exec api python -m app.manage change-password
```

## בדיקה אחרי פריסה

```sh
docker compose -f compose.yaml -f compose.production.yaml ps
curl --fail https://YOUR_REAL_DOMAIN/api/health
python3 scripts/smoke_http.py
```

בדיקת smoke מבקשת כניסה, יוצרת משימת בדיקה ייחודית, מעבירה אותה בין התיבות ומוחקת רק אותה. לאחר מכן יש לבדוק כניסה מכל אחד משני המכשירים ועריכה של אותה משימה. תיעוד ה־API זמין למשתמש מחובר ב־`/api/docs`.

## חידוש תעודה וגיבוי

לאחר הפרסום, העבירו את חידוש התעודה לשיטת webroot כדי לא לעצור את האתר:

```sh
sudo mkdir -p /var/www/certbot
sudo certbot reconfigure --cert-name YOUR_REAL_DOMAIN --webroot -w /var/www/certbot
sudo certbot renew --dry-run
```

קבעו deploy hook של Certbot שמפעיל מתוך `/opt/bayachad` את `docker compose -f compose.yaml -f compose.production.yaml exec -T nginx nginx -s reload`, ורק לאחר מכן ודאו שטיימר החידוש מופעל. אל תסתפקו בקיום התעודה הראשונית.

ה־volume שורד החלפת קונטיינרים, אבל אינו גיבוי. יש להגדיר snapshot של EBS וגיבוי MySQL מחוץ לשרת, ולבצע שחזור ניסיון לפני שימוש ממושך. אל תריצו `docker compose down -v`, שמוחק את נתוני ה־volume.

## מצב הבדיקות בעת המסירה

- בניית הממשק ובדיקת טיפוסים נבדקות מקומית.
- בדיקות API בודקות כניסה, CSRF, הרשאות, שני משתמשים, שמירת עברית, תיבות, מחיקה ומניעת דריסת עריכות. הן משתמשות ב־SQLite מבודד לצורך בדיקת לוגיקה; הפריסה מוגדרת ל־MySQL בלבד.
- יש לבצע את בדיקת ה־Compose המלאה עם MySQL ו־Nginx כאשר מנוע Docker זמין. אין להתייחס לבדיקות הלוגיקה כאישור להרצת הקונטיינרים או לפריסה ב־AWS.

הפריסה החדשה משתמשת ב־`vite.ec2.config.ts` וב־`backend/`. קובצי Sites מהגרסה הקודמת נשארו בהיסטוריית העבודה ואינם נקודת ההפעלה של Compose.
