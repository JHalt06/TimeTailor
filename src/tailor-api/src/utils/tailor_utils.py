from db.db_utils import (
    exec_get_all_dict, exec_get_one_dict, exec_commit
)
from psycopg2.extras import Json

# Valid part tables
_VALID = {"movements", "cases", "dials", "straps", "hands", "crowns"}

def _ensure_valid(part_type: str):
    if part_type not in _VALID:
        raise ValueError(f"Invalid part type: {part_type}")

def _adapt_json_value(v):
    if isinstance(v, (dict, list)):
        return Json(v)
    return v

def _apply_json_adapters(d: dict, json_cols: set[str]) -> dict:
    if not d:
        return d
    out = {}
    for k, v in d.items():
        out[k] = _adapt_json_value(v) if k in json_cols or isinstance(v, (dict, list)) else v
    return out

def _normalize_keys(d: dict) -> dict:
    """
    Bring incoming payload keys to our DB schema:
      - product_url / productURL / productLink -> product_link
      - allow 'type_' for movements; we handle mapping later
    """
    if not d:
        return {}
    out = dict(d)

    # Normalize product link keys to product_link
    if "product_link" not in out:
        if "product_url" in out:
            out["product_link"] = out.pop("product_url")
        elif "productURL" in out:
            out["product_link"] = out.pop("productURL")
        elif "productLink" in out:
            out["product_link"] = out.pop("productLink")

    return out

# ---------- movement_types helpers ----------
def movement_type_id_for_name(type_name: str) -> int | None:
    if not type_name:
        return None
    row = exec_get_one_dict(
        """
        INSERT INTO movement_types (type_name)
        VALUES (%s)
        ON CONFLICT (type_name) DO NOTHING
        RETURNING id;
        """,
        (type_name,)
    )
    if row and "id" in row:
        return row["id"]
    row = exec_get_one_dict("SELECT id FROM movement_types WHERE type_name=%s", (type_name,))
    return row["id"] if row else None

# ---------- Users ----------
def get_user_by_google_id(google_id: str):
    return exec_get_one_dict("SELECT * FROM users WHERE google_id=%s", (google_id,))

def get_or_create_user_from_session(session_user: dict):
    google_id = (session_user or {}).get("google_id")
    if not google_id:
        return None
    row = exec_get_one_dict("SELECT * FROM users WHERE google_id=%s", (google_id,))
    if row:
        return row
    email = (session_user or {}).get("email", "")
    display_name = (session_user or {}).get("display_name", email or google_id)
    avatar_url = (session_user or {}).get("avatar_url", "")
    row = exec_get_one_dict(
        """
        INSERT INTO users (google_id, email, display_name, avatar_url)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (google_id) DO UPDATE
          SET email=EXCLUDED.email,
              display_name=COALESCE(users.display_name, EXCLUDED.display_name),
              avatar_url=EXCLUDED.avatar_url,
              updated_at=NOW()
        RETURNING *;
        """,
        (google_id, email, display_name, avatar_url)
    )
    return row

def update_user_profile(google_id: str, display_name: str, bio: str):
    exec_commit(
        "UPDATE users SET display_name=%s, bio=%s, updated_at=NOW() WHERE google_id=%s",
        (display_name, bio, google_id)
    )
    return exec_get_one_dict(
        "SELECT google_id, email, display_name, avatar_url, COALESCE(bio,'') AS bio FROM users WHERE google_id=%s",
        (google_id,)
    )

# ---------- Parts (read) ----------
def get_all_parts(part_type: str):
    _ensure_valid(part_type)
    if part_type == "movements":
        return exec_get_all_dict(
            """
            SELECT m.*, mt.type_name AS movement_type
            FROM movements m
            LEFT JOIN movement_types mt ON m.movement_type_id = mt.id
            ORDER BY m.id DESC
            """
        )
    return exec_get_all_dict(f"SELECT * FROM {part_type} ORDER BY id DESC")

def get_parts_by_id(part_type: str, part_id: int):
    _ensure_valid(part_type)
    if part_type == "movements":
        return exec_get_one_dict(
            """
            SELECT m.*, mt.type_name AS movement_type
            FROM movements m
            LEFT JOIN movement_types mt ON m.movement_type_id = mt.id
            WHERE m.id=%s
            """,
            (part_id,)
        )
    return exec_get_one_dict(f"SELECT * FROM {part_type} WHERE id=%s", (part_id,))

def list_my_parts(user_id: int):
    out = {}
    for t in _VALID:
        out[t] = exec_get_all_dict(
            f"SELECT * FROM {t} WHERE user_id=%s ORDER BY id DESC",
            (user_id,)
        )
    return out

