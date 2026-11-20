import json
import secrets
from datetime import datetime, time, timedelta
import bcrypt
from werkzeug.security import check_password_hash
from app.database import db

class User(db.Model):
    """User account model supporting campus roles and an optional admin scope."""
    __tablename__ = 'users'
    __table_args__ = (
        db.UniqueConstraint('role', 'usn_or_emp_id', name='uq_users_role_identifier'),
        db.UniqueConstraint('main_admin_guard', name='uq_users_main_admin_guard'),
    )

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    # Base roles: main_admin, canteen_admin, teacher, student, visitor.
    role = db.Column(db.String(30), nullable=False, default='student', index=True)
    main_admin_guard = db.Column(db.Boolean, nullable=True)
    # Scoped administration is separate so faculty retain their existing account role.
    admin_scope = db.Column(db.String(30), nullable=True, index=True)
    department = db.Column(db.String(100), nullable=True) # e.g. CSE, ECE, ME, Civil, Admin
    phone = db.Column(db.String(20), nullable=True)
    usn_or_emp_id = db.Column(db.String(50), nullable=True)
    designation = db.Column(db.String(100), nullable=True) # e.g. Professor, Assistant Professor, HOD
    semester = db.Column(db.String(20), nullable=True) # e.g. 1st Sem, 3rd Sem, 5th Sem, 7th Sem
    purpose_of_visit = db.Column(db.String(150), nullable=True) # For visitors: e.g. Parent Meeting, Campus Tour
    is_verified = db.Column(db.Boolean, default=True, nullable=False) # For teachers: requires Main Admin verification for canteen priority
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    reset_token = db.Column(db.String(100), nullable=True, index=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

    # Settings page preferences (all optional - NULL means "use the defaults")
    notif_prefs_json = db.Column(db.String(255), nullable=True)  # which alert groups to deliver
    ui_prefs_json = db.Column(db.String(255), nullable=True)     # theme / accent / motion / effects
    reveal_contact_to_matches = db.Column(db.Boolean, default=True, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Defaults shared with the Settings form; a stored key always wins.
    NOTIF_PREF_DEFAULTS = {'lost_found': True, 'canteen': True, 'exam': True, 'other': True}
    UI_PREF_DEFAULTS = {'theme': 'dark', 'accent': 'cyan', 'motion': 'full', 'effects': True}

    # Relationships
    lost_found_reports = db.relationship(
        'LostFoundItem', backref='reporter', lazy=True,
        foreign_keys='LostFoundItem.user_id', passive_deletes=True,
    )
    canteen_orders = db.relationship(
        'CanteenOrder', backref=db.backref('customer', lazy=True, passive_deletes=True),
        lazy=True, passive_deletes=True,
    )

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('ascii')

    def check_password(self, password: str) -> bool:
        if self.password_hash.startswith(('$2a$', '$2b$', '$2y$')):
            try:
                return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('ascii'))
            except (ValueError, UnicodeEncodeError):
                return False
        return check_password_hash(self.password_hash, password)

    # ---- Settings helpers -------------------------------------------------
    def _read_prefs(self, raw, defaults) -> dict:
        """Merge a stored JSON preference blob over its defaults, tolerating junk."""
        merged = dict(defaults)
        if raw:
            try:
                stored = json.loads(raw)
                if isinstance(stored, dict):
                    merged.update({k: v for k, v in stored.items() if k in defaults})
            except (ValueError, TypeError):
                pass
        return merged

    def _write_prefs(self, column, values, defaults):
        """Store only the keys that differ from the defaults, or NULL if none do."""
        delta = {k: v for k, v in values.items() if defaults.get(k) != v}
        setattr(self, column, json.dumps(delta) if delta else None)

    @property
    def notif_prefs(self) -> dict:
        return self._read_prefs(self.notif_prefs_json, self.NOTIF_PREF_DEFAULTS)

    @notif_prefs.setter
    def notif_prefs(self, values: dict):
        self._write_prefs('notif_prefs_json', values, self.NOTIF_PREF_DEFAULTS)

    @property
    def ui_prefs(self) -> dict:
        return self._read_prefs(self.ui_prefs_json, self.UI_PREF_DEFAULTS)

    @ui_prefs.setter
    def ui_prefs(self, values: dict):
        self._write_prefs('ui_prefs_json', values, self.UI_PREF_DEFAULTS)

    def receives_module(self, module: str) -> bool:
        """Whether this user wants alerts for a notification module group."""
        return bool(self.notif_prefs.get(module, True))

    def reveals_contact_to_matches(self) -> bool:
        """Privacy switch: share my name/contact with the matched counterpart."""
        return self.reveal_contact_to_matches is not False

    def is_main_admin(self) -> bool:
        return self.role == 'main_admin'

    def has_module_admin(self, module_key: str) -> bool:
        if self.role == 'main_admin':
            return True
        assignment_query = AdminAssignment.query.join(AdminModule).filter(
            AdminAssignment.user_id == self.id,
            AdminModule.key == module_key,
        )
        assignment = assignment_query.first()
        if assignment:
            return bool(
                self.is_active and assignment.status == 'active'
                and assignment.module.is_active
            )
        # Compatibility for unmigrated deployments and legacy direct updates.
        return self.admin_scope == module_key

    def has_module_permission(self, module_key: str, permission: str) -> bool:
        """Check a live module grant without trusting stale JWT role data."""
        if self.role == 'main_admin':
            return True
        assignment = AdminAssignment.query.join(AdminModule).filter(
            AdminAssignment.user_id == self.id,
            AdminModule.key == module_key,
        ).first()
        if assignment and self.is_active and assignment.status == 'active' and assignment.module.is_active:
            return permission in assignment.permissions
        # Keep direct legacy admin_scope assignments fully functional until they
        # are migrated to a persistent AdminAssignment row.
        return self.admin_scope == module_key and self.is_active

    def is_canteen_admin(self) -> bool:
        return self.role in ('main_admin', 'canteen_admin') or self.has_module_admin('canteen')

    def is_lost_found_admin(self) -> bool:
        return self.has_module_admin('lost_found')

    def is_navigation_admin(self) -> bool:
        return self.has_module_admin('navigation')

    @property
    def admin_role_label(self) -> str | None:
        labels = {
            'lost_found': 'Lost & Found Admin',
            'navigation': 'College Navigation Admin',
            'canteen': 'Canteen Admin',
        }
        return labels.get(self.admin_scope)

    def is_teacher(self) -> bool:
        return self.role == 'teacher'

    def is_verified_teacher(self) -> bool:
        """Returns True only if user is a teacher AND verified by Main Admin."""
        return self.role == 'teacher' and bool(self.is_verified)

    def generate_reset_token(self) -> str:
        """Generates a secure 48-character token valid for 30 minutes."""
        self.reset_token = secrets.token_urlsafe(36)
        self.reset_token_expiry = datetime.utcnow() + timedelta(minutes=30)
        return self.reset_token

    def verify_reset_token(self, token: str) -> bool:
        """Validates token authenticity and expiration (constant-time comparison)."""
        if not self.reset_token or not self.reset_token_expiry:
            return False
        if not secrets.compare_digest(self.reset_token, token):
            return False
        return datetime.utcnow() <= self.reset_token_expiry

    def clear_reset_token(self):
        """Clears the token after successful password reset."""
        self.reset_token = None
        self.reset_token_expiry = None

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "admin_scope": self.admin_scope,
            "department": self.department,
            "phone": self.phone,
            "usn_or_emp_id": self.usn_or_emp_id,
            "designation": self.designation,
            "semester": self.semester,
            "purpose_of_visit": self.purpose_of_visit,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None
        }

    def __repr__(self):
        return f"<User {self.email} ({self.role}, verified={self.is_verified})>"


