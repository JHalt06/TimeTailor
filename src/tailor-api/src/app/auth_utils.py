from functools import wraps
from flask import session, jsonify

def login_required(fn):
    @wraps(fn)
    def _wrap(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return _wrap

def get_current_user():
    return session.get("user")
