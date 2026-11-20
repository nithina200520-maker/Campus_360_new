import os
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import render_template, request, redirect, url_for, flash, current_app, jsonify, abort
from app.blueprints.lost_found import lost_found_bp
from app.models import LostFoundItem, LostFoundMatch, LostFoundClaim, Notification, AuditLog, User
from app.database import db
from app.utils.auth_helpers import login_required, restrict_visitors, get_current_user
from app.utils.image_matcher import validate_image_bytes

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_PHOTO_BYTES = 8 * 1024 * 1024  # 8 MB upload ceiling

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _admin_ids():
    admins = User.query.filter(
        User.is_active.is_(True),
        (User.role == 'main_admin') | (User.admin_scope == 'lost_found')
    ).all()
    return [user.id for user in admins]

def _notify_registered_user(user_id, **kwargs):
    """Deliver a Lost & Found notification ONLY to a registered, active, non-visitor
    account. Missing, deactivated and visitor accounts are silently skipped."""
    if not user_id:
        return None
    target = db.session.get(User, user_id)
    if not target or not target.is_active or target.role == 'visitor':
        return None
    return Notification.notify(user_id, **kwargs)

@lost_found_bp.route('/')
def index():
    """Module 2: Lost & Found items catalog."""
    user = get_current_user()
    report_type = request.args.get('type')
    category = request.args.get('category')
    status_f = request.args.get('status')
    search = request.args.get('q', '').strip()

    query = LostFoundItem.query.order_by(LostFoundItem.date_time_reported.desc())

    if report_type in ['lost', 'found']:
        query = query.filter_by(report_type=report_type)

    if category:
        query = query.filter_by(category=category)

    if status_f in ('open', 'matched', 'claimed', 'closed'):
        query = query.filter_by(status=status_f)

    if search:
        query = query.filter(
            (LostFoundItem.title.ilike(f"%{search}%")) |
            (LostFoundItem.description.ilike(f"%{search}%")) |
            (LostFoundItem.location_reported.ilike(f"%{search}%"))
        )

    items = query.all()
    categories = ['Electronics', 'ID Cards & Docs', 'Books & Stationery', 'Personal Items', 'Valuables', 'Other']

    return render_template(
        'lost_found/index.html',
        user=user,
        items=items,
        categories=categories,
        current_type=report_type,
        current_cat=category,
        current_status=status_f,
        search_query=search
    )

