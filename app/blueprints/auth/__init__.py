from flask import Blueprint

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
api_auth_bp = Blueprint('api_auth', __name__, url_prefix='/api')

from . import routes
