from flask import Blueprint

campus_admin_bp = Blueprint('campus_admin', __name__, url_prefix='/api/campus-admin')

from . import routes
