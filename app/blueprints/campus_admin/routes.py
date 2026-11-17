"""Bearer-token API for centralized Main Admin and module administrators."""
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.admin_registry import active_admin_modules, seed_default_modules
from app.blueprints.campus_admin import campus_admin_bp
from app.database import db
from app.models import (
    AdminAssignment, AdminModule, AuditLog, MainAdminHandoff, MainAdminSetupState,
    Notification, User,
)


def _error(message, status):
    return jsonify(success=False, message=message), status


def _audit(actor, action, module='admin', target=None, details=None):
    entry = AuditLog(
        action=action,
        module=module,
        user_id=actor.id,
        actor_id=actor.id,
        target_user_id=target.id if target else None,
        details=details,
        ip_address=request.remote_addr,
    )
    db.session.add(entry)
    return entry


def _record_student_deletion_failure(actor, user_id, identifier, reason, status):
    entry = AuditLog(
        action='STUDENT_ACCOUNT_DELETION_FAILED',
        module='accounts',
        user_id=actor.id,
        actor_id=actor.id,
        target_user_id=user_id,
        details=(
            f'result=failure; student_identifier={identifier or "unavailable"}; '
            f'admin={actor.email}; reason={reason}'
        ),
        ip_address=request.remote_addr,
    )
    db.session.add(entry)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception('Failed to record a student account deletion failure.')
        return _error('The deletion could not be completed or audited.', 500)
    return _error(reason, status)


def _user_json(user):
    return {
        'id': user.id,
        'name': user.full_name,
        'full_name': user.full_name,
        'identifier': user.usn_or_emp_id,
        'usn_or_id': user.usn_or_emp_id,
        'email': user.email,
        'role': user.role,
        'department': user.department,
        'is_active': bool(user.is_active),
        'status': 'active' if user.is_active else 'inactive',
        'is_verified': bool(user.is_verified),
        'usn_or_emp_id': user.usn_or_emp_id,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'admin_modules': active_admin_modules(user),
    }


def _issue_token(user):
    now = datetime.now(timezone.utc)
    return jwt.encode({
        'id': user.id,
        'sub': str(user.id),
        'role': user.role,
        'iat': now,
        'exp': datetime.fromtimestamp(now.timestamp() + 86400, timezone.utc),
    }, current_app.config['AUTH_JWT_SECRET'], algorithm='HS256')


def _bearer_required(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        authorization = request.headers.get('Authorization', '')
        scheme, _, token = authorization.partition(' ')
        if scheme.lower() != 'bearer' or not token:
            return _error('A bearer JWT is required.', 401)
        try:
            claims = jwt.decode(
                token, current_app.config['AUTH_JWT_SECRET'], algorithms=['HS256'],
                options={'require': ['exp']},
            )
            user_id = claims.get('id', claims.get('sub'))
            user = db.session.get(User, int(user_id)) if user_id is not None else None
        except (jwt.PyJWTError, TypeError, ValueError):
            user = None
        if not user or not user.is_active:
            return _error('The account or token is no longer authorized.', 401)
        g.campus_admin_user = user
        g.is_main_admin = user.role == 'main_admin'
        if not g.is_main_admin:
            g.active_grants = active_admin_modules(user)
        else:
            g.active_grants = active_admin_modules(user)
        return handler(*args, **kwargs)
    return wrapped


def _main_admin_required(handler):
    @_bearer_required
    @wraps(handler)
    def wrapped(*args, **kwargs):
        if not g.is_main_admin:
            return _error('Main Admin access is required.', 403)
        return handler(*args, **kwargs)
    return wrapped


def _assigned_module(value):
    identity_filter = [AdminModule.key == str(value)]
    if str(value).isdigit():
        identity_filter.append(AdminModule.id == int(value))
    module = AdminModule.query.filter(or_(*identity_filter), AdminModule.is_active.is_(True)).first()
    if not module:
        return None
    if not g.is_main_admin and not any(grant['id'] == module.id for grant in g.active_grants):
        return None
    return module


def _datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=None)
    except (ValueError, AttributeError):
        return None


