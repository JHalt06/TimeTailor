import mimetypes
from flask import request, jsonify, send_from_directory, abort
from flask_restful import Resource
from ..auth_utils import login_required, get_current_user
from ..storage import (
    get_storage,
    ALLOWED_MIME,
    MAX_UPLOAD_BYTES,
    LOCAL_STORAGE_DIR_ABS,
)

storage = get_storage()


class PresignUpload(Resource):
    """Create a presigned-style PUT target (local backend today)."""
    method_decorators = [login_required]

    def post(self):
        user = get_current_user()
        data = request.get_json(silent=True) or {}
        filename = data.get("filename") or "upload"
        content_type = data.get("contentType") or mimetypes.guess_type(filename)[0] or "application/octet-stream"

        if content_type not in ALLOWED_MIME:
            return {"error": "unsupported_file_type"}, 400

        presign = storage.generate_put(user["google_id"], filename, content_type)
        return jsonify({
            "key": presign["key"],
            "uploadUrl": presign["uploadUrl"],
            "maxBytes": MAX_UPLOAD_BYTES,
            "cdnUrl": storage.public_url(presign["key"]),
        })


class PutUpload(Resource):
    """Handle the actual PUT of bytes (local backend)."""
    method_decorators = [login_required]

    def put(self):
        key = request.args.get("key")
        if not key:
            return {"error": "missing_key"}, 400
        data = request.get_data()
        content_type = request.mimetype or request.headers.get("Content-Type") or "application/octet-stream"
        try:
            storage.handle_put(key, data, content_type)
        except ValueError as e:
            code = 413 if str(e) == "too_large" else 400
            return {"error": str(e)}, code
        return {"ok": True}


class ServeUpload(Resource):
    """Serve uploaded files. Public for hackathon; lock down later if needed."""
    def get(self, key):
        if ".." in key or key.startswith("/"):
            abort(400)
        guessed = mimetypes.guess_type(key)[0] or "application/octet-stream"
        return send_from_directory(LOCAL_STORAGE_DIR_ABS, key, mimetype=guessed, conditional=True)
