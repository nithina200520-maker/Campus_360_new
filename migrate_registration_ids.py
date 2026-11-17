"""Add database-level uniqueness for student USNs and faculty employee IDs.

Run with: python migrate_registration_ids.py
"""
import shutil
from datetime import datetime
from pathlib import Path

from sqlalchemy import inspect, text

from app import create_app
from app.database import db


def backup_sqlite_database():
    if db.engine.dialect.name != 'sqlite':
        return None

    database_path = db.engine.url.database
    if not database_path or database_path == ':memory:':
        return None

    source = Path(database_path)
    if not source.exists():
        return None

    backup_dir = Path(__file__).resolve().parent / 'backups'
    backup_dir.mkdir(exist_ok=True)
    backup_path = backup_dir / (
        f"{source.stem}_pre_registration_ids_{datetime.now().strftime('%Y%m%d_%H%M%S')}{source.suffix}"
    )
    shutil.copy2(source, backup_path)
    return backup_path


def migrate():
    app = create_app()
    with app.app_context():
        backup_path = backup_sqlite_database()
        if backup_path:
            print(f"[backup] Saved database backup to {backup_path.name}")

        db.create_all()
        duplicate_groups = db.session.execute(text(
            """
            SELECT role, LOWER(TRIM(usn_or_emp_id)) AS normalized_id, COUNT(*) AS duplicate_count
            FROM users
            WHERE usn_or_emp_id IS NOT NULL AND TRIM(usn_or_emp_id) <> ''
            GROUP BY role, LOWER(TRIM(usn_or_emp_id))
            HAVING COUNT(*) > 1
            """
        )).fetchall()
        if duplicate_groups:
            raise RuntimeError(
                "Duplicate role-specific identifiers already exist. Resolve them before "
                "adding the unique registration-ID index; no account rows were changed."
            )

        inspector = inspect(db.engine)
        unique_names = {
            index['name']
            for index in inspector.get_indexes('users')
            if index.get('unique')
        }
        unique_names.update(
            constraint['name']
            for constraint in inspector.get_unique_constraints('users')
            if constraint.get('name')
        )
        if 'uq_users_role_identifier' in unique_names:
            print("[schema] Unique role/identifier index already exists.")
            return

        with db.engine.begin() as connection:
            connection.execute(text(
                "CREATE UNIQUE INDEX uq_users_role_identifier "
                "ON users (role, usn_or_emp_id)"
            ))
        print("[schema] Added unique role/identifier index. Existing accounts were preserved.")


if __name__ == '__main__':
    migrate()
