import json, os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Optional, Any


@dataclass
class User:
    google_id: str
    email: str
    display_name: str
    avatar_url: str
    bio: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "google_id": self.google_id,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "User":
        return User(
            google_id=d["google_id"],
            email=d.get("email", ""),
            display_name=d.get("display_name", ""),
            avatar_url=d.get("avatar_url", ""),
            bio=d.get("bio", ""),
        )


class UserStore:
    def get_by_google_id(self, google_sub: str) -> Optional[User]: ...
    def create_or_update_from_google(self, google_profile: Dict[str, Any]) -> User: ...
    def update_profile(self, google_sub: str, display_name: str, bio: str) -> User: ...


class JSONUserStore(UserStore):
    def __init__(self, path: str):
        self.path = path
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        if not os.path.exists(self.path):
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump({"users": {}, "meta": {"version": 1}}, f, indent=2)

    def _load(self) -> Dict[str, Any]:
        with open(self.path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save(self, data: Dict[str, Any]):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_by_google_id(self, google_sub: str) -> Optional[User]:
        row = self._load().get("users", {}).get(google_sub)
        return User.from_dict(row) if row else None

    def create_or_update_from_google(self, profile: Dict[str, Any]) -> User:
        sub = profile["sub"]
        data = self._load()
        users = data.setdefault("users", {})
        now = datetime.now(timezone.utc).isoformat()

        row = users.get(sub)
        if row:
            row["email"] = profile.get("email", row.get("email", ""))
            row["avatar_url"] = profile.get("picture", row.get("avatar_url", ""))
            if not row.get("display_name"):
                row["display_name"] = profile.get("name", "")
            row["updated_at"] = now
        else:
            row = {
                "google_id": sub,
                "email": profile.get("email", ""),
                "display_name": profile.get("name", ""),
                "avatar_url": profile.get("picture", ""),
                "bio": "",
                "created_at": now,
                "updated_at": now,
            }
            users[sub] = row

        self._save(data)
        return User.from_dict(row)

    def update_profile(self, google_sub: str, display_name: str, bio: str) -> User:
        data = self._load()
        users = data.setdefault("users", {})
        row = users.get(google_sub)
        if not row:
            raise KeyError("User not found")
        row["display_name"] = display_name
        row["bio"] = bio
        row["updated_at"] = datetime.now(timezone.utc).isoformat()
        users[google_sub] = row
        self._save(data)
        return User.from_dict(row)
