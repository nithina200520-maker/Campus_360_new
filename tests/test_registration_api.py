"""Student/faculty JSON registration and login share the Flask SQL account store."""
import jwt

from app.models import User


PASSWORD = "CampusPass123"
DEPARTMENT = "Computer Science & Engineering"


def student_payload(**overrides):
    payload = {
        "fullName": "API Student",
        "email": "api.student@example.edu",
        "department": DEPARTMENT,
        "phoneNumber": "9876543210",
        "universityUSN": "4HG24CS001",
        "currentSemester": "5th Semester",
        "password": PASSWORD,
        "confirmPassword": PASSWORD,
    }
    payload.update(overrides)
    return payload


def faculty_payload(**overrides):
    payload = {
        "fullName": "API Faculty",
        "email": "api.faculty@example.edu",
        "department": "Information Science & Engineering",
        "phoneNumber": "",
        "employeeId": "EMP-ISE-001",
        "academicDesignation": "Assistant Professor",
        "password": PASSWORD,
        "confirmPassword": PASSWORD,
    }
    payload.update(overrides)
    return payload


def test_student_registration_and_login_use_bcrypt_and_issue_role_token(client, db, app):
    registered = client.post("/api/students/register", json=student_payload())

    assert registered.status_code == 201
    user = User.query.filter_by(email="api.student@example.edu").one()
    assert user.role == "student"
    assert user.password_hash.startswith(("$2a$", "$2b$", "$2y$"))
    assert user.check_password(PASSWORD)

    response = client.post("/api/students/login", json={
        "identifier": "4HG24CS001",
        "password": PASSWORD,
    })
    data = response.get_json()

    assert response.status_code == 200
    assert data["user"]["role"] == "student"
    claims = jwt.decode(
        data["token"],
        app.config["AUTH_JWT_SECRET"],
        algorithms=["HS256"],
    )
    assert claims["role"] == "student"
    assert claims["id"] == user.id

    name_login = client.post("/api/students/login", json={
        "identifier": "API Student",
        "password": PASSWORD,
    })

    assert name_login.status_code == 200
    assert name_login.get_json()["user"]["name"] == "API Student"


def test_faculty_registration_and_login_use_employee_id_and_faculty_role(client, db, app):
    registered = client.post("/api/faculty/register", json=faculty_payload())

    assert registered.status_code == 201
    user = User.query.filter_by(email="api.faculty@example.edu").one()
    assert user.role == "teacher"
    assert user.is_verified is False
    assert user.usn_or_emp_id == "EMP-ISE-001"

    response = client.post("/api/faculty/login", json={
        "identifier": "api.faculty@example.edu",
        "password": PASSWORD,
    })

    assert response.status_code == 200
    assert response.get_json()["user"]["role"] == "faculty"
    claims = jwt.decode(
        response.get_json()["token"],
        app.config["AUTH_JWT_SECRET"],
        algorithms=["HS256"],
    )
    assert claims["role"] == "faculty"


def test_registration_rejects_duplicate_student_usn_and_email(client):
    assert client.post("/api/students/register", json=student_payload()).status_code == 201

    duplicate_usn = client.post("/api/students/register", json=student_payload(
        email="another.student@example.edu",
    ))
    duplicate_email = client.post("/api/faculty/register", json=faculty_payload(
        email="API.STUDENT@EXAMPLE.EDU",
        employeeId="EMP-CSE-111",
    ))

    assert duplicate_usn.status_code == 409
    assert duplicate_email.status_code == 409
    assert User.query.count() == 1


def test_registration_rejects_duplicate_faculty_employee_id(client):
    assert client.post("/api/faculty/register", json=faculty_payload()).status_code == 201
    duplicate = client.post("/api/faculty/register", json=faculty_payload(
        email="another.faculty@example.edu",
    ))

    assert duplicate.status_code == 409
    assert User.query.count() == 1


def test_registration_enforces_password_and_role_specific_fields(client):
    weak_password = client.post("/api/students/register", json=student_payload(
        password="weakpass",
        confirmPassword="weakpass",
    ))
    missing_designation = client.post("/api/faculty/register", json=faculty_payload(
        academicDesignation="",
    ))
    mismatched_login = client.post("/api/faculty/login", json={
        "identifier": "4HG24CS001",
        "password": PASSWORD,
    })

    assert weak_password.status_code == 400
    assert missing_designation.status_code == 400
    assert mismatched_login.status_code == 401
    assert User.query.count() == 0


def test_student_and_faculty_identifiers_are_scoped_by_account_role(client):
    student = client.post("/api/students/register", json=student_payload())
    faculty = client.post("/api/faculty/register", json=faculty_payload(
        employeeId="4HG24CS001",
        email="cross-role.faculty@example.edu",
    ))

    assert student.status_code == 201
    assert faculty.status_code == 201


def test_student_credentials_cannot_authenticate_through_faculty_endpoint(client):
    registration = client.post("/api/students/register", json=student_payload())

    response = client.post("/api/faculty/login", json={
        "identifier": "4HG24CS001",
        "password": PASSWORD,
    })

    assert registration.status_code == 201
    assert response.status_code == 401
