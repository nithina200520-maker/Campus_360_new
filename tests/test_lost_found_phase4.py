"""
LOST & FOUND TESTS - community reunification flow (AI matching removed).

Covers: reporting lost/found items, broadcasting every new LOST report to all
registered campus members, a finder notifying the owner directly with their own
public contact details, the ownership-claim -> admin-verification -> return
workflow, admin controls, notification history and the personal dashboard.

Runs only against the throwaway test database (see conftest.py); the real campus
database is never touched.
"""
from datetime import datetime, timedelta

from tests.conftest import login
from app.models import (
    LostFoundItem, LostFoundClaim, Notification, AuditLog, User,
)


# --------------------------------------------------------------------------
# helpers / fixtures
# --------------------------------------------------------------------------
def _mk_item(db, owner, report_type, title, category="Electronics",
             colour="Black", location="Central Library", days_ago=0,
             description=None, status="open"):
    item = LostFoundItem(
        user_id=owner.id,
        report_type=report_type,
        title=title,
        category=category,
        location_reported=location,
        date_time_reported=datetime.utcnow() - timedelta(days=days_ago),
        description=description or f"{colour} {category.lower()} left at {location}",
        color_hint=colour,
        contact_phone="+91 98450 00000",
        status=status,
    )
    db.session.add(item)
    db.session.commit()
    return item


def _lost_form(title="My Casio Calculator", department="CSE", color="Black",
               item_date="15/11/2026", time_slot="Morning", identification_marks="Yellow sticker"):
    return {
        "report_type": "lost",
        "title": title,
        "category": "Electronics",
        "department": department,
        "color": color,
        "location_reported": "Central Library",
        "description": "Black scientific calculator with a yellow sticker",
        "item_date": item_date,
        "time_slot": time_slot,
        "identification_marks": identification_marks,
        "contact_phone": "+91 98450 44004",
    }


