"""
SETTINGS MIGRATION - per-user preferences for the new Settings page.

Safe & non-destructive (idempotent - re-running changes nothing further):
  1. Backs up the SQLite database file before touching anything.
  2. Adds missing columns to `users` (only if absent):
       notif_prefs_json            -> which alert groups the user wants delivered
       ui_prefs_json               -> theme / accent / motion / effects choices
       reveal_contact_to_matches   -> privacy switch for Lost & Found contact sharing
  No table is dropped, no row is deleted and no existing value is rewritten -
  all current records are preserved. Existing users keep today's behaviour
  because the model treats NULL as "use the default" (all alerts on, contact
  sharing on).

Run:  python migrate_settings.py
"""
import shutil
from datetime import datetime
from pathlib import Path

from app import create_app
from app.database import db

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "instance" / "smart_campus_360.db"


def backup_database():
    if not DB_FILE.exists():
        print(f"[backup] No SQLite file at {DB_FILE} - skipping backup.")
        return None
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    dest = backup_dir / f"smart_campus_360_pre_settings_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    shutil.copy2(DB_FILE, dest)
    print(f"[backup] Database backed up to {dest.name}")
    return dest


def add_missing_columns():
    """ALTER TABLE only for columns that do not exist yet (idempotent)."""
    from sqlalchemy import text
    plan = {
        "notif_prefs_json": "VARCHAR(255)",
        "ui_prefs_json": "VARCHAR(255)",
        "reveal_contact_to_matches": "BOOLEAN DEFAULT 1",
    }
    with db.engine.connect() as conn:
        existing = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if not existing:
            print("[schema] users table missing - create_all will handle it.")
            return
        for col, ddl in plan.items():
            if col in existing:
                print(f"[schema] Column users.{col} already exists - skipped.")
                continue
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ddl}"))
            conn.commit()
            print(f"[schema] Added column users.{col}.")
        # Treat pre-existing rows (NULL from the ALTER) as the default "on".
        conn.execute(text(
            "UPDATE users SET reveal_contact_to_matches = 1 "
            "WHERE reveal_contact_to_matches IS NULL"))
        conn.commit()
        print("[schema] Existing users stamped with the default contact-sharing value.")


def main():
    app = create_app()
    with app.app_context():
        print("=== SETTINGS MIGRATION - per-user preferences ===")
        backup_database()
        db.create_all()  # future-proof: creates anything missing, never touches rows
        add_missing_columns()
        print("Settings migration complete. All existing data preserved.")


if __name__ == "__main__":
    main()
