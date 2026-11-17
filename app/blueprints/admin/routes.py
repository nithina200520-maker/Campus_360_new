import csv
import io
from pathlib import Path
from datetime import date, datetime, time, timedelta
from sqlalchemy import text as sql_text
from werkzeug.utils import secure_filename
from flask import render_template, request, redirect, url_for, flash, current_app, Response
from app.blueprints.admin import admin_bp
from app.models import (
    User, NavigationNode, NavigationEdge, CampusFloorPlan, LostFoundItem, LostFoundClaim,
    Notification, CanteenCategory, CanteenItem, CanteenOrder, CanteenOrderItem,
    Payment, Refund, AuditLog, ExamSchedule, AdminAssignment, AdminModule,
)
from app.admin_registry import DEFAULT_MODULE_PERMISSIONS, seed_default_modules
from app.database import db
from app.utils.auth_helpers import role_required, get_current_user
from app.utils.image_matcher import validate_image_bytes

ALLOWED_PHOTO_EXT = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_UPLOAD_PHOTO_BYTES = 8 * 1024 * 1024
ALLOWED_DOC_EXT = {'pdf', 'png', 'jpg', 'jpeg', 'webp'}
MAX_UPLOAD_DOC_BYTES = 10 * 1024 * 1024
EXAM_DAY_PARTS = ('Morning', 'Afternoon', 'Evening')
# Branch codes shown as columns in the column-wise bulk entry (single source of
# truth lives in ExamSchedule.BRANCH_CATALOG).
EXAM_BRANCHES = ExamSchedule.BRANCH_ORDER

def _deny_scoped_admin_access(user, module):
    AuditLog.log(
        action='ACCESS_DENIED_ROLE',
        module=module.upper(),
        user_id=user.id,
        details=f"User '{user.email}' (admin_scope={user.admin_scope}) was denied access to {module} administration.",
        ip_address=request.remote_addr
    )
    flash("Access denied: this data belongs to a different administration module.", "danger")
    return redirect(url_for('main.index'))

NODE_CSV_TEMPLATE = """node_code,name,building,floor,category,description,x_coord,y_coord,photo_url,is_panoramic,is_accessible,is_sample_data
NODE_EXAMPLE_1,Sample Classroom 101,Academic Block A,Ground Floor,Classroom,Imported via Phase 3 template,420,300,,False,True,True
NODE_EXAMPLE_2,Sample Corridor A,Academic Block A,Ground Floor,Corridor,Corridor connecting rooms,360,300,/static/uploads/navigation/corridor.jpg,False,True,True
"""

EDGE_CSV_TEMPLATE = """source_node_code,target_node_code,distance_meters,direction_hint,is_bidirectional,is_sample_data
NODE_EXAMPLE_1,NODE_EXAMPLE_2,15,Walk straight along the corridor,True,True
"""

FLOORPLAN_CSV_TEMPLATE = """building,floor,title,image_url,is_sample_data
Academic Block A,Ground Floor,Block A Ground Floor Plan,/static/uploads/navigation/block_a_gf_plan.png,True
"""

EXAM_CSV_TEMPLATE = """subject_code,subject_name,exam_date,start_time,end_time,session,room_node_code,room_number,audience_role,department,semester,instructions
21CS401,Data Structures,2026-11-10,09:30,12:00,Morning,NODE_CLASS_101,A-101,student,CSE,3rd Sem,Report 30 minutes early with hall ticket
"""

def _save_exam_attachment(file):
    """Store an optional exam notice/timetable document (PDF or image) under
    static/uploads/exam and return (web_url, safe_original_name). True content is
    validated (PDF magic bytes or real image), never the extension alone."""
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_DOC_EXT:
        return None, None
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_UPLOAD_DOC_BYTES:
        return None, None
    head = file.read(5)
    file.seek(0)
    if ext == 'pdf':
        if head != b'%PDF-':
            return None, None
    elif not validate_image_bytes(file):
        return None, None
    filename = secure_filename(f"exam_{int(datetime.utcnow().timestamp())}_{file.filename}")
    upload_dir = Path(current_app.root_path) / "static" / "uploads" / "exam"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file.save(upload_dir / filename)
    return f"/static/uploads/exam/{filename}", secure_filename(file.filename)

def _parse_hhmm(value):
    """Parse 'HH:MM' or 'HH:MM:SS' into a datetime.time (None when malformed)."""
    value = (value or '').strip()
    for fmt in ('%H:%M', '%H:%M:%S'):
        try:
            return datetime.strptime(value, fmt).time()
        except ValueError:
            continue
    return None

def _save_navigation_photo(file):
    """Stores an uploaded navigation photograph under static/uploads/navigation and returns its web URL.
    Phase 10 SECURITY: same discipline as every other upload surface - true image content
    (magic bytes) validation and an 8 MB cap, never the file extension alone."""
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_PHOTO_EXT:
        return None
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_UPLOAD_PHOTO_BYTES:
        return None
    if not validate_image_bytes(file):
        return None
    filename = secure_filename(f"nav_{int(datetime.utcnow().timestamp())}_{file.filename}")
    upload_dir = Path(current_app.root_path) / "static" / "uploads" / "navigation"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file.save(upload_dir / filename)
    return f"/static/uploads/navigation/{filename}"

@admin_bp.route('/dashboard')
@role_required('main_admin')
def dashboard():
    """Main Admin master command center controlling all 3 modules."""
    user = get_current_user()

    total_users = User.query.count()
    pending_teachers_count = User.query.filter_by(role='teacher', is_verified=False).count()
    total_nodes = NavigationNode.query.count()
    total_edges = NavigationEdge.query.count()
    total_lf_items = LostFoundItem.query.count()
    open_lf_items = LostFoundItem.query.filter_by(status='open').count()
    total_orders = CanteenOrder.query.count()
    total_revenue = db.session.query(db.func.sum(CanteenOrder.total_amount)).filter_by(payment_status='paid').scalar() or 0.0

    # PHASE 8: unified cross-module indicators (all computed live from the DB)
    published_nodes = NavigationNode.query.filter_by(is_published=True).count()
    pending_claims = LostFoundClaim.query.filter_by(status='pending').count()
    refunds_open = Refund.query.filter(Refund.status.in_(('requested', 'processing', 'failed'))).count()
    payments_captured = float(db.session.query(db.func.sum(Payment.amount)).filter(
        Payment.status.in_(('succeeded', 'partially_refunded'))).scalar() or 0.0)
    low_stock_items = CanteenItem.query.filter(
        CanteenItem.is_available.is_(True), CanteenItem.stock_quantity <= 5).count()
    priority_orders = CanteenOrder.query.filter_by(is_priority=True).count()

    recent_audits = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_users = User.query.order_by(User.created_at.desc()).limit(6).all()
    pending_teachers = User.query.filter_by(role='teacher', is_verified=False).limit(5).all()

    stats = {
        "total_users": total_users,
        "pending_teachers_count": pending_teachers_count,
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "total_lf_items": total_lf_items,
        "open_lf_items": open_lf_items,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        # Phase 8 central control additions
        "published_nodes": published_nodes,
        "pending_claims": pending_claims,
        "refunds_open": refunds_open,
        "payments_captured": payments_captured,
        "low_stock_items": low_stock_items,
        "priority_orders": priority_orders,
    }

    return render_template(
        'admin/dashboard.html',
        user=user,
        stats=stats,
        recent_audits=recent_audits,
        recent_users=recent_users,
        pending_teachers=pending_teachers
    )

@admin_bp.route('/users')
@role_required('main_admin')
def users_list():
    """User account management table with role assignment and verification filters."""
    user = get_current_user()
    role_filter = request.args.get('role')
    status_filter = request.args.get('status')
    pending_only = request.args.get('pending') == '1'

    query = User.query.order_by(User.created_at.desc())

    if role_filter:
        query = query.filter_by(role=role_filter)

    if status_filter == 'active':
        query = query.filter_by(is_active=True)
    elif status_filter == 'inactive':
        query = query.filter_by(is_active=False)

    if pending_only:
        query = query.filter_by(role='teacher', is_verified=False)

    users = query.all()
    pending_teachers_count = User.query.filter_by(role='teacher', is_verified=False).count()

    return render_template(
        'admin/users.html',
        user=user,
        users=users,
        pending_teachers_count=pending_teachers_count,
        current_role=role_filter,
        current_status=status_filter,
        pending_only=pending_only
    )

