"""
EXAM ROOM FINDER - optional USN range (from..to) per allotment.

Covers: the ExamSchedule.usn_in_range() helper, audience_users() narrowing by USN
range, and the admin single-entry form storing / validating the range. Runs only
against the throwaway test database (see conftest.py).
"""
from datetime import date

from tests.conftest import login
from app.models import ExamSchedule, User


def _mk_student(db, email, usn, department="Computer Science and Engineering",
                semester="5th Semester"):
    u = User(full_name=f"Student {usn}", email=email, role="student",
             is_verified=True, is_active=True, usn_or_emp_id=usn,
             department=department, semester=semester)
    u.password_hash = "x"
    db.session.add(u)
    db.session.commit()
    return u


# --------------------------------------------------------------- range helper
class TestUsnRangeHelper:

    def test_no_bounds_match_everything(self, db):
        s = ExamSchedule(audience_role="student")
        assert s.usn_in_range("4HG2CS0001") is True
        assert s.usn_in_range(None) is True

    def test_inclusive_bounds(self, db):
        s = ExamSchedule(audience_role="student",
                         usn_from="4HG2CS0001", usn_to="4HG2CS0050")
        assert s.usn_in_range("4HG2CS0001") is True   # lower bound inclusive
        assert s.usn_in_range("4HG2CS0025") is True   # inside
        assert s.usn_in_range("4HG2CS0050") is True   # upper bound inclusive
        assert s.usn_in_range("4HG2CS0051") is False  # above range
        assert s.usn_in_range("4HG2CS0000") is False  # below range

    def test_case_insensitive_and_only_one_bound(self, db):
        s = ExamSchedule(audience_role="student", usn_from="4HG2CS0050")
        assert s.usn_in_range("4hg2cs0075") is True   # upper-cased comparison
        assert s.usn_in_range("4HG2CS0049") is False
        assert s.usn_in_range(None) is False          # bound set -> USN required


# ------------------------------------------------------------ audience filter
class TestAudienceUsersRange:

    def test_audience_narrows_to_usn_range(self, app, db):
        with app.app_context():
            inside = _mk_student(db, "in1@gechassan.ac.in", "4HG2CS0010")
            edge = _mk_student(db, "in2@gechassan.ac.in", "4HG2CS0050")
            _mk_student(db, "out1@gechassan.ac.in", "4HG2CS0051")
            s = ExamSchedule(subject_code="21CS401", subject_name="DS",
                             exam_date=date(2026, 11, 1), audience_role="student",
                             usn_from="4HG2CS0001", usn_to="4HG2CS0050")
            emails = {u.email for u in s.audience_users()}
            assert {inside.email, edge.email} <= emails
            assert "out1@gechassan.ac.in" not in emails

    def test_no_range_targets_whole_branch(self, app, db):
        with app.app_context():
            _mk_student(db, "a@gechassan.ac.in", "4HG2CS0100")
            s = ExamSchedule(subject_code="21CS401", subject_name="DS",
                             exam_date=date(2026, 11, 1), audience_role="student",
                             department="Computer Science and Engineering")
            assert "a@gechassan.ac.in" in {u.email for u in s.audience_users()}


# ------------------------------------------------------------- admin form flow
class TestAdminCreateStoresRange:

    def _payload(self, **over):
        data = {"subject_code": "21CS401", "subject_name": "Data Structures",
                "exam_date": "2026-11-01", "start_time": "09:30", "end_time": "12:00",
                "department": "CS", "semester": "5th Sem"}
        data.update(over)
        return data

    def test_create_persists_uppercased_range(self, client, users, db):
        login(client, "admin@gechassan.ac.in")
        resp = client.post("/admin/exam-schedule/create",
                           data=self._payload(usn_from="4hg2cs0001", usn_to="4hg2cs0050"))
        assert resp.status_code == 302
        with client.application.app_context():
            s = ExamSchedule.query.filter_by(subject_code="21CS401").order_by(ExamSchedule.id.desc()).first()
            assert s.usn_from == "4HG2CS0001"
            assert s.usn_to == "4HG2CS0050"

    def test_reversed_range_is_rejected(self, client, users, db):
        login(client, "admin@gechassan.ac.in")
        before = ExamSchedule.query.count()
        resp = client.post("/admin/exam-schedule/create",
                           data=self._payload(usn_from="4HG2CS0050", usn_to="4HG2CS0001"),
                           follow_redirects=True)
        assert "must not come after" in resp.get_data(as_text=True)
        with client.application.app_context():
            assert ExamSchedule.query.count() == before