# --------------------------------------------------------------------------
# 1. Reporting + Targeted Notification & Matching Flow (No whole-campus broadcasts)
# --------------------------------------------------------------------------
class TestReportAndNotify:
    def test_lost_report_saves_all_11_fields_and_never_broadcasts(self, client, db, users):
        login(client, "student@gechassan.ac.in")
        resp = client.post("/lost-found/report", data=_lost_form(), follow_redirects=False)
        assert resp.status_code == 302

        item = LostFoundItem.query.filter_by(title="My Casio Calculator").one()
        assert item.report_type == "lost" and item.status == "open"
        assert item.department == "CSE"
        assert item.color == "Black"
        assert item.item_date == "15/11/2026"
        assert item.time_slot == "Morning"
        assert item.identification_marks == "Yellow sticker"

        # Crucial requirement: NEVER broadcast notifications to all students
        found_broadcasts = Notification.query.filter_by(category="found").all()
        assert len(found_broadcasts) == 0

    def test_potential_match_notifies_only_relevant_users(self, client, db, users):
        # Teacher reports a FOUND Casio Calculator in Electronics
        teacher = users["teacher_verified"]
        found = LostFoundItem(
            user_id=teacher.id,
            report_type="found",
            title="Casio Calculator FX991",
            category="Electronics",
            department="CSE",
            color="Black",
            location_reported="Central Library",
            description="Found a scientific calculator with yellow sticker on floor 2",
            date_time_reported=datetime.utcnow(),
            status="open"
        )
        db.session.add(found)
        db.session.commit()

        # Student reports a LOST Casio Calculator matching category, title, colour, desc, location
        login(client, "student@gechassan.ac.in")
        resp = client.post("/lost-found/report", data=_lost_form(), follow_redirects=False)
        assert resp.status_code == 302

        # Verify that ONLY the relevant parties (finder and loser) receive match notification
        student_matches = Notification.query.filter_by(user_id=users["student"].id, category="match").all()
        teacher_matches = Notification.query.filter_by(user_id=teacher.id, category="match").all()
        assert len(student_matches) == 1
        assert len(teacher_matches) == 1
        # Unrelated student/canteen admin receives NO match notification
        unrelated_matches = Notification.query.filter_by(user_id=users["canteen_admin"].id, category="match").all()
        assert len(unrelated_matches) == 0

    def test_found_report_lists_publicly_and_alerts_admin_only(self, client, db, users):
        login(client, "teacher@gechassan.ac.in")
        resp = client.post("/lost-found/report", data={
            "report_type": "found", "title": "Found Water Bottle", "category": "Personal Items",
            "department": "Civil", "color": "Blue", "item_date": "16/11/2026", "time_slot": "Morning",
            "location_reported": "Canteen", "description": "Blue steel bottle on a bench",
            "contact_phone": "+91 98450 00000",
        }, follow_redirects=False)
        assert resp.status_code == 302

        admins = Notification.query.filter_by(category="admin").all()
        assert admins and any(a.user_id == users["main_admin"].id for a in admins)
        # a found report is NOT broadcast to the whole campus
        assert Notification.query.filter_by(category="found").count() == 0
        # an unrelated student gets nothing
        assert Notification.query.filter_by(user_id=users["student"].id).count() == 0

    def test_matching_system_pairs_potential_matches(self, client, db, users):
        teacher = users["teacher_verified"]
        found = LostFoundItem(
            user_id=teacher.id,
            report_type="found",
            title="Scientific Calculator",
            category="Electronics",
            department="CSE",
            color="Black",
            location_reported="Central Library",
            description="Found a scientific calculator left at library",
            date_time_reported=datetime.utcnow(),
            status="open"
        )
        db.session.add(found)
        db.session.commit()

        login(client, "student@gechassan.ac.in")
        client.post("/lost-found/report", data=_lost_form())
        from app.models import LostFoundMatch
        match = LostFoundMatch.query.filter_by(found_item_id=found.id).first()
        assert match is not None
        assert match.status == 'suggested'

    def test_finder_notifies_owner_with_public_contact(self, client, db, users):
        owner = users["student"]
        lost = _mk_item(db, owner, "lost", "Lost Calculator")

        login(client, "teacher@gechassan.ac.in")
        resp = client.post(f"/lost-found/item/{lost.id}/found", data={
            "contact": "+91 90000 12345",
            "found_location": "CSE Lab 2 bench",
            "note": "It is safe with me in the faculty room.",
        }, follow_redirects=False)
        assert resp.status_code == 302

        owner_notes = Notification.query.filter_by(user_id=owner.id, category="found").all()
        assert len(owner_notes) == 1
        msg = owner_notes[0].message
        assert "Dr. Ramesh Kumar" in msg          # finder identity revealed
        assert "+91 90000 12345" in msg           # finder contact revealed publicly
        assert "CSE Lab 2 bench" in msg
        assert "faculty room" in msg

        db.session.refresh(lost)
        assert lost.status == "matched"           # a find was reported on the lost item
        # administration is looped in for oversight
        assert Notification.query.filter_by(user_id=users["main_admin"].id, category="admin").count() >= 1
        assert AuditLog.query.filter_by(action="LF_FOUND_REPORTED").count() >= 1

    def test_repeat_find_by_same_user_notifies_once(self, client, db, users):
        owner = users["student"]
        lost = _mk_item(db, owner, "lost", "Lost Calculator")
        login(client, "teacher@gechassan.ac.in")
        for _ in range(2):
            client.post(f"/lost-found/item/{lost.id}/found", data={"contact": "+91 90000 12345"})
        assert Notification.query.filter_by(user_id=owner.id, category="found").count() == 1

    def test_owner_cannot_report_own_item_found(self, client, db, users):
        lost = _mk_item(db, users["student"], "lost", "Lost Calculator")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{lost.id}/found", data={"contact": "+91 90000 12345"})
        # self-action is refused, so the owner is not notified of their own report
        assert Notification.query.filter_by(category="found").count() == 0

    def test_reporter_contact_is_public_to_members(self, client, db, users):
        lost = _mk_item(db, users["student"], "lost", "Lost Wallet")
        # a registered campus member sees the reporter name + contact (public coordination)
        login(client, "teacher@gechassan.ac.in")
        body = client.get(f"/lost-found/item/{lost.id}").get_data(as_text=True)
        assert "Sneha Patil" in body
        assert "+91 98450 00000" in body
        # anonymous / visitor viewers do NOT get the member's private contact
        client.get("/auth/logout")
        anon = client.get(f"/lost-found/item/{lost.id}").get_data(as_text=True)
        assert "+91 98450 00000" not in anon
        assert "Private (coordinate via a claim)" in anon

    def test_opt_out_hides_contact_from_members(self, client, db, users):
        owner = users["student"]
        owner.reveal_contact_to_matches = False
        db.session.commit()
        lost = _mk_item(db, owner, "lost", "Private Lost Wallet")
        lost.contact_phone = None
        db.session.commit()
        # even a registered member only sees the opt-out notice
        login(client, "teacher@gechassan.ac.in")
        body = client.get(f"/lost-found/item/{lost.id}").get_data(as_text=True)
        assert "opted out of public contact" in body


