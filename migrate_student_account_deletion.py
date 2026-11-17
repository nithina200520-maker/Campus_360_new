"""Migrate canteen order ownership to preserve transactions after account deletion.

Run once against the configured database before deploying student deletion:
    python migrate_student_account_deletion.py
"""
import shutil
from datetime import datetime
from pathlib import Path

from sqlalchemy import MetaData, inspect
from sqlalchemy.schema import CreateTable

from app import create_app
from app.database import db
from app.models import CanteenOrder


BASE_DIR = Path(__file__).resolve().parent
TEMP_TABLE = 'canteen_orders_account_delete_migration'


def _needs_migration():
    inspector = inspect(db.engine)
    if 'canteen_orders' not in inspector.get_table_names():
        raise RuntimeError('The canteen_orders table is missing; initialize the database first.')
    columns = {column['name']: column for column in inspector.get_columns('canteen_orders')}
    user_foreign_key = next(
        (
            foreign_key for foreign_key in inspector.get_foreign_keys('canteen_orders')
            if foreign_key.get('referred_table') == 'users'
            and 'user_id' in foreign_key.get('constrained_columns', [])
        ),
        None,
    )
    return (
        columns['user_id']['nullable'] is not True
        or not user_foreign_key
        or (user_foreign_key.get('options', {}).get('ondelete') or '').upper() != 'SET NULL'
    )


def _migrate_sqlite():
    expected_columns = {column.name for column in CanteenOrder.__table__.columns}
    actual_columns = {
        column['name'] for column in inspect(db.engine).get_columns('canteen_orders')
    }
    if actual_columns != expected_columns:
        raise RuntimeError(
            'canteen_orders columns differ from the current model; refusing a rebuild that '
            'could discard data. Reconcile the schema before retrying.'
        )

    table = CanteenOrder.__table__
    replacement = table.to_metadata(MetaData(), name=TEMP_TABLE)
    connection = db.engine.connect()
    try:
        connection.exec_driver_sql('PRAGMA foreign_keys=OFF')
        connection.commit()
        with connection.begin():
            connection.exec_driver_sql(f'DROP TABLE IF EXISTS "{TEMP_TABLE}"')
            connection.execute(CreateTable(replacement))
            names = ', '.join(f'"{name}"' for name in expected_columns)
            connection.exec_driver_sql(
                f'INSERT INTO "{TEMP_TABLE}" ({names}) SELECT {names} FROM "canteen_orders"'
            )
            connection.exec_driver_sql('DROP TABLE "canteen_orders"')
            connection.exec_driver_sql(
                f'ALTER TABLE "{TEMP_TABLE}" RENAME TO "canteen_orders"'
            )
            for index in table.indexes:
                indexed_columns = ', '.join(
                    f'"{column.name}"' for column in index.columns
                )
                unique = 'UNIQUE ' if index.unique else ''
                connection.exec_driver_sql(
                    f'CREATE {unique}INDEX IF NOT EXISTS "{index.name}" '
                    f'ON "canteen_orders" ({indexed_columns})'
                )
        connection.exec_driver_sql('PRAGMA foreign_keys=ON')
        connection.commit()
        violations = connection.exec_driver_sql('PRAGMA foreign_key_check').fetchall()
        if violations:
            raise RuntimeError(f'Foreign-key violations found after migration: {violations!r}')
    finally:
        connection.close()


def _migrate_mysql():
    inspector = inspect(db.engine)
    foreign_keys = inspector.get_foreign_keys('canteen_orders')
    ownership_keys = [
        key for key in foreign_keys
        if key.get('referred_table') == 'users'
        and 'user_id' in key.get('constrained_columns', [])
    ]
    preparer = db.engine.dialect.identifier_preparer
    with db.engine.begin() as connection:
        for key in ownership_keys:
            name = key.get('name')
            if name:
                connection.exec_driver_sql(
                    f'ALTER TABLE canteen_orders DROP FOREIGN KEY {preparer.quote(name)}'
                )
        connection.exec_driver_sql(
            'ALTER TABLE canteen_orders MODIFY COLUMN user_id INTEGER NULL'
        )
        connection.exec_driver_sql(
            'ALTER TABLE canteen_orders '
            'ADD CONSTRAINT fk_canteen_orders_user_account '
            'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
        )


def backup_sqlite_database():
    database_path = db.engine.url.database
    if db.engine.dialect.name != 'sqlite' or not database_path or database_path == ':memory:':
        return
    source = Path(database_path)
    if not source.exists():
        return
    backup_dir = BASE_DIR / 'backups'
    backup_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup = backup_dir / f'smart_campus_pre_student_deletion_{timestamp}.db'
    shutil.copy2(source, backup)
    print(f'[backup] Database copied to {backup.name}')


def main():
    app = create_app()
    with app.app_context():
        if not _needs_migration():
            print('[schema] Canteen order ownership already supports account deletion.')
            return
        backup_sqlite_database()
        if db.engine.dialect.name == 'sqlite':
            _migrate_sqlite()
        elif db.engine.dialect.name == 'mysql':
            _migrate_mysql()
        else:
            raise RuntimeError(f'Unsupported database dialect: {db.engine.dialect.name}')
        if _needs_migration():
            raise RuntimeError('Canteen order ownership migration did not complete.')
        print('[schema] Canteen orders will be retained and anonymized when an account is deleted.')


if __name__ == '__main__':
    main()
