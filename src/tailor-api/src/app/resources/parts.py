from flask_restful import Resource
from flask import jsonify
from ..services.parts_service import list_parts, get_part, is_allowed

class PartsList(Resource):
    def get(self, part_type: str):
        if not is_allowed(part_type):
            return {"error": "invalid part_type"}, 400
        return jsonify(list_parts(part_type))

class PartById(Resource):
    def get(self, part_type: str, part_id: int):
        if not is_allowed(part_type):
            return {"error": "invalid part_type"}, 400
        item = get_part(part_type, part_id)
        if not item: return {"error": "not found"}, 404
        return jsonify(item)
