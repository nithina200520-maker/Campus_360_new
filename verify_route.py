from app import create_app
from app.models import NavigationNode
from app.utils.pathfinding import find_route

app = create_app()
with app.app_context():
    n1 = NavigationNode.query.filter_by(node_code='GEC-MAIN-ENTRANCE').first()
    n3 = NavigationNode.query.filter_by(node_code='GEC-CHAMBER-DR-BABY').first()
    print("Node 1:", n1.name, n1.photo_url)
    print("Node 3:", n3.name, n3.photo_url)
    
    route = find_route(n1.id, n3.id)
    if route:
        print("\n=== ROUTE FOUND ===")
        print("Total Distance:", route['total_distance_meters'], "meters")
        print("Steps:")
        for step in route['instructions']:
            print(f" -> {step['instruction']} (to {step['to_node']}) [Photo: {step['to_photo_url']}]")
    else:
        print("No route found.")