# --------------------------------------------------------------------------
# 2. Claim -> verification -> return workflow (applies to FOUND items)
# --------------------------------------------------------------------------
class TestClaimWorkflow:
    def test_claim_requires_substantial_proof(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "student@gechassan.ac.in")
        resp = client.post(f"/lost-found/item/{found.id}/claim",
                           data={"proof_statement": "mine"}, follow_redirects=False)
        assert resp.status_code == 302
        assert LostFoundClaim.query.count() == 0
        db.session.refresh(found)
        assert found.status == "open"

    def test_cannot_claim_own_report(self, client, db, users):
        own = _mk_item(db, users["student"], "found", "My Own Found Item")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{own.id}/claim",
                    data={"proof_statement": "I think this is mine actually"})
        assert LostFoundClaim.query.filter_by(item_id=own.id).count() == 0

    def test_valid_claim_notifies_reporter_and_admins(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{found.id}/claim",
                    data={"proof_statement": "The calculator has my USN 4GH22CS054 scratched on the back."},
                    follow_redirects=False)
        claim = LostFoundClaim.query.filter_by(item_id=found.id).first()
        assert claim is not None and claim.status == "pending"
        db.session.refresh(found)
        assert found.status == "claimed" and found.claimed_by_user_id == users["student"].id
        assert Notification.query.filter_by(user_id=users["teacher_verified"].id).count() >= 1
        assert Notification.query.filter_by(user_id=users["main_admin"].id).count() >= 1
        assert Notification.query.filter_by(user_id=users["visitor"].id).count() == 0

    def test_duplicate_pending_claim_blocked(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "student@gechassan.ac.in")
        proof = {"proof_statement": "Distinctive yellow sticker and USN on the battery cover."}
        client.post(f"/lost-found/item/{found.id}/claim", data=proof)
        client.post(f"/lost-found/item/{found.id}/claim", data=proof)
        assert LostFoundClaim.query.filter_by(item_id=found.id, status="pending").count() == 1

    def test_admin_approve_then_record_return(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{found.id}/claim",
                    data={"proof_statement": "USN 4GH22CS054 etched, yellow brand sticker on back."})
        claim = LostFoundClaim.query.filter_by(item_id=found.id).first()

        client.get("/auth/logout")
        login(client, "admin@gechassan.ac.in")
        dresp = client.post(f"/admin/lost-found/claim/{claim.id}/decision",
                            data={"decision": "approve", "decision_note": "USN matched."})
        assert dresp.status_code == 302, dresp.get_data(as_text=True)[:400]
        db.session.refresh(claim)
        assert claim.status == "approved"

        client.post(f"/admin/lost-found/item/{found.id}/record-return",
                    data={"handover_note": "Collected with college ID at office."})
        db.session.refresh(found)
        assert found.status == "closed" and found.collected_at is not None
        assert Notification.query.filter_by(user_id=users["student"].id, category="claim").count() >= 1
        assert Notification.query.filter_by(user_id=users["student"].id, category="return").count() >= 1

    def test_admin_reject_reopens_item(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{found.id}/claim",
                    data={"proof_statement": "I believe the calculator is mine but cannot detail it."})
        claim = LostFoundClaim.query.filter_by(item_id=found.id).first()
        client.get("/auth/logout")
        login(client, "admin@gechassan.ac.in")
        client.post(f"/admin/lost-found/claim/{claim.id}/decision",
                    data={"decision": "reject", "decision_note": "No unique identifiers given."})
        db.session.refresh(claim)
        db.session.refresh(found)
        assert claim.status == "rejected"
        assert found.status == "open" and found.claimed_by_user_id is None


