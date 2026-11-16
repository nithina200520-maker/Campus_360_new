import re
from datetime import datetime, timedelta, timezone
from flask import render_template, request, redirect, url_for, flash, session, current_app, abort, jsonify
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
import jwt
from app.blueprints.auth import auth_bp, api_auth_bp
from app.models import User, AuditLog
from app.database import db
from app.utils.auth_helpers import login_user, logout_user, login_required, get_current_user

DEPARTMENT_CHOICES = (
    'Computer Science & Engineering',
    'Information Science & Engineering',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Other',
)
SEMESTER_CHOICES = tuple(f'{number}{suffix} Semester' for number, suffix in (
    ('1st', ''), ('2nd', ''), ('3rd', ''), ('4th', ''),
    ('5th', ''), ('6th', ''), ('7th', ''), ('8th', ''),
))
DESIGNATION_CHOICES = (
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Head of Department (HOD)',
    'Lecturer',
    'Senior Assistant Professor',
    'Visiting Faculty',
    'Other',
)

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Enforces minimum 8 characters, with letters and numbers."""
    if len(password.encode('utf-8')) > 72:
        return False, "Password must be no more than 72 UTF-8 bytes."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one alphabetical letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one numeric digit."
    return True, ""


def _api_error(message, status):
    return jsonify(success=False, message=message), status


def _api_user_data(user, role):
    return {
        'id': user.id,
        'name': user.full_name,
        'fullName': user.full_name,
        'email': user.email,
        'phone': user.phone,
        'role': role,
        'department': user.department,
        'semester': user.semester,
        'usn': user.usn_or_emp_id if role == 'student' else None,
        'employeeId': user.usn_or_emp_id if role == 'faculty' else None,
        'usnOrId': user.usn_or_emp_id,
        'designation': user.designation,
    }


def _api_register(role):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _api_error('A JSON registration request is required.', 400)

    full_name = str(data.get('fullName', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    department = str(data.get('department', '')).strip()
    phone = str(data.get('phoneNumber', data.get('phone', ''))).strip()
    password = data.get('password', '')
    confirm_password = data.get('confirmPassword', '')

    identifier = str(
        data.get('universityUSN', data.get('usn', '')) if role == 'student'
        else data.get('employeeId', '')
    ).strip().upper()
    semester = str(data.get('currentSemester', data.get('semester', ''))).strip()
    designation = str(data.get('academicDesignation', data.get('designation', ''))).strip()

    if not isinstance(password, str) or not isinstance(confirm_password, str):
        return _api_error('Password and confirmation must be strings.', 400)
    if not full_name or not email or not department or not identifier or not password or not confirm_password:
        return _api_error('Please complete all required registration fields.', 400)
    if len(full_name) > 120 or len(email) > 120 or len(identifier) > 50 or len(phone) > 20:
        return _api_error('One or more fields exceed the allowed length.', 400)
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        return _api_error('Please provide a valid email address.', 400)
    if department not in DEPARTMENT_CHOICES:
        return _api_error('Please select a valid department or branch.', 400)
    if role == 'student' and semester not in SEMESTER_CHOICES:
        return _api_error('Please select a valid current semester.', 400)
    if role == 'faculty' and designation not in DESIGNATION_CHOICES:
        return _api_error('Please select a valid academic designation.', 400)
    if password != confirm_password:
        return _api_error('Password and Confirm Password must match.', 400)
    is_valid, message = validate_password_strength(password)
    if not is_valid:
        return _api_error(message, 400)

    account_role = 'student' if role == 'student' else 'teacher'
    if User.query.filter(func.lower(User.email) == email).first():
        return _api_error('An account with this email address is already registered.', 409)
    if User.query.filter(
        User.role == account_role,
        func.lower(User.usn_or_emp_id) == identifier.lower(),
    ).first():
        label = 'University USN' if role == 'student' else 'Employee ID'
        return _api_error(f'This {label} is already registered.', 409)

    user = User(
        full_name=full_name,
        email=email,
        role=account_role,
        department=department,
        phone=phone or None,
        usn_or_emp_id=identifier,
        semester=semester if role == 'student' else None,
        designation=designation if role == 'faculty' else None,
        is_verified=role == 'student',
        is_active=True,
    )
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _api_error('An account with this email or institutional ID is already registered.', 409)

    AuditLog.log(
        action='USER_REGISTERED' if role == 'student' else 'TEACHER_REGISTERED_PENDING_VERIFICATION',
        module='AUTH',
        user_id=user.id,
        details=f'New {role.upper()} account registered: {full_name} ({email})',
        ip_address=request.remote_addr,
    )
    return jsonify(
        success=True,
        message='Registration successful. Please sign in with your institutional ID or email.',
        user=_api_user_data(user, role),
    ), 201


def _api_login(role):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _api_error('A JSON login request is required.', 400)
    identifier = str(data.get('identifier', '')).strip()
    password = data.get('password', '')
    if not identifier or not isinstance(password, str) or not password:
        return _api_error('Please provide your registered ID or email and password.', 400)

    account_role = 'student' if role == 'student' else 'teacher'
    name_clause = func.lower(User.full_name) == identifier.lower() if role == 'student' else False
    user = User.query.filter(
        User.role == account_role,
        or_(
            func.lower(User.email) == identifier.lower(),
            func.lower(User.usn_or_emp_id) == identifier.lower(),
            name_clause,
        ),
    ).first()
    if not user or not user.check_password(password):
        return _api_error('Invalid credentials for the selected account type.', 401)
    if not user.is_active:
        return _api_error('This account has been deactivated. Please contact the Main Admin.', 403)

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            'id': user.id,
            'sub': str(user.id),
            'name': user.full_name,
            'usnOrId': user.usn_or_emp_id,
            'role': role,
            'department': user.department,
            'iat': now,
            'exp': now + timedelta(hours=24),
        },
        current_app.config['AUTH_JWT_SECRET'],
        algorithm='HS256',
    )
    return jsonify(
        success=True,
        message=f'{role.title()} login successful.',
        token=token,
        user=_api_user_data(user, role),
    )


@api_auth_bp.route('/students/register', methods=['POST'])
def api_student_register():
    return _api_register('student')


@api_auth_bp.route('/students/login', methods=['POST'])
def api_student_login():
    return _api_login('student')


@api_auth_bp.route('/faculty/register', methods=['POST'])
def api_faculty_register():
    return _api_register('faculty')


@api_auth_bp.route('/faculty/login', methods=['POST'])
def api_faculty_login():
    return _api_login('faculty')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Secure user authentication with credential validation and audit logging."""
    if session.get('user_id'):
        return redirect(url_for('main.index'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            if not user.is_active:
                AuditLog.log(
                    action='LOGIN_BLOCKED_INACTIVE',
                    module='AUTH',
                    user_id=user.id,
                    details=f"Deactivated account '{email}' attempted sign in.",
                    ip_address=request.remote_addr
                )
                flash("Your account has been deactivated by administration. Please contact the Main Admin.", "danger")
                return render_template('auth/login.html')

            login_user(user)

            AuditLog.log(
                action='USER_LOGIN_SUCCESS',
                module='AUTH',
                user_id=user.id,
                details=f"User signed in as {user.role.upper()} (Verified={user.is_verified})",
                ip_address=request.remote_addr
            )

            # Flash role-specific welcome message
            if user.role == 'teacher':
                if user.is_verified:
                    flash(f"Welcome Dr./Prof. {user.full_name}! Faculty status verified - Teacher-First Priority is ACTIVE.", "success")
                else:
                    flash(f"Welcome {user.full_name}! Your teacher account is awaiting Main Admin verification for canteen priority.", "warning")
            else:
                flash(f"Welcome back, {user.full_name}! Signed in as [{user.role.replace('_', ' ').title()}].", "success")

            next_page = request.args.get('next')
            if next_page and not next_page.startswith('//') and not next_page.startswith('http'):
                return redirect(next_page)

            # Role-based landing redirects
            if user.role == 'main_admin':
                return redirect(url_for('admin.dashboard'))
            elif user.role == 'canteen_admin' or user.admin_scope == 'canteen':
                return redirect(url_for('canteen_admin.dashboard'))
            elif user.admin_scope == 'lost_found':
                return redirect(url_for('admin.manage_lost_found'))
            elif user.admin_scope == 'navigation':
                return redirect(url_for('admin.manage_navigation'))
            else:
                return redirect(url_for('main.index'))
        else:
            AuditLog.log(
                action='USER_LOGIN_FAILED',
                module='AUTH',
                details=f"Failed login attempt for email '{email}'",
                ip_address=request.remote_addr
            )
            flash("Invalid email address or password. Please verify your credentials.", "danger")

    active_tab = request.args.get('tab', 'login')
    return render_template('auth/login.html', active_tab=active_tab)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """
    Role-specific registration for Students, Teachers, and Visitors.
    Security: Never allows public registration to create Main Admin or Canteen Admin accounts.
    Teacher verification: Teacher accounts default to is_verified=False pending Main Admin approval.
    """
    if session.get('user_id'):
        user = get_current_user()
        if user:
            flash(f"You are already signed in as {user.full_name}. Please sign out to register a new account.", "info")
            return redirect(url_for('main.index'))
        else:
            session.clear()

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        role = request.form.get('role', 'student').strip().lower()
        department = request.form.get('department', '').strip()
        phone = request.form.get('phone', '').strip()

        # Administrative access must be explicitly assigned by Main Admin.
        admin_roles = {
            'admin', 'main_admin', 'canteen_admin', 'lost_found_admin',
            'navigation_admin', 'lost_found', 'navigation', 'canteen'
        }
        if role in admin_roles:
            AuditLog.log(
                action='UNAUTHORIZED_ADMIN_REGISTRATION_ATTEMPT',
                module='AUTH',
                details=f"Blocked attempt to register public account with administrative role '{role}' for '{email}'.",
                ip_address=request.remote_addr
            )
            flash("Administrative access cannot be registered publicly. Contact the Main Admin for role assignment.", "danger")
            return redirect(url_for('auth.login', tab='register'))

        if role not in ['student', 'teacher', 'visitor']:
            flash("Please select Student, Faculty, or Visitor to register.", "warning")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)

        if not full_name or not email or not password:
            flash("Please fill in all required fields.", "warning")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)
        if len(full_name) > 120 or len(email) > 120:
            flash("Name and email must be no more than 120 characters.", "warning")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
            flash("Please provide a valid email address.", "warning")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)

        if password != confirm_password:
            flash("Passwords do not match.", "warning")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)

        is_valid, msg = validate_password_strength(password)
        if not is_valid:
            flash(msg, "warning")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)

        existing = User.query.filter_by(email=email).first()
        if existing:
            flash("An account with this email address is already registered.", "danger")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)

        # Role-specific fields
        designation = None
        semester = None
        purpose_of_visit = None
        usn_or_emp_id = None
        is_verified = True # Students and visitors are active directly

        if role == 'teacher':
            usn_or_emp_id = request.form.get('employee_id', '').strip()
            designation = request.form.get('designation', 'Assistant Professor').strip()
            # Crucial requirement: Teacher priority is granted ONLY to verified teacher accounts!
            is_verified = False
        elif role == 'student':
            usn_or_emp_id = request.form.get('usn', '').strip().upper()
            semester = request.form.get('semester', '').strip()
        elif role == 'visitor':
            purpose_of_visit = request.form.get('purpose_of_visit', 'Campus Visit').strip()

        if role in ('student', 'teacher'):
            if department not in DEPARTMENT_CHOICES:
                flash("Please select a valid department or branch.", "warning")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)
            if len(phone) > 20:
                flash("Phone number must be no more than 20 characters.", "warning")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)
            if not usn_or_emp_id:
                flash("University USN is required." if role == 'student' else "Official Employee ID is required.", "warning")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)
            if len(usn_or_emp_id) > 50:
                flash("Institutional ID must be no more than 50 characters.", "warning")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)
            duplicate_identifier = User.query.filter(
                User.role == role,
                func.lower(User.usn_or_emp_id) == usn_or_emp_id.lower(),
            ).first()
            if duplicate_identifier:
                flash("This University USN is already registered." if role == 'student' else "This Employee ID is already registered.", "danger")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)
            if role == 'student' and semester not in SEMESTER_CHOICES:
                flash("Please select a valid current semester.", "warning")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)
            if role == 'teacher' and designation not in DESIGNATION_CHOICES:
                flash("Please select a valid academic designation.", "warning")
                return render_template('auth/login.html', active_tab='register', form_data=request.form)

        new_user = User(
            full_name=full_name,
            email=email,
            role=role,
            department=department,
            phone=phone,
            usn_or_emp_id=usn_or_emp_id,
            designation=designation,
            semester=semester,
            purpose_of_visit=purpose_of_visit,
            is_verified=is_verified,
            is_active=True
        )
        new_user.set_password(password)
        db.session.add(new_user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash("An account with this email or institutional ID is already registered.", "danger")
            return render_template('auth/login.html', active_tab='register', form_data=request.form)

        if role == 'teacher':
            AuditLog.log(
                action='TEACHER_REGISTERED_PENDING_VERIFICATION',
                module='AUTH',
                user_id=new_user.id,
                details=f"Faculty '{full_name}' ({designation}, {department}, Emp ID: {usn_or_emp_id}) registered. Verification pending.",
                ip_address=request.remote_addr
            )
            flash("Faculty registration successful! Your Employee ID has been submitted for Main Admin verification. Once verified, Teacher-First Priority will activate automatically.", "info")
        else:
            AuditLog.log(
                action='USER_REGISTERED',
                module='AUTH',
                user_id=new_user.id,
                details=f"New {role.upper()} account registered: {full_name} ({email})",
                ip_address=request.remote_addr
            )
            flash("Registration successful! You may now sign in.", "success")

        return redirect(url_for('auth.login', email=email, tab='login'))

    return render_template('auth/login.html', active_tab='register')

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Password reset request: generates secure, time-sensitive reset token."""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        user = User.query.filter_by(email=email).first()

        if user and user.is_active:
            token = user.generate_reset_token()
            db.session.commit()

            AuditLog.log(
                action='PASSWORD_RESET_TOKEN_GENERATED',
                module='AUTH',
                user_id=user.id,
                details=f"Password reset token requested for '{email}'",
                ip_address=request.remote_addr
            )

            reset_url = url_for('auth.reset_password', token=token, _external=True)
            # In development/local demonstration, display link directly
            flash(f"Password reset link generated (valid for 30 minutes). Click below to proceed:", "info")
            return render_template('auth/forgot_password.html', reset_url=reset_url, reset_token=token)
        else:
            # Generic response to prevent user enumeration
            flash("If that email address exists in our database, password reset instructions have been generated.", "info")
            return render_template('auth/forgot_password.html')

    return render_template('auth/forgot_password.html')

@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Verifies reset token and updates account password."""
    user = User.query.filter_by(reset_token=token).first()

    if not user or not user.verify_reset_token(token):
        flash("Password reset link is invalid or has expired (valid for 30 minutes). Please request a new link.", "danger")
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        new_password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if new_password != confirm_password:
            flash("Passwords do not match.", "warning")
            return render_template('auth/reset_password.html', token=token, user=user)

        is_valid, msg = validate_password_strength(new_password)
        if not is_valid:
            flash(msg, "warning")
            return render_template('auth/reset_password.html', token=token, user=user)

        user.set_password(new_password)
        user.clear_reset_token()
        db.session.commit()

        AuditLog.log(
            action='PASSWORD_RESET_COMPLETED',
            module='AUTH',
            user_id=user.id,
            details=f"Password reset completed successfully for '{user.email}'",
            ip_address=request.remote_addr
        )

        flash("Your password has been updated successfully! Please sign in with your new credentials.", "success")
        return redirect(url_for('auth.login'))

    return render_template('auth/reset_password.html', token=token, user=user)

@auth_bp.route('/logout')
def logout():
    """Securely clears session and records sign out audit."""
    current_user = get_current_user()
    if current_user:
        AuditLog.log(
            action='USER_LOGOUT',
            module='AUTH',
            user_id=current_user.id,
            details=f"User signed out ({current_user.role})",
            ip_address=request.remote_addr
        )

    logout_user()
    flash("You have been signed out safely.", "info")
    return redirect(url_for('main.index'))

@auth_bp.route('/profile')
@login_required
def profile():
    """User profile overview showcasing role details and verification status."""
    user = get_current_user()
    return render_template('auth/profile.html', user=user)

# Allowed values for the Settings page pickers - anything else falls back to
# the stored/default preference rather than being written to the database.
THEME_CHOICES = ('light', 'dark')
ACCENT_CHOICES = ('cyan', 'violet', 'emerald', 'amber')
MOTION_CHOICES = ('full', 'calm')
NOTIF_MODULES = ('lost_found', 'canteen', 'exam', 'other')

@auth_bp.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    """Personal settings: account details, appearance, alert delivery and privacy.
    Appearance is stored per user and also mirrored to localStorage by the page."""
    user = get_current_user()

    if request.method == 'POST':
        changed = []

        # --- Account -----------------------------------------------------
        full_name = (request.form.get('full_name') or '').strip()
        if full_name and len(full_name) <= 120 and full_name != user.full_name:
            user.full_name = full_name
            changed.append('name')

        phone = (request.form.get('phone') or '').strip()
        if phone and (len(phone) > 20 or not re.fullmatch(r'[0-9+\-\s]{6,20}', phone)):
            flash("Please enter a valid contact number (6-20 digits).", "danger")
            return render_template('auth/settings.html', user=user,
                                   theme_choices=THEME_CHOICES, accent_choices=ACCENT_CHOICES,
                                   motion_choices=MOTION_CHOICES, notif_modules=NOTIF_MODULES)
        if 'phone' in request.form:      # field absent (partial submit) -> keep the stored number
            user.phone = phone or None
            changed.append('contact')

        department = (request.form.get('department') or '').strip()
        if department and len(department) <= 100:
            user.department = department
            changed.append('department')

        semester = (request.form.get('semester') or '').strip()
        if semester and len(semester) <= 20:
            user.semester = semester
            changed.append('semester')

        # --- Alerts (checkboxes are simply absent when unticked) ----------
        user.notif_prefs = {m: (f'notif_{m}' in request.form) for m in NOTIF_MODULES}
        changed.append('alerts')

        # --- Appearance (whitelisted so a hand-crafted form can't store junk) ---
        ui = dict(user.ui_prefs)
        if request.form.get('theme') in THEME_CHOICES:
            ui['theme'] = request.form['theme']
        if request.form.get('accent') in ACCENT_CHOICES:
            ui['accent'] = request.form['accent']
        if request.form.get('motion') in MOTION_CHOICES:
            ui['motion'] = request.form['motion']
        ui['effects'] = 'fx_effects' in request.form
        user.ui_prefs = ui
        changed.append('appearance')

        # --- Privacy ------------------------------------------------------
        user.reveal_contact_to_matches = 'reveal_contact' in request.form
        changed.append('privacy')

        db.session.commit()
        AuditLog.log(action='USER_SETTINGS_UPDATED', module='AUTH', user_id=user.id,
                     details=f"Updated: {', '.join(changed)}.",
                     ip_address=request.remote_addr)
        flash("Your settings have been saved.", "success")
        return redirect(url_for('auth.settings'))

    return render_template('auth/settings.html', user=user,
                           theme_choices=THEME_CHOICES, accent_choices=ACCENT_CHOICES,
                           motion_choices=MOTION_CHOICES, notif_modules=NOTIF_MODULES)

@auth_bp.route('/export-data')
@login_required
def export_data():
    """GDPR-style download of everything the portal holds about the signed-in user."""
    from app.models import LostFoundItem, LostFoundClaim, LostFoundMatch, Notification, CanteenOrder
    user = get_current_user()

    reports = LostFoundItem.query.filter_by(user_id=user.id).order_by(LostFoundItem.id.desc()).all()
    claims = LostFoundClaim.query.filter_by(claimant_id=user.id).all()
    orders = CanteenOrder.query.filter_by(user_id=user.id).order_by(CanteenOrder.id.desc()).all()
    notes = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).all()
    my_ids = [r.id for r in reports]
    matches = LostFoundMatch.query.filter(
        db.or_(LostFoundMatch.lost_item_id.in_(my_ids), LostFoundMatch.found_item_id.in_(my_ids))
    ).all() if my_ids else []

    def iso(dt):
        return dt.isoformat() + 'Z' if dt else None

    payload = {
        'exported_at_utc': datetime.utcnow().isoformat() + 'Z',
        'institution': current_app.config.get('COLLEGE_NAME'),
        'account': {
            'full_name': user.full_name, 'email': user.email, 'role': user.role,
            'department': user.department, 'phone': user.phone,
            'usn_or_emp_id': user.usn_or_emp_id, 'designation': user.designation,
            'semester': user.semester, 'is_verified': user.is_verified,
            'is_active': user.is_active, 'registered_at_utc': iso(user.created_at),
            'preferences': {'notifications': user.notif_prefs, 'appearance': user.ui_prefs,
                            'reveal_contact_to_matches': user.reveals_contact_to_matches()},
        },
        'lost_found_reports': [
            {'id': r.id, 'type': r.report_type, 'title': r.title, 'category': r.category,
             'location': r.location_reported, 'status': r.status,
             'incident_time_utc': iso(r.date_time_reported), 'has_photo': bool(r.photo_url),
             'created_at_utc': iso(r.created_at)}
            for r in reports],
        'lost_found_claims': [
            {'id': c.id, 'item_id': c.item_id, 'status': c.status,
             'proof_statement': c.proof_statement, 'created_at_utc': iso(c.created_at)}
            for c in claims],
        'ai_match_pairs': [
            {'id': m.id, 'lost_item_id': m.lost_item_id, 'found_item_id': m.found_item_id,
             'status': m.status, 'similarity': m.similarity_score, 'composite': m.composite_score}
            for m in matches],
        'canteen_orders': [
            {'id': o.id, 'order_code': getattr(o, 'order_code', None), 'status': o.status,
             'total': getattr(o, 'total_amount', None), 'created_at_utc': iso(o.created_at)}
            for o in orders],
        'notifications': [
            {'id': n.id, 'category': n.category, 'title': n.title, 'message': n.message,
             'is_read': n.is_read, 'created_at_utc': iso(n.created_at)}
            for n in notes],
    }

    AuditLog.log(action='USER_DATA_EXPORT', module='AUTH', user_id=user.id,
                 details='Downloaded a JSON copy of personal data.',
                 ip_address=request.remote_addr)

    from flask import jsonify
    response = jsonify({'user_export': payload})
    response.headers['Content-Disposition'] = f"attachment; filename=smart-campus-360-{user.id}-data.json"
    return response

