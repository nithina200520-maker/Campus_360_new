"""Shared helpers for persistent module-admin grants."""
from app.database import db
from app.models import AdminAssignment, AdminModule


DEFAULT_ADMIN_MODULES = (
    ('lost_found', 'Lost & Found', 'Lost and found reports, claims, and returns'),
    ('navigation', 'Campus Navigation', 'Campus map and navigation content'),
    ('canteen', 'Smart Canteen', 'Canteen menu and order operations'),
    ('exam', 'Exam Room Finder', 'Exam schedules and room information'),
)

DEFAULT_MODULE_PERMISSIONS = (
    'notifications:read', 'notifications:send', 'activity:read',
)


def seed_default_modules():
    """Insert missing defaults without overwriting administrator configuration."""
    for key, name, description in DEFAULT_ADMIN_MODULES:
        if not AdminModule.query.filter_by(key=key).first():
            db.session.add(AdminModule(key=key, name=name, description=description, is_active=True))
    db.session.flush()


def active_admin_modules(user):
    """Return grants computed live from the database, never from JWT claims."""
    if not user or not user.is_active:
        return []
    if user.role == 'main_admin':
        return [
            dict(module.to_dict(), status='active', permissions=['*'])
            for module in AdminModule.query.filter_by(is_active=True).order_by(AdminModule.id).all()
        ]
    assignments = (
        AdminAssignment.query.join(AdminModule)
        .filter(
            AdminAssignment.user_id == user.id,
            AdminAssignment.status == 'active',
            AdminModule.is_active.is_(True),
        )
        .order_by(AdminModule.id)
        .all()
    )
    return [
        {
            'id': assignment.module.id,
            'key': assignment.module.key,
            'name': assignment.module.name,
            'description': assignment.module.description,
            'status': assignment.status,
            'permissions': assignment.permissions,
            'assignment_id': assignment.id,
        }
        for assignment in assignments
    ]
