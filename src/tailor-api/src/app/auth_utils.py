# app/auth_utils.py
from __future__ import annotations

from functools import wraps
from typing import Callable, Any, Optional, Dict

from flask import session, abort, g
from utils.tailor_utils import get_or_create_user_from_session


def get_current_user() -> Optional[Dict[str, Any]]:
    """
    Returns the session's lightweight user blob set at login time, or None.
    This is *not* the DB row; it intentionally mirrors what the frontend needs.
    """
    return session.get("user")


def _ensure_db_user() -> Optional[Dict[str, Any]]:
    """
    Ensures there's a corresponding row in the DB for the current session user.
    Returns the DB row (RealDict) or None if not authenticated.
    Stores it on flask.g.db_user for convenience.
    """
    sess_user = get_current_user()
    if not sess_user:
        return None

    db_user = get_or_create_user_from_session(sess_user)
    g.db_user = db_user
    return db_user


def login_required(fn: Callable) -> Callable:
    """
    Decorator that:
      1) Requires a session user (401 if missing)
      2) Ensures a DB user row exists (autocreates if DB was reset)
    """
    @wraps(fn)
    def _wrapped(*args, **kwargs):
        if not get_current_user():
            abort(401, description="Unauthorized")
        # Make sure a DB row exists even after a full schema reset.
        _ensure_db_user()
        return fn(*args, **kwargs)
    return _wrapped
