from flask_restful import Resource, reqparse
from flask import jsonify
from ..auth_utils import login_required, get_current_user
from ..services.builds_service import (
    create_build_for_user, list_user_builds, delete_user_build, publish_build
)

class BuildList(Resource):
    method_decorators = [login_required]

    def get(self):
        user = get_current_user()
        return jsonify(list_user_builds(user["google_id"]))

    def post(self):
        parser = reqparse.RequestParser()
        for key in ("movements_id","cases_id","dials_id","straps_id","hands_id","crowns_id"):
            parser.add_argument(key, type=int, required=False)
        data = parser.parse_args()
        user = get_current_user()
        build = create_build_for_user(user["google_id"], data)
        return jsonify(build)

class BuildItem(Resource):
    method_decorators = [login_required]

    def delete(self, build_id: int):
        user = get_current_user()
        ok = delete_user_build(user["google_id"], build_id)
        return ({"ok": True} if ok else ({"error": "not found"}, 404))

class PublishBuild(Resource):
    method_decorators = [login_required]

    def post(self, build_id: int):
        user = get_current_user()
        ok = publish_build(user["google_id"], build_id)
        return {"ok": ok}
