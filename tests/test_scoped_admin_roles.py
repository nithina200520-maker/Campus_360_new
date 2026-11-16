"""Module-scoped administrator access and assignment rules."""
import pytest

from app.models import AuditLog, LostFoundItem, NavigationNode, User
from tests.conftest import TEST_PASSWORD, login


@pytest.mark.parametrize(
    ('scope', 'own_path', 'restricted_paths'),
    [
        ('lost_found', '/admin/lost-found', ('/admin/navigation/manage', '/canteen-admin/dashboard')),
        ('navigation', '/admin/navigation/manage', ('/admin/lost-found', '/canteen-admin/dashboard')),
        ('canteen', '/canteen-admin/dashboard', ('/admin/lost-found', '/admin/navigation/manage')),
    ],
)
def test_module_admins_are_limited_to_their_module(
    client, db, users, scope, own_path, restricted_paths
):
    user = users['teacher_verified'] if scope == 'lost_found' else users['student']
    user.admin_scope = scope
    db.session.commit()

    response = login(client, user.email)
    assert response.status_code == 302
    assert response.headers['Location'].endswith(own_path)
    assert client.get(own_path).status_code == 200

    for path in restricted_paths:
        denied = client.get(path)
        assert denied.status_code == 302
        assert denied.headers['Location'].endswith('/')

    assert AuditLog.query.filter_by(action='ACCESS_DENIED_ROLE', user_id=user.id).count() == 2


def test_main_admin_can_open_all_module_dashboards(client, users):
    login(client, users['main_admin'].email)

    for path in ('/admin/lost-found', '/admin/navigation/manage', '/canteen-admin/dashboard'):
        assert client.get(path).status_code == 200


@pytest.mark.parametrize(
    ('scope', 'path', 'data'),
    [
        ('lost_found', '/admin/navigation/node/create', {
            'node_code': 'SCOPE_TEST', 'name': 'Forbidden node', 'building': 'Test block',
        }),
        ('navigation', '/admin/lost-found/item/create', {
            'reporter_id': '', 'report_type': 'lost', 'title': 'Forbidden report',
            'category': 'Other', 'location_reported': 'Test', 'description': 'Not permitted',
        }),
        ('canteen', '/admin/navigation/node/create', {
            'node_code': 'SCOPE_TEST', 'name': 'Forbidden node', 'building': 'Test block',
        }),
        ('canteen', '/admin/lost-found/item/create', {
            'reporter_id': '', 'report_type': 'lost', 'title': 'Forbidden report',
            'category': 'Other', 'location_reported': 'Test', 'description': 'Not permitted',
        }),
        ('navigation', '/canteen-admin/menu', {}),
    ],
)
def test_scoped_admins_cannot_post_to_other_module(
    client, db, users, scope, path, data
):
    user = users['teacher_verified'] if scope == 'lost_found' else users['student']
    user.admin_scope = scope
    db.session.commit()
    login(client, user.email)

    response = client.post(path, data=data)

    assert response.status_code == 302
    assert response.headers['Location'].endswith('/')
    assert NavigationNode.query.filter_by(node_code='SCOPE_TEST').first() is None
    assert LostFoundItem.query.filter_by(title='Forbidden report').first() is None


def test_lost_found_admin_can_create_edit_and_delete_reports(client, db, users):
    admin = users['teacher_verified']
    admin.admin_scope = 'lost_found'
    db.session.commit()
    login(client, admin.email)

    response = client.post('/admin/lost-found/item/create', data={
        'reporter_id': users['student'].id,
        'report_type': 'lost',
        'title': 'Lost calculator',
        'category': 'Electronics',
        'location_reported': 'Library',
        'description': 'Black calculator with a cracked corner',
        'contact_phone': '',
    })
    item = LostFoundItem.query.filter_by(title='Lost calculator').one()
    assert response.status_code == 302
    assert item.user_id == users['student'].id

    client.post(f'/admin/lost-found/item/{item.id}/edit', data={
        'title': 'Found calculator',
        'category': 'Electronics',
        'location_reported': 'CSE Block',
        'description': 'Updated description',
        'contact_phone': '',
    })
    db.session.refresh(item)
    assert item.title == 'Found calculator'
    assert item.location_reported == 'CSE Block'

    client.post(f'/lost-found/item/{item.id}/delete')
    assert db.session.get(LostFoundItem, item.id) is None


def test_main_admin_can_assign_module_scope_without_changing_faculty_role(client, db, users):
    faculty = users['teacher_verified']
    login(client, users['main_admin'].email)

    response = client.post(
        f'/admin/users/{faculty.id}/admin-scope',
        data={'admin_scope': 'lost_found'},
    )

    assert response.status_code == 302
    assert faculty.role == 'teacher'
    assert faculty.admin_scope == 'lost_found'
    assert faculty.is_verified_teacher()
    assert AuditLog.query.filter_by(action='USER_ADMIN_SCOPE_CHANGED').count() == 1


def test_lost_found_admin_scope_is_restricted_to_faculty(client, db, users):
    student = users['student']
    login(client, users['main_admin'].email)

    client.post(
        f'/admin/users/{student.id}/admin-scope',
        data={'admin_scope': 'lost_found'},
    )

    assert student.admin_scope is None


@pytest.mark.parametrize('role', ['admin', 'main_admin', 'canteen_admin', 'lost_found_admin', 'navigation_admin'])
def test_public_registration_cannot_create_admin_roles(client, db, role):
    email = f'{role}@gechassan.ac.in'
    client.post('/auth/register', data={
        'full_name': 'Public Admin Attempt',
        'email': email,
        'password': TEST_PASSWORD,
        'confirm_password': TEST_PASSWORD,
        'role': role,
    })

    assert User.query.filter_by(email=email).first() is None
    assert AuditLog.query.filter_by(action='UNAUTHORIZED_ADMIN_REGISTRATION_ATTEMPT').count() == 1


def test_registration_form_keeps_public_roles_and_password_confirmation(client):
    response = client.get('/auth/login?tab=register')
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    assert 'id="roleStudent" value="student"' in html
    assert 'id="roleTeacher" value="teacher"' in html
    assert 'id="roleVisitor" value="visitor"' in html
    assert 'Assigned by Main Admin' in html
    assert 'id="regConfirmPassword" name="confirm_password"' in html
    assert 'Passwords match' in html