@admin_bp.route('/users/<int:user_id>/verify-teacher', methods=['POST'])
@role_required('main_admin')
def verify_teacher(user_id):
    """Verifies a teacher account, unlocking Teacher-First Priority queue status."""
    admin_user = get_current_user()
    target_user = User.query.get_or_404(user_id)

    if target_user.role != 'teacher':
        flash("Target user is not a teacher account.", "warning")
        return redirect(url_for('admin.users_list'))

    target_user.is_verified = True
    db.session.commit()

    AuditLog.log(
        action='TEACHER_VERIFIED',
        module='ADMIN',
        user_id=target_user.id,
        details=f"Main Admin '{admin_user.full_name}' verified faculty credentials for '{target_user.full_name}' (Emp ID: {target_user.usn_or_emp_id}). Priority queue active.",
        ip_address=request.remote_addr
    )

    flash(f"Success! Faculty credentials approved for {target_user.full_name}. Teacher-First Priority queue is now UNLOCKED.", "success")
    return redirect(request.referrer or url_for('admin.users_list'))

@admin_bp.route('/users/<int:user_id>/revoke-teacher', methods=['POST'])
@role_required('main_admin')
def revoke_teacher(user_id):
    """Revokes teacher verification status, resetting to standard queue."""
    admin_user = get_current_user()
    target_user = User.query.get_or_404(user_id)

    target_user.is_verified = False
    db.session.commit()

    AuditLog.log(
        action='TEACHER_VERIFICATION_REVOKED',
        module='ADMIN',
        user_id=target_user.id,
        details=f"Main Admin '{admin_user.full_name}' revoked teacher verification for '{target_user.full_name}'.",
        ip_address=request.remote_addr
    )

    flash(f"Teacher verification revoked for {target_user.full_name}. Reverted to standard queue.", "warning")
    return redirect(request.referrer or url_for('admin.users_list'))

@admin_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@role_required('main_admin')
def toggle_user_status(user_id):
    """Toggle active/suspended status for a user."""
    admin_user = get_current_user()
    target_user = User.query.get_or_404(user_id)

    if target_user.role == 'main_admin':
        flash("Cannot suspend Main Admin accounts.", "danger")
        return redirect(url_for('admin.users_list'))

    target_user.is_active = not target_user.is_active
    db.session.commit()

    action = "activated" if target_user.is_active else "suspended"
    action_type = "USER_ACTIVATED" if target_user.is_active else "USER_DEACTIVATED"

    AuditLog.log(
        action=action_type,
        module='ADMIN',
        user_id=target_user.id,
        details=f"Main Admin '{admin_user.full_name}' {action} account '{target_user.email}'.",
        ip_address=request.remote_addr
    )

    flash(f"Account for {target_user.full_name} has been {action}.", "success")
    return redirect(request.referrer or url_for('admin.users_list'))

@admin_bp.route('/users/<int:user_id>/change-role', methods=['POST'])
@role_required('main_admin')
def change_user_role(user_id):
    """Modify role for a user."""
    admin_user = get_current_user()
    target_user = User.query.get_or_404(user_id)
    new_role = request.form.get('new_role')
    
    if new_role in ['canteen_admin', 'teacher', 'student', 'visitor'] and target_user.role != 'main_admin':
        old_role = target_user.role
        target_user.role = new_role
        if old_role != new_role:
            target_user.admin_scope = None
            for assignment in AdminAssignment.query.filter_by(user_id=target_user.id).all():
                assignment.status = 'revoked'
                assignment.revoked_at = datetime.utcnow()
        # If changing to teacher, set verified to False unless already verified
        if new_role == 'teacher' and old_role != 'teacher':
            target_user.is_verified = False
        db.session.commit()

        AuditLog.log(
            action='USER_ROLE_CHANGED',
            module='ADMIN',
            user_id=target_user.id,
            details=f"Main Admin '{admin_user.full_name}' changed role of '{target_user.email}' from {old_role} to {new_role}.",
            ip_address=request.remote_addr
        )

        flash(f"Role updated from {old_role} to {new_role} for {target_user.full_name}.", "success")
    else:
        flash("Invalid role specified.", "danger")

    return redirect(request.referrer or url_for('admin.users_list'))

@admin_bp.route('/users/<int:user_id>/admin-scope', methods=['POST'])
@role_required('main_admin')
def change_user_admin_scope(user_id):
    """Assign or revoke one module-specific admin role without replacing the base role."""
    admin_user = get_current_user()
    target_user = User.query.get_or_404(user_id)
    scope = request.form.get('admin_scope', '').strip().lower()
    valid_scopes = {'', 'lost_found', 'navigation', 'canteen'}

    if scope not in valid_scopes:
        flash("Invalid module admin role.", "danger")
        return redirect(request.referrer or url_for('admin.users_list'))

    if scope and target_user.role not in ('student', 'teacher'):
        flash("Module admin access can only be assigned to a student or faculty account.", "warning")
        return redirect(request.referrer or url_for('admin.users_list'))

    if scope == 'lost_found' and target_user.role != 'teacher':
        flash("Lost & Found Admin access can only be assigned to faculty accounts.", "warning")
        return redirect(request.referrer or url_for('admin.users_list'))

    previous_scope = target_user.admin_scope
    seed_default_modules()
    target_user.admin_scope = scope or None
    if previous_scope and previous_scope != scope:
        previous_module = AdminModule.query.filter_by(key=previous_scope).first()
        if previous_module:
            previous_assignment = AdminAssignment.query.filter_by(
                user_id=target_user.id, module_id=previous_module.id,
            ).first()
            if previous_assignment:
                previous_assignment.status = 'revoked'
                previous_assignment.revoked_at = datetime.utcnow()
    if scope:
        module = AdminModule.query.filter_by(key=scope).first()
        assignment = AdminAssignment.query.filter_by(
            user_id=target_user.id, module_id=module.id,
        ).first()
        if assignment:
            assignment.status = 'active'
            assignment.revoked_at = None
            assignment.assigned_by_id = admin_user.id
        else:
            assignment = AdminAssignment(
                user_id=target_user.id, module_id=module.id,
                status='active', assigned_by_id=admin_user.id,
            )
            assignment.permissions = list(DEFAULT_MODULE_PERMISSIONS)
            db.session.add(assignment)
    db.session.commit()

    AuditLog.log(
        action='USER_ADMIN_SCOPE_CHANGED',
        module='ADMIN',
        user_id=target_user.id,
        actor_id=admin_user.id,
        target_user_id=target_user.id,
        details=f"Main Admin '{admin_user.full_name}' changed module admin scope for "
                f"'{target_user.email}' from '{previous_scope or 'none'}' to '{scope or 'none'}'.",
        ip_address=request.remote_addr
    )
    flash(f"Module admin access updated for {target_user.full_name}.", "success")
    return redirect(request.referrer or url_for('admin.users_list'))

@admin_bp.route('/create-canteen-admin', methods=['GET', 'POST'])
@role_required('main_admin')
def create_canteen_admin():
    """Main Admin capability to create dedicated Canteen Admin accounts."""
    admin_user = get_current_user()

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        department = request.form.get('department', 'Campus Dining & Canteen Operations').strip()
        phone = request.form.get('phone', '').strip()

        if not full_name or not email or not password:
            flash("All fields are required to provision a Canteen Admin.", "warning")
            return render_template('admin/create_canteen_admin.html', user=admin_user)

        if len(password) < 8:
            flash("Password must be at least 8 characters long.", "warning")
            return render_template('admin/create_canteen_admin.html', user=admin_user)

        existing = User.query.filter_by(email=email).first()
        if existing:
            flash(f"An account with email '{email}' already exists.", "danger")
            return render_template('admin/create_canteen_admin.html', user=admin_user)

        canteen_admin = User(
            full_name=full_name,
            email=email,
            role='canteen_admin',
            department=department,
            phone=phone,
            is_verified=True,
            is_active=True
        )
        canteen_admin.set_password(password)
        db.session.add(canteen_admin)
        db.session.commit()

        AuditLog.log(
            action='CANTEEN_ADMIN_CREATED',
            module='ADMIN',
            user_id=canteen_admin.id,
            details=f"Main Admin '{admin_user.full_name}' provisioned Canteen Admin '{canteen_admin.email}'.",
            ip_address=request.remote_addr
        )

        flash(f"Canteen Admin account successfully created for '{full_name}' ({email})!", "success")
        return redirect(url_for('admin.users_list'))

    return render_template('admin/create_canteen_admin.html', user=admin_user)

@admin_bp.route('/audit-logs')
@role_required('main_admin')
def audit_logs():
    """Comprehensive searchable security and administrative audit log viewer."""
    user = get_current_user()
    module_filter = request.args.get('module')
    search_q = request.args.get('q', '').strip()

    query = AuditLog.query.order_by(AuditLog.created_at.desc())

    if module_filter:
        query = query.filter_by(module=module_filter)

    if search_q:
        query = query.filter(
            (AuditLog.action.ilike(f"%{search_q}%")) |
            (AuditLog.details.ilike(f"%{search_q}%"))
        )

    logs = query.limit(100).all()

    return render_template(
        'admin/audit_logs.html',
        user=user,
        logs=logs,
        current_module=module_filter,
        search_query=search_q
    )

