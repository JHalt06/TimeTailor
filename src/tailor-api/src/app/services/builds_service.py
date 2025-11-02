from typing import Dict, Any, List
from utils.tailor_utils import (
    get_user_by_google_id,
    create_build,
    get_user_builds,
    delete_build_for_user,
    publish_build_for_user
)

def create_build_for_user(google_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    user = get_user_by_google_id(google_id)
    if not user:
        raise ValueError("user_not_found")
    return create_build(user["id"], payload)

def list_user_builds(google_id: str) -> List[Dict[str, Any]]:
    user = get_user_by_google_id(google_id)
    if not user:
        return []
    return get_user_builds(user["id"])

def delete_user_build(google_id: str, build_id: int) -> bool:
    user = get_user_by_google_id(google_id)
    if not user:
        return False
    return delete_build_for_user(user["id"], build_id)

def publish_build(google_id: str, build_id: int) -> bool:
    user = get_user_by_google_id(google_id)
    if not user:
        return False
    return publish_build_for_user(user["id"], build_id, True)
