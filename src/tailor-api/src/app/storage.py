import os
import re
import mimetypes
import pathlib
import uuid
from pathlib import Path

# ---------- Config ----------
# Switchable later to "s3" without changing the front-end
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")  # "local" | "s3"

# Where local files live (hackathon default). Can be relative; we resolve to absolute.
LOCAL_STORAGE_DIR = os.getenv("LOCAL_STORAGE_DIR", "./var/uploads")
LOCAL_STORAGE_DIR_ABS = str(Path(LOCAL_STORAGE_DIR).resolve())

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10 MB


def _sanitize_filename(name: str) -> str:
    name = (name or "upload").replace("\\", "/").split("/")[-1]
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:80]


class Storage:
    """Interface; we implement LocalStorage now.
    Later you can add S3Storage with the same methods.
    """

    def generate_put(self, user_id: str, filename: str, content_type: str) -> dict:
        ...

    def handle_put(self, key: str, data: bytes, content_type: str) -> bool:
        ...

    def public_url(self, key: str) -> str:
        ...


class LocalStorage(Storage):
    def __init__(self):
        # Use an absolute base so send_from_directory is unambiguous on all OSes
        self.base = Path(LOCAL_STORAGE_DIR_ABS)
        self.base.mkdir(parents=True, exist_ok=True)

    def _make_key(self, user_id: str, filename: str, content_type: str) -> str:
        ext = mimetypes.guess_extension(content_type) or pathlib.Path(filename).suffix or ".bin"
        return f"parts/{user_id}/{uuid.uuid4().hex}{ext}"

    def _path_for(self, key: str) -> Path:
        # Prevent path escapes
        if ".." in key or key.startswith("/"):
            raise ValueError("invalid_key")
        p = self.base.joinpath(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def generate_put(self, user_id: str, filename: str, content_type: str) -> dict:
        filename = _sanitize_filename(filename)
        key = self._make_key(user_id, filename, content_type)
        # Mirror S3 presign shape: a single-use PUT endpoint and a key
        return {"key": key, "uploadUrl": f"/api/uploads/put?key={key}"}

    def handle_put(self, key: str, data: bytes, content_type: str) -> bool:
        if len(data or b"") > MAX_UPLOAD_BYTES:
            raise ValueError("too_large")
        path = self._path_for(key)
        with open(path, "wb") as f:
            f.write(data)
        return True

    def public_url(self, key: str) -> str:
        # Served via Flask so it works behind your Vite proxy
        return f"/api/uploads/file/{key}"


def get_storage() -> Storage:
    # For now we only return LocalStorage; later add S3Storage and switch via env.
    return LocalStorage()