def _notification_json(note):
    data = note.to_dict()
    data['recipient'] = _user_json(note.user) if note.user else None
    creator = db.session.get(User, note.created_by_id) if note.created_by_id else None
    data['created_by_name'] = creator.full_name if creator else 'System'
    return data


def _has_permission(module, permission):
    return g.is_main_admin or any(
        grant['id'] == module.id and permission in grant.get('permissions', [])
        for grant in g.active_grants
    )


@campus_admin_bp.route('/setup-status', methods=['GET'])
def setup_status():
    token = current_app.config.get('MAIN_ADMIN_SETUP_TOKEN', '')
    setup_completed = db.session.get(MainAdminSetupState, 'main_admin')
    main_admin_exists = User.query.filter_by(role='main_admin').first()
    setup_configured = len(token) >= 32
    setup_completed = bool(setup_completed or main_admin_exists)
    return jsonify(
        setup_available=setup_configured and not setup_completed,
        setup_configured=setup_configured,
        setup_completed=setup_completed,
    )


def _validated_main_admin_registration(data):
    full_name = str(data.get('full_name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = data.get('password')
    if not full_name or len(full_name) > 120:
        return None, _error('full_name must contain 1-120 characters.', 400)
    if len(email) > 120 or not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email):
        return None, _error('A valid email address is required.', 400)
    if not isinstance(password, str) or len(password.encode('utf-8')) > 72 or len(password) < 12:
        return None, _error('Password must be 12-72 characters.', 400)
    if not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        return None, _error('Password must contain at least one letter and one number.', 400)
    if password != data.get('confirm_password'):
        return None, _error('Password confirmation does not match.', 400)
    if User.query.filter(func.lower(User.email) == email).first():
        return None, _error('An account already uses this email address.', 409)
    return {'full_name': full_name, 'email': email, 'password': password}, None


@campus_admin_bp.route('/setup', methods=['POST'])
def initialize_main_admin():
    setup_token = current_app.config.get('MAIN_ADMIN_SETUP_TOKEN', '')
    if len(setup_token) < 32:
        return _error('Secure Main Admin initialization is not configured.', 503)
    if (
        db.session.get(MainAdminSetupState, 'main_admin')
        or User.query.filter_by(role='main_admin').first()
    ):
        return _error('The initial Main Admin account has already been created.', 409)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON initialization request is required.', 400)
    submitted_token = data.get('setup_token')
    if not isinstance(submitted_token, str) or not hmac.compare_digest(submitted_token, setup_token):
        return _error('The one-time setup token is invalid.', 403)

    registration, error_response = _validated_main_admin_registration(data)
    if error_response:
        return error_response

    user = User(
        full_name=registration['full_name'],
        email=registration['email'],
        role='main_admin',
        main_admin_guard=True,
        department='System Administration',
        is_verified=True,
        is_active=True,
    )
    user.set_password(registration['password'])
    db.session.add(user)
    try:
        db.session.flush()
        seed_default_modules()
        db.session.add(MainAdminSetupState(
            key='main_admin',
            admin_user_id=user.id,
            completed_at=datetime.utcnow(),
        ))
        _audit(user, 'MAIN_ADMIN_INITIALIZED', target=user, details='Initial Main Admin account created.')
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error('The initial Main Admin account has already been created.', 409)

    from app.utils.auth_helpers import login_user
    login_user(user)
    return jsonify(success=True, token=_issue_token(user), user=_user_json(user)), 201


@campus_admin_bp.route('/handoff', methods=['POST'])
@_main_admin_required
def create_main_admin_handoff():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('password'), str):
        return _error('Confirm the current Main Admin password to create a transfer code.', 400)

    actor = g.campus_admin_user
    if not actor.check_password(data['password']):
        return _error('The current Main Admin password is incorrect.', 403)

    now = datetime.utcnow()
    for pending in MainAdminHandoff.query.filter_by(
        created_by_id=actor.id, claimed_at=None, revoked_at=None,
    ).all():
        pending.revoked_at = now

    code = secrets.token_urlsafe(32)
    handoff = MainAdminHandoff(
        code_hash=hashlib.sha256(code.encode('utf-8')).hexdigest(),
        created_by_id=actor.id,
        expires_at=now + timedelta(minutes=30),
    )
    db.session.add(handoff)
    _audit(
        actor,
        'MAIN_ADMIN_HANDOFF_CREATED',
        target=actor,
        details='Created a single-use Main Admin transfer code expiring in 30 minutes.',
    )
    db.session.commit()
    return jsonify(
        success=True,
        code=code,
        expires_at=handoff.expires_at.isoformat(),
    ), 201


