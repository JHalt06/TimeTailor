import os
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, session, request, redirect, url_for, flash
from authlib.integrations.flask_client import OAuth
from flask_restful import Api

from app.use_store import JSONUserStore, PostgresUserStore

ENV_PATH = Path(__file__).with_name(".env")
load_dotenv(dotenv_path=ENV_PATH)

def require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing env var: {name}")
    return v

app = Flask(__name__)
app.secret_key = require_env("FLASK_SECRET_KEY")
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # set True behind HTTPS
)

USER_DB_PATH = os.getenv("USER_DB_PATH", "./data/users.json")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
USER_STORE = os.getenv("USER_STORE", "postgres")  # "postgres" | "json"

store = PostgresUserStore() if USER_STORE == "postgres" else JSONUserStore(USER_DB_PATH)

oauth = OAuth(app)
oauth.register(
    name="google",
    client_id=require_env("GOOGLE_CLIENT_ID"),
    client_secret=require_env("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# -------------------- Auth --------------------
@app.get("/auth/login")
def auth_login():
    session["post_login_next"] = request.args.get("next")
    redirect_uri = url_for("auth_callback", _external=True)
    app.logger.info(f"OAuth redirect_uri -> {redirect_uri}")
    return oauth.google.authorize_redirect(redirect_uri)

@app.get("/auth/callback")
def auth_callback():
    try:
        oauth.google.authorize_access_token()
        userinfo = oauth.google.get("https://openidconnect.googleapis.com/v1/userinfo").json()
        # userinfo contains: sub, email, name, picture (plus others)
    except Exception as e:
        app.logger.exception("OAuth error")
        flash(f"OAuth error: {e}", "error")
        return redirect(f"{FRONTEND_URL}/login")

    # Clear any stale session (prevents FK issues after DB resets)
    session.clear()

    # Upsert the DB user row from Google profile — DB is source of truth
    user = store.create_or_update_from_google(userinfo)

    # Store a minimal, stable session payload the app expects
    session["sub"] = userinfo.get("sub")  # handy if you ever need it directly
    session["user"] = {
        "google_id": user.google_id,        # this is Google's "sub"
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
    }

    next_url = session.pop("post_login_next", None) or "/"
    return redirect(f"{FRONTEND_URL}{next_url}")

@app.get("/auth/logout")
def auth_logout():
    session.clear()
    return redirect(f"{FRONTEND_URL}/")

# -------------------- API --------------------
api = Api(app, prefix="/api")

from app.resources.parts import PartsList, PartById, PartsCreate, PartsMine
from app.resources.builds import BuildList, BuildItem, PublishBuild
from app.resources.users import Me, Profile
from app.resources.uploads import PresignUpload, PutUpload, ServeUpload

api.add_resource(PresignUpload, "/uploads/presign")
api.add_resource(PutUpload, "/uploads/put")
api.add_resource(ServeUpload, "/uploads/file/<path:key>")

api.add_resource(Me, "/me")
api.add_resource(Profile, "/profile")

api.add_resource(PartsCreate, "/parts")                                # POST (create)
api.add_resource(PartsMine, "/parts/mine")                             # GET current user's parts
api.add_resource(PartsList, "/parts/<string:part_type>")               # GET list (public)
api.add_resource(PartById, "/parts/<string:part_type>/<int:part_id>")  # GET (public), PATCH/DELETE (auth+owner)

api.add_resource(BuildList, "/builds")
api.add_resource(BuildItem, "/builds/<int:build_id>")
api.add_resource(PublishBuild, "/builds/<int:build_id>/publish")

@app.get("/api/health")
def api_health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    # Keep 127.0.0.1 if your Vite proxy expects that, otherwise 0.0.0.0 for LAN
    app.run(host="127.0.0.1", port=5000, debug=True)
