from datetime import date, datetime
from flask import render_template, request, jsonify, flash, redirect, url_for
from app.blueprints.navigation import navigation_bp
from app.models import NavigationNode, NavigationEdge, CampusFloorPlan, ExamSchedule, User
from app.utils.auth_helpers import get_current_user, role_required, login_required, restrict_visitors
from app.utils.pathfinding import find_route

@navigation_bp.route('/')
def index():
    """Module 1: Interactive Campus Navigator foundation."""
    user = get_current_user()
    # Phase 8: only Main-Admin-published locations appear on the public map
    nodes = NavigationNode.query.filter_by(is_published=True).order_by(NavigationNode.building.asc(), NavigationNode.name.asc()).all()
    categories = sorted(list(set(n.category for n in nodes)))
    buildings = sorted(list(set(n.building for n in nodes)))
    floor_plans = CampusFloorPlan.query.order_by(CampusFloorPlan.building.asc()).all()

    return render_template(
        'navigation/index.html',
        user=user,
        nodes=nodes,
        categories=categories,
        buildings=buildings,
        floor_plans=floor_plans
    )

@navigation_bp.route('/api/nodes', methods=['GET'])
def get_nodes_api():
    """API endpoint providing all navigation nodes for map canvas rendering."""
    nodes = NavigationNode.query.filter_by(is_published=True).all()
    return jsonify({
        "success": True,
        "nodes": [n.to_dict() for n in nodes]
    })

@navigation_bp.route('/api/route', methods=['POST'])
def calculate_route_api():
    """
    Computes optimal path between start and destination nodes
    using A* or Dijkstra graph traversal.
    """
    data = request.get_json() or {}
    start_id = data.get('start_node_id')
    target_id = data.get('target_node_id')
    algorithm = data.get('algorithm', 'astar').lower()

    if not start_id or not target_id:
        return jsonify({"success": False, "error": "Start and destination nodes are required."}), 400

    if start_id == target_id:
        return jsonify({"success": False, "error": "Start and destination cannot be identical."}), 400

    route_result = find_route(int(start_id), int(target_id), algorithm=algorithm)
    if not route_result:
        return jsonify({"success": False, "error": "No viable path could be calculated between these two locations."}), 404

    return jsonify(route_result)

@navigation_bp.route('/api/node/<int:node_id>', methods=['GET'])
def get_node_detail_api(node_id):
    """Fetches single node details with street-view / point of interest photo."""
    node = NavigationNode.query.filter_by(id=node_id, is_published=True).first_or_404()
    return jsonify({
        "success": True,
        "node": node.to_dict()
    })

@navigation_bp.route('/api/node/<int:node_id>/connections', methods=['GET'])
def get_node_connections_api(node_id):
    """
    Phase 3: Street-view graph walker.
    Returns every node walkable-connected to this node (following configured
    bidirectional/directed edges) with direction hints, distance and photograph
    references so the viewer can move photo-to-photo like Google Street View.
    """
    node = NavigationNode.query.filter_by(id=node_id, is_published=True).first_or_404()
    edges = NavigationEdge.query.filter(
        ((NavigationEdge.source_node_id == node_id) & NavigationEdge.is_bidirectional) |
        ((NavigationEdge.target_node_id == node_id) & NavigationEdge.is_bidirectional) |
        ((NavigationEdge.source_node_id == node_id) & ~NavigationEdge.is_bidirectional)
    ).all()

    connections = []
    seen = set()
    for edge in edges:
        other_id = edge.target_node_id if edge.source_node_id == node_id else edge.source_node_id
        if other_id == node.id or other_id in seen:
            continue
        # Phase 8: unpublished neighbours are not exposed on the public walker
        other = NavigationNode.query.filter_by(id=other_id, is_published=True).first()
        if not other:
            continue
        seen.add(other.id)
        connections.append({
            "node": other.to_dict(),
            "edge_id": edge.id,
            "distance_meters": edge.distance_meters,
            "direction_hint": edge.direction_hint or "Continue towards",
            "traversable_back": bool(edge.is_bidirectional)
        })

    return jsonify({
        "success": True,
        "source_node": node.to_dict(),
        "connections": connections,
        "connection_count": len(connections)
    })

# ---------------------------------------------------------------------------
# EXAM ROOM FINDER - students/teachers confirm their hall, date and time,
# then route straight to it. Allotments are published by the Main Admin.
# ---------------------------------------------------------------------------

def _exam_matches_user(schedule, user):
    """Whether a published allotment applies to this account. Students are matched
    by resolved BRANCH CODE (profile may store the full department name) and by a
    normalised semester number, so a 'CSE / 3rd' allotment reaches the right column."""
    if user.role not in (schedule.audience_role, 'main_admin'):
        return False
    if schedule.audience_role == 'student':
        if schedule.department and ExamSchedule.branch_code(user.department) != ExamSchedule.branch_code(schedule.department):
            return False
        if schedule.semester and ExamSchedule.semester_key(user.semester) != ExamSchedule.semester_key(schedule.semester):
            return False
    return True

def _exam_window(schedules, today, days_before=7):
    """Split allotments into upcoming (incl. today) and recently-past lists."""
    upcoming = [s for s in schedules if s.exam_date >= today]
    past = [s for s in schedules if s.exam_date < today]
    upcoming.sort(key=lambda s: (s.exam_date, s.start_time))
    past.sort(key=lambda s: (s.exam_date, s.start_time), reverse=True)
    return upcoming, past[:10]

@navigation_bp.route('/exam-finder')
@login_required
@restrict_visitors
def exam_finder():
    """Exam Room Finder: 'where is my exam hall and which time?' - answered
    from the admin-published timetable, with a direct route to the hall."""
    user = get_current_user()
    today = date.today()

    if user.is_main_admin():
        # Admins preview the whole timetable, not a personal list
        schedules = ExamSchedule.query.all()
    else:
        schedules = [s for s in ExamSchedule.query.all() if _exam_matches_user(s, user)]

    # Free-text lookup (subject code / name / hall) over the visible timetable,
    # so a student who searches '21CS401' or 'Seminar Hall' finds the allotment.
    q = request.args.get('q', '').strip().lower()
    if q:
        def _matches(s):
            room_text = f"{s.room.name} {s.room.building} {s.room.floor}" if s.room else ''
            return q in f"{s.subject_code} {s.subject_name} {room_text}".lower()
        schedules = [s for s in schedules if _matches(s)]

    upcoming, past = _exam_window(schedules, today)
    branch_matrix = ExamSchedule.build_branch_matrix(schedules)
    has_personal_list = not user.is_main_admin()
    return render_template('navigation/exam_finder.html', user=user, upcoming=upcoming,
                           past=past, today=today, search_query=q,
                           branch_matrix=branch_matrix,
                           has_personal_list=has_personal_list)

@navigation_bp.route('/api/exam-schedule')
def exam_schedule_api():
    """Public (signed-in) JSON feed of upcoming exam allotments for the finder UI.
    Visitors receive nothing - the timetable is private campus data."""
    user = get_current_user()
    if not user or user.role == 'visitor':
        return jsonify({"success": False, "error": "Sign in to view the exam timetable."}), 403
    today = date.today()
    schedules = ExamSchedule.query.filter(ExamSchedule.exam_date >= today).order_by(
        ExamSchedule.exam_date.asc(), ExamSchedule.start_time.asc()).limit(100).all()
    if not user.is_main_admin():
        schedules = [s for s in schedules if _exam_matches_user(s, user)]
    return jsonify({
        "success": True,
        "exams": [s.to_dict() for s in schedules],
    })

