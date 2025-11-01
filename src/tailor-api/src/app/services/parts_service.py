from typing import List, Dict, Any, Optional

# import your friend's functions here when ready:
# from utils.tailor_utils import get_all_parts, get_parts_by_id

_ALLOWED = {"movements","cases","dials","straps","hands","crowns"}

def is_allowed(part_type: str) -> bool:
    return part_type in _ALLOWED

# TEMP stub data so UI works right now
_FAKE = {
    "dials": [
        {"id": 1, "brand":"Seiko", "model":"Sunburst Blue", "price": 29.99, "image_url": "", "description": "40mm dial"},
        {"id": 2, "brand":"Namoki", "model":"Matte Black", "price": 24.00, "image_url": "", "description": "40mm dial"}
    ],
    "straps": [
        {"id": 10, "brand":"Barton", "model":"Silicone 20mm", "price": 19.00, "image_url": "", "description": "20mm quick-release"}
    ],
}

def list_parts(part_type: str) -> List[Dict[str, Any]]:
    if not is_allowed(part_type):
        return []
    # return get_all_parts(part_type)
    return _FAKE.get(part_type, [])

def get_part(part_type: str, part_id: int) -> Optional[Dict[str, Any]]:
    # return get_parts_by_id(part_type, part_id)
    for p in _FAKE.get(part_type, []):
        if p["id"] == part_id:
            return p
    return None