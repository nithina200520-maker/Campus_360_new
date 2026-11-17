"""Create the centralized admin schema, seed modules, and backfill legacy grants.

Run with: python migrate_campus_admin.py
The operation is repeatable and preserves existing users and notification rows.
"""
from sqlalchemy import inspect, text

from app import create_app
from app.admin_registry import DEFAULT_MODULE_PERMISSIONS, seed_default_modules
from app.database import db
from app.models import AdminAssignment, AdminModule, MainAdminSetupState, User


def _add_missing_columns(table, columns):
    existing = {column['name'] for column in inspect(db.engine).get_columns(table)}
    for name, declaration in columns.items():
        if name not in existing:
            with db.engine.begin() as connection:
                connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {declaration}'))
            print(f'[schema] Added {table}.{name}')


def migrate():
    app = create_app()
    with app.app_context():
        # New registry/assignment tables are created; create_all intentionally
        # does not alter existing tables, so the additive columns follow.
        db.create_all()
        _add_missing_columns('users', {
            'admin_scope': 'VARCHAR(30) NULL',
            'main_admin_guard': 'BOOLEAN NULL',
        })
        unique_constraints = {
            constraint.get('name')
            for constraint in inspect(db.engine).get_unique_constraints('users')
        }
        unique_indexes = {
            index.get('name')
            for index in inspect(db.engine).get_indexes('users')
            if index.get('unique')
        }
        if 'uq_users_main_admin_guard' not in unique_constraints | unique_indexes:
            with db.engine.begin() as connection:
                connection.execute(text(
                    'CREATE UNIQUE INDEX uq_users_main_admin_guard ON users (main_admin_guard)'
                ))
            print('[schema] Added unique Main Admin guard')
        _add_missing_columns('notifications', {
            'created_by_id': 'INTEGER NULL',
            'originating_module': 'VARCHAR(50) NULL',
            'audience': 'VARCHAR(30) NULL',
        })
        _add_missing_columns('audit_logs', {
            'actor_id': 'INTEGER NULL',
            'target_user_id': 'INTEGER NULL',
        })

        main_admins = User.query.filter_by(role='main_admin').order_by(User.id).all()
        if len(main_admins) > 1:
            raise RuntimeError(
                'Multiple Main Admin accounts exist. Resolve them before applying this migration.'
            )
        if main_admins:
            main_admins[0].main_admin_guard = True
            if not db.session.get(MainAdminSetupState, 'main_admin'):
                db.session.add(MainAdminSetupState(
                    key='main_admin',
                    admin_user_id=main_admins[0].id,
                ))

        seed_default_modules()
        db.session.flush()
        module_by_key = {module.key: module for module in AdminModule.query.all()}
        migrated = 0
        for user in User.query.filter(User.role != 'main_admin').all():
            legacy_scope = user.admin_scope
            if not legacy_scope and user.role == 'canteen_admin':
                legacy_scope = 'canteen'
            module = module_by_key.get(legacy_scope)
            if not module:
                continue
            assignment = AdminAssignment.query.filter_by(
                user_id=user.id, module_id=module.id,
            ).first()
            if not assignment:
                assignment = AdminAssignment(
                    user_id=user.id,
                    module_id=module.id,
                    status='active' if user.is_active else 'suspended',
                )
                assignment.permissions = list(DEFAULT_MODULE_PERMISSIONS)
                db.session.add(assignment)
                migrated += 1
        db.session.execute(text(
            "UPDATE notifications SET originating_module = CASE "
            "WHEN category IN ('found','match','claim','return') THEN 'lost_found' "
            "WHEN category = 'canteen' THEN 'canteen' "
            "WHEN category = 'exam' THEN 'exam' "
            "ELSE 'other' END WHERE originating_module IS NULL"
        ))
        db.session.commit()
        print(f'[data] Seeded default modules and backfilled {migrated} admin assignment(s).')


if __name__ == '__main__':
    migrate()