class AdminModule(db.Model):
    """Database-configurable module that can be assigned to an administrator."""
    __tablename__ = 'admin_modules'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignments = db.relationship('AdminAssignment', backref='module', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'key': self.key, 'name': self.name,
            'description': self.description, 'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class AdminAssignment(db.Model):
    """Persistent module-admin grant with a revocable live status."""
    __tablename__ = 'admin_assignments'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'module_id', name='uq_admin_assignment_user_module'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    module_id = db.Column(db.Integer, db.ForeignKey('admin_modules.id', ondelete='CASCADE'), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='active', index=True)
    permissions_json = db.Column(db.Text, nullable=False, default='[]')
    assigned_by_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    revoked_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship(
        'User', foreign_keys=[user_id],
        backref=db.backref('admin_assignments', passive_deletes=True),
    )

    @property
    def permissions(self):
        try:
            values = json.loads(self.permissions_json or '[]')
            return values if isinstance(values, list) else []
        except (ValueError, TypeError):
            return []

    @permissions.setter
    def permissions(self, values):
        self.permissions_json = json.dumps(values if isinstance(values, list) else [])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user': {
                'id': self.user.id, 'name': self.user.full_name,
                'email': self.user.email, 'role': self.user.role,
            } if self.user else None,
            'module_id': self.module_id,
            'module': self.module.to_dict() if self.module else None,
            'status': self.status,
            'permissions': self.permissions,
            'assigned_by_id': self.assigned_by_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
        }


class MainAdminSetupState(db.Model):
    """Persistent one-time initialization marker, independent of the admin user row."""
    __tablename__ = 'main_admin_setup_state'

    key = db.Column(db.String(40), primary_key=True)
    admin_user_id = db.Column(db.Integer, nullable=True)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class MainAdminHandoff(db.Model):
    """Single-use, expiring credential for an explicitly initiated admin transfer."""
    __tablename__ = 'main_admin_handoffs'

    id = db.Column(db.Integer, primary_key=True)
    code_hash = db.Column(db.String(64), nullable=False, unique=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    claimed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    claimed_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)