@campus_admin_bp.route('/handoff/claim', methods=['POST'])
def claim_main_admin_handoff():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON transfer claim request is required.', 400)
    code = data.get('code')
    if not isinstance(code, str) or not code.strip() or len(code) > 128:
        return _error('A valid Main Admin transfer code is required.', 400)
    code_hash = hashlib.sha256(code.strip().encode('utf-8')).hexdigest()
    now = datetime.utcnow()
    handoff = MainAdminHandoff.query.filter_by(code_hash=code_hash).with_for_update().first()
    if not handoff or handoff.claimed_at or handoff.revoked_at:
        return _error('This Main Admin transfer code is invalid or has already been used.', 410)
    if handoff.expires_at <= now:
        return _error('This Main Admin transfer code has expired.', 410)

    registration, error_response = _validated_main_admin_registration(data)
    if error_response:
        return error_response

    previous_admin = db.session.get(User, handoff.created_by_id)
    if not previous_admin or previous_admin.role != 'main_admin' or not previous_admin.is_active:
        return _error('The Main Admin transfer is no longer available.', 409)
    other_admin = User.query.filter(
        User.role == 'main_admin',
        User.id != previous_admin.id,
        User.is_active.is_(True),
    ).first()
    if other_admin:
        return _error('Another active Main Admin already exists.', 409)

    new_admin = User(
        full_name=registration['full_name'],
        email=registration['email'],
        role='main_admin',
        main_admin_guard=True,
        department='System Administration',
        is_verified=True,
        is_active=True,
    )
    new_admin.set_password(registration['password'])
    previous_admin.role = 'visitor'
    previous_admin.admin_scope = None
    previous_admin.main_admin_guard = None
    previous_admin.is_active = False
    handoff.claimed_at = now
    db.session.add(new_admin)

    try:
        db.session.flush()
        setup_state = db.session.get(MainAdminSetupState, 'main_admin')
        if setup_state:
            setup_state.admin_user_id = new_admin.id
            setup_state.completed_at = now
        else:
            db.session.add(MainAdminSetupState(
                key='main_admin',
                admin_user_id=new_admin.id,
                completed_at=now,
            ))
        _audit(
            previous_admin,
            'MAIN_ADMIN_HANDOFF_CLAIMED',
            target=new_admin,
            details='Main Admin authority transferred to a new standalone account.',
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error('The Main Admin transfer could not be completed. The code may have been used already.', 409)

    from app.utils.auth_helpers import login_user
    seed_default_modules()
    db.session.commit()
    login_user(new_admin)
    return jsonify(
        success=True,
        token=_issue_token(new_admin),
        user=_user_json(new_admin),
    ), 201


@campus_admin_bp.route('/login', methods=['POST'])
def main_admin_login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON login request is required.', 400)
    identifier = str(data.get('identifier', data.get('email', ''))).strip().lower()
    password = data.get('password', '')
    if not identifier or not isinstance(password, str) or not password:
        return _error('Email and password are required.', 400)
    user = User.query.filter(
        User.role == 'main_admin',
        func.lower(User.email) == identifier,
    ).first()
    if not user or not user.is_active or not user.check_password(password):
        return _error('Invalid Main Admin credentials.', 401)
    seed_default_modules()
    from app.utils.auth_helpers import login_user
    login_user(user)
    _audit(user, 'CAMPUS_ADMIN_LOGIN', target=user, details='Main Admin authenticated through JSON API.')
    db.session.commit()
    return jsonify(
        success=True,
        token=_issue_token(user),
        user=_user_json(user),
    )


@campus_admin_bp.route('/me', methods=['GET'])
@_bearer_required
def me():
    user = g.campus_admin_user
    return jsonify(
        user=_user_json(user),
        is_main_admin=g.is_main_admin,
        admin_modules=active_admin_modules(user),
    )


@campus_admin_bp.route('/overview', methods=['GET'])
@_main_admin_required
def overview():
    seed_default_modules()
    db.session.commit()
    by_role = {}
    by_module = {}
    recent = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(20).all()
    for event in recent:
        actor = db.session.get(User, event.actor_id or event.user_id) if (event.actor_id or event.user_id) else None
        role = actor.role if actor else 'system'
        by_role[role] = by_role.get(role, 0) + 1
        module = (event.module or 'other').lower()
        by_module[module] = by_module.get(module, 0) + 1
    notifications = Notification.query.order_by(Notification.created_at.desc()).limit(10).all()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_assignments = AdminAssignment.query.join(AdminModule).join(User).filter(
        AdminAssignment.status == 'active',
        AdminModule.is_active.is_(True),
        User.is_active.is_(True),
    )
    active_modules = db.session.query(AdminAssignment.module_id).join(AdminModule).join(User).filter(
        AdminAssignment.status == 'active',
        AdminModule.is_active.is_(True),
        User.is_active.is_(True),
    ).distinct().count()
    students_count = User.query.filter_by(role='student').count()
    faculty_count = User.query.filter(User.role.in_(('teacher', 'faculty'))).count()
    return jsonify(
        counts={
            'students': students_count,
            'faculty': faculty_count,
            'registered_users': students_count + faculty_count,
            'active_assignments': active_assignments.count(),
            'active_admins': active_assignments.with_entities(AdminAssignment.user_id).distinct().count(),
            'modules': AdminModule.query.filter_by(is_active=True).count(),
            'active_modules': active_modules,
            'activity_today': AuditLog.query.filter(AuditLog.created_at >= today).count(),
            'notifications': Notification.query.count(),
        },
        recent_activity={
            'by_role': [{'role': key, 'count': value} for key, value in sorted(by_role.items())],
            'by_module': [{'module': key, 'count': value} for key, value in sorted(by_module.items())],
        },
        activity=[event.to_dict() for event in recent],
        notifications=[_notification_json(note) for note in notifications],
    )


@campus_admin_bp.route('/users', methods=['GET'])
@_main_admin_required
def users():
    query = User.query
    role = request.args.get('role')
    search = request.args.get('q', '').strip()
    if role:
        query = query.filter(User.role == role)
    if search:
        pattern = f'%{search}%'
        query = query.filter(or_(
            User.full_name.ilike(pattern), User.email.ilike(pattern),
            User.usn_or_emp_id.ilike(pattern), User.department.ilike(pattern),
        ))
    if request.args.get('status') in ('active', 'inactive'):
        query = query.filter(User.is_active.is_(request.args['status'] == 'active'))
    records = query.order_by(User.created_at.desc(), User.id.desc()).limit(200).all()
    return jsonify(users=[_user_json(user) for user in records])


@campus_admin_bp.route('/users/<int:user_id>/status', methods=['PATCH'])
@_main_admin_required
def update_user_status(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return _error('User account not found.', 404)
    if user.role == 'main_admin':
        return _error('The permanent Main Admin account cannot be modified here.', 403)
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get('status') not in ('active', 'inactive'):
        return _error('status must be active or inactive.', 400)
    previous_status = 'active' if user.is_active else 'inactive'
    user.is_active = data['status'] == 'active'
    _audit(
        g.campus_admin_user,
        'USER_STATUS_CHANGED',
        module='accounts',
        target=user,
        details=f'Account status changed from {previous_status} to {data["status"]}.',
    )
    db.session.commit()
    return jsonify(success=True, user=_user_json(user))


@campus_admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@_main_admin_required
def delete_student_account(user_id):
    data = request.get_json(silent=True)
    identifier = data.get('identifier') if isinstance(data, dict) else None
    if not isinstance(identifier, str) or not identifier.strip():
        return _record_student_deletion_failure(
            g.campus_admin_user, user_id, None, 'A student identifier is required.', 400,
        )
    identifier = identifier.strip()
    target = db.session.get(User, user_id)
    if not target:
        return _record_student_deletion_failure(
            g.campus_admin_user, user_id, identifier, 'Student account not found.', 404,
        )
    if target.role != 'student':
        return _record_student_deletion_failure(
            g.campus_admin_user, user_id, target.usn_or_emp_id, 'Student account not found.', 404,
        )
    if not target.usn_or_emp_id or target.usn_or_emp_id != identifier:
        return _record_student_deletion_failure(
            g.campus_admin_user, user_id, target.usn_or_emp_id,
            'The student identifier did not match this account.', 409,
        )

    actor = g.campus_admin_user
    audit_entry = AuditLog(
        action='STUDENT_ACCOUNT_DELETION_SUCCEEDED',
        module='accounts',
        user_id=actor.id,
        actor_id=actor.id,
        target_user_id=target.id,
        details=(
            f'result=success; student_identifier={target.usn_or_emp_id}; '
            f'admin={actor.email}'
        ),
        ip_address=request.remote_addr,
    )
    db.session.delete(target)
    db.session.add(audit_entry)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception(
            'Student account deletion failed for user id %s.', user_id,
        )
        return _record_student_deletion_failure(
            actor, user_id, identifier, 'Student account deletion failed.', 500,
        )
    return jsonify(
        success=True,
        message='Student account permanently deleted.',
        deleted_user_id=user_id,
        identifier=identifier,
    )


@campus_admin_bp.route('/modules', methods=['GET', 'POST'])
@_main_admin_required
def modules():
    seed_default_modules()
    if request.method == 'GET':
        db.session.commit()
        return jsonify(modules=[module.to_dict() for module in AdminModule.query.order_by(AdminModule.id).all()])
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON module object is required.', 400)
    key = str(data.get('key', '')).strip().lower()
    name = str(data.get('name', '')).strip()
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{1,49}', key) or not name or len(name) > 100:
        return _error('A valid module key and name are required.', 400)
    if AdminModule.query.filter_by(key=key).first():
        return _error('That module key already exists.', 409)
    module = AdminModule(
        key=key, name=name, description=str(data.get('description', '')).strip() or None,
        is_active=bool(data.get('is_active', True)),
    )
    db.session.add(module)
    _audit(g.campus_admin_user, 'MODULE_CREATED', key, details=f'Created module {key}.')
    db.session.commit()
    return jsonify(module=module.to_dict()), 201


@campus_admin_bp.route('/modules/<int:module_id>', methods=['PATCH'])
@_main_admin_required
def update_module(module_id):
    module = db.session.get(AdminModule, module_id)
    if not module:
        return _error('Module not found.', 404)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON module patch is required.', 400)
    if 'key' in data and str(data['key']).strip() != module.key:
        return _error('Module keys are immutable.', 400)
    if 'name' in data:
        name = str(data['name']).strip()
        if not name or len(name) > 100:
            return _error('Module name must be 1-100 characters.', 400)
        module.name = name
    if 'description' in data:
        module.description = str(data['description']).strip() or None
    if 'is_active' in data:
        module.is_active = bool(data['is_active'])
    _audit(g.campus_admin_user, 'MODULE_UPDATED', module.key, details=f'Updated module {module.key}.')
    db.session.commit()
    return jsonify(module=module.to_dict())


@campus_admin_bp.route('/assignments', methods=['GET', 'POST'])
@_main_admin_required
def assignments():
    if request.method == 'GET':
        query = AdminAssignment.query
        if request.args.get('status'):
            query = query.filter_by(status=request.args['status'])
        if request.args.get('module'):
            module = AdminModule.query.filter_by(key=request.args['module']).first()
            query = query.filter_by(module_id=module.id if module else -1)
        return jsonify(assignments=[item.to_dict() for item in query.order_by(AdminAssignment.created_at.desc()).limit(500).all()])
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON assignment object is required.', 400)
    try:
        user_id = int(data.get('user_id'))
    except (TypeError, ValueError):
        return _error('A valid user_id is required.', 400)
    user = db.session.get(User, user_id)
    module = _assigned_module(data.get('module_id', data.get('module', '')))
    if not user or user.role == 'main_admin' or user.role not in ('student', 'teacher', 'faculty'):
        return _error('Only an existing non-Main-Admin user can be assigned.', 400)
    if not module:
        return _error('An active configured module is required.', 400)
    if not user.is_active or not user.is_verified:
        return _error('Only active, verified student or faculty accounts can receive assignments.', 400)
    if AdminAssignment.query.filter_by(user_id=user.id, module_id=module.id).first():
        return _error('An assignment for this user and module already exists.', 409)
    permissions = data.get('permissions', ['notifications:read', 'notifications:send', 'activity:read'])
    supported_permissions = {'notifications:read', 'notifications:send', 'activity:read'}
    if not isinstance(permissions, list) or not all(
        isinstance(value, str) and value in supported_permissions for value in permissions
    ):
        return _error('permissions must contain supported permission names.', 400)
    item = AdminAssignment(
        user_id=user.id, module_id=module.id, status='active',
        assigned_by_id=g.campus_admin_user.id,
    )
    item.permissions = permissions
    db.session.add(item)
    _audit(g.campus_admin_user, 'ADMIN_ASSIGNMENT_CREATED', module.key, user, f'Assigned {user.email} to {module.key}.')
    db.session.commit()
    return jsonify(assignment=item.to_dict()), 201


@campus_admin_bp.route('/assignments/<int:assignment_id>', methods=['PATCH'])
@_main_admin_required
def update_assignment(assignment_id):
    item = db.session.get(AdminAssignment, assignment_id)
    if not item:
        return _error('Assignment not found.', 404)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON assignment patch is required.', 400)
    actor = g.campus_admin_user
    action = data.get('action')
    target = item.user
    if action == 'transfer' or 'user_id' in data:
        try:
            new_user = db.session.get(User, int(data.get('target_user_id', data.get('user_id'))))
        except (TypeError, ValueError):
            new_user = None
        if (
            not new_user or new_user.role not in ('student', 'teacher', 'faculty')
            or not new_user.is_active or not new_user.is_verified
        ):
            return _error('Transfer requires an active, verified student or faculty target.', 400)
        if AdminAssignment.query.filter(
            AdminAssignment.user_id == new_user.id,
            AdminAssignment.module_id == item.module_id,
            AdminAssignment.id != item.id,
        ).first():
            return _error('The target user already has an assignment for this module.', 409)
        item.user_id = new_user.id
        target = new_user
        if action == 'transfer':
            item.status = 'active'
            item.revoked_at = None
    if 'module_id' in data:
        new_module = _assigned_module(data['module_id'])
        if not new_module:
            return _error('An active configured module is required.', 400)
        if AdminAssignment.query.filter(
            AdminAssignment.user_id == item.user_id,
            AdminAssignment.module_id == new_module.id,
            AdminAssignment.id != item.id,
        ).first():
            return _error('The user already has an assignment for this module.', 409)
        item.module_id = new_module.id
    elif action in ('revoke', 'suspend', 'reactivate'):
        item.status = {'revoke': 'revoked', 'suspend': 'suspended', 'reactivate': 'active'}[action]
        item.revoked_at = datetime.utcnow() if action == 'revoke' else None
    elif 'status' in data and data['status'] in ('active', 'suspended', 'revoked'):
        item.status = data['status']
        item.revoked_at = datetime.utcnow() if item.status == 'revoked' else None
    elif action == 'transfer' or 'user_id' in data or 'module_id' in data:
        pass
    else:
        return _error('Use action=transfer|revoke|suspend|reactivate or a valid status.', 400)
    if 'permissions' in data:
        if not isinstance(data['permissions'], list) or not all(isinstance(value, str) for value in data['permissions']):
            return _error('permissions must be an array of strings.', 400)
        item.permissions = data['permissions']
    item.assigned_by_id = actor.id
    _audit(actor, f'ADMIN_ASSIGNMENT_{action or item.status.upper()}', item.module.key, target, f'Updated assignment {item.id}.')
    db.session.commit()
    return jsonify(assignment=item.to_dict())


@campus_admin_bp.route('/activity', methods=['GET'])
@_bearer_required
def activity():
    query = AuditLog.query
    actor_id = func.coalesce(AuditLog.actor_id, AuditLog.user_id)
    query = query.outerjoin(User, User.id == actor_id)
    role_filter = request.args.get('role', '').strip().lower()
    if role_filter in ('student', 'students'):
        query = query.filter(User.role == 'student')
    elif role_filter in ('faculty', 'teacher', 'teachers'):
        query = query.filter(User.role.in_(('teacher', 'faculty')))
    elif role_filter in ('admin', 'administrator', 'administrators'):
        active_assignment = db.session.query(AdminAssignment.id).filter(
            AdminAssignment.user_id == User.id,
            AdminAssignment.status == 'active',
        ).exists()
        query = query.filter(or_(User.role.in_(('main_admin', 'canteen_admin')), active_assignment))
    elif role_filter:
        return _error('role must be student, faculty, or administrator.', 400)
    module_filter = request.args.get('module')
    if not g.is_main_admin:
        allowed_keys = {grant['key'] for grant in g.active_grants}
        if module_filter:
            matching_grant = next((grant for grant in g.active_grants if grant['key'] == module_filter), None)
            if not matching_grant or 'activity:read' not in matching_grant.get('permissions', []):
                return _error('This module is not actively assigned to you.', 403)
            allowed_keys = {module_filter}
        else:
            allowed_keys = {
                grant['key'] for grant in g.active_grants
                if 'activity:read' in grant.get('permissions', [])
            }
        if not allowed_keys:
            return jsonify(activity=[])
        query = query.filter(func.lower(AuditLog.module).in_(
            tuple(set(allowed_keys) | {key.upper() for key in allowed_keys})
        ))
    elif module_filter:
        query = query.filter(func.lower(AuditLog.module) == module_filter.lower())
    action_filter = request.args.get('action')
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    since_value = request.args.get('since') or request.args.get('from')
    until_value = request.args.get('until') or request.args.get('to')
    since = _datetime(since_value)
    until = _datetime(until_value)
    if since_value and not since:
        return _error('since must be a valid ISO date or datetime.', 400)
    if until_value and not until:
        return _error('until must be a valid ISO date or datetime.', 400)
    if since:
        query = query.filter(AuditLog.created_at >= since)
    if until:
        query = query.filter(AuditLog.created_at <= until)
    records = query.order_by(AuditLog.created_at.desc()).limit(200).all()
    return jsonify(activity=[event.to_dict() for event in records])


@campus_admin_bp.route('/notifications', methods=['GET', 'POST'])
@_bearer_required
def notifications():
    actor = g.campus_admin_user
    if request.method == 'GET':
        module_filter = request.args.get('module')
        query = Notification.query
        if not g.is_main_admin:
            allowed_keys = {grant['key'] for grant in g.active_grants}
            if module_filter and module_filter not in allowed_keys:
                return _error('This module is not actively assigned to you.', 403)
            if module_filter and not _has_permission(
                AdminModule.query.filter_by(key=module_filter).first(), 'notifications:read'
            ):
                return _error('Notification read permission is required.', 403)
            if module_filter:
                allowed_keys = {module_filter}
            else:
                allowed_keys = {
                    grant['key'] for grant in g.active_grants
                    if 'notifications:read' in grant.get('permissions', [])
                }
            if not allowed_keys:
                return jsonify(notifications=[])
            query = query.filter(Notification.originating_module.in_(allowed_keys))
        elif module_filter:
            if not AdminModule.query.filter_by(key=module_filter).first():
                return _error('Unknown module.', 404)
            query = query.filter(Notification.originating_module == module_filter)
        if request.args.get('unread') == 'true':
            query = query.filter(Notification.is_read.is_(False))
        records = query.order_by(Notification.created_at.desc()).limit(200).all()
        return jsonify(notifications=[_notification_json(note) for note in records])

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error('A JSON notification object is required.', 400)
    module = _assigned_module(data.get('module_slug', data.get('module', '')))
    if not module:
        return _error('An active module assigned to this administrator is required.', 403)
    if not _has_permission(module, 'notifications:send'):
        return _error('Notification send permission is required.', 403)
    title = str(data.get('title', '')).strip()
    message = str(data.get('description', data.get('message', ''))).strip()
    audience = str(data.get('audience', 'all')).strip().lower()
    if not title or len(title) > 150 or not message:
        return _error('title (1-150 characters) and message are required.', 400)
    recipient_ids = data.get('recipient_ids')
    if recipient_ids is not None:
        if not isinstance(recipient_ids, list) or not all(str(value).isdigit() for value in recipient_ids):
            return _error('recipient_ids must be an array of user IDs.', 400)
        recipients = User.query.filter(User.id.in_([int(value) for value in recipient_ids]), User.is_active.is_(True)).all()
        if len(recipients) != len(set(int(value) for value in recipient_ids)):
            return _error('One or more recipients are missing or inactive.', 400)
        if audience not in ('all', 'students', 'faculty', 'selected'):
            return _error('audience must be all, students, faculty, or selected.', 400)
        if audience in ('students', 'faculty'):
            required_role = 'student' if audience == 'students' else 'teacher'
            if any(user.role != required_role for user in recipients):
                return _error('Recipients do not match the selected audience.', 400)
        audience = audience if audience != 'all' else 'selected'
    else:
        if audience not in ('all', 'students', 'faculty'):
            return _error('audience must be all, students, or faculty.', 400)
        recipients_query = User.query.filter_by(is_active=True)
        if audience == 'students':
            recipients_query = recipients_query.filter_by(role='student')
        elif audience == 'faculty':
            recipients_query = recipients_query.filter_by(role='teacher')
        recipients = recipients_query.all()
    if not recipients:
        return _error('The selected audience has no active recipients.', 400)
    category = module.key if module.key in Notification.MODULE_CATEGORIES else 'admin'
    created = []
    for recipient in recipients:
        note = Notification(
            user_id=recipient.id, title=title, message=message, category=category,
            created_by_id=actor.id, originating_module=module.key, audience=audience,
        )
        db.session.add(note)
        created.append(note)
    _audit(actor, 'MODULE_NOTIFICATION_SENT', module.key, details=f'Notification sent to audience {audience} ({len(created)} recipients).')
    db.session.commit()
    return jsonify(notifications=[_notification_json(note) for note in created]), 201


@campus_admin_bp.route('/logout', methods=['POST'])
def logout():
    """Clear the Flask browser session; bearer-token clients clear their own token."""
    from app.utils.auth_helpers import logout_user
    logout_user()
    return jsonify(success=True)