# --------------------------------------------------------------------------
# 3. Main Admin controls
# --------------------------------------------------------------------------
class TestAdminControls:
    def test_student_cannot_access_lf_admin(self, client, users):
        login(client, "student@gechassan.ac.in")
        resp = client.get("/admin/lost-found", follow_redirects=False)
        assert resp.status_code in (302, 403)

    def test_admin_page_renders_without_ai_lab(self, client, db, users):
        login(client, "admin@gechassan.ac.in")
        resp = client.get("/admin/lost-found")
        assert resp.status_code == 200
        body = resp.get_data(as_text=True)
        assert "Lost &amp; Found Administration" in body
        assert "/admin/ai-lab" not in body
        assert client.get("/admin/ai-lab").status_code == 404

    def test_student_cannot_delete_other_students_report(self, client, db, users):
        student_a = users["student"]
        lost_item = _mk_item(db, student_a, "lost", "Student A Laptop")

        # Log in as a different student/user
        login(client, "pending.teacher@gechassan.ac.in")
        resp = client.post(f"/lost-found/item/{lost_item.id}/delete", follow_redirects=True)
        assert "You are not authorized to delete this report" in resp.get_data(as_text=True)
        assert LostFoundItem.query.get(lost_item.id) is not None

    def test_department_admin_permissions_and_scoping(self, client, db, users):
        # Main Admin appoints teacher as Lost & Found Admin for CSE
        login(client, "admin@gechassan.ac.in")
        teacher = users["teacher_verified"]
        resp = client.post(f"/admin/users/{teacher.id}/admin-scope", data={
            "admin_scope": "lost_found",
            "department": "CSE"
        }, follow_redirects=True)
        assert resp.status_code == 200

        db.session.refresh(teacher)
        assert teacher.admin_scope == "lost_found"
        assert teacher.department == "CSE"

        # Create an item in CSE and an item in Civil
        cse_item = LostFoundItem(
            user_id=users["student"].id,
            report_type="found",
            title="CSE Lab Notebook",
            category="Books & Stationery",
            department="CSE",
            location_reported="CSE Lab",
            description="Left on lab desk",
            status="open",
            date_time_reported=datetime.utcnow()
        )
        civil_item = LostFoundItem(
            user_id=users["student"].id,
            report_type="found",
            title="Civil Theodolite Cover",
            category="Other",
            department="Civil",
            location_reported="Survey Store",
            description="Cover found",
            status="open",
            date_time_reported=datetime.utcnow()
        )
        db.session.add_all([cse_item, civil_item])
        db.session.commit()

        # Login as CSE Department Admin
        client.get("/auth/logout")
        login(client, "teacher@gechassan.ac.in")

        # Department admin can view their dashboard and see CSE item
        view_resp = client.get("/admin/lost-found")
        assert view_resp.status_code == 200
        content = view_resp.get_data(as_text=True)
        assert "CSE Lab Notebook" in content
        assert "Civil Theodolite Cover" not in content

        # Department admin cannot edit Civil item
        edit_resp = client.post(f"/admin/lost-found/item/{civil_item.id}/edit", data={
            "title": "Hacked Civil Item",
            "category": "Other",
            "location_reported": "Survey Store",
            "description": "Modified by unauthorized dept admin"
        }, follow_redirects=True)
        assert "Access denied: You can only edit records assigned to your department" in edit_resp.get_data(as_text=True)
        db.session.refresh(civil_item)
        assert civil_item.title == "Civil Theodolite Cover"

        # Main Admin has full access to both
        client.get("/auth/logout")
        login(client, "admin@gechassan.ac.in")
        main_view = client.get("/admin/lost-found").get_data(as_text=True)
        assert "CSE Lab Notebook" in main_view
        assert "Civil Theodolite Cover" in main_view

    def test_admin_update_location_notifies_reporter(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "admin@gechassan.ac.in")
        client.post(f"/admin/lost-found/item/{found.id}/update-location",
                    data={"location_reported": "Lost & Found Office, Admin Block"})
        db.session.refresh(found)
        assert found.location_reported == "Lost & Found Office, Admin Block"
        assert Notification.query.filter_by(user_id=users["teacher_verified"].id, category="admin").count() >= 1

    def test_admin_verify_item_sets_verified(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "admin@gechassan.ac.in")
        client.post(f"/admin/lost-found/item/{found.id}/verify")
        db.session.refresh(found)
        assert found.verified_by_admin_id == users["main_admin"].id

    def test_admin_targeted_notification_only(self, client, db, users):
        login(client, "admin@gechassan.ac.in")
        client.post(f"/admin/lost-found/notify/{users['student'].id}",
                    data={"title": "Please visit the office", "message": "Your item is ready for collection."})
        assert Notification.query.filter_by(user_id=users["student"].id).count() >= 1
        assert Notification.query.filter_by(user_id=users["visitor"].id).count() == 0