class NavigationNode(db.Model):
    """
    Campus location node for map search, routing, and Street View/photo POIs.
    Contains clearly labeled sample data flags for development.
    """
    __tablename__ = 'navigation_nodes'

    id = db.Column(db.Integer, primary_key=True)
    node_code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    building = db.Column(db.String(100), nullable=False, index=True)
    floor = db.Column(db.String(50), nullable=False, default='Ground Floor', index=True)
    category = db.Column(db.String(50), nullable=False, default='Classroom', index=True)
    description = db.Column(db.Text, nullable=True)
    x_coord = db.Column(db.Integer, nullable=False, default=0) # 2D map canvas coordinate X
    y_coord = db.Column(db.Integer, nullable=False, default=0) # 2D map canvas coordinate Y
    photo_url = db.Column(db.String(255), nullable=True)
    is_panoramic = db.Column(db.Boolean, default=False, nullable=False)
    is_accessible = db.Column(db.Boolean, default=True, nullable=False)
    is_sample_data = db.Column(db.Boolean, default=True, nullable=False)
    # Phase 8: Main Admin location publication - unpublished rooms/points are
    # hidden from the public map, APIs and route finding until officially published.
    is_published = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Graph relationships
    outgoing_edges = db.relationship('NavigationEdge', backref='source_node', lazy=True, foreign_keys='NavigationEdge.source_node_id', cascade="all, delete-orphan")
    incoming_edges = db.relationship('NavigationEdge', backref='target_node', lazy=True, foreign_keys='NavigationEdge.target_node_id', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "node_code": self.node_code,
            "name": self.name,
            "building": self.building,
            "floor": self.floor,
            "category": self.category,
            "description": self.description,
            "x_coord": self.x_coord,
            "y_coord": self.y_coord,
            "photo_url": self.photo_url,
            "is_panoramic": self.is_panoramic,
            "is_accessible": self.is_accessible,
            "is_sample_data": self.is_sample_data,
            "is_published": self.is_published
        }

    def __repr__(self):
        return f"<NavigationNode {self.node_code}: {self.name}>"


class NavigationEdge(db.Model):
    """Bidirectional / directed connections between navigation nodes for A* and Dijkstra."""
    __tablename__ = 'navigation_edges'

    id = db.Column(db.Integer, primary_key=True)
    source_node_id = db.Column(db.Integer, db.ForeignKey('navigation_nodes.id', ondelete='CASCADE'), nullable=False)
    target_node_id = db.Column(db.Integer, db.ForeignKey('navigation_nodes.id', ondelete='CASCADE'), nullable=False)
    distance_meters = db.Column(db.Float, nullable=False, default=10.0)
    direction_hint = db.Column(db.String(255), nullable=True)
    is_bidirectional = db.Column(db.Boolean, default=True, nullable=False)
    is_sample_data = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "source_node_id": self.source_node_id,
            "target_node_id": self.target_node_id,
            "distance_meters": self.distance_meters,
            "direction_hint": self.direction_hint,
            "is_bidirectional": self.is_bidirectional,
            "is_sample_data": self.is_sample_data
        }


class LostFoundItem(db.Model):
    """Lost and Found catalog items with photo embeddings and status tracking."""
    __tablename__ = 'lost_found_items'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    report_type = db.Column(db.String(10), nullable=False) # 'lost' or 'found'
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False, default='Other')
    location_reported = db.Column(db.String(150), nullable=False)
    date_time_reported = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    description = db.Column(db.Text, nullable=False)
    photo_url = db.Column(db.String(255), nullable=True)
    image_feature_vector = db.Column(db.Text, nullable=True) # JSON serialized embedding
    color_hint = db.Column(db.String(30), nullable=True) # Phase 4: dominant item colour for contextual ranking
    status = db.Column(db.String(20), nullable=False, default='open') # 'open', 'matched', 'claimed', 'closed'
    contact_phone = db.Column(db.String(20), nullable=True)
    resolution_note = db.Column(db.Text, nullable=True) # Phase 4: admin dispute / handover remarks
    claimed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    verified_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    collected_at = db.Column(db.DateTime, nullable=True)
    # Phase 5: duplicate-report detection (same user re-reporting the same item)
    is_duplicate = db.Column(db.Boolean, default=False, nullable=False)
    duplicate_of_id = db.Column(db.Integer, db.ForeignKey('lost_found_items.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reporter_name": self.reporter.full_name if self.reporter else "Unknown",
            "report_type": self.report_type,
            "title": self.title,
            "category": self.category,
            "location_reported": self.location_reported,
            "date_time_reported": self.date_time_reported.strftime('%Y-%m-%d %H:%M') if self.date_time_reported else None,
            "description": self.description,
            "photo_url": self.photo_url,
            "status": self.status,
            "contact_phone": self.contact_phone,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None
        }


class LostFoundMatch(db.Model):
    """AI-suggested similarity pairings between lost and found items."""
    __tablename__ = 'lost_found_matches'

    id = db.Column(db.Integer, primary_key=True)
    lost_item_id = db.Column(db.Integer, db.ForeignKey('lost_found_items.id', ondelete='CASCADE'), nullable=False)
    found_item_id = db.Column(db.Integer, db.ForeignKey('lost_found_items.id', ondelete='CASCADE'), nullable=False)
    similarity_score = db.Column(db.Float, nullable=False) # e.g. 0.87 (image embedding cosine)
    composite_score = db.Column(db.Float, nullable=True) # Phase 4: image + category/colour/date/location blend
    factors = db.Column(db.Text, nullable=True) # Phase 4: JSON breakdown of contextual signals
    status = db.Column(db.String(20), default='suggested') # 'suggested', 'verified', 'rejected'
    # Phase 5: Main Admin review decision on a suggested match
    decided_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    decided_at = db.Column(db.DateTime, nullable=True)
    rejected_reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    lost_item = db.relationship('LostFoundItem', foreign_keys=[lost_item_id])
    found_item = db.relationship('LostFoundItem', foreign_keys=[found_item_id])
    deciding_admin = db.relationship('User', foreign_keys=[decided_by_admin_id])


class LostFoundClaim(db.Model):
    """Phase 4: formal ownership claim against a report, requiring authorized verification."""
    __tablename__ = 'lost_found_claims'

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('lost_found_items.id', ondelete='CASCADE'), nullable=False)
    claimant_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    proof_statement = db.Column(db.Text, nullable=False) # claimant's ownership description (never shown publicly)
    status = db.Column(db.String(20), default='pending') # 'pending', 'approved', 'rejected'
    decided_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    decision_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    decided_at = db.Column(db.DateTime, nullable=True)

    item = db.relationship('LostFoundItem', backref='claims')
    claimant = db.relationship('User', foreign_keys=[claimant_id])
    deciding_admin = db.relationship('User', foreign_keys=[decided_by_admin_id])