# ---------- Parts (create/update/delete) ----------
def create_part(part_type: str, part_data: dict, user_id: int | None = None):
    _ensure_valid(part_type)

    ALLOWED = {
        "movements": {
            "brand", "model", "movement_type_id", "price", "image_url",
            "power_reserve", "accuracy", "description", "product_link",
            "user_id", "align_meta"
        },
        "cases": {
            "brand", "model", "price", "image_url",
            "material", "dimension1", "dimension2", "dimension3",
            "description", "product_link",
            "user_id", "align_meta"
        },
        "dials": {
            "brand", "model", "price", "image_url",
            "color", "material", "diameter_mm",
            "description", "product_link",
            "user_id", "align_meta"
        },
        "straps": {
            "brand", "model", "price", "image_url",
            "color", "material", "width_mm", "length_mm",
            "description", "product_link",
            "user_id", "align_meta"
        },
        "hands": {
            "brand", "model", "price", "image_url",
            "color", "material", "type_",
            "description", "product_link",
            "user_id", "align_meta"
        },
        "crowns": {
            "brand", "model", "price", "image_url",
            "color", "material",
            "description", "product_link",
            "user_id", "align_meta"
        },
    }
    JSON_COLS = {"align_meta"}

    # Normalize and copy
    data = _normalize_keys(dict(part_data or {}))

    # Map movements.type_ => movement_type_id
    if part_type == "movements":
        if "movement_type_id" not in data:
            type_name = data.pop("type_", None)
            movement_tid = movement_type_id_for_name(type_name) if type_name else None
            if movement_tid is not None:
                data["movement_type_id"] = movement_tid

    if user_id is not None:
        data["user_id"] = user_id

    allowed = ALLOWED[part_type]
    filtered = {k: v for k, v in data.items() if k in allowed and v is not None}

    for req in ("brand", "model", "price"):
        if req not in filtered:
            raise ValueError(f"missing_{req}")

    filtered = _apply_json_adapters(filtered, JSON_COLS)

    cols = ", ".join(filtered.keys())
    placeholders = ", ".join(["%s"] * len(filtered))
    sql = f"INSERT INTO {part_type} ({cols}) VALUES ({placeholders}) RETURNING *;"
    row = exec_get_one_dict(sql, tuple(filtered.values()))
    return row

def update_part(part_type: str, part_id: int, data: dict, user_id: int):
    _ensure_valid(part_type)
    payload = _normalize_keys(dict(data or {}))
    JSON_COLS = {"align_meta"}

    if part_type == "movements" and "type_" in payload and "movement_type_id" not in payload:
        tid = movement_type_id_for_name(payload.get("type_"))
        if tid is not None:
            payload["movement_type_id"] = tid
        payload.pop("type_", None)

    payload.pop("user_id", None)

    if not payload:
        return exec_get_one_dict(
            f"SELECT * FROM {part_type} WHERE id=%s AND user_id=%s",
            (part_id, user_id)
        )

    payload = _apply_json_adapters(payload, JSON_COLS)

    sets = ", ".join([f"{k}=%s" for k in payload.keys()])
    sql = f"UPDATE {part_type} SET {sets}, updated_at=NOW() WHERE id=%s AND user_id=%s RETURNING *;"
    args = tuple(payload.values()) + (part_id, user_id)
    return exec_get_one_dict(sql, args)

def delete_part(part_type: str, part_id: int, user_id: int) -> bool:
    _ensure_valid(part_type)
    changed = exec_commit(
        f"DELETE FROM {part_type} WHERE id=%s AND user_id=%s",
        (part_id, user_id)
    )
    return changed > 0

# ---------- Builds ----------
def create_build(user_id: int, payload: dict):
    movement_id = payload.get("movements_id")
    case_id     = payload.get("cases_id")
    dial_id     = payload.get("dials_id")
    strap_id    = payload.get("straps_id")
    hand_id     = payload.get("hands_id")
    crown_id    = payload.get("crowns_id")

    sql_total = """
        SELECT COALESCE(SUM(price), 0) AS total FROM (
            SELECT price FROM movements WHERE id = %s
            UNION ALL SELECT price FROM cases WHERE id = %s
            UNION ALL SELECT price FROM dials WHERE id = %s
            UNION ALL SELECT price FROM straps WHERE id = %s
            UNION ALL SELECT price FROM hands WHERE id = %s
            UNION ALL SELECT price FROM crowns WHERE id = %s
        ) t;
    """
    total_row = exec_get_one_dict(sql_total, (movement_id, case_id, dial_id, strap_id, hand_id, crown_id))
    total = total_row["total"]

    ins = """
        INSERT INTO builds (user_id, movements_id, cases_id, dials_id, straps_id, hands_id, crowns_id, total_price)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
      RETURNING *;
    """
    return exec_get_one_dict(ins, (user_id, movement_id, case_id, dial_id, strap_id, hand_id, crown_id, total))

def get_user_builds(user_id: int):
    sql = """
    SELECT b.*,
        m.model AS movement_model, c.model AS case_model, d.model AS dial_model,
        s.model AS strap_model, h.model AS hand_model, cr.model AS crown_model
    FROM builds b
        LEFT JOIN movements m ON b.movements_id = m.id
        LEFT JOIN cases     c ON b.cases_id     = c.id
        LEFT JOIN dials     d ON b.dials_id     = d.id
        LEFT JOIN straps    s ON b.straps_id    = s.id
        LEFT JOIN hands     h ON b.hands_id     = h.id
        LEFT JOIN crowns    cr ON b.crowns_id   = cr.id
    WHERE b.user_id = %s
    ORDER BY b.id DESC;
    """
    return exec_get_all_dict(sql, (user_id,))

def delete_build_for_user(user_id: int, build_id: int) -> bool:
    changed = exec_commit("DELETE FROM builds WHERE id=%s AND user_id=%s", (build_id, user_id))
    return changed > 0

def publish_build_for_user(user_id: int, build_id: int, published: bool=True) -> bool:
    changed = exec_commit("UPDATE builds SET published=%s, updated_at=NOW() WHERE id=%s AND user_id=%s",
                        (published, build_id, user_id))
    return changed > 0
