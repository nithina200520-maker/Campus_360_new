from flask import render_template, request, redirect, url_for, flash, jsonify
from app.blueprints.notifications import notifications_bp
from app.models import Notification
from app.database import db
from app.utils.auth_helpers import login_required, get_current_user

VALID_MODULES = ('lost_found', 'canteen', 'exam', 'other')

@notifications_bp.route('/')
@login_required
def index():
    """PHASE 4/5: personal notification history (in-app only; no email dependency).
    Grouped by campus module so Lost & Found and Smart Canteen alerts stay separate."""
    user = get_current_user()
    only_unread = request.args.get('unread') == '1'
    # Primary grouping: the module tab currently selected
    module = request.args.get('module')
    if module not in VALID_MODULES:
        module = None
    # Optional finer filter within a module (legacy category chips)
    category = request.args.get('category')
    query = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc())
    if only_unread:
        query = query.filter_by(is_read=False)
    if module:
        query = query.filter(Notification.category.in_(Notification.categories_for_module(module)))
    elif category in ('match', 'claim', 'return', 'admin', 'system', 'canteen', 'exam'):
        query = query.filter_by(category=category)
    notifications = query.limit(200).all()
    return render_template('notifications/list.html', user=user,
                           notifications=notifications, only_unread=only_unread,
                           current_module=module, current_category=category)

@notifications_bp.route('/mark-read/<int:note_id>', methods=['POST'])
@login_required
def mark_read(note_id):
    note = Notification.query.get_or_404(note_id)
    if note.user_id != get_current_user().id:
        abort_forbidden()
    note.is_read = True
    db.session.commit()
    return redirect(request.referrer or url_for('notifications.index'))

@notifications_bp.route('/delete/<int:note_id>', methods=['POST'])
@login_required
def delete_note(note_id):
    """Swipe-to-delete: remove a single alert from the user's own history.
    Answers JSON for the swipe gesture and falls back to a redirect for plain form posts."""
    note = Notification.query.get_or_404(note_id)
    user = get_current_user()
    if note.user_id != user.id:
        abort_forbidden()
    db.session.delete(note)
    db.session.commit()
    if request.accept_mimetypes.best == 'application/json':
        return jsonify({'ok': True, 'id': note_id})
    flash("Notification deleted.", "success")
    return redirect(request.referrer or url_for('notifications.index'))

@notifications_bp.route('/mark-all-read', methods=['POST'])
@login_required
def mark_all_read():
    user = get_current_user()
    module = request.form.get('module')
    query = Notification.query.filter_by(user_id=user.id, is_read=False)
    if module in VALID_MODULES:
        query = query.filter(Notification.category.in_(Notification.categories_for_module(module)))
    query.update({'is_read': True})
    db.session.commit()
    flash("All notifications marked as read.", "success")
    if module in VALID_MODULES:
        return redirect(url_for('notifications.index', module=module))
    return redirect(url_for('notifications.index'))

def abort_forbidden():
    from flask import abort
    abort(403)
