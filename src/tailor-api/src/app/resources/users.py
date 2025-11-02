from flask_restful import Resource, reqparse
from flask import jsonify, request
from ..auth_utils import login_required, get_current_user
from ..services.users_service import me, update_profile as svc_update

class Me(Resource):
    def get(self):
        return jsonify(me(get_current_user()))

class Profile(Resource):
    method_decorators = [login_required]

    def get(self):
        return jsonify(get_current_user() or {})

    def post(self):
        user = get_current_user()
        data = request.get_json(silent=True) or {}
        name = data.get("display_name","").strip()
        bio  = data.get("bio","")
        if not name:
            return {"error":"display_name_required"}, 400
        updated = svc_update(user["google_id"], name, bio)
        # also reflect in session so header updates immediately
        user["display_name"] = updated.get("display_name", user["display_name"])
        return {"ok": True}