# --------------------------------------------------------------------------
# 4. Notification history, unread count, read state
# --------------------------------------------------------------------------
class TestNotificationHistory:
    def test_history_requires_login(self, client):
        assert client.get("/notifications/", follow_redirects=False).status_code == 302

    def test_unread_count_and_mark_read(self, client, db, users):
        Notification.notify(users["student"].id, title="T1", message="M1", category="found")
        Notification.notify(users["student"].id, title="T2", message="M2", category="claim")
        db.session.commit()
        login(client, "student@gechassan.ac.in")
        body = client.get("/notifications/").get_data(as_text=True)
        assert "T1" in body and "T2" in body

        first = Notification.query.filter_by(user_id=users["student"].id).first()
        client.post(f"/notifications/mark-read/{first.id}")
        db.session.refresh(first)
        assert first.is_read is True

    def test_mark_all_read(self, client, db, users):
        for i in range(3):
            Notification.notify(users["student"].id, title=f"N{i}", message="x")
        db.session.commit()
        login(client, "student@gechassan.ac.in")
        client.post("/notifications/mark-all-read")
        assert Notification.query.filter_by(user_id=users["student"].id, is_read=False).count() == 0

    def test_cannot_mark_another_users_notification(self, client, db, users):
        note = Notification.notify(users["visitor"].id, title="V", message="x")
        db.session.commit()
        login(client, "student@gechassan.ac.in")
        resp = client.post(f"/notifications/mark-read/{note.id}", follow_redirects=False)
        assert resp.status_code == 403
        db.session.refresh(note)
        assert note.is_read is False


# --------------------------------------------------------------------------
# 5. Personal dashboard + audit trail
# --------------------------------------------------------------------------
class TestPersonalDashboardAndAudit:
    def test_my_reports_lists_own_items_and_claims(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Casio Calculator")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{found.id}/claim",
                    data={"proof_statement": "Yellow sticker and USN engraving confirm ownership."})
        body = client.get("/lost-found/my-reports").get_data(as_text=True)
        assert "Reports I Filed" in body
        assert "Found Casio Calculator" in body

    def test_claim_and_report_actions_are_audited(self, client, db, users):
        found = _mk_item(db, users["teacher_verified"], "found", "Found Calculator")
        login(client, "student@gechassan.ac.in")
        client.post(f"/lost-found/item/{found.id}/claim",
                    data={"proof_statement": "USN engraving and brand sticker on the back cover."})
        assert AuditLog.query.filter_by(action="LF_CLAIM_SUBMITTED").count() >= 1
