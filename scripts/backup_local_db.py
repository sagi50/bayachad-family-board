"""Create a timestamped SQLite backup without stopping the API."""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
root = Path(__file__).resolve().parents[1]
source = root / 'local-data' / 'bayachad.sqlite3'
if not source.exists(): raise SystemExit('Local database does not exist yet. Run local_setup.py first.')
destination_dir = root / 'local-data' / 'backups'; destination_dir.mkdir(parents=True, exist_ok=True)
destination = destination_dir / (datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '.sqlite3')
with sqlite3.connect(source) as source_db, sqlite3.connect(destination) as backup_db: source_db.backup(backup_db)
print(f'Backup created: {destination}')