@lost_found_bp.route('/report', methods=['GET', 'POST'])
@login_required
@restrict_visitors
def report_item():
    """Report a lost or found item. Lost reports are broadcast to every registered
    campus member; a finder later notifies the owner directly from the item page."""
    user = get_current_user()

    if request.method == 'POST':
        report_type = request.form.get('report_type')
        title = request.form.get('title', '').strip()
        category = request.form.get('category')
        location_reported = request.form.get('location_reported', '').strip()
        description = request.form.get('description', '').strip()
        color_hint = request.form.get('color_hint', '').strip() or None
        contact_phone = request.form.get('contact_phone', user.phone or '').strip()

        if not title or not location_reported or not description or report_type not in ['lost', 'found']:
            flash("Please fill in all required fields.", "warning")
            return redirect(url_for('lost_found.report_item'))

        # Optional photograph, stored for human identification only (no AI embedding)
        photo_rel_url = None
        file = request.files.get('photo')

        if file and file.filename:
            if not allowed_file(file.filename):
                flash("Photograph rejected: only PNG, JPG, JPEG or WEBP images are allowed.", "danger")
                return redirect(url_for('lost_found.report_item'))
            file.seek(0, os.SEEK_END)
            size = file.tell()
            file.seek(0)
            if size > MAX_PHOTO_BYTES:
                flash("Photograph rejected: file exceeds the 8 MB limit.", "danger")
                return redirect(url_for('lost_found.report_item'))
            if not validate_image_bytes(file):
                flash("Photograph rejected: file content is not a valid image.", "danger")
                return redirect(url_for('lost_found.report_item'))

            filename = secure_filename(f"lf_{int(datetime.utcnow().timestamp())}_{file.filename}")
            upload_dir = Path(current_app.root_path) / "static" / "uploads" / "lost_found"
            upload_dir.mkdir(parents=True, exist_ok=True)
            saved_path = upload_dir / filename
            file.save(saved_path)
            photo_rel_url = f"/static/uploads/lost_found/{filename}"

        new_item = LostFoundItem(
            user_id=user.id,
            report_type=report_type,
            title=title,
            category=category,
            location_reported=location_reported,
            date_time_reported=datetime.utcnow(),
            description=description,
            color_hint=color_hint,
            photo_url=photo_rel_url,
            contact_phone=contact_phone,
            status='open'
        )
        db.session.add(new_item)
        db.session.flush() # obtain new_item.id

        if report_type == 'lost':
            # Broadcast to every registered, active, non-visitor campus member
            # (except the reporter) so the whole community keeps an eye out.
            audience = User.query.filter(
                User.is_active.is_(True), User.role != 'visitor').all()
            for recipient in audience:
                if recipient.id == user.id:
                    continue
                _notify_registered_user(
                    recipient.id,
                    title=f"Lost item reported: '{title}'",
                    message=(f"{user.full_name} reported losing a "
                             f"'{title}' ({category}) near {location_reported}. "
                             "Open the report and use 'I found this' to notify the "
                             "owner directly if you have it."),
                    category='found',
                    link_url=url_for('lost_found.item_detail', item_id=new_item.id),
                    dedup_key=f"lf-lost-broadcast:{new_item.id}:u{recipient.id}")
            flash("Lost item reported. Every registered campus member has been notified.", "success")
        else:
            # A found item is listed publicly; alert the office so it can oversee handover.
            for admin_id in _admin_ids():
                _notify_registered_user(
                    admin_id,
                    title=f"Found item submitted: '{title}'",
                    message=(f"{user.full_name} reported finding '{title}' ({category}) near "
                             f"{location_reported}. It is now listed in the public registry."),
                    category='admin',
                    link_url=url_for('lost_found.item_detail', item_id=new_item.id),
                    dedup_key=f"lf-found-submitted:{new_item.id}:u{admin_id}")
            flash("Found item reported. It is now listed publicly for the owner to find.", "success")

        AuditLog.log(action='LF_REPORT_SUBMITTED', module='LOST_FOUND', user_id=user.id,
                     details=f"{report_type.upper()} report '{title}' at {location_reported}.",
                     ip_address=request.remote_addr)
        db.session.commit()

        return redirect(url_for('lost_found.item_detail', item_id=new_item.id))

    categories = ['Electronics', 'ID Cards & Docs', 'Books & Stationery', 'Personal Items', 'Valuables', 'Other']
    return render_template('lost_found/report.html', user=user, categories=categories)

