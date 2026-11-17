"""Focused tests for centralized Flask module-admin authorization and API."""
from datetime import datetime, timedelta

import jwt

from app.models import (
    AdminAssignment, AdminModule, AuditLog, CanteenOrder, MainAdminHandoff,
    MainAdminSetupState, Notification, User,
)
from tests.conftest import TEST_PASSWORD


def main_login(client):
    response = client.post('/api/campus-admin/login', json={
        'email': 'admin@gechassan.ac.in',
        'password': TEST_PASSWORD,
    })
    assert response.status_code == 200
    return response.get_json()['token']


def bearer(token):
    return {'Authorization': f'Bearer {token}'}


def test_main_admin_login_uses_existing_account_and_sets_flask_session(client, users, app):
    denied = client.post('/api/campus-admin/login', json={
        'email': 'student@gechassan.ac.in', 'password': TEST_PASSWORD,
    })
    assert denied.status_code == 401
    response = client.post('/api/campus-admin/login', json={
        'email': users['main_admin'].email, 'password': TEST_PASSWORD,
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['user']['role'] == 'main_admin'
    assert data['user']['admin_modules']
    claims = jwt.decode(data['token'], app.config['AUTH_JWT_SECRET'], algorithms=['HS256'])
    assert claims['id'] == users['main_admin'].id
    assert 'session=' in response.headers['Set-Cookie']
    assert client.get('/admin/dashboard').status_code == 200
    assert client.post('/api/campus-admin/logout').get_json()['success'] is True
    assert client.get('/admin/dashboard').status_code == 302
    assert users['main_admin'].role == 'main_admin'
    assert users['main_admin'].is_active is True


def test_main_admin_initial_setup_is_token_protected_and_one_time(client, db, users, app):
    db.session.delete(users['main_admin'])
    db.session.commit()
    app.config['MAIN_ADMIN_SETUP_TOKEN'] = 'one-time-setup-token-with-at-least-32-characters'

    assert client.get('/api/campus-admin/setup-status').get_json()['setup_available'] is True
    denied = client.post('/api/campus-admin/setup', json={
        'setup_token': 'wrong',
        'full_name': 'Initial Admin',
        'email': 'main-admin@example.edu',
        'password': 'StrongCampusAdmin123',
        'confirm_password': 'StrongCampusAdmin123',
    })
    assert denied.status_code == 403

    created = client.post('/api/campus-admin/setup', json={
        'setup_token': app.config['MAIN_ADMIN_SETUP_TOKEN'],
        'full_name': 'Initial Admin',
        'email': 'main-admin@example.edu',
        'password': 'StrongCampusAdmin123',
        'confirm_password': 'StrongCampusAdmin123',
    })
    assert created.status_code == 201
    assert created.get_json()['user']['role'] == 'main_admin'
    assert client.get(
        '/api/campus-admin/me',
        headers=bearer(created.get_json()['token']),
    ).status_code == 200
    main_admin = User.query.filter_by(role='main_admin').one()
    assert main_admin.main_admin_guard is True
    assert main_admin.password_hash != 'StrongCampusAdmin123'
    assert main_admin.check_password('StrongCampusAdmin123')
    assert db.session.get(MainAdminSetupState, 'main_admin') is not None
    db.session.delete(main_admin)
    db.session.commit()
    assert client.get('/api/campus-admin/setup-status').get_json()['setup_available'] is False
    assert client.post('/api/campus-admin/setup', json={
        'setup_token': app.config['MAIN_ADMIN_SETUP_TOKEN'],
        'full_name': 'Second Admin',
        'email': 'second-admin@example.edu',
        'password': 'AnotherStrongAdmin123',
        'confirm_password': 'AnotherStrongAdmin123',
    }).status_code == 409


def test_main_admin_handoff_requires_password_and_transfers_once(client, db, users):
    student_login = client.post('/api/students/login', json={
        'identifier': users['student'].usn_or_emp_id,
        'password': TEST_PASSWORD,
    })
    forbidden = client.post(
        '/api/campus-admin/handoff',
        headers=bearer(student_login.get_json()['token']),
        json={'password': TEST_PASSWORD},
    )
    assert forbidden.status_code == 403

    token = main_login(client)
    denied = client.post(
        '/api/campus-admin/handoff',
        headers=bearer(token),
        json={'password': 'not-the-admin-password'},
    )
    assert denied.status_code == 403

    created = client.post(
        '/api/campus-admin/handoff',
        headers=bearer(token),
        json={'password': TEST_PASSWORD},
    )
    assert created.status_code == 201
    code = created.get_json()['code']
    handoff = MainAdminHandoff.query.one()
    assert handoff.code_hash != code

    existing_account = client.post('/api/campus-admin/handoff/claim', json={
        'code': code,
        'full_name': 'Existing Student',
        'email': users['student'].email,
        'password': 'NewStrongOwner123',
        'confirm_password': 'NewStrongOwner123',
    })
    assert existing_account.status_code == 409
    assert handoff.claimed_at is None

    claimed = client.post('/api/campus-admin/handoff/claim', json={
        'code': code,
        'full_name': 'New System Owner',
        'email': 'new-owner@example.edu',
        'password': 'NewStrongOwner123',
        'confirm_password': 'NewStrongOwner123',
    })
    assert claimed.status_code == 201
    data = claimed.get_json()
    assert data['user']['role'] == 'main_admin'
    assert client.get('/api/campus-admin/me', headers=bearer(data['token'])).status_code == 200
    assert client.get('/api/campus-admin/me', headers=bearer(token)).status_code == 401
    assert users['main_admin'].role == 'visitor'
    assert users['main_admin'].is_active is False
    assert handoff.claimed_at is not None
    assert client.post('/api/campus-admin/handoff/claim', json={
        'code': code,
        'full_name': 'Third Owner',
        'email': 'third-owner@example.edu',
        'password': 'ThirdStrongOwner123',
        'confirm_password': 'ThirdStrongOwner123',
    }).status_code == 410


def test_expired_main_admin_handoff_cannot_be_claimed(client, db, users):
    token = main_login(client)
    created = client.post(
        '/api/campus-admin/handoff',
        headers=bearer(token),
        json={'password': TEST_PASSWORD},
    )
    assert created.status_code == 201
    handoff = MainAdminHandoff.query.one()
    handoff.expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.session.commit()

    expired = client.post('/api/campus-admin/handoff/claim', json={
        'code': created.get_json()['code'],
        'full_name': 'New System Owner',
        'email': 'new-owner@example.edu',
        'password': 'NewStrongOwner123',
        'confirm_password': 'NewStrongOwner123',
    })
    assert expired.status_code == 410
    assert users['main_admin'].is_active is True
    assert client.get('/api/campus-admin/me', headers=bearer(token)).status_code == 200


def test_assignment_lifecycle_and_live_grants(client, users):
    token = main_login(client)
    modules = client.get('/api/campus-admin/modules', headers=bearer(token)).get_json()['modules']
    lost_found = next(module for module in modules if module['key'] == 'lost_found')
    created = client.post('/api/campus-admin/assignments', headers=bearer(token), json={
        'user_id': users['student'].id, 'module_id': lost_found['id'],
    })
    assert created.status_code == 201
    assignment_id = created.get_json()['assignment']['id']

    student_token_response = client.post('/api/students/login', json={
        'identifier': users['student'].usn_or_emp_id,
        'password': TEST_PASSWORD,
    })
    assert student_token_response.status_code == 200
    student_token = student_token_response.get_json()['token']
    user_payload = student_token_response.get_json()['user']
    assert [grant['key'] for grant in user_payload['admin_modules']] == ['lost_found']
    assert 'session=' in student_token_response.headers['Set-Cookie']

    suspended = client.patch(
        f'/api/campus-admin/assignments/{assignment_id}',
        headers=bearer(token), json={'status': 'suspended'},
    )
    assert suspended.get_json()['assignment']['status'] == 'suspended'
    assert client.get('/api/campus-admin/me', headers=bearer(student_token)).get_json()['admin_modules'] == []

    reactivated = client.patch(
        f'/api/campus-admin/assignments/{assignment_id}',
        headers=bearer(token), json={'status': 'active', 'permissions': ['activity:read']},
    )
    assert reactivated.get_json()['assignment']['permissions'] == ['activity:read']
    canteen = next(module for module in modules if module['key'] == 'canteen')
    moved = client.patch(
        f'/api/campus-admin/assignments/{assignment_id}',
        headers=bearer(token), json={'module_id': canteen['id']},
    )
    assert moved.get_json()['assignment']['module']['key'] == 'canteen'
    assert client.get('/api/campus-admin/me', headers=bearer(student_token)).get_json()[
        'admin_modules'
    ][0]['key'] == 'canteen'
    transferred = client.patch(
        f'/api/campus-admin/assignments/{assignment_id}',
        headers=bearer(token), json={'user_id': users['teacher_verified'].id},
    )
    assert transferred.status_code == 200
    assert transferred.get_json()['assignment']['user_id'] == users['teacher_verified'].id
    assert AdminAssignment.query.get(assignment_id).user_id == users['teacher_verified'].id


def test_assignments_require_verified_registered_student_or_faculty(client, users):
    token = main_login(client)
    module = AdminModule.query.filter_by(key='lost_found').one()

    pending = client.post('/api/campus-admin/assignments', headers=bearer(token), json={
        'user_id': users['teacher_pending'].id, 'module_id': module.id,
    })
    visitor = client.post('/api/campus-admin/assignments', headers=bearer(token), json={
        'user_id': users['visitor'].id, 'module_id': module.id,
    })

    assert pending.status_code == 400
    assert visitor.status_code == 400
    assert AdminAssignment.query.count() == 0


def test_main_admin_account_status_changes_are_audited_and_invalidate_tokens(client, users):
    main_token = main_login(client)
    student_login = client.post('/api/students/login', json={
        'identifier': users['student'].usn_or_emp_id,
        'password': TEST_PASSWORD,
    }).get_json()

    changed = client.patch(
        f"/api/campus-admin/users/{users['student'].id}/status",
        headers=bearer(main_token),
        json={'status': 'inactive'},
    )
    assert changed.status_code == 200
    assert changed.get_json()['user']['status'] == 'inactive'
    assert client.get('/api/campus-admin/me', headers=bearer(student_login['token'])).status_code == 401
    assert client.patch(
        f"/api/campus-admin/users/{users['main_admin'].id}/status",
        headers=bearer(main_token),
        json={'status': 'inactive'},
    ).status_code == 403
    assert client.patch(
        f"/api/campus-admin/users/{users['student'].id}/status",
        headers=bearer(main_token),
        json={'status': 'suspended'},
    ).status_code == 400


def test_student_deletion_is_main_admin_only_and_checks_usn(client, users):
    student_token = client.post('/api/students/login', json={
        'identifier': users['student'].usn_or_emp_id,
        'password': TEST_PASSWORD,
    }).get_json()['token']
    url = f"/api/campus-admin/users/{users['student'].id}"
    payload = {'identifier': '4GH22CS999'}

    denied = client.delete(url, headers=bearer(student_token), json=payload)
    assert denied.status_code == 403
    assert User.query.get(users['student'].id) is not None

    token = main_login(client)
    mismatch = client.delete(url, headers=bearer(token), json=payload)
    assert mismatch.status_code == 409
    assert User.query.get(users['student'].id) is not None
    failure = AuditLog.query.filter_by(action='STUDENT_ACCOUNT_DELETION_FAILED').one()
    assert failure.target_user_id == users['student'].id
    assert '4GH22CS054' in failure.details


def test_main_admin_deletion_removes_login_and_preserves_canteen_history(client, users, db):
    token = main_login(client)
    student = users['student']
    old_id = student.id
    old_usn = student.usn_or_emp_id
    old_email = student.email
    student_token = client.post('/api/students/login', json={
        'identifier': old_usn, 'password': TEST_PASSWORD,
    }).get_json()['token']
    order = CanteenOrder(
        order_code='ORD-DELETE-TEST',
        user_id=old_id,
        user_role_at_order='student',
        pickup_time=datetime.utcnow(),
        total_amount=125.00,
        payment_status='paid',
    )
    db.session.add(order)
    db.session.commit()
    order_id = order.id

    response = client.delete(
        f'/api/campus-admin/users/{old_id}',
        headers=bearer(token),
        json={'identifier': old_usn},
    )

    assert response.status_code == 200
    assert response.get_json()['success'] is True
    assert db.session.get(User, old_id) is None
    retained_order = db.session.get(CanteenOrder, order_id)
    assert retained_order is not None
    assert retained_order.user_id is None
    assert retained_order.customer is None
    audit = AuditLog.query.filter_by(action='STUDENT_ACCOUNT_DELETION_SUCCEEDED').one()
    assert audit.target_user_id == old_id
    assert audit.actor_id == users['main_admin'].id
    assert audit.user_id == users['main_admin'].id
    assert old_usn in audit.details
    assert audit.created_at is not None

    assert client.post('/api/students/login', json={
        'identifier': old_usn, 'password': TEST_PASSWORD,
    }).status_code == 401
    assert client.get('/api/campus-admin/me', headers=bearer(student_token)).status_code == 401
    assert User.query.filter_by(email=old_email).first() is None
    assert client.delete(
        f'/api/campus-admin/users/{old_id}',
        headers=bearer(token),
        json={'identifier': old_usn},
    ).status_code == 404
    assert AuditLog.query.filter_by(action='STUDENT_ACCOUNT_DELETION_SUCCEEDED').count() == 1


def test_configured_modules_and_main_admin_only_management(client, users):
    token = main_login(client)
    created = client.post('/api/campus-admin/modules', headers=bearer(token), json={
        'key': 'events', 'name': 'Campus Events', 'description': 'Event announcements',
    })
    assert created.status_code == 201
    module = created.get_json()['module']
    updated = client.patch(
        f"/api/campus-admin/modules/{module['id']}",
        headers=bearer(token), json={'name': 'Campus Events Board', 'is_active': False},
    )
    assert updated.get_json()['module']['is_active'] is False
    listed = client.get('/api/campus-admin/modules', headers=bearer(token)).get_json()['modules']
    assert any(item['key'] == 'events' for item in listed)

    student_login = client.post('/api/students/login', json={
        'identifier': users['student'].usn_or_emp_id, 'password': TEST_PASSWORD,
    }).get_json()
    headers = bearer(student_login['token'])
    assert client.get('/api/campus-admin/modules', headers=headers).status_code == 403
    assert client.get('/api/campus-admin/users', headers=headers).status_code == 403
    assert client.get('/api/campus-admin/assignments', headers=headers).status_code == 403
    assert client.get('/api/campus-admin/overview', headers=headers).status_code == 403
    assert client.get('/api/campus-admin/users').status_code == 401


def test_module_boundary_notification_attribution_and_stale_assignment(client, users):
    main_token = main_login(client)
    module = AdminModule.query.filter_by(key='lost_found').one()
    assignment_response = client.post('/api/campus-admin/assignments', headers=bearer(main_token), json={
        'user_id': users['student'].id, 'module_id': module.id,
    })
    assignment_id = assignment_response.get_json()['assignment']['id']
    student_login = client.post('/api/students/login', json={
        'identifier': users['student'].usn_or_emp_id, 'password': TEST_PASSWORD,
    }).get_json()
    student_token = student_login['token']
    headers = bearer(student_token)

    sent = client.post('/api/campus-admin/notifications', headers=headers, json={
        'title': 'Found item update',
        'description': 'A matching report is available.',
        'module_slug': 'lost_found',
        'audience': 'selected',
        'recipient_ids': [users['teacher_verified'].id],
    })
    assert sent.status_code == 201
    note = sent.get_json()['notifications'][0]
    assert note['created_by_id'] == users['student'].id
    assert note['originating_module'] == 'lost_found'
    assert note['audience'] == 'selected'
    assert note['is_read'] is False
    assert note['recipient']['id'] == users['teacher_verified'].id
    assert client.post('/api/campus-admin/notifications', headers=headers, json={
        'title': 'Cross module', 'description': 'Denied',
        'module_slug': 'canteen', 'audience': 'all',
    }).status_code == 403
    scoped = client.get('/api/campus-admin/notifications?module=lost_found', headers=headers)
    assert len(scoped.get_json()['notifications']) == 1
    assert client.get('/api/campus-admin/notifications?module=canteen', headers=headers).status_code == 403
    assert client.get('/api/campus-admin/activity?module=canteen', headers=headers).status_code == 403

    revoked = client.patch(
        f'/api/campus-admin/assignments/{assignment_id}',
        headers=bearer(main_token), json={'status': 'revoked'},
    )
    assert revoked.get_json()['assignment']['status'] == 'revoked'
    assert client.get('/api/campus-admin/me', headers=headers).get_json()['admin_modules'] == []
    assert client.post('/api/campus-admin/notifications', headers=headers, json={
        'title': 'Stale token', 'description': 'Denied',
        'module_slug': 'lost_found', 'audience': 'all',
    }).status_code == 403


def test_public_registration_cannot_promote_to_admin_role(client):
    response = client.post('/api/students/register', json={
        'fullName': 'Unprivileged User',
        'email': 'unprivileged@example.edu',
        'department': 'Computer Science & Engineering',
        'universityUSN': '4HG24CS990',
        'currentSemester': '5th Semester',
        'password': 'CampusPass123',
        'confirmPassword': 'CampusPass123',
        'role': 'main_admin',
        'admin_scope': 'lost_found',
    })
    assert response.status_code == 201
    user = User.query.filter_by(email='unprivileged@example.edu').one()
    assert user.role == 'student'
    assert user.admin_scope is None
    assert user.admin_assignments == []
