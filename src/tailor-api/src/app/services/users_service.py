from typing import Dict, Any
from utils.tailor_utils import update_user_profile

def me(user: Dict[str, Any]) -> Dict[str, Any]:
    return user or {}

def update_profile(google_id: str, display_name: str, bio: str) -> Dict[str, Any]:
    return update_user_profile(google_id, display_name, bio)
