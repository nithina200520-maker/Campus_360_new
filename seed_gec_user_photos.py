"""
Helper script to register the user's uploaded real photos as connected navigation waypoints.
"""
from app import create_app
from app.database import db
from app.models import NavigationNode, NavigationEdge

def setup_user_navigation():
    app = create_app()
    with app.app_context():
        # Check or create Node 1: Main Entrance
        n1 = NavigationNode.query.filter_by(node_code='GEC-MAIN-ENTRANCE').first()
        if not n1:
            n1 = NavigationNode(
                node_code='GEC-MAIN-ENTRANCE',
                name='Main College Entrance & Porch',
                building='Main Academic Block',
                floor='Ground Floor',
                category='Entrance',
                description='Main entrance portico and driveway of Government Engineering College, Mosalehosahalli.',
                x_coord=120,
                y_coord=350,
                photo_url='/static/uploads/navigation/gec_main_entrance.jpg',
                is_panoramic=False,
                is_accessible=True,
                is_sample_data=False,
                is_published=True
            )
            db.session.add(n1)
            db.session.flush()
            print(f"[+] Created node: {n1.name} (id={n1.id})")
        else:
            n1.photo_url = '/static/uploads/navigation/gec_main_entrance.jpg'
            n1.is_sample_data = False
            n1.is_published = True
            print(f"[*] Updated node: {n1.name} (id={n1.id})")

        # Check or create Node 2: Administrative Office
        n2 = NavigationNode.query.filter_by(node_code='GEC-ADM-OFFICE').first()
        if not n2:
            n2 = NavigationNode(
                node_code='GEC-ADM-OFFICE',
                name='Administrative Office & Corridor',
                building='Main Academic Block',
                floor='Ground Floor',
                category='Office',
                description='Ground floor corridor with visitor seating bench and Administrative Office entrance.',
                x_coord=240,
                y_coord=350,
                photo_url='/static/uploads/navigation/gec_office_corridor.jpg',
                is_panoramic=False,
                is_accessible=True,
                is_sample_data=False,
                is_published=True
            )
            db.session.add(n2)
            db.session.flush()
            print(f"[+] Created node: {n2.name} (id={n2.id})")
        else:
            n2.photo_url = '/static/uploads/navigation/gec_office_corridor.jpg'
            n2.is_sample_data = False
            n2.is_published = True
            print(f"[*] Updated node: {n2.name} (id={n2.id})")

        # Check or create Node 3: Dr. Baby H.T. Chamber
        n3 = NavigationNode.query.filter_by(node_code='GEC-CHAMBER-DR-BABY').first()
        if not n3:
            n3 = NavigationNode(
                node_code='GEC-CHAMBER-DR-BABY',
                name='Dr. Baby H.T. Chamber (HOD / Faculty Cabin)',
                building='Main Academic Block',
                floor='Ground Floor',
                category='HOD Chamber',
                description='Department hallway with faculty chamber of Dr. Baby H.T. (ಡಾ. ಬೇಬಿ ಹೆಚ್.ಟಿ).',
                x_coord=360,
                y_coord=350,
                photo_url='/static/uploads/navigation/gec_dr_baby_chamber.jpg',
                is_panoramic=False,
                is_accessible=True,
                is_sample_data=False,
                is_published=True
            )
            db.session.add(n3)
            db.session.flush()
            print(f"[+] Created node: {n3.name} (id={n3.id})")
        else:
            n3.photo_url = '/static/uploads/navigation/gec_dr_baby_chamber.jpg'
            n3.is_sample_data = False
            n3.is_published = True
            print(f"[*] Updated node: {n3.name} (id={n3.id})")

        # Connect Node 1 <-> Node 2
        edge1 = NavigationEdge.query.filter(
            ((NavigationEdge.source_node_id == n1.id) & (NavigationEdge.target_node_id == n2.id)) |
            ((NavigationEdge.source_node_id == n2.id) & (NavigationEdge.target_node_id == n1.id))
        ).first()
        if not edge1:
            edge1 = NavigationEdge(
                source_node_id=n1.id,
                target_node_id=n2.id,
                distance_meters=15.0,
                direction_hint='Walk up the front steps through the main doors into the administrative hallway',
                is_bidirectional=True,
                is_sample_data=False
            )
            db.session.add(edge1)
            print(f"[+] Created edge: {n1.name} <---> {n2.name}")
        else:
            edge1.direction_hint = 'Walk up the front steps through the main doors into the administrative hallway'
            edge1.is_sample_data = False
            print(f"[*] Edge already exists: {n1.name} <---> {n2.name}")

        # Connect Node 2 <-> Node 3
        edge2 = NavigationEdge.query.filter(
            ((NavigationEdge.source_node_id == n2.id) & (NavigationEdge.target_node_id == n3.id)) |
            ((NavigationEdge.source_node_id == n3.id) & (NavigationEdge.target_node_id == n2.id))
        ).first()
        if not edge2:
            edge2 = NavigationEdge(
                source_node_id=n2.id,
                target_node_id=n3.id,
                distance_meters=20.0,
                direction_hint='Continue straight along the corridor past the office waiting area towards Dr. Baby H.T. Chamber',
                is_bidirectional=True,
                is_sample_data=False
            )
            db.session.add(edge2)
            print(f"[+] Created edge: {n2.name} <---> {n3.name}")
        else:
            edge2.direction_hint = 'Continue straight along the corridor past the office waiting area towards Dr. Baby H.T. Chamber'
            edge2.is_sample_data = False
            print(f"[*] Edge already exists: {n2.name} <---> {n3.name}")

        db.session.commit()
        print("\n[SUCCESS] All 3 real photos registered and linked as a walkthrough path!")

if __name__ == '__main__':
    setup_user_navigation()

