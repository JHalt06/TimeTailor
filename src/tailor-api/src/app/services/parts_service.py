from typing import List, Dict, Any, Optional
from utils.tailor_utils import get_all_parts, get_parts_by_id

_ALLOWED = {"movements","cases","dials","straps","hands","crowns"}

def is_allowed(part_type: str) -> bool:
    return part_type in _ALLOWED

def list_parts(part_type: str) -> List[Dict[str, Any]]:
    if not is_allowed(part_type):
        return []
    return get_all_parts(part_type)

def get_part(part_type: str, part_id: int) -> Optional[Dict[str, Any]]:
    if not is_allowed(part_type):
        return None
    return get_parts_by_id(part_type, part_id)
