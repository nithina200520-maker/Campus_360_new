"""
EXAM ROOM FINDER MIGRATION - optional USN range (from..to) per allotment.

Safe & non-destructive (idempotent - re-running changes nothing further):
  1. Backs up the SQLite database file before touching anything.
  2. create_all() provisions anything missing.
  3. Adds the usn_from / usn_to columns to an existing exam_schedules table when
     they are absent. Existing tables and rows are never modified.
  4. Verifies the columns and prints its row count.

Run:  python migrate_exam_usn_range.py
"""
import shutil
from datetime import datetime
from pathlib import Path

from sqlalchemy import inspect, text
from app import create_app
from app.database import db

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "instance" / "smart_campus_360.db"

NEW_COLUMNS = {
    "usn_from": "VARCHAR(50)",
    "usn_to": "VARCHAR(50)",
}


def backup_database():
    if not DB_FILE.exists():
        print(f"[backup] No SQLite file at {DB_FILE} - skipping backup.")
        return None
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dest = backup_dir / f"smart_campus_360_pre_usnrange_{stamp}.db"
    shutil.copy2(DB_FILE, dest)
    print(f"[backup] Database backed up to {dest.name}")
    return dest


def column_exists(table, column):
    insp = inspect(db.engine)
    return column in {c["name"] for c in insp.get_columns(table)}


def add_usn_range_columns():
    """Add the optional USN-range columns to an already-created exam_schedules table."""
    insp = inspect(db.engine)
    if "exam_schedules" not in insp.get_table_names():
        print("[schema] exam_schedules not present yet - create_all() will build it fully.")
        return
    for column, ddl_type in NEW_COLUMNS.items():
        if column_exists("exam_schedules", column):
            print(f"[schema] exam_schedules.{column} already present - skipped.")
            continue
        with db.engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE exam_schedules ADD COLUMN {column} {ddl_type}"))
        print(f"[schema] Added exam_schedules.{column}.")


def verify_schema():
    insp = inspect(db.engine)
    if "exam_schedules" not in insp.get_table_names():
        raise RuntimeError("exam_schedules table is missing after create_all()!")
    cols = {c["name"] for c in insp.get_columns("exam_schedules")}
    missing = [c for c in NEW_COLUMNS if c not in cols]
    if missing:
        raise RuntimeError(f"exam_schedules is missing columns: {missing}")
    with db.engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM exam_schedules")).scalar()
    print(f"[verify] exam_schedules present with USN-range columns, {total} allotment row(s).")


def main():
    app = create_app()
    with app.app_context():
        print("=== EXAM ROOM FINDER MIGRATION - optional USN range (from..to) ===")
        backup_database()
        db.create_all()
        add_usn_range_columns()
        verify_schema()
        print("USN-range migration complete. All existing data preserved.")


if __name__ == "__main__":
    main()