# ---------------------------------------------------------------------------
# PHASE 3: SMART CAMPUS NAVIGATION - MAP, NODE, EDGE, FLOOR PLAN MANAGEMENT
# ---------------------------------------------------------------------------

@admin_bp.route('/navigation/manage')
@role_required(['main_admin', 'navigation_admin'])
def manage_navigation():
    """Main Admin map manager: buildings, floors, rooms, navigation points, photos and paths."""
    user = get_current_user()
    nodes = NavigationNode.query.order_by(NavigationNode.building.asc(), NavigationNode.floor.asc(), NavigationNode.name.asc()).all()
    edges = NavigationEdge.query.order_by(NavigationEdge.id.asc()).all()
    floor_plans = CampusFloorPlan.query.order_by(CampusFloorPlan.building.asc()).all()
    buildings = sorted(list(set(n.building for n in nodes)))
    floors = sorted(list(set(n.floor for n in nodes)))
    photos_count = sum(1 for n in nodes if n.photo_url)

    return render_template(
        'admin/manage_navigation.html',
        user=user,
        nodes=nodes,
        edges=edges,
        floor_plans=floor_plans,
        buildings=buildings,
        floors=floors,
        photos_count=photos_count
    )

@admin_bp.route('/navigation/node/create', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def create_nav_node():
    """Adds a navigation point (classroom, lab, HOD office, corridor, staircase...) with optional photo."""
    user = get_current_user()
    node_code = request.form.get('node_code', '').strip().upper()
    name = request.form.get('name', '').strip()
    building = request.form.get('building', '').strip()
    floor = request.form.get('floor', 'Ground Floor').strip()
    category = request.form.get('category', 'Classroom').strip()

    if not node_code or not name or not building:
        flash("Node code, name and building are required.", "danger")
        return redirect(url_for('admin.manage_navigation'))
    if NavigationNode.query.filter_by(node_code=node_code).first():
        flash(f"Node code '{node_code}' already exists. Choose a unique code.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    photo_file = request.files.get('photo')
    photo_url = request.form.get('photo_url', '').strip() or None
    if photo_file and photo_file.filename:
        saved_photo = _save_navigation_photo(photo_file)
        if saved_photo:
            photo_url = saved_photo
        else:
            flash("Photograph rejected: only real PNG/JPG/JPEG/WEBP/GIF images up to 8 MB are allowed.", "warning")

    node = NavigationNode(
        node_code=node_code,
        name=name,
        building=building,
        floor=floor,
        category=category,
        description=request.form.get('description', '').strip(),
        x_coord=int(request.form.get('x_coord') or 0),
        y_coord=int(request.form.get('y_coord') or 0),
        photo_url=photo_url,
        is_panoramic=bool(request.form.get('is_panoramic')),
        is_accessible=bool(request.form.get('is_accessible', 'on')),
        is_sample_data=bool(request.form.get('is_sample_data'))
    )
    db.session.add(node)
    db.session.commit()
    AuditLog.log(action='NAV_NODE_CREATED', module='NAVIGATION', user_id=user.id,
                 details=f"Created navigation node {node_code}: '{name}' ({building}, {floor}).", ip_address=request.remote_addr)
    flash(f"Navigation point '{name}' created.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/node/<int:node_id>/delete', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def delete_nav_node(node_id):
    node = NavigationNode.query.get_or_404(node_id)
    code, name = node.node_code, node.name
    db.session.delete(node)
    db.session.commit()
    AuditLog.log(action='NAV_NODE_DELETED', module='NAVIGATION', user_id=get_current_user().id,
                 details=f"Deleted navigation node {code}: '{name}'.", ip_address=request.remote_addr)
    flash(f"Navigation point '{name}' deleted along with its connections.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/node/<int:node_id>/update', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def update_nav_node(node_id):
    """PHASE 8: update room information, photograph and map position of a published point."""
    user = get_current_user()
    node = NavigationNode.query.get_or_404(node_id)

    for field, cleaner in (('name', str.strip), ('building', str.strip), ('floor', str.strip),
                           ('category', str.strip), ('description', str.strip)):
        value = request.form.get(field)
        if value is not None and (field in ('name', 'building') or value.strip()):
            setattr(node, field, cleaner(value))

    if request.form.get('x_coord') is not None:
        node.x_coord = int(request.form.get('x_coord') or 0)
    if request.form.get('y_coord') is not None:
        node.y_coord = int(request.form.get('y_coord') or 0)
    node.is_panoramic = bool(request.form.get('is_panoramic'))
    node.is_accessible = bool(request.form.get('is_accessible'))

    photo_file = request.files.get('photo')
    if photo_file and photo_file.filename:
        saved = _save_navigation_photo(photo_file)
        if saved:
            node.photo_url = saved
        else:
            flash("Photograph rejected: only real PNG/JPG/JPEG/WEBP/GIF images up to 8 MB are allowed.", "warning")

    db.session.commit()
    AuditLog.log(action='NAV_NODE_UPDATED', module='NAVIGATION', user_id=user.id,
                 details=f"Updated room/location info for node {node.node_code}: '{node.name}'.",
                 ip_address=request.remote_addr)
    flash(f"Location '{node.name}' updated.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/node/<int:node_id>/toggle-publish', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def toggle_nav_node_publish(node_id):
    """PHASE 8: publish / unpublish a campus location. Unpublished points vanish from
    the public map, node APIs and route finding until Main Admin publishes them."""
    user = get_current_user()
    node = NavigationNode.query.get_or_404(node_id)
    node.is_published = not node.is_published
    db.session.commit()
    state = 'PUBLISHED' if node.is_published else 'UNPUBLISHED'
    AuditLog.log(action='NAV_NODE_PUBLICATION_CHANGED', module='NAVIGATION', user_id=user.id,
                 details=f"{state} location {node.node_code}: '{node.name}'.",
                 ip_address=request.remote_addr)
    flash(f"Location '{node.name}' is now {'live on the campus map' if node.is_published else 'withdrawn from the public map'}.", "success")
    return redirect(request.referrer or url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/edge/create', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def create_nav_edge():
    """Defines a walkable connection between two navigation points."""
    source_id = request.form.get('source_node_id', type=int)
    target_id = request.form.get('target_node_id', type=int)
    distance = request.form.get('distance_meters', 15.0, type=float)
    hint = request.form.get('direction_hint', '').strip()
    bidirectional = bool(request.form.get('is_bidirectional'))

    if not source_id or not target_id or source_id == target_id:
        flash("Select two different points to connect.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    source = NavigationNode.query.get(source_id)
    target = NavigationNode.query.get(target_id)
    if not source or not target:
        flash("Unknown node selected.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    exists = NavigationEdge.query.filter_by(source_node_id=source_id, target_node_id=target_id).first()
    if exists:
        flash(f"A path from '{source.name}' to '{target.name}' already exists.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    edge = NavigationEdge(
        source_node_id=source_id, target_node_id=target_id,
        distance_meters=max(0.5, distance), direction_hint=hint or None,
        is_bidirectional=bidirectional,
        is_sample_data=bool(request.form.get('is_sample_data'))
    )
    db.session.add(edge)
    db.session.commit()
    AuditLog.log(action='NAV_EDGE_CREATED', module='NAVIGATION', user_id=get_current_user().id,
                 details=f"Connected '{source.name}' -> '{target.name}' ({distance}m).", ip_address=request.remote_addr)
    flash("Walkable path saved.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/edge/<int:edge_id>/delete', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def delete_nav_edge(edge_id):
    edge = NavigationEdge.query.get_or_404(edge_id)
    db.session.delete(edge)
    db.session.commit()
    AuditLog.log(action='NAV_EDGE_DELETED', module='NAVIGATION', user_id=get_current_user().id,
                 details=f"Removed walkable path #{edge_id}.", ip_address=request.remote_addr)
    flash("Path connection removed.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/edge/<int:edge_id>/update', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def update_nav_edge(edge_id):
    """Photo Route Guide: edit an existing connection's endpoints, distance (m) and direction."""
    user = get_current_user()
    edge = NavigationEdge.query.get_or_404(edge_id)
    source_id = request.form.get('source_node_id', type=int)
    target_id = request.form.get('target_node_id', type=int)
    distance = request.form.get('distance_meters', edge.distance_meters, type=float)
    hint = request.form.get('direction_hint', '').strip()
    bidirectional = bool(request.form.get('is_bidirectional'))

    if not source_id or not target_id or source_id == target_id:
        flash("Select two different points to connect.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    source = NavigationNode.query.get(source_id)
    target = NavigationNode.query.get(target_id)
    if not source or not target:
        flash("Unknown node selected.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    clash = NavigationEdge.query.filter(
        NavigationEdge.id != edge.id,
        NavigationEdge.source_node_id == source_id,
        NavigationEdge.target_node_id == target_id
    ).first()
    if clash:
        flash(f"A path from '{source.name}' to '{target.name}' already exists.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    edge.source_node_id = source_id
    edge.target_node_id = target_id
    edge.distance_meters = max(0.5, distance)
    edge.direction_hint = hint or None
    edge.is_bidirectional = bidirectional
    db.session.commit()
    AuditLog.log(action='NAV_EDGE_UPDATED', module='NAVIGATION', user_id=user.id,
                 details=f"Updated path #{edge.id}: '{source.name}' -> '{target.name}' ({edge.distance_meters}m).",
                 ip_address=request.remote_addr)
    flash("Walkable path updated.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/floorplan/create', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def create_floor_plan():
    """Main Admin uploads a digital floor plan image for a building/floor."""
    building = request.form.get('building', '').strip()
    floor = request.form.get('floor', 'Ground Floor').strip()
    title = request.form.get('title', '').strip()

    if not building or not title:
        flash("Building and title are required for a floor plan.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    image_url = request.form.get('image_url', '').strip() or None
    plan_file = request.files.get('plan_image')
    if plan_file and plan_file.filename:
        saved_plan = _save_navigation_photo(plan_file)
        if saved_plan:
            image_url = saved_plan
        else:
            flash("Floor plan image rejected: only real PNG/JPG/JPEG/WEBP/GIF images up to 8 MB are allowed.", "warning")

    plan = CampusFloorPlan(
        building=building, floor=floor, title=title,
        image_url=image_url,
        is_sample_data=bool(request.form.get('is_sample_data'))
    )
    db.session.add(plan)
    db.session.commit()
    AuditLog.log(action='NAV_FLOORPLAN_UPLOADED', module='NAVIGATION', user_id=get_current_user().id,
                 details=f"Uploaded floor plan '{title}' for {building} ({floor}).", ip_address=request.remote_addr)
    flash(f"Floor plan '{title}' saved.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/floorplan/<int:plan_id>/delete', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def delete_floor_plan(plan_id):
    plan = CampusFloorPlan.query.get_or_404(plan_id)
    title = plan.title
    db.session.delete(plan)
    db.session.commit()
    AuditLog.log(action='NAV_FLOORPLAN_DELETED', module='NAVIGATION', user_id=get_current_user().id,
                 details=f"Deleted floor plan '{title}'.", ip_address=request.remote_addr)
    flash(f"Floor plan '{title}' deleted.", "success")
    return redirect(url_for('admin.manage_navigation'))

@admin_bp.route('/navigation/template/<kind>')
@role_required(['main_admin', 'navigation_admin'])
def download_import_template(kind):
    """Serves CSV import templates for nodes, edges and floor plans."""
    user = get_current_user()
    if kind == 'exams' and user.role != 'main_admin':
        return _deny_scoped_admin_access(user, 'exam')

    templates = {
        'nodes': ('navigation_nodes_template.csv', NODE_CSV_TEMPLATE),
        'edges': ('navigation_edges_template.csv', EDGE_CSV_TEMPLATE),
        'floorplans': ('floor_plans_template.csv', FLOORPLAN_CSV_TEMPLATE),
        'exams': ('exam_schedule_template.csv', EXAM_CSV_TEMPLATE),
    }
    if kind not in templates:
        flash("Unknown template type.", "danger")
        return redirect(url_for('admin.manage_navigation'))
    filename, content = templates[kind]
    return Response(content, mimetype='text/csv',
                    headers={'Content-Disposition': f'attachment; filename={filename}'})

def _csv_row_to_bool(value, default=False):
    return str(value).strip().lower() in ('true', '1', 'yes', 'y') if value not in (None, '') else default

@admin_bp.route('/navigation/import', methods=['POST'])
@admin_bp.route('/navigation/import/<kind>', methods=['POST'])
@role_required(['main_admin', 'navigation_admin'])
def import_navigation_data(kind=None):
    """Bulk-imports campus data (nodes / edges / floor plans) from an uploaded CSV file."""
    user = get_current_user()
    kind = kind or request.form.get('kind', 'nodes')
    if kind == 'exams' and user.role != 'main_admin':
        return _deny_scoped_admin_access(user, 'exam')

    file = request.files.get('csv_file')
    if not file or not file.filename.lower().endswith('.csv'):
        flash("A .csv file is required for data import.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    try:
        rows = list(csv.DictReader(io.StringIO(file.read().decode('utf-8-sig'))))
    except Exception as exc:
        flash(f"Could not read CSV file: {exc}", "danger")
        return redirect(url_for('admin.manage_navigation'))

    created, skipped = 0, 0

    if kind == 'nodes':
        for row in rows:
            code = (row.get('node_code') or '').strip().upper()
            if not code or not (row.get('name') or '').strip() or not (row.get('building') or '').strip():
                skipped += 1
                continue
            if NavigationNode.query.filter_by(node_code=code).first():
                skipped += 1
                continue
            try:
                # Phase 10: per-row SAVEPOINT - one malformed or duplicated row
                # can never abort (or half-commit) the whole import transaction.
                with db.session.begin_nested():
                    db.session.add(NavigationNode(
                        node_code=code, name=row['name'].strip(), building=row['building'].strip(),
                        floor=(row.get('floor') or 'Ground Floor').strip(),
                        category=(row.get('category') or 'Classroom').strip(),
                        description=(row.get('description') or '').strip(),
                        x_coord=int(row.get('x_coord') or 0), y_coord=int(row.get('y_coord') or 0),
                        photo_url=(row.get('photo_url') or '').strip() or None,
                        is_panoramic=_csv_row_to_bool(row.get('is_panoramic')),
                        is_accessible=_csv_row_to_bool(row.get('is_accessible'), True),
                        is_sample_data=_csv_row_to_bool(row.get('is_sample_data'), True)
                    ))
                created += 1
            except Exception:
                skipped += 1
    elif kind == 'edges':
        node_map = {n.node_code: n.id for n in NavigationNode.query.all()}
        for row in rows:
            src = node_map.get((row.get('source_node_code') or '').strip().upper())
            dst = node_map.get((row.get('target_node_code') or '').strip().upper())
            if not src or not dst or src == dst or NavigationEdge.query.filter_by(source_node_id=src, target_node_id=dst).first():
                skipped += 1
                continue
            try:
                with db.session.begin_nested():
                    db.session.add(NavigationEdge(
                        source_node_id=src, target_node_id=dst,
                        distance_meters=float(row.get('distance_meters') or 15.0),
                        direction_hint=(row.get('direction_hint') or '').strip() or None,
                        is_bidirectional=_csv_row_to_bool(row.get('is_bidirectional'), True),
                        is_sample_data=_csv_row_to_bool(row.get('is_sample_data'), True)
                    ))
                created += 1
            except Exception:
                skipped += 1
    elif kind == 'floorplans':
        for row in rows:
            building = (row.get('building') or '').strip()
            title = (row.get('title') or '').strip()
            if not building or not title:
                skipped += 1
                continue
            try:
                with db.session.begin_nested():
                    db.session.add(CampusFloorPlan(
                        building=building, floor=(row.get('floor') or 'Ground Floor').strip(),
                        title=title, image_url=(row.get('image_url') or '').strip() or None,
                        is_sample_data=_csv_row_to_bool(row.get('is_sample_data'), True)
                    ))
                created += 1
            except Exception:
                skipped += 1
    else:
        flash("Unknown import type.", "danger")
        return redirect(url_for('admin.manage_navigation'))

    db.session.commit()
    AuditLog.log(action='NAV_DATA_IMPORTED', module='NAVIGATION', user_id=user.id,
                 details=f"Imported {kind} CSV: {created} created, {skipped} skipped.", ip_address=request.remote_addr)
    flash(f"Import finished: {created} {kind} record(s) created, {skipped} skipped.", "success")
    return redirect(url_for('admin.manage_navigation'))

# ---------------------------------------------------------------------------
# PHASE 4: LOST & FOUND ADMINISTRATION - review, verify, disputes, returns
# ---------------------------------------------------------------------------

@admin_bp.route('/lost-found')
@role_required(['main_admin', 'lost_found_admin'])
def manage_lost_found():
    """Main Admin Lost & Found command center: reports, claims queue, notification history."""
    user = get_current_user()
    status_f = request.args.get('status')
    query = LostFoundItem.query.order_by(LostFoundItem.date_time_reported.desc())
    if status_f in ('open', 'matched', 'claimed', 'closed'):
        query = query.filter_by(status=status_f)
    items = query.all()
    pending_claims = LostFoundClaim.query.filter_by(status='pending').order_by(LostFoundClaim.created_at.desc()).all()
    recent_notifications = Notification.query.order_by(Notification.created_at.desc()).limit(60).all()
    reporters = User.query.filter(
        User.is_active.is_(True), User.role.in_(('student', 'teacher'))
    ).order_by(User.full_name.asc()).all()
    stats = {
        'open': LostFoundItem.query.filter_by(status='open').count(),
        'claimed': LostFoundItem.query.filter_by(status='claimed').count(),
        'returned': LostFoundItem.query.filter_by(status='closed').count(),
        'pending_claims': len(pending_claims),
        'duplicate_reports': LostFoundItem.query.filter_by(is_duplicate=True).count(),
    }
    return render_template('admin/lost_found.html', user=user, items=items,
                           pending_claims=pending_claims, notifications=recent_notifications,
                           reporters=reporters, stats=stats, current_status=status_f)

@admin_bp.route('/lost-found/item/create', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_create_item():
    """Create a Lost & Found report for an active, registered campus member."""
    admin = get_current_user()
    reporter_id = request.form.get('reporter_id', type=int)
    reporter = User.query.filter(
        User.id == reporter_id,
        User.is_active.is_(True),
        User.role.in_(('student', 'teacher'))
    ).first() if reporter_id else None
    report_type = request.form.get('report_type', '').strip().lower()
    title = request.form.get('title', '').strip()
    category = request.form.get('category', '').strip()
    location = request.form.get('location_reported', '').strip()
    description = request.form.get('description', '').strip()
    valid_categories = {
        'Electronics', 'ID Cards & Docs', 'Books & Stationery',
        'Personal Items', 'Valuables', 'Other'
    }

    if not reporter:
        flash("Choose an active student or faculty member as the report owner.", "warning")
        return redirect(url_for('admin.manage_lost_found'))
    if report_type not in ('lost', 'found') or not title or not location or not description:
        flash("Report type, title, location, and description are required.", "warning")
        return redirect(url_for('admin.manage_lost_found'))
    if category not in valid_categories:
        flash("Choose a valid Lost & Found category.", "warning")
        return redirect(url_for('admin.manage_lost_found'))

    item = LostFoundItem(
        user_id=reporter.id,
        report_type=report_type,
        title=title,
        category=category,
        location_reported=location,
        description=description,
        contact_phone=request.form.get('contact_phone', '').strip() or reporter.phone,
        date_time_reported=datetime.utcnow(),
        status='open'
    )
    db.session.add(item)
    db.session.commit()
    AuditLog.log(
        action='LF_ADMIN_REPORT_CREATED',
        module='LOST_FOUND',
        user_id=admin.id,
        details=f"{admin.full_name} created a {report_type.upper()} report '{title}' for {reporter.email}.",
        ip_address=request.remote_addr
    )
    flash(f"Lost & Found report '{title}' created.", "success")
    return redirect(url_for('admin.manage_lost_found'))

@admin_bp.route('/lost-found/item/<int:item_id>/edit', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_edit_item(item_id):
    """Update descriptive Lost & Found record information."""
    admin = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)
    title = request.form.get('title', '').strip()
    category = request.form.get('category', '').strip()
    location = request.form.get('location_reported', '').strip()
    description = request.form.get('description', '').strip()
    valid_categories = {
        'Electronics', 'ID Cards & Docs', 'Books & Stationery',
        'Personal Items', 'Valuables', 'Other'
    }

    if not title or not location or not description or category not in valid_categories:
        flash("Title, category, location, and description are required.", "warning")
        return redirect(url_for('admin.manage_lost_found'))

    item.title = title
    item.category = category
    item.location_reported = location
    item.description = description
    item.contact_phone = request.form.get('contact_phone', '').strip() or None
    db.session.commit()
    AuditLog.log(
        action='LF_ADMIN_REPORT_UPDATED',
        module='LOST_FOUND',
        user_id=admin.id,
        details=f"{admin.full_name} updated report #{item.id} '{item.title}'.",
        ip_address=request.remote_addr
    )
    flash(f"Lost & Found report '{title}' updated.", "success")
    return redirect(url_for('admin.manage_lost_found'))

@admin_bp.route('/lost-found/item/<int:item_id>/update-location', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_update_location(item_id):
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)
    new_location = request.form.get('location_reported', '').strip()
    if not new_location:
        flash("New location is required.", "danger")
        return redirect(url_for('admin.manage_lost_found'))
    old = item.location_reported
    item.location_reported = new_location
    Notification.notify(item.user_id, title="Report location updated by administration",
                        message=f"The recorded location of '{item.title}' was updated from '{old}' to '{new_location}'. Follow collection instructions at the new location.",
                        category='admin', link_url=url_for('lost_found.item_detail', item_id=item.id))
    AuditLog.log(action='LF_LOCATION_UPDATED', module='LOST_FOUND', user_id=user.id,
                 details=f"Item {item.id} location '{old}' -> '{new_location}'.", ip_address=request.remote_addr)
    db.session.commit()
    flash("Item location updated and reporter notified.", "success")
    return redirect(url_for('admin.manage_lost_found'))

@admin_bp.route('/lost-found/item/<int:item_id>/verify', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_verify_item(item_id):
    """Authorized verification that a found item is genuine and in campus custody."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)
    item.verified_by_admin_id = user.id
    if item.status == 'open':
        item.status = 'matched'
    Notification.notify(item.user_id, title="Your report was verified by campus administration",
                        message=f"'{item.title}' has been officially verified and logged by the Lost & Found office.",
                        category='admin', link_url=url_for('lost_found.item_detail', item_id=item.id))
    AuditLog.log(action='LF_ITEM_VERIFIED', module='LOST_FOUND', user_id=user.id,
                 details=f"Verified item '{item.title}' (id {item.id}).", ip_address=request.remote_addr)
    db.session.commit()
    flash(f"Item '{item.title}' marked as verified.", "success")
    return redirect(url_for('admin.manage_lost_found'))

@admin_bp.route('/lost-found/claim/<int:claim_id>/decision', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_claim_decision(claim_id):
    """Approve or reject an ownership claim (dispute resolution). Similarity score is never proof."""
    user = get_current_user()
    claim = LostFoundClaim.query.get_or_404(claim_id)
    if claim.status != 'pending':
        flash("This claim was already decided.", "info")
        return redirect(url_for('admin.manage_lost_found'))

    decision = request.form.get('decision')  # 'approve' | 'reject'
    note = request.form.get('decision_note', '').strip()
    item = claim.item
    claim.decided_by_admin_id = user.id
    claim.decision_note = note or None
    claim.decided_at = datetime.utcnow()

    if decision == 'approve':
        claim.status = 'approved'
        item.status = 'claimed'
        item.claimed_by_user_id = claim.claimant_id
        Notification.notify(claim.claimant_id, title="Your claim was approved",
                            message=f"Ownership verified for '{item.title}'. Collect the item from the campus Lost & Found office with valid ID.",
                            category='claim', link_url=url_for('lost_found.item_detail', item_id=item.id))
        AuditLog.log(action='LF_CLAIM_APPROVED', module='LOST_FOUND', user_id=user.id,
                     details=f"Approved claim {claim.id} on item '{item.title}'.", ip_address=request.remote_addr)
    else:
        claim.status = 'rejected'
        item.status = 'open'
        item.claimed_by_user_id = None
        if note:
            item.resolution_note = f"Rejected claim dispute note: {note}"
        Notification.notify(claim.claimant_id, title="Your claim was not approved",
                            message=f"The claim on '{item.title}' was rejected after review. {note}".strip(),
                            category='claim', link_url=url_for('lost_found.item_detail', item_id=item.id))
        AuditLog.log(action='LF_CLAIM_REJECTED', module='LOST_FOUND', user_id=user.id,
                     details=f"Rejected claim {claim.id} on item '{item.title}'.", ip_address=request.remote_addr)

    Notification.notify(item.user_id, title=f"Update on your report '{item.title}'",
                        message=f"Campus administration reviewed a claim on your report: decision recorded ({claim.status}).",
                        category='claim', link_url=url_for('lost_found.item_detail', item_id=item.id))
    db.session.commit()
    flash(f"Claim {claim.status}.", "success")
    return redirect(url_for('admin.manage_lost_found'))

@admin_bp.route('/lost-found/item/<int:item_id>/record-return', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_record_return(item_id):
    """Track the physical handover: mark item collected and returned to its owner."""
    user = get_current_user()
    item = LostFoundItem.query.get_or_404(item_id)
    note = request.form.get('handover_note', '').strip()

    if not item.claimed_by_user_id:
        flash("Assign an approved claimant before recording a return.", "danger")
        return redirect(url_for('admin.manage_lost_found'))

    item.status = 'closed'
    item.collected_at = datetime.utcnow()
    item.verified_by_admin_id = user.id
    if note:
        item.resolution_note = f"Handover: {note}"

    recipient = item.claimed_by_user_id
    Notification.notify(recipient, title="Return recorded - thank you for using Smart Campus 360",
                        message=f"'{item.title}' was collected and officially returned to you. The report is now closed.",
                        category='return', link_url=url_for('lost_found.item_detail', item_id=item.id))
    Notification.notify(item.user_id, title="Your reported item was returned",
                        message=(f"'{item.title}' has been handed over to its verified owner and the report is closed. "
                                 "Thank you for your honesty in reporting it."),
                        category='return', link_url=url_for('lost_found.item_detail', item_id=item.id))
    AuditLog.log(action='LF_ITEM_RETURNED', module='LOST_FOUND', user_id=user.id,
                 details=f"Recorded return of item {item.id} '{item.title}' to user {recipient}.", ip_address=request.remote_addr)
    db.session.commit()
    flash("Item return recorded; both parties notified.", "success")
    return redirect(url_for('admin.manage_lost_found'))

@admin_bp.route('/lost-found/notify/<int:user_id>', methods=['POST'])
@role_required(['main_admin', 'lost_found_admin'])
def lf_send_notification(user_id):
    """Send a single targeted in-app notification (never a broadcast)."""
    admin = get_current_user()
    target = User.query.get_or_404(user_id)
    title = request.form.get('title', '').strip()
    message = request.form.get('message', '').strip()
    if not title or not message:
        flash("Notification title and message are required.", "danger")
        return redirect(url_for('admin.manage_lost_found'))
    Notification.notify(target.id, title=title, message=message, category='admin')
    AuditLog.log(action='LF_ADMIN_NOTIFICATION_SENT', module='LOST_FOUND', user_id=admin.id,
                 details=f"Targeted notification '{title}' to user {target.email}.", ip_address=request.remote_addr)
    db.session.commit()
    flash(f"Notification sent to {target.full_name}.", "success")
    return redirect(url_for('admin.manage_lost_found'))

# ---------------------------------------------------------------------------
# PHASE 8: CENTRAL MAIN ADMIN DASHBOARD - CANTEEN CONSOLE + REPORTS
# ---------------------------------------------------------------------------

@admin_bp.route('/canteen')
@role_required('main_admin')
def manage_canteen():
    """Main Admin canteen control center: accounts, menu & stock, orders with
    teacher-priority visibility, gateway payment records, refund requests and complaints."""
    user = get_current_user()
    tab = request.args.get('tab', 'orders')

    # --- Teacher and student orders (with priority + payment state) ---
    order_query = CanteenOrder.query.order_by(CanteenOrder.created_at.desc())
    status_f = request.args.get('status')
    role_f = request.args.get('role')
    if status_f:
        order_query = order_query.filter_by(order_status=status_f)
    if role_f:
        order_query = order_query.filter_by(user_role_at_order=role_f)
    orders = order_query.limit(100).all()

    # --- Food items & stock (grouped by category) ---
    categories = CanteenCategory.query.order_by(CanteenCategory.display_order.asc()).all()
    items = CanteenItem.query.order_by(CanteenItem.name.asc()).all()
    low_stock = [i for i in items if i.is_available and int(i.stock_quantity) <= 5]

    # --- Payment records (Phase 7 gateway ledger) ---
    payments = Payment.query.order_by(Payment.created_at.desc()).limit(100).all()

    # --- Refund requests + complaint trail (all statuses, newest first) ---
    refunds = Refund.query.order_by(Refund.created_at.desc()).limit(60).all()

    # --- Canteen Admin accounts ---
    canteen_admins = User.query.filter_by(role='canteen_admin').order_by(User.created_at.desc()).all()

    stats = {
        'orders_total': CanteenOrder.query.count(),
        'orders_active': CanteenOrder.query.filter(
            CanteenOrder.order_status.in_(('pending', 'placed', 'confirmed', 'preparing', 'ready'))).count(),
        'priority_orders': CanteenOrder.query.filter_by(is_priority=True).count(),
        'items_total': len(items),
        'low_stock': len(low_stock),
        'captured_total': float(db.session.query(db.func.sum(Payment.amount)).filter(
            Payment.status.in_(('succeeded', 'partially_refunded'))).scalar() or 0.0),
        'refunded_total': float(db.session.query(db.func.sum(Payment.refunded_amount)).scalar() or 0.0),
        'refunds_open': Refund.query.filter(Refund.status.in_(('requested', 'processing', 'failed'))).count(),
        'mismatch_payments': Payment.query.filter_by(confirm_mismatch=True).count(),
    }

    return render_template('admin/manage_canteen.html', user=user, tab=tab, orders=orders,
                           categories=categories, items=items, low_stock=low_stock,
                           payments=payments, refunds=refunds, canteen_admins=canteen_admins,
                           stats=stats, current_status=status_f, current_role=role_f)

@admin_bp.route('/canteen/item/<int:item_id>/update', methods=['POST'])
@role_required('main_admin')
def admin_update_canteen_item(item_id):
    """Main Admin direct control of menu pricing, stock and availability."""
    admin = get_current_user()
    item = CanteenItem.query.get_or_404(item_id)

    old = (float(item.price), int(item.stock_quantity), bool(item.is_available))
    price = request.form.get('price', type=float)
    stock = request.form.get('stock_quantity', type=int)
    if price is not None and price >= 0:
        item.price = price
    if stock is not None and stock >= 0:
        item.stock_quantity = stock
    item.is_available = bool(request.form.get('is_available'))

    db.session.commit()
    AuditLog.log(action='CANTEEN_ITEM_UPDATED_BY_MAIN_ADMIN', module='CANTEEN', user_id=admin.id,
                 details=f"Item '{item.name}': price/stock/availability {old} -> "
                         f"({float(item.price)}, {int(item.stock_quantity)}, {item.is_available}).",
                 ip_address=request.remote_addr)
    flash(f"Menu item '{item.name}' updated.", "success")
    return redirect(request.referrer or url_for('admin.manage_canteen', tab='items'))

@admin_bp.route('/reports')
@role_required('main_admin')
def reports():
    """PHASE 8 statistics & charts computed live from the database - nothing hardcoded."""
    user = get_current_user()
    F = db.func

    def count(q):
        return q.count()

    # ---- Headline KPIs (real rows only) ----
    kpi = {
        'users_total': count(User.query),
        'users_active': User.query.filter_by(is_active=True).count(),
        'teachers_verified': User.query.filter_by(role='teacher', is_verified=True).count(),
        'teachers_pending': User.query.filter_by(role='teacher', is_verified=False).count(),
        'nodes_published': NavigationNode.query.filter_by(is_published=True).count(),
        'nodes_unpublished': NavigationNode.query.filter_by(is_published=False).count(),
        'edges_total': count(NavigationEdge.query),
        'photos_total': NavigationNode.query.filter(
            NavigationNode.photo_url.isnot(None), NavigationNode.photo_url != '').count(),
        'lf_total': count(LostFoundItem.query),
        'lf_open': LostFoundItem.query.filter_by(status='open').count(),
        'lf_returned': LostFoundItem.query.filter_by(status='closed').count(),
        'orders_total': count(CanteenOrder.query),
        'orders_priority': CanteenOrder.query.filter_by(is_priority=True).count(),
        'revenue_net': float(db.session.query(F.sum(CanteenOrder.total_amount)).filter(
            CanteenOrder.payment_status.in_(('paid', 'partially_refunded'))).scalar() or 0.0)
            - float(db.session.query(F.sum(Payment.refunded_amount)).scalar() or 0.0),
        'refunds_succeeded': Refund.query.filter_by(status='succeeded').count(),
    }

    # ---- 14-day orders + revenue time series ----
    since = datetime.utcnow().date() - timedelta(days=13)
    day_keys = [(since + timedelta(days=i)) for i in range(14)]
    orders_series = {d: 0 for d in day_keys}
    revenue_series = {d: 0.0 for d in day_keys}
    rows = db.session.query(
        CanteenOrder.created_at, CanteenOrder.total_amount, CanteenOrder.payment_status).all()
    for created, amount, pay_status in rows:
        if created and created.date() in orders_series:
            orders_series[created.date()] += 1
            if pay_status in ('paid', 'partially_refunded'):
                revenue_series[created.date()] += float(amount or 0)
    time_series = {
        'labels': [d.strftime('%d %b') for d in day_keys],
        'orders': [orders_series[d] for d in day_keys],
        'revenue': [round(revenue_series[d], 2) for d in day_keys],
    }

    # ---- categorical distributions (real group-bys) ----
    order_status_counts = dict((s, CanteenOrder.query.filter_by(order_status=s).count())
                               for s, _ in db.session.query(
                                   CanteenOrder.order_status, F.count(CanteenOrder.id)
                               ).group_by(CanteenOrder.order_status).all())
    role_counts = dict((r, User.query.filter_by(role=r).count())
                       for r, in db.session.query(User.role).distinct().all())
    lf_type_counts = {
        'lost': LostFoundItem.query.filter_by(report_type='lost').count(),
        'found': LostFoundItem.query.filter_by(report_type='found').count(),
    }
    payment_status_counts = dict((st, Payment.query.filter_by(status=st).count())
                                 for st, in db.session.query(Payment.status).distinct().all())

    # ---- top 5 sold items by real line-item quantity ----
    top_rows = db.session.query(
        CanteenOrderItem.item_name, F.sum(CanteenOrderItem.quantity).label('qty')
    ).join(CanteenOrder, CanteenOrder.id == CanteenOrderItem.order_id
    ).group_by(CanteenOrderItem.item_name).order_by(sql_text('qty DESC')).limit(5).all()
    top_items = {'labels': [r[0] for r in top_rows], 'quantities': [int(r[1] or 0) for r in top_rows]}

    charts = {
        'timeSeries': time_series,
        'orderStatus': order_status_counts,
        'userRoles': role_counts,
        'lfTypes': lf_type_counts,
        'paymentStatus': payment_status_counts,
        'topItems': top_items,
    }

    return render_template('admin/reports.html', user=user, kpi=kpi, charts=charts)

# ---------------------------------------------------------------------------
# EXAM ROOM FINDER - hall allotment publishing + audience notification
# ---------------------------------------------------------------------------

def _exam_room_nodes():
    """Published rooms that can host an exam (halls, classrooms, labs, auditoria)."""
    return NavigationNode.query.filter(
        NavigationNode.is_published.is_(True),
        NavigationNode.category.in_(('Classroom', 'Laboratory', 'Auditorium', 'Hall', 'Seminar Hall', 'Corridor'))
    ).order_by(NavigationNode.building.asc(), NavigationNode.name.asc()).all()

@admin_bp.route('/exam-schedule')
@role_required('main_admin')
def manage_exam_schedule():
    """Exam Room Finder control center: publish when each exam happens and in which room."""
    user = get_current_user()
    schedules = ExamSchedule.query.order_by(ExamSchedule.exam_date.asc(), ExamSchedule.start_time.asc()).all()
    rooms = _exam_room_nodes()
    departments = sorted({d for (d,) in db.session.query(User.department).distinct().all() if d})
    semesters = ExamSchedule.SEMESTER_OPTIONS
    stats = {
        'total': len(schedules),
        'upcoming': sum(1 for s in schedules if s.exam_date and s.exam_date >= date.today()),
        'notified': sum(1 for s in schedules if s.notified_at),
        'alerts_sent': sum(s.notify_count or 0 for s in schedules),
        'pending_notify': sum(1 for s in schedules if not s.notified_at),
    }
    branch_matrix = ExamSchedule.build_branch_matrix(schedules)
    return render_template('admin/exam_schedule.html', user=user, schedules=schedules,
                           rooms=rooms, departments=departments, semesters=semesters,
                           day_parts=EXAM_DAY_PARTS, branches=ExamSchedule.BRANCH_CATALOG,
                           branch_matrix=branch_matrix, stats=stats)

@admin_bp.route('/exam-schedule/create', methods=['POST'])
@role_required('main_admin')
def create_exam_schedule():
    """Admin uploads one exam allotment: subject, date, conduct window (from-to +
    day-part), room number, branch + semester and an optional notice. Audience is
    always students here; a map hall is optional (route link only shows if chosen)."""
    user = get_current_user()
    subject_code = request.form.get('subject_code', '').strip().upper()
    subject_name = request.form.get('subject_name', '').strip()
    exam_date = None
    start_time = _parse_hhmm(request.form.get('start_time'))
    end_time = _parse_hhmm(request.form.get('end_time'))
    try:
        exam_date = datetime.strptime(request.form.get('exam_date', '').strip(), '%Y-%m-%d').date()
    except ValueError:
        exam_date = None

    # Optional map hall: the single-entry form no longer shows a picker, but the
    # field is honoured if present so a route link can still be offered.
    room_id = request.form.get('room_node_id', type=int)
    room = NavigationNode.query.get(room_id) if room_id else None

    if not subject_code or not subject_name or not exam_date or not start_time or not end_time:
        flash("Subject code, subject name, exam date and start/end times are required.", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))
    if end_time <= start_time:
        flash("Exam end time must be after the start time.", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))

    session = request.form.get('session', '').strip()
    if session and session not in EXAM_DAY_PARTS:
        session = ''
    if room:
        clash = ExamSchedule.query.filter_by(exam_date=exam_date, start_time=start_time, room_node_id=room.id).first()
        if clash:
            flash(f"That hall is already booked for '{clash.subject_name}' at the same time.", "danger")
            return redirect(url_for('admin.manage_exam_schedule'))

    attachment_url = attachment_name = None
    doc_file = request.files.get('attachment')
    if doc_file and doc_file.filename:
        attachment_url, attachment_name = _save_exam_attachment(doc_file)
        if not attachment_url:
            flash("Attachment rejected: only a real PDF or PNG/JPG/JPEG/WEBP image up to 10 MB is allowed.", "warning")

    room_number = request.form.get('room_number', '').strip() or None
    # Optional USN range narrows the student audience (inclusive, upper-cased).
    usn_from = request.form.get('usn_from', '').strip().upper() or None
    usn_to = request.form.get('usn_to', '').strip().upper() or None
    if usn_from and usn_to and usn_from > usn_to:
        flash("The 'USN From' value must not come after the 'USN To' value.", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))
    schedule = ExamSchedule(
        subject_code=subject_code,
        subject_name=subject_name,
        exam_date=exam_date,
        start_time=start_time,
        end_time=end_time,
        session=session or None,
        room_node_id=room.id if room else None,
        room_number=room_number,
        audience_role='student',
        department=request.form.get('department', '').strip() or None,
        semester=request.form.get('semester', '').strip() or None,
        usn_from=usn_from,
        usn_to=usn_to,
        instructions=request.form.get('instructions', '').strip() or None,
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        created_by_id=user.id,
    )
    db.session.add(schedule)
    db.session.commit()
    where = room.name if room else (room_number or 'a hall to be announced')
    AuditLog.log(action='EXAM_SCHEDULE_CREATED', module='EXAM', user_id=user.id,
                 details=f"Published hall allotment: {subject_code} '{subject_name}' on {exam_date} "
                         f"{schedule.time_window} in '{where}'"
                         f"{f' ({schedule.department} {schedule.semester})'.rstrip() if schedule.department or schedule.semester else ''} for students.",
                 ip_address=request.remote_addr)
    flash(f"Exam '{subject_code} - {subject_name}' published for {where}. Send the alert to notify the students.", "success")
    return redirect(url_for('admin.manage_exam_schedule'))

@admin_bp.route('/exam-schedule/bulk-create', methods=['POST'])
@role_required('main_admin')
def create_exam_schedule_bulk():
    """Column-wise entry: one subject/date/time/semester shared across branches, with
    a hall + room number filled in per branch column. Creates one allotment per branch
    that has a hall chosen (blank columns are skipped)."""
    user = get_current_user()
    subject_code = request.form.get('subject_code', '').strip().upper()
    subject_name = request.form.get('subject_name', '').strip()
    start_time = _parse_hhmm(request.form.get('start_time'))
    end_time = _parse_hhmm(request.form.get('end_time'))
    try:
        exam_date = datetime.strptime(request.form.get('exam_date', '').strip(), '%Y-%m-%d').date()
    except ValueError:
        exam_date = None
    session = request.form.get('session', '').strip()
    if session and session not in EXAM_DAY_PARTS:
        session = ''
    semester = request.form.get('semester', '').strip() or None

    if not subject_code or not subject_name or not exam_date or not start_time or not end_time:
        flash("Subject code, subject name, date and start/end times are required for a column-wise upload.", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))
    if end_time <= start_time:
        flash("Exam end time must be after the start time.", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))

    created, skipped = 0, 0
    for branch in EXAM_BRANCHES:
        hall_id = request.form.get(f'hall_{branch}', type=int)
        if not hall_id:
            continue  # empty column -> nothing published for this branch
        room = NavigationNode.query.get(hall_id)
        if not room or not room.is_published:
            skipped += 1
            continue
        clash = ExamSchedule.query.filter_by(exam_date=exam_date, start_time=start_time, room_node_id=room.id).first()
        if clash:
            skipped += 1
            continue
        db.session.add(ExamSchedule(
            subject_code=subject_code, subject_name=subject_name,
            exam_date=exam_date, start_time=start_time, end_time=end_time,
            session=session or None, room_node_id=room.id,
            room_number=(request.form.get(f'roomno_{branch}', '').strip() or None),
            audience_role='student', department=branch, semester=semester,
            instructions=request.form.get('instructions', '').strip() or None,
            created_by_id=user.id))
        created += 1

    if not created:
        flash("No branch had a hall selected - nothing was published.", "warning")
        return redirect(url_for('admin.manage_exam_schedule'))
    db.session.commit()
    AuditLog.log(action='EXAM_SCHEDULE_BULK_CREATED', module='EXAM', user_id=user.id,
                 details=f"Column-wise upload: {subject_code} '{subject_name}' on {exam_date} "
                         f"{start_time}-{end_time} published for {created} branch(es)"
                         f"{f', {skipped} skipped' if skipped else ''}.",
                 ip_address=request.remote_addr)
    flash(f"Published '{subject_code}' for {created} branch(es). Use 'Notify All Pending' to alert every branch at once."
          + (f" {skipped} column(s) skipped (no hall or a room clash)." if skipped else ''), "success")
    return redirect(url_for('admin.manage_exam_schedule'))

def _send_exam_alert(schedule, actor_user):
    """Deliver the hall-allotment alert to everyone it applies to. Targeted per-user
    notifications (never a shout into a void): each recipient's bell shows it under
    the dedicated Exam tab, linking straight to the finder. Re-sending is idempotent
    via dedup_key. Returns the number of (new) alerts delivered."""
    room = schedule.room
    audience = schedule.audience_users()
    if not audience:
        return 0
    when = schedule.exam_date.strftime('%d %b %Y')
    hall = f"{room.name} ({room.building}, {room.floor})" if room else 'the assigned hall'
    room_bit = f" Room {schedule.room_number}" if schedule.room_number else ''
    audience_desc = (f"{schedule.department} {schedule.semester}".strip() if schedule.audience_role == 'student'
                     else 'invigilation duty') or f"all {schedule.audience_role}s"
    if schedule.audience_role == 'student' and (schedule.usn_from or schedule.usn_to):
        audience_desc = f"{audience_desc}, USNs {schedule.usn_from or '…'} – {schedule.usn_to or '…'}"
    message = (f"Your exam hall for '{schedule.subject_code} - {schedule.subject_name}' ({audience_desc}) is "
               f"{hall}{room_bit} on {when}, {schedule.time_window}. "
               f"Open the Exam Room Finder to confirm your hall and route there.")
    sent = 0
    for target in audience:
        note = Notification.notify(
            target.id, title=f"Exam hall allotted: {schedule.subject_code} ({when})",
            message=message, category='exam',
            link_url=url_for('navigation.exam_finder'),
            dedup_key=f"exam_{schedule.id}_u{target.id}")
        sent += 1 if note else 0
    schedule.notified_at = datetime.utcnow()
    schedule.notify_count = (schedule.notify_count or 0) + sent
    AuditLog.log(action='EXAM_ALLOTMENT_NOTIFIED', module='EXAM', user_id=actor_user.id,
                 details=f"Sent hall allotment alert for {schedule.subject_code} on {when} to "
                         f"{sent} {schedule.audience_role}(s). Hall: {hall}{room_bit}.",
                 ip_address=request.remote_addr)
    return sent

@admin_bp.route('/exam-schedule/<int:schedule_id>/notify', methods=['POST'])
@role_required('main_admin')
def notify_exam_schedule(schedule_id):
    """Send the hall-allotment alert for one exam to its audience."""
    user = get_current_user()
    schedule = ExamSchedule.query.get_or_404(schedule_id)
    sent = _send_exam_alert(schedule, user)
    db.session.commit()
    if sent == 0 and schedule.notify_count:
        flash("Alert already delivered earlier - nothing new to send (no duplicates).", "info")
    elif sent == 0:
        flash("No active accounts match this audience yet - nothing was sent.", "warning")
    else:
        flash(f"Alert sent: {sent} {schedule.audience_role}(s) notified about '{schedule.subject_code}'. "
              "Re-sending never duplicates alerts.", "success")
    return redirect(url_for('admin.manage_exam_schedule'))

@admin_bp.route('/exam-schedule/notify-all', methods=['POST'])
@role_required('main_admin')
def notify_all_pending_exams():
    """Send every not-yet-delivered allotment alert at once (used right after a
    column-wise bulk upload so all branches' students are notified together)."""
    user = get_current_user()
    pending = ExamSchedule.query.filter(ExamSchedule.notified_at.is_(None)).all()
    if not pending:
        flash("All published allotments have already been notified.", "info")
        return redirect(url_for('admin.manage_exam_schedule'))
    total_sent, exams = 0, 0
    for schedule in pending:
        s = _send_exam_alert(schedule, user)
        if s:
            exams += 1
            total_sent += s
    db.session.commit()
    flash(f"Bulk alert sent: {total_sent} notification(s) across {exams} exam allotment(s).", "success")
    return redirect(url_for('admin.manage_exam_schedule'))

@admin_bp.route('/exam-schedule/<int:schedule_id>/delete', methods=['POST'])
@role_required('main_admin')
def delete_exam_schedule(schedule_id):
    """Withdraw an allotment. Already-delivered notifications stay in user history
    (harmless), but the exam disappears from the finder."""
    user = get_current_user()
    schedule = ExamSchedule.query.get_or_404(schedule_id)
    label = f"{schedule.subject_code} - {schedule.subject_name}"
    db.session.delete(schedule)
    db.session.commit()
    AuditLog.log(action='EXAM_SCHEDULE_DELETED', module='EXAM', user_id=user.id,
                 details=f"Removed exam allotment '{label}'.", ip_address=request.remote_addr)
    flash(f"Exam allotment '{label}' withdrawn.", "success")
    return redirect(url_for('admin.manage_exam_schedule'))

@admin_bp.route('/exam-schedule/import', methods=['POST'])
@role_required('main_admin')
def import_exam_schedule():
    """Bulk-upload the whole exam timetable from a CSV file."""
    user = get_current_user()
    file = request.files.get('csv_file')
    if not file or not file.filename.lower().endswith('.csv'):
        flash("A .csv file is required for exam timetable import.", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))
    try:
        rows = list(csv.DictReader(io.StringIO(file.read().decode('utf-8-sig'))))
    except Exception as exc:
        flash(f"Could not read CSV file: {exc}", "danger")
        return redirect(url_for('admin.manage_exam_schedule'))

    room_map = {n.node_code: n.id for n in NavigationNode.query.all()}
    created, skipped = 0, 0
    for row in rows:
        code = (row.get('subject_code') or '').strip().upper()
        name = (row.get('subject_name') or '').strip()
        room_id = room_map.get((row.get('room_node_code') or '').strip().upper())
        try:
            exam_date = datetime.strptime((row.get('exam_date') or '').strip(), '%Y-%m-%d').date()
        except ValueError:
            exam_date = None
        start_time = _parse_hhmm(row.get('start_time'))
        end_time = _parse_hhmm(row.get('end_time'))
        if not code or not name or not room_id or not exam_date or not start_time or not end_time or end_time <= start_time:
            skipped += 1
            continue
        clash = ExamSchedule.query.filter_by(subject_code=code, exam_date=exam_date, start_time=start_time).first()
        if clash:
            skipped += 1
            continue
        role = (row.get('audience_role') or 'student').strip().lower()
        if role not in ('student', 'teacher'):
            role = 'student'
        day_part = (row.get('session') or '').strip().title()
        if day_part not in EXAM_DAY_PARTS:
            day_part = None
        try:
            # Per-row SAVEPOINT: one bad row can never abort the whole import.
            with db.session.begin_nested():
                db.session.add(ExamSchedule(
                    subject_code=code, subject_name=name, exam_date=exam_date,
                    start_time=start_time, end_time=end_time,
                    session=day_part,
                    room_node_id=room_id,
                    room_number=(row.get('room_number') or '').strip() or None,
                    audience_role=role,
                    department=(row.get('department') or '').strip() or None if role == 'student' else None,
                    semester=(row.get('semester') or '').strip() or None if role == 'student' else None,
                    instructions=(row.get('instructions') or '').strip() or None,
                    created_by_id=user.id))
            created += 1
        except Exception:
            skipped += 1

    db.session.commit()
    AuditLog.log(action='EXAM_DATA_IMPORTED', module='EXAM', user_id=user.id,
                 details=f"Imported exam timetable CSV: {created} created, {skipped} skipped.",
                 ip_address=request.remote_addr)
    flash(f"Timetable import finished: {created} allotment(s) created, {skipped} skipped. Send alerts when ready.", "success")
    return redirect(url_for('admin.manage_exam_schedule'))