@lost_found_bp.route('/item/<int:item_id>')
def item_detail(item_id):
    """View an item's details. Among registered campus members the reporter's name
    and contact are shown publicly so a finder and the owner can coordinate the
    return directly. Visitors and anonymous viewers get the report content but not
    the member's private identity or contact."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)

    is_owner = bool(user and user.id == item.user_id)
    is_admin = bool(user and user.has_module_permission('lost_found', 'reports:view'))
    is_member = bool(user and user.role != 'visitor' and user.is_active)

    # Contact is shown publicly to registered members by default so owners and
    # finders can coordinate. A reporter may opt out in Settings; visitors and
    # anonymous viewers never see the member's private contact.
    contact_public = bool(
        (item.reporter is None or item.reporter.reveals_contact_to_matches())
        and (is_member or is_owner or is_admin))

    # A registered, signed-in non-owner can tell the loser they found the item.
    can_report_found = bool(
        user and not is_owner and user.role != 'visitor' and user.is_active
        and item.report_type == 'lost' and item.status in ('open', 'matched'))

    # The owner sees that claims exist; claim proof statements are admin-only.
    claims = []
    if is_owner or is_admin:
        claims = LostFoundClaim.query.filter_by(item_id=item.id).order_by(LostFoundClaim.created_at.desc()).all()

    my_pending_claim = None
    if user:
        my_pending_claim = LostFoundClaim.query.filter_by(item_id=item.id, claimant_id=user.id, status='pending').first()

    return render_template(
        'lost_found/detail.html',
        user=user, item=item, claims=claims,
        is_owner=is_owner, is_admin=is_admin,
        can_report_found=can_report_found,
        contact_public=contact_public,
        is_member=is_member,
        my_pending_claim=my_pending_claim)

@lost_found_bp.route('/item/<int:item_id>/claim', methods=['POST'])
@login_required
@restrict_visitors
def claim_item(item_id):
    """PHASE 4: formal ownership claim - requires a proof statement and admin verification."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)

    proof_statement = request.form.get('proof_statement', '').strip()
    if len(proof_statement) < 15:
        flash("Please describe why this item belongs to you (at least 15 characters). Your statement stays private and is reviewed only by campus administration.", "warning")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    if item.user_id == user.id:
        flash("You cannot claim your own report.", "danger")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    if item.status == 'closed':
        flash("This item has already been returned to its owner.", "info")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    existing = LostFoundClaim.query.filter_by(item_id=item.id, claimant_id=user.id, status='pending').first()
    if existing:
        flash("You already have a pending claim on this item awaiting verification.", "info")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    claim = LostFoundClaim(item_id=item.id, claimant_id=user.id, proof_statement=proof_statement, status='pending')
    db.session.add(claim)
    item.status = 'claimed'
    item.claimed_by_user_id = user.id

    # Notify only the involved parties: the finder/reporter and campus administration
    Notification.notify(
        item.user_id,
        title=f"Someone claimed the '{item.title}' you reported",
        message=(f"A claim was submitted for the item you reported as '{item.title}'. "
                 "Campus administration will verify ownership before handover. "
                 "Please keep the physical item secure until contacted."),
        category='claim',
        link_url=url_for('lost_found.item_detail', item_id=item.id))
    for admin_id in _admin_ids():
        Notification.notify(
            admin_id,
            title="New ownership claim awaiting verification",
            message=(f"User '{user.full_name}' claimed the report '{item.title}' "
                     f"({item.report_type.upper()}). Review the private proof statement and verify."),
            category='claim',
            link_url=url_for('admin.manage_lost_found'))

    AuditLog.log(action='LF_CLAIM_SUBMITTED', module='LOST_FOUND', user_id=user.id,
                 details=f"Claim #{claim.id if claim.id else 'new'} on item '{item.title}' (id {item.id}).",
                 ip_address=request.remote_addr)
    db.session.commit()

    flash("Claim submitted. Campus administration has been notified and will verify ownership before any handover.", "success")
    return redirect(url_for('lost_found.item_detail', item_id=item.id))

@lost_found_bp.route('/item/<int:item_id>/found', methods=['POST'])
@login_required
@restrict_visitors
def report_found(item_id):
    """A registered member who has located a lost item notifies its owner directly,
    sharing their own contact details publicly so the two can arrange the return."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)

    if item.report_type != 'lost':
        flash("This is not an open lost-item report.", "info")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))
    if item.user_id == user.id:
        flash("This is your own report.", "info")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))
    if item.status == 'closed':
        flash("This item has already been returned to its owner.", "info")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    contact = (request.form.get('contact') or '').strip() or user.phone or user.email or 'reply via the portal'
    where = (request.form.get('found_location') or '').strip()
    note = (request.form.get('note') or '').strip()
    finder_role = (user.designation or user.department or user.role.replace('_', ' ').title())

    lines = [f"{user.full_name} ({finder_role}) says they have found your lost item '{item.title}'."]
    if where:
        lines.append(f"They found it near {where}.")
    lines.append(f"You can reach them at: {contact}")
    if note:
        lines.append(f"Message: {note}")
    lines.append("Please arrange a safe place to collect your item.")

    _notify_registered_user(
        item.user_id,
        title=f"{user.full_name} found your item '{item.title}'",
        message="\n".join(lines),
        category='found',
        link_url=url_for('lost_found.item_detail', item_id=item.id),
        dedup_key=f"lf-found-tip:{item.id}:u{user.id}")

    # Let campus administration oversee the handover too.
    for admin_id in _admin_ids():
        _notify_registered_user(
            admin_id,
            title=f"A find was reported for '{item.title}'",
            message=(f"{user.full_name} notified the owner of lost item '{item.title}' "
                     f"with contact {contact}. Confirm the handover once it is complete."),
            category='admin',
            link_url=url_for('lost_found.item_detail', item_id=item.id),
            dedup_key=f"lf-found-tip-admin:{item.id}:u{user.id}:a{admin_id}")

    if item.status == 'open':
        item.status = 'matched'
    item.resolution_note = f"Found reported by {user.full_name} ({contact})."

    AuditLog.log(action='LF_FOUND_REPORTED', module='LOST_FOUND', user_id=user.id,
                 details=f"{user.full_name} reported finding lost item '{item.title}' (id {item.id}).",
                 ip_address=request.remote_addr)
    db.session.commit()

    flash("Thanks! The owner has been notified with your contact details.", "success")
    return redirect(url_for('lost_found.item_detail', item_id=item.id))

@lost_found_bp.route('/item/<int:item_id>/photo/delete', methods=['POST'])
@login_required
@restrict_visitors
def delete_item_photo(item_id):
    """Remove only the uploaded photo from a report. Owner or Main Admin."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)

    if not (user.id == item.user_id or user.has_module_permission('lost_found', 'reports:edit')):
        flash("You can only manage photos of reports you filed.", "danger")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    if not item.photo_url:
        flash("This report has no photo to delete.", "info")
        return redirect(request.referrer or url_for('lost_found.item_detail', item_id=item.id))

    filename = os.path.basename(item.photo_url)
    photo_path = Path(current_app.root_path) / 'static' / 'uploads' / 'lost_found' / filename
    try:
        if photo_path.exists():
            photo_path.unlink()
    except OSError:
        current_app.logger.warning(f"Could not delete lost & found photo: {photo_path}")

    item.photo_url = None
    db.session.commit()

    AuditLog.log(action='LF_PHOTO_DELETED', module='LOST_FOUND', user_id=user.id,
                 details=f"Removed photo '{filename}' from report '{item.title}' (id {item.id}).",
                 ip_address=request.remote_addr)

    flash("Photo deleted from this report.", "success")
    return redirect(request.referrer or url_for('lost_found.item_detail', item_id=item.id))

