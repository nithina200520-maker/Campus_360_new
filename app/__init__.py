from pathlib import Path
import json
import re
from datetime import timedelta
from flask import Flask, render_template, request
from app.config import config_by_name, Config
from app.database import db, init_db_connection
from app.utils.auth_helpers import get_current_user

# Timestamps are stored as naive UTC; campus users are in India (IST = UTC+5:30).
IST_OFFSET = timedelta(hours=5, minutes=30)

def _period_of_day(hour):
    """Map an hour (0-23) to a human day-part label."""
    if 5 <= hour < 12:
        return "Morning"
    if 12 <= hour < 17:
        return "Afternoon"
    if 17 <= hour < 20:
        return "Evening"
    return "Night"

def create_app(config_name="default"):
    """
    Application factory constructing the integrated Smart Campus 360 platform.
    """
    app = Flask(__name__)
    cfg = config_by_name.get(config_name, Config)
    app.config.from_object(cfg)
    app.config['BASE_DIR'] = Config.BASE_DIR

    # Ensure upload directories exist
    upload_dirs = [
        app.config['UPLOAD_FOLDER'],
        app.config['UPLOAD_NAV_DIR'],
        app.config['UPLOAD_LF_DIR'],
        app.config['UPLOAD_CANTEEN_DIR'],
        app.config['UPLOAD_QR_DIR'],
        app.config['UPLOAD_EXAM_DIR'],
        Config.BASE_DIR / "instance"
    ]
    for d in upload_dirs:
        Path(d).mkdir(parents=True, exist_ok=True)

    # Initialize Database
    init_db_connection(app)

    # Phase 4: Jinja helper to parse a stored JSON string (match factor breakdown)
    @app.template_filter('from_json')
    def from_json_filter(value):
        if not value:
            return {}
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return {}

    # Display helper: convert a stored naive-UTC datetime to IST and render it in
    # 12-hour AM/PM format with a Morning/Afternoon/Evening/Night confirmation label.
    @app.template_filter('ist')
    def ist_filter(value, fmt='%d %b %Y, %I:%M %p'):
        if not value:
            return '-'
        local = value + IST_OFFSET
        text = local.strftime(fmt)
        if ('%I' in fmt) or ('%H' in fmt):
            # drop the leading zero on the hour (07:18 PM -> 7:18 PM) and add the day-part
            text = re.sub(r'\b0(\d:)', r'\1', text)
            text = f"{text} ({_period_of_day(local.hour)})"
        return text

    # Register Context Processors for global template access
    @app.context_processor
    def inject_global_template_vars():
        user = get_current_user()
        unread_count = 0
        latest_notifications = []

        # Detect the campus module the user is currently browsing so the
        # notification bell shows only that module's alerts (never mixed).
        endpoint = request.endpoint or ''
        path = request.path or ''
        if endpoint.startswith('lost_found') or path.startswith('/lost-found'):
            notif_module = 'lost_found'
        elif endpoint.startswith('canteen') or path.startswith('/canteen'):
            notif_module = 'canteen'
        elif endpoint == 'navigation.exam_finder' or path.startswith('/navigation/exam-finder'):
            notif_module = 'exam'
        elif endpoint.startswith('notifications'):
            m = request.args.get('module', 'all')
            notif_module = m if m in ('lost_found', 'canteen', 'exam', 'other') else 'all'
        else:
            notif_module = 'all'

        if user:
            from app.models import Notification
            cats = Notification.categories_for_module(notif_module)
            base_q = Notification.query.filter_by(user_id=user.id)
            if cats:
                base_q = base_q.filter(Notification.category.in_(cats))
            # Settings \u203a Alerts: modules the user switched off are never surfaced
            # in the bell or its unread badge (delivery still happens silently, so
            # nothing is lost if the switch is turned back on later).
            disabled = [m for m in ('lost_found', 'canteen', 'exam', 'other')
                        if not user.receives_module(m)]
            if disabled:
                off_cats = set()
                for m in disabled:
                    off_cats.update(Notification.categories_for_module(m))
                base_q = base_q.filter(Notification.category.notin_(tuple(off_cats)))
            unread_count = base_q.filter(Notification.is_read == False).count()
            latest_notifications = (base_q.order_by(Notification.created_at.desc())
                                    .limit(5).all())

        module_labels = {
            'lost_found': 'Lost & Found',
            'canteen': 'Smart Canteen',
            'exam': 'Exam Room Finder',
            'other': 'Other',
            'all': 'Notifications',
        }
        return {
            "current_user": user,
            "unread_notifications": unread_count,
            "latest_notifications": latest_notifications,
            "notif_module": notif_module,
            "notif_module_label": module_labels.get(notif_module, 'Notifications'),
            "COLLEGE_NAME": app.config.get("COLLEGE_NAME"),
            "COLLEGE_LOCATION": app.config.get("COLLEGE_LOCATION"),
            "COLLEGE_MAPS_URL": app.config.get("COLLEGE_MAPS_URL"),
            "APP_NAME": app.config.get("APP_NAME"),
            # Settings \u203a Appearance, consumed by the dashboard boot script
            "ui_prefs": user.ui_prefs if user else None,
            "ALLOW_QUICK_SWITCH": app.config.get("ALLOW_QUICK_SWITCH", False)
        }

    # Register Blueprints
    from app.blueprints.auth import auth_bp
    from app.blueprints.main import main_bp
    from app.blueprints.admin import admin_bp
    from app.blueprints.canteen_admin import canteen_admin_bp
    from app.blueprints.navigation import navigation_bp
    from app.blueprints.lost_found import lost_found_bp
    from app.blueprints.canteen import canteen_bp
    from app.blueprints.notifications import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(canteen_admin_bp)
    app.register_blueprint(navigation_bp)
    app.register_blueprint(lost_found_bp)
    app.register_blueprint(canteen_bp)
    app.register_blueprint(notifications_bp)

    # Register Error Handlers
    @app.errorhandler(403)
    def forbidden_error(error):
        return render_template('errors/403.html', user=get_current_user()), 403

    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('errors/404.html', user=get_current_user()), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('errors/500.html', user=get_current_user()), 500

    return app