@auth_bp.route('/quick-switch/<role>')
def quick_switch(role):
    """
    Developer convenience helper to test application roles in 1 click.
    Switches active session to a seed user of the requested role.

    SECURITY (Phase 2): This endpoint is a privilege-escalation surface
    (no credentials required). It is therefore restricted to the development
    environment only via Config.ALLOW_QUICK_SWITCH; any attempt in production
    is refused, audited, and returns HTTP 403.
    """
    if not current_app.config.get('ALLOW_QUICK_SWITCH', False):
        AuditLog.log(
            action='QUICK_SWITCH_BLOCKED_PRODUCTION',
            module='AUTH',
            details=f"Security: blocked /auth/quick-switch/{role} attempt outside development environment.",
            ip_address=request.remote_addr
        )
        abort(403)

    user = User.query.filter_by(role=role).first()
    if user:
        login_user(user)
        flash(f"Switched role to {user.role.upper()} ({user.full_name}) for testing.", "info")
        next_url = request.args.get('next')
        if next_url:
            return redirect(next_url)
        if role == 'main_admin':
            return redirect(url_for('admin.dashboard'))
        elif role == 'canteen_admin':
            return redirect(url_for('canteen_admin.dashboard'))
        return redirect(url_for('main.index'))
    else:
        flash(f"Seed user with role '{role}' not found. Please run init_db.py.", "warning")
        return redirect(url_for('main.index'))