@lost_found_bp.route('/item/<int:item_id>/delete', methods=['POST'])
@login_required
@restrict_visitors
def delete_item(item_id):
    """Delete a report and its uploaded photo. Allowed for the report owner or Lost & Found Admin,
    until the item has been officially returned (status 'closed')."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)

    is_admin = user.has_module_permission('lost_found', 'reports:delete')
    if not (user.id == item.user_id or is_admin):
        flash("You can only delete reports that you filed.", "danger")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    if item.status == 'closed' and not is_admin:
        flash("This report is already closed and the item was returned - it cannot be deleted.", "warning")
        return redirect(url_for('lost_found.item_detail', item_id=item.id))

    # Remove the uploaded photo from disk (DB stores /static/uploads/lost_found/<file>)
    if item.photo_url:
        filename = os.path.basename(item.photo_url)
        photo_path = Path(current_app.root_path) / 'static' / 'uploads' / 'lost_found' / filename
        try:
            if photo_path.exists():
                photo_path.unlink()
        except OSError:
            current_app.logger.warning(f"Could not delete lost & found photo: {photo_path}")

    # Reports flagged as duplicates of this one revert to normal reports
    LostFoundItem.query.filter_by(duplicate_of_id=item.id).update({'is_duplicate': False, 'duplicate_of_id': None})

    # Remove dependent rows explicitly (ORM relationships have no delete cascade)
    LostFoundClaim.query.filter_by(item_id=item.id).delete()
    LostFoundMatch.query.filter(
        (LostFoundMatch.lost_item_id == item.id) | (LostFoundMatch.found_item_id == item.id)
    ).delete(synchronize_session=False)

    title = item.title
    deleted_id = item.id
    db.session.delete(item)
    db.session.commit()

    AuditLog.log(action='LF_REPORT_DELETED', module='LOST_FOUND', user_id=user.id,
                 details=f"Deleted lost/found report '{title}' (id {deleted_id}) including its photo.",
                 ip_address=request.remote_addr)

    flash(f"Report '{title}' and its photo were deleted.", "success")
    return redirect(url_for('lost_found.my_reports'))

@lost_found_bp.route('/my-reports')
@login_required
def my_reports():
    """Phase 4: personal dashboard of the user's reports, matches and claim outcomes."""
    user = get_current_user()
    items = LostFoundItem.query.filter_by(user_id=user.id).order_by(LostFoundItem.date_time_reported.desc()).all()
    claims = LostFoundClaim.query.filter_by(claimant_id=user.id).order_by(LostFoundClaim.created_at.desc()).all()
    return render_template('lost_found/my_reports.html', user=user, items=items, claims=claims)
