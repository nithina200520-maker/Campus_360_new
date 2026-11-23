"""
Migration script: Add branch, colour, date, time slot, and marks to lost_found_items.
"""
import shutil
from datetime import datetime
from pathlib import Path
from sqlalchemy import text
from app import create_app
from app.database import db

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "instance" / "smart_campus_360.db"

def run_migration():
    app = create_app()
    with app.app_context():
        if DB_FILE.exists():
            backup_dir = BASE_DIR / "backups"
            backup_dir.mkdir(exist_ok=True)
            dest = backup_dir / f"smart_campus_360_pre_lf_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            shutil.copy2(DB_FILE, dest)
            print(f"[backup] Database backed up to {dest.name}")

        with db.engine.connect() as conn:
            # Check SQLite table info
            try:
                existing = [r[1] for r in conn.execute(text("PRAGMA table_info(lost_found_items)")).fetchall()]
                new_cols = [
                    ("department", "VARCHAR(50) DEFAULT 'CSE'"),
                    ("color", "VARCHAR(50)"),
                    ("item_date", "VARCHAR(20)"),
                    ("time_slot", "VARCHAR(20)"),
                    ("identification_marks", "TEXT"),
                ]
                for col_name, col_type in new_cols:
                    if col_name not in existing:
                        conn.execute(text(f"ALTER TABLE lost_found_items ADD COLUMN {col_name} {col_type}"))
                        print(f"[migration] Added column {col_name} to lost_found_items")
                conn.commit()
            except Exception as e:
                print(f"[migration] SQLite check/alter: {e}")

        # Ensure create_all runs for any missing tables
        db.create_all()
        print("[migration] Lost & Found branch schema migration complete.")

if __name__ == "__main__":
    run_migration()
