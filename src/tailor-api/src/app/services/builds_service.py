from typing import Dict, Any, List
from .parts_service import get_part

# TEMP in-memory “builds”
_BUILDS: Dict[str, List[Dict[str, Any]]] = {}

def create_build_for_user(google_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    # payload like: {"movements_id":1, "cases_id":2, ...}
    total = 0.0
    for k, v in payload.items():
        if k.endswith("_id") and v:
            ptype = k[:-3]  # e.g. "dials_id" -> "dials_"
            ptype = ptype[:-1] if ptype.endswith("s") else ptype
            # crude heuristic -> better: a real mapping table
            if ptype in ("movement","case","dial","strap","hand","crown"):
                t = ptype + "s"
                part = get_part(t, int(v))
                if part and "price" in part:
                    total += float(part["price"])

    build = {"id": len(_BUILDS.get(google_id, [])) + 1, "total_price": round(total, 2), **payload}
    _BUILDS.setdefault(google_id, []).append(build)
    return build

def list_user_builds(google_id: str) -> List[Dict[str, Any]]:
    return _BUILDS.get(google_id, [])

def delete_user_build(google_id: str, build_id: int) -> bool:
    arr = _BUILDS.get(google_id, [])
    idx = next((i for i,b in enumerate(arr) if b["id"] == build_id), None)
    if idx is None: return False
    arr.pop(idx)
    return True

def publish_build(google_id: str, build_id: int) -> bool:
    # TODO: mark in DB later
    return True
