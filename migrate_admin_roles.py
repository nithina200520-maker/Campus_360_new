"""Add a separate, optional module-admin scope to existing user accounts.

The migration is idempotent and preserves every existing user and role.
Run with: python migrate_admin_roles.py
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
        f"{source.stem}_pre_admin_roles_{datetime.now().strftime('%Y%m%d_%H%M%S')}{source.suffix}"
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
        inspector = inspect(db.engine)
        columns = {column['name'] for column in inspector.get_columns('users')}
        if 'admin_scope' in columns:
            print("[schema] users.admin_scope already exists.")
        else:
            with db.engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN admin_scope VARCHAR(30) NULL"
                ))
            print("[schema] Added users.admin_scope. Existing records were preserved.")

        indexes = {index['name'] for index in inspector.get_indexes('users')}
        if 'ix_users_admin_scope' not in indexes:
            with db.engine.begin() as connection:
                connection.execute(text(
                    "CREATE INDEX ix_users_admin_scope ON users (admin_scope)"
                ))
            print("[schema] Added index ix_users_admin_scope.")


if __name__ == '__main__':
    migrate()