class Notification(db.Model):
    """Phase 4: in-app user notifications. Targeted only - never broadcast to all users."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(20), default='system') # 'match', 'claim', 'return', 'canteen', 'admin', 'system'
    link_url = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    # Phase 5: idempotency key - the same logical event can never notify twice
    # (NULL rows are legacy Phase 4 records and always allowed to coexist)
    dedup_key = db.Column(db.String(120), nullable=True, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by_id = db.Column(db.Integer, nullable=True)
    originating_module = db.Column(db.String(50), nullable=True, index=True)
    audience = db.Column(db.String(30), nullable=True)

    user = db.relationship(
        'User', foreign_keys=[user_id],
        backref=db.backref('notifications', passive_deletes=True),
    )

    # Notification grouping by campus module, so Lost & Found alerts and Smart
    # Canteen alerts are never mixed in the same view. Exam timetable alerts
    # form their own module so hall allotments stay separate from everything else.
    LOST_FOUND_CATEGORIES = ('found', 'match', 'claim', 'return', 'admin')
    CANTEEN_CATEGORIES = ('canteen',)
    EXAM_CATEGORIES = ('exam',)
    OTHER_CATEGORIES = ('system',)
    MODULE_CATEGORIES = {
        'lost_found': LOST_FOUND_CATEGORIES,
        'canteen': CANTEEN_CATEGORIES,
        'exam': EXAM_CATEGORIES,
        'other': OTHER_CATEGORIES,
    }

    @classmethod
    def categories_for_module(cls, module):
        """Return the tuple of categories for a module key, or None for 'all'."""
        return cls.MODULE_CATEGORIES.get(module)

    @classmethod
    def module_for_category(cls, category):
        """Reverse map: which module a single category belongs to."""
        for module, cats in cls.MODULE_CATEGORIES.items():
            if category in cats:
                return module
        return 'other'

    @classmethod
    def notify(cls, user_id, title, message, category='system', link_url=None, dedup_key=None):
        """
        Create one targeted in-app notification (no commit - caller controls the transaction).
        Phase 5: when a dedup_key is supplied, an already-recorded key is silently
        skipped, preventing duplicate notifications for the same match/event.
        """
        if not user_id:
            return None
        if dedup_key and cls.query.filter_by(dedup_key=dedup_key).first():
            return None
        note = cls(user_id=user_id, title=title, message=message,
                   category=category, link_url=link_url, dedup_key=dedup_key)
        db.session.add(note)
        return note

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "category": self.category,
            "link_url": self.link_url,
            "is_read": self.is_read,
            "created_by_id": self.created_by_id,
            "originating_module": self.originating_module or self.module_for_category(self.category),
            "audience": self.audience or "individual",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ExamSchedule(db.Model):
    """
    EXAM ROOM FINDER: Main Admin publishes which exam happens when, in which
    campus room (a navigation node). Affected students/teachers are notified
    and can then find their hall and route to it from the Exam Room Finder.
    """
    __tablename__ = 'exam_schedules'

    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(30), nullable=False)       # e.g. 21CS401
    subject_name = db.Column(db.String(150), nullable=False)      # e.g. Data Structures
    exam_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    session = db.Column(db.String(20), nullable=True)             # day-part label: Morning / Afternoon / Evening
    # The exam hall MAY be a published navigation node, so the finder can deep-link
    # straight into the Photo Route Guide. It is optional: a single-form allotment can
    # be published with just a typed Room Number (no map hall chosen).
    room_node_id = db.Column(db.Integer, db.ForeignKey('navigation_nodes.id', ondelete='CASCADE'),
                             nullable=True, index=True)
    # Human room / hall number typed by the admin (e.g. "A-101"), shown alongside the map room.
    room_number = db.Column(db.String(50), nullable=True)
    # Audience targeting: role plus optional department/semester (NULL = all)
    audience_role = db.Column(db.String(30), nullable=False, default='student')  # student | teacher
    department = db.Column(db.String(100), nullable=True)
    semester = db.Column(db.String(20), nullable=True)
    # Optional USN range: narrow the student audience to those whose USN falls
    # between these bounds (inclusive), e.g. 4HG2CS0001 .. 4HG2CS0050. Blank = no limit.
    usn_from = db.Column(db.String(50), nullable=True)
    usn_to = db.Column(db.String(50), nullable=True)
    instructions = db.Column(db.Text, nullable=True)
    # Optional uploaded notice/timetable document (PDF or image) attached by the admin.
    attachment_url = db.Column(db.String(255), nullable=True)
    attachment_name = db.Column(db.String(150), nullable=True)
    # Notification trail: set once the allotment alert has been broadcast to the audience
    notified_at = db.Column(db.DateTime, nullable=True)
    notify_count = db.Column(db.Integer, nullable=False, default=0)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    room = db.relationship('NavigationNode', foreign_keys=[room_node_id])

    @property
    def time_window(self):
        """Readable conduct window, e.g. '9:30 AM - 12:00 PM Morning'."""
        parts = f"{self.human_time(self.start_time)} - {self.human_time(self.end_time)}"
        return f"{parts} {self.session}".strip() if self.session else parts

    # Canonical branches for the column-wise exam timetable (code, full name, icon).
    # Admins publish a hall allotment per branch code; profiles may store either the
    # code or the full department name, so BRANCH_ALIASES resolves both to one code.
    BRANCH_CATALOG = [
        {'code': 'CS',   'name': 'Computer Science and Engineering',        'emoji': '💻'},
        {'code': 'AIDS', 'name': 'Artificial Intelligence and Data Science', 'emoji': '🤖'},
        {'code': 'EC',   'name': 'Electronics and Communication Engineering', 'emoji': '📡'},
        {'code': 'EEE',  'name': 'Electrical and Electronics Engineering',   'emoji': '⚡'},
        {'code': 'CE',   'name': 'Civil Engineering',                        'emoji': '🏗️'},
        {'code': 'MECH', 'name': 'Mechanical Engineering',                   'emoji': '⚙️'},
    ]
    BRANCH_ORDER = tuple(b['code'] for b in BRANCH_CATALOG)
    BRANCH_ALIASES = {
        'CS': 'CS', 'CSE': 'CS', 'COMPUTER SCIENCE AND ENGINEERING': 'CS',
        'COMPUTER SCIENCE & ENGINEERING': 'CS', 'COMPUTER SCIENCE': 'CS',
        'AIDS': 'AIDS', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AIDS',
        'ARTIFICIAL INTELLIGENCE & DATA SCIENCE': 'AIDS', 'AI AND DATA SCIENCE': 'AIDS',
        'EC': 'EC', 'ECE': 'EC', 'ELECTRONICS AND COMMUNICATION ENGINEERING': 'EC',
        'ELECTRONICS & COMMUNICATION ENGINEERING': 'EC', 'ELECTRONICS AND COMMUNICATION': 'EC',
        'EEE': 'EEE', 'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
        'ELECTRICAL & ELECTRONICS ENGINEERING': 'EEE', 'ELECTRICAL AND ELECTRONICS': 'EEE',
        'CE': 'CE', 'CIVIL': 'CE', 'CIVIL ENGINEERING': 'CE',
        'MECH': 'MECH', 'ME': 'MECH', 'MECHANICAL': 'MECH', 'MECHANICAL ENGINEERING': 'MECH',
    }
    # Semester dropdown for exam allotments: 1st through 8th.
    SEMESTER_OPTIONS = ('1st Sem', '2nd Sem', '3rd Sem', '4th Sem',
                        '5th Sem', '6th Sem', '7th Sem', '8th Sem')

    @classmethod
    def branch_code(cls, department):
        """Resolve any department string (branch code OR full name) to a single
        canonical branch code so students line up with the right timetable column."""
        if not department:
            return None
        d = department.strip().upper()
        if d in cls.BRANCH_ORDER:
            return d
        if d in cls.BRANCH_ALIASES:
            return cls.BRANCH_ALIASES[d]
        for alias, code in cls.BRANCH_ALIASES.items():
            if ' ' in alias and alias in d:
                return code
        return d  # unknown branch: keep the admin's own label

    @staticmethod
    def semester_key(value):
        """Normalise '3rd Semester' / '3rd Sem' / '3' to a comparable token ('3')."""
        import re
        if not value:
            return ''
        m = re.search(r'\d+', value)
        return m.group() if m else value.strip().lower()

    @classmethod
    def build_branch_matrix(cls, schedules):
        """Group student allotments into a column-wise matrix: one block per exam
        date, each holding one column per branch with that branch's exams (sorted
        by start time). Used by both the admin preview and the read-only student view."""
        from collections import defaultdict
        by_date = defaultdict(lambda: defaultdict(list))
        for s in schedules:
            if (s.audience_role or 'student') != 'student':
                continue
            code = cls.branch_code(s.department) or 'ALL BRANCHES'
            by_date[s.exam_date][code].append(s)

        def col_key(code):
            try:
                return (0, cls.BRANCH_ORDER.index(code), code)
            except ValueError:
                return (1, 0, code)

        matrix = []
        for exam_day in sorted(by_date.keys()):
            columns = []
            for code in sorted(by_date[exam_day].keys(), key=col_key):
                exams = sorted(by_date[exam_day][code], key=lambda s: (s.start_time or time(0, 0)))
                columns.append({'branch': code, 'exams': exams})
            matrix.append({'date': exam_day, 'columns': columns})
        return matrix

    def usn_in_range(self, usn):
        """True when a USN sits within this allotment's optional [from..to] range
        (inclusive). Comparison is on the upper-cased string, which lines up for
        fixed-width college USNs (e.g. 4HG2CS0001). A blank bound is unbounded."""
        if not self.usn_from and not self.usn_to:
            return True
        if not usn:
            return False
        u = usn.strip().upper()
        if self.usn_from and u < self.usn_from.strip().upper():
            return False
        if self.usn_to and u > self.usn_to.strip().upper():
            return False
        return True

    def audience_users(self):
        """Active users this allotment applies to. Students are matched by their
        resolved BRANCH CODE (so a profile storing 'Computer Science & Engineering'
        is found by a 'CSE' allotment), normalised semester number, and an optional
        USN range (from..to, inclusive)."""
        users = User.query.filter_by(role=self.audience_role, is_active=True).all()
        if self.audience_role != 'student':
            return users
        want_branch = self.branch_code(self.department) if self.department else None
        want_sem = self.semester_key(self.semester) if self.semester else None
        result = []
        for u in users:
            if want_branch and self.branch_code(u.department) != want_branch:
                continue
            if want_sem and self.semester_key(u.semester) != want_sem:
                continue
            if not self.usn_in_range(u.usn_or_emp_id):
                continue
            result.append(u)
        return result

    def audience_query(self):
        """Active users this allotment applies to (students of a dept/sem or teachers)."""
        query = User.query.filter_by(role=self.audience_role, is_active=True)
        if self.audience_role == 'student':
            if self.department:
                query = query.filter(User.department == self.department)
            if self.semester:
                query = query.filter(User.semester == self.semester)
        return query

    def human_time(self, value):
        return value.strftime('%I:%M %p').lstrip('0') if value else '-'

    def to_dict(self):
        return {
            "id": self.id,
            "subject_code": self.subject_code,
            "subject_name": self.subject_name,
            "exam_date": self.exam_date.isoformat() if self.exam_date else None,
            "start_time": self.start_time.strftime('%H:%M') if self.start_time else None,
            "end_time": self.end_time.strftime('%H:%M') if self.end_time else None,
            "session": self.session,
            "room_node_id": self.room_node_id,
            "room_number": self.room_number,
            "room_name": self.room.name if self.room else '',
            "building": self.room.building if self.room else '',
            "floor": self.room.floor if self.room else '',
            "audience_role": self.audience_role,
            "department": self.department,
            "semester": self.semester,
            "usn_from": self.usn_from,
            "usn_to": self.usn_to,
            "instructions": self.instructions,
            "attachment_url": self.attachment_url,
            "attachment_name": self.attachment_name,
            "notified_at": self.notified_at.isoformat() if self.notified_at else None,
            "notify_count": self.notify_count,
        }


class CanteenCategory(db.Model):
    """Categorization for canteen food items (e.g. Breakfast, Lunch, Beverages)."""
    __tablename__ = 'canteen_categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('CanteenItem', backref='category_rel', lazy=True, cascade="all, delete-orphan")


class CanteenItem(db.Model):
    """Canteen food item with pricing, availability, and real-time inventory."""
    __tablename__ = 'canteen_items'

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('canteen_categories.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(8, 2), nullable=False, default=0.00)
    stock_quantity = db.Column(db.Integer, nullable=False, default=50)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    preparation_time_mins = db.Column(db.Integer, default=10, nullable=False)
    photo_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "category_name": self.category_rel.name if self.category_rel else "",
            "name": self.name,
            "description": self.description,
            "price": float(self.price),
            "stock_quantity": self.stock_quantity,
            "is_available": self.is_available,
            "preparation_time_mins": self.preparation_time_mins,
            "photo_url": self.photo_url
        }


class CanteenPickupSlot(db.Model):
    """Phase 6: configurable canteen pickup slots with per-slot order capacity."""
    __tablename__ = 'canteen_pickup_slots'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)          # e.g. "Lunch Break"
    slot_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(5), nullable=False)       # 'HH:MM'
    end_time = db.Column(db.String(5), nullable=False)         # 'HH:MM'
    order_capacity = db.Column(db.Integer, nullable=False, default=50)  # max orders
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_sample_data = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def starts_at(self) -> datetime:
        """Combined date + start time as a naive local datetime."""
        hour, minute = (int(p) for p in self.start_time.split(':'))
        return datetime.combine(self.slot_date, datetime.min.time()).replace(hour=hour, minute=minute)

    @property
    def ends_at(self) -> datetime:
        hour, minute = (int(p) for p in self.end_time.split(':'))
        return datetime.combine(self.slot_date, datetime.min.time()).replace(hour=hour, minute=minute)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slot_date": self.slot_date.strftime('%Y-%m-%d'),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "order_capacity": self.order_capacity,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<CanteenPickupSlot {self.name} {self.slot_date} {self.start_time}-{self.end_time}>"


class CanteenOrder(db.Model):
    """
    Canteen pre-orders with Teacher-First Priority queue handling and QR code generation.
    """
    __tablename__ = 'canteen_orders'

    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    user_role_at_order = db.Column(db.String(20), nullable=False)
    is_priority = db.Column(db.Boolean, default=False, nullable=False, index=True) # True for teachers
    total_amount = db.Column(db.Numeric(8, 2), nullable=False, default=0.00)
    pickup_time = db.Column(db.DateTime, nullable=False)
    # Phase 6: slot booking + secure tokenized pickup QR
    slot_id = db.Column(db.Integer, db.ForeignKey('canteen_pickup_slots.id', ondelete='SET NULL'), nullable=True, index=True)
    pickup_token = db.Column(db.String(64), nullable=True, unique=True)  # opaque QR secret
    estimated_ready_at = db.Column(db.DateTime, nullable=True)           # realistic queue estimate
    confirmed_at = db.Column(db.DateTime, nullable=True)
    order_status = db.Column(db.String(24), nullable=False, default='placed', index=True)
    # Phase 6 statuses: 'pending', 'confirmed', 'preparing', 'ready', 'collected',
    # 'cancelled', 'refund_requested', 'refund_processing', 'refunded'
    # ('placed' remains valid for pre-Phase-6 legacy records and is shown as Pending)
    payment_status = db.Column(db.String(20), nullable=False, default='paid') # 'pending', 'paid', 'partially_refunded', 'refunded'
    payment_method = db.Column(db.String(30), default='upi_simulation')
    qr_code_path = db.Column(db.String(255), nullable=True)
    refund_reason = db.Column(db.Text, nullable=True)
    collected_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship('CanteenOrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    slot = db.relationship('CanteenPickupSlot', backref='orders', lazy=True)
    # Phase 7: gateway payment record + refund trail (1 order : 0..1 payment)
    payment = db.relationship('Payment', back_populates='order', uselist=False, lazy=True)

    # Phase 6: customer-facing labels for every lifecycle state
    STATUS_LABELS = {
        'placed': 'Pending',
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'preparing': 'Preparing',
        'ready': 'Ready for Pickup',
        'collected': 'Collected',
        'cancelled': 'Cancelled',
        'refund_requested': 'Refund Requested',
        'refund_processing': 'Refund Processing',
        'refunded': 'Refunded',
    }

    @property
    def status_label(self) -> str:
        return self.STATUS_LABELS.get(self.order_status, self.order_status.title())

    def to_dict(self):
        return {
            "id": self.id,
            "order_code": self.order_code,
            "user_id": self.user_id,
            "customer_name": self.customer.full_name if self.customer else "Unknown",
            "user_role_at_order": self.user_role_at_order,
            "is_priority": self.is_priority,
            "total_amount": float(self.total_amount),
            "pickup_time": self.pickup_time.strftime('%Y-%m-%d %H:%M') if self.pickup_time else None,
            "slot_id": self.slot_id,
            "estimated_ready_at": self.estimated_ready_at.strftime('%Y-%m-%d %H:%M') if self.estimated_ready_at else None,
            "order_status": self.order_status,
            "status_label": self.status_label,
            "payment_status": self.payment_status,
            "payment_method": self.payment_method,
            "qr_code_path": self.qr_code_path,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None,
            "items_count": len(self.items)
        }


class CanteenOrderItem(db.Model):
    """Line items for each canteen order."""
    __tablename__ = 'canteen_order_items'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('canteen_orders.id', ondelete='CASCADE'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('canteen_items.id', ondelete='CASCADE'), nullable=False)
    item_name = db.Column(db.String(150), nullable=False)
    unit_price = db.Column(db.Numeric(8, 2), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    subtotal = db.Column(db.Numeric(8, 2), nullable=False)


# ============================================================ PHASE 7: PAYMENTS

class Payment(db.Model):
    """
    One gateway payment per order. The gateway intent id is UNIQUE, so the same
    transaction can never be captured twice; every status change is driven only
    by backend verification (provider confirm call or a signature-verified
    webhook) - never by anything the browser claims.
    """
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('canteen_orders.id', ondelete='CASCADE'),
                         nullable=False, unique=True, index=True)
    provider = db.Column(db.String(20), nullable=False, default='sandbox')  # 'sandbox' | 'stripe'
    intent_id = db.Column(db.String(120), nullable=False, unique=True)      # gateway payment-intent ref
    transaction_reference = db.Column(db.String(120), nullable=True)        # gateway charge ref (recorded)
    client_secret = db.Column(db.String(255), nullable=True)                # shown to the payer only
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(8), nullable=False, default='inr')
    # 'created' -> 'processing' | 'succeeded' | 'failed' | 'canceled'
    # succeeded -> 'refunded' | 'partially_refunded'
    status = db.Column(db.String(24), nullable=False, default='created', index=True)
    failure_reason = db.Column(db.Text, nullable=True)
    refunded_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    # True when the intent was captured but the order could not be confirmed
    # (mismatch is surfaced to admins and refundable - money is never lost).
    confirm_mismatch = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    succeeded_at = db.Column(db.DateTime, nullable=True)
    failed_at = db.Column(db.DateTime, nullable=True)

    order = db.relationship('CanteenOrder', back_populates='payment')
    refunds = db.relationship('Refund', back_populates='payment', lazy=True,
                              cascade="all, delete-orphan", order_by='Refund.id')

    @property
    def refundable_amount(self):
        return max(float(self.amount or 0) - float(self.refunded_amount or 0), 0.0)

    def to_dict(self):
        return {
            "id": self.id,
            "order_code": self.order.order_code if self.order else None,
            "provider": self.provider,
            "intent_id": self.intent_id,
            "transaction_reference": self.transaction_reference,
            "amount": float(self.amount),
            "currency": self.currency,
            "status": self.status,
            "refunded_amount": float(self.refunded_amount or 0),
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None,
        }


class Refund(db.Model):
    """
    Full or partial refund trail. Lifecycle mirrors the required workflow:
    complaint recorded ('requested') -> verified -> authorized + initiated
    through the gateway ('pending'/'processing') -> status only becomes
    'succeeded' on reliable gateway confirmation (sync result, re-sync or
    verified webhook). Failures stay visible for retry - nothing silent.
    """
    __tablename__ = 'refunds'

    id = db.Column(db.Integer, primary_key=True)
    refund_reference = db.Column(db.String(40), nullable=False, unique=True)  # our own REF-... code
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id', ondelete='CASCADE'),
                           nullable=True, index=True)  # NULL: complaint on a legacy/cash order (no gateway payment)
    order_id = db.Column(db.Integer, db.ForeignKey('canteen_orders.id', ondelete='CASCADE'),
                         nullable=False, index=True)
    provider_refund_id = db.Column(db.String(120), nullable=True, unique=True)  # gateway refund ref
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(8), nullable=False, default='inr')
    is_partial = db.Column(db.Boolean, nullable=False, default=False)
    # 'requested' -> 'processing' | 'succeeded' | 'failed' ('failed' -> retry -> 'processing')
    status = db.Column(db.String(20), nullable=False, default='requested', index=True)
    # 1. complaint record
    complaint_note = db.Column(db.Text, nullable=True)
    requested_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    # 4. explicit authorization by canteen/main admin before the gateway call
    authorized_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    authorized_at = db.Column(db.DateTime, nullable=True)
    initiated_at = db.Column(db.DateTime, nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)   # reliable gateway confirmation time
    gateway_message = db.Column(db.String(255), nullable=True)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payment = db.relationship('Payment', back_populates='refunds')
    order = db.relationship('CanteenOrder', backref=db.backref('refund_records', lazy=True))

    @property
    def status_label(self):
        return {
            'requested': 'Authorized Pending', 'processing': 'With Gateway',
            'succeeded': 'Refunded', 'failed': 'Failed - Retry Needed',
        }.get(self.status, self.status.title())

    def to_dict(self):
        return {
            "refund_reference": self.refund_reference,
            "amount": float(self.amount),
            "is_partial": self.is_partial,
            "status": self.status,
            "provider_refund_id": self.provider_refund_id,
        }


class WebhookEvent(db.Model):
    """
    Every signature-verified gateway event is recorded here keyed by the
    provider's UNIQUE event id - a duplicate delivery is detected before any
    business logic runs, so success/refund handlers are exactly-once.
    """
    __tablename__ = 'webhook_events'

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(20), nullable=False)
    event_id = db.Column(db.String(120), nullable=False, unique=True)  # duplicate-webhook guard
    event_type = db.Column(db.String(80), nullable=False)
    payload = db.Column(db.Text, nullable=True)
    # 'processed' | 'ignored' | 'failed'
    status = db.Column(db.String(16), nullable=False, default='ignored')
    error = db.Column(db.String(255), nullable=True)
    received_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)


class AuditLog(db.Model):
    """Global system audit log for security, administrative actions, and module events."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    module = db.Column(db.String(50), nullable=False) # 'AUTH', 'NAVIGATION', 'LOST_FOUND', 'CANTEEN', 'ADMIN'
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    actor_id = db.Column(db.Integer, nullable=True, index=True)
    target_user_id = db.Column(db.Integer, nullable=True, index=True)

    user = db.relationship('User', foreign_keys=[user_id])

    @classmethod
    def log(
        cls, action: str, module: str, user_id=None, details: str = None,
        ip_address: str = None, actor_id=None, target_user_id=None,
    ):
        """Standardized helper for recording security and administrative audit events."""
        try:
            entry = cls(
                action=action,
                module=module,
                user_id=user_id,
                actor_id=actor_id,
                target_user_id=target_user_id,
                details=details,
                ip_address=ip_address
            )
            db.session.add(entry)
            db.session.commit()
            return entry
        except Exception:
            db.session.rollback()
            return None

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "actor_id": self.actor_id,
            "target_user_id": self.target_user_id,
            "user_name": self.user.full_name if self.user else "System / Guest",
            "user_email": self.user.email if self.user else "-",
            "user_role": self.user.role if self.user else "-",
            "action": self.action,
            "module": self.module,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }


class CampusFloorPlan(db.Model):
    """Uploaded digital floor plan images per building/floor (Phase 3 navigation)."""
    __tablename__ = 'campus_floor_plans'

    id = db.Column(db.Integer, primary_key=True)
    building = db.Column(db.String(100), nullable=False, index=True)
    floor = db.Column(db.String(50), nullable=False, default='Ground Floor')
    title = db.Column(db.String(150), nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    is_sample_data = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "building": self.building,
            "floor": self.floor,
            "title": self.title,
            "image_url": self.image_url,
            "is_sample_data": self.is_sample_data
        }

    def __repr__(self):
        return f"<CampusFloorPlan {self.building} - {self.floor}>"
