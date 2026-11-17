"""
EXAM ROOM FINDER MIGRATION - exam hall allotment publishing + alerts.

Safe & non-destructive (idempotent - re-running changes nothing further):
  1. Backs up the SQLite database file before touching anything.
  2. create_all() provisions the exam_schedules table (or verifies it exists).
  3. Adds the admin-entry columns introduced later - room_number, attachment_url,
     attachment_name - to an existing exam_schedules table if they are missing.
     Existing tables and rows are never modified.
  4. Verifies the table/columns and prints its row count.

Run:  python migrate_exam_finder.py
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
    "room_number": "VARCHAR(50)",
    "attachment_url": "VARCHAR(255)",
    "attachment_name": "VARCHAR(150)",
}


def backup_database():
    if not DB_FILE.exists():
        print(f"[backup] No SQLite file at {DB_FILE} - skipping backup.")
        return None
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dest = backup_dir / f"smart_campus_360_pre_examfinder_{stamp}.db"
    shutil.copy2(DB_FILE, dest)
    print(f"[backup] Database backed up to {dest.name}")
    return dest


def column_exists(table, column):
    insp = inspect(db.engine)
    return column in {c["name"] for c in insp.get_columns(table)}


def add_admin_entry_columns():
    """Add the room-number / attachment columns to an already-created table."""
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


def make_room_optional():
    """The single-entry form no longer forces a map hall, so room_node_id becomes
    optional. SQLite cannot drop a NOT NULL in place, so rebuild the table (data
    preserved) only when the constraint is still present."""
    insp = inspect(db.engine)
    if "exam_schedules" not in insp.get_table_names():
        print("[schema] exam_schedules not present yet - create_all() will build it correctly.")
        return
    room_col = next((c for c in insp.get_columns("exam_schedules") if c["name"] == "room_node_id"), None)
    if room_col is None or room_col.get("nullable"):
        print("[schema] exam_schedules.room_node_id already nullable - skipped.")
        return
    cols = [c["name"] for c in insp.get_columns("exam_schedules")]
    col_list = ", ".join(cols)
    new_ddl = """
    CREATE TABLE exam_schedules_new (
        id INTEGER NOT NULL PRIMARY KEY,
        subject_code VARCHAR(30) NOT NULL,
        subject_name VARCHAR(150) NOT NULL,
        exam_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        session VARCHAR(20),
        room_node_id INTEGER,
        room_number VARCHAR(50),
        audience_role VARCHAR(30) NOT NULL,
        department VARCHAR(100),
        semester VARCHAR(20),
        instructions TEXT,
        attachment_url VARCHAR(255),
        attachment_name VARCHAR(150),
        notified_at DATETIME,
        notify_count INTEGER NOT NULL,
        created_by_id INTEGER,
        created_at DATETIME,
        FOREIGN KEY(room_node_id) REFERENCES navigation_nodes (id) ON DELETE CASCADE,
        FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL
    )
    """
    with db.engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(text(new_ddl))
        conn.execute(text(f"INSERT INTO exam_schedules_new ({col_list}) SELECT {col_list} FROM exam_schedules"))
        conn.execute(text("DROP TABLE exam_schedules"))
        conn.execute(text("ALTER TABLE exam_schedules_new RENAME TO exam_schedules"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_exam_schedules_exam_date ON exam_schedules (exam_date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_exam_schedules_room_node_id ON exam_schedules (room_node_id)"))
        conn.execute(text("PRAGMA foreign_keys=ON"))
    print("[schema] Rebuilt exam_schedules with optional room_node_id (data preserved).")


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
    print(f"[verify] exam_schedules present with admin-entry columns, {total} allotment row(s).")


def main():
    app = create_app()
    with app.app_context():
        print("=== EXAM ROOM FINDER MIGRATION - hall allotments + audience alerts ===")
        backup_database()
        db.create_all()
        add_admin_entry_columns()
        make_room_optional()
        verify_schema()
        print("Exam Room Finder migration complete. All existing data preserved.")


if __name__ == "__main__":
    main()
