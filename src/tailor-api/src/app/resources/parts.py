from flask_restful import Resource
from flask import jsonify, request
from ..services.parts_service import list_parts, get_part, is_allowed
from ..auth_utils import get_current_user
from utils.tailor_utils import (
    create_part,
    get_or_create_user_from_session,
    update_part,
    delete_part,
    list_my_parts,
)

class PartsList(Resource):
    def get(self, part_type: str):
        if not is_allowed(part_type):
            return {"error": "invalid part_type"}, 400
        return jsonify(list_parts(part_type))

class PartById(Resource):
    # GET is public; write methods gate on session internally.
    def get(self, part_type: str, part_id: int):
        if not is_allowed(part_type):
            return {"error": "invalid part_type"}, 400
        item = get_part(part_type, part_id)
        if not item:
            return {"error": "not_found"}, 404
        return jsonify(item)

    def patch(self, part_type: str, part_id: int):
        if not is_allowed(part_type):
            return {"error": "invalid part_type"}, 400
        session_user = get_current_user()
        if not session_user:
            return {"error": "unauthorized"}, 401
        user_row = get_or_create_user_from_session(session_user)
        if not user_row:
            return {"error": "user_not_found"}, 400
        payload = request.get_json(silent=True) or {}
        # Prevent part_type overwrite via payload
        payload.pop("part_type", None)
        row = update_part(part_type, part_id, payload, user_id=user_row["id"])
        if not row:
            # not found or not owned
            return {"error": "not_found"}, 404
        return jsonify(row)

    def delete(self, part_type: str, part_id: int):
        if not is_allowed(part_type):
            return {"error": "invalid part_type"}, 400
        session_user = get_current_user()
        if not session_user:
            return {"error": "unauthorized"}, 401
        user_row = get_or_create_user_from_session(session_user)
        if not user_row:
            return {"error": "user_not_found"}, 400
        ok = delete_part(part_type, part_id, user_id=user_row["id"])
        if not ok:
            return {"error": "not_found"}, 404
        return {"ok": True}

class PartsCreate(Resource):
    # creation requires a session user; auto-create DB row if needed
    def post(self):
        session_user = get_current_user()
        if not session_user:
            return {"error": "unauthorized"}, 401

        data = request.get_json(silent=True) or {}
        part_type = data.pop("part_type", None)
        if not part_type or not is_allowed(part_type):
            return {"error": "invalid_part_type"}, 400

        # Drop client-only helpers
        data.pop("__type", None)
        data.pop("image_key", None)  # we only persist image_url

        user_row = get_or_create_user_from_session(session_user)
        if not user_row:
            return {"error": "user_not_found"}, 400

        try:
            row = create_part(part_type, data, user_id=user_row["id"])
        except ValueError as e:
            msg = str(e)
            code = 400
            return {"error": msg}, code
        return jsonify(row)

class PartsMine(Resource):
    """Return all parts for the current user, grouped by type."""
    def get(self):
        session_user = get_current_user()
        if not session_user:
            return {"error": "unauthorized"}, 401
        user_row = get_or_create_user_from_session(session_user)
        if not user_row:
            return {"error": "user_not_found"}, 400
        return jsonify(list_my_parts(user_row["id"]))
