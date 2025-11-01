from flask_restful import Resource
from flask import jsonify
from ..auth_utils import login_required, get_current_user
from ..services.users_service import me

class Me(Resource):
    def get(self):
        return jsonify(me(get_current_user()))

class Profile(Resource):
    method_decorators = [login_required]

    def get(self):
        # keep compatible with your old /api/profile GET
        return jsonify(get_current_user() or {})

    def post(self):
        # hand off to your JSONUserStore later if you want to persist
        return {"ok": True}
