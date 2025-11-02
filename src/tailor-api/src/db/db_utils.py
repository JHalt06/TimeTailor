# db/db_utils.py
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
import yaml

# --- config loading ---
def _config_path() -> Path:
    # .../src/db/db_utils.py -> .../src/config/db.yml
    return Path(__file__).resolve().parent.parent.parent.parent.parent / "config" / "db.yml"

def _load_config() -> dict:
    with _config_path().open("r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    # Normalize types
    if "port" in cfg:
        try:
            cfg["port"] = int(cfg["port"])
        except Exception:
            pass
    return cfg

# --- connection helper ---
def connect(dict_cursor: bool = False):
    cfg = _load_config()
    return psycopg2.connect(
        dbname=cfg["database"],
        user=cfg["user"],
        password=cfg.get("password", ""),
        host=cfg.get("host", "localhost"),
        port=cfg.get("port", 5432),
        cursor_factory=(RealDictCursor if dict_cursor else None),
    )

# --- helpers ---
def exec_sql_file(path_relative_to_db_dir: str):
    # Example: "sql/tables.sql" or "sql/seeds.sql"
    full_path = Path(__file__).resolve().parent / path_relative_to_db_dir
    with full_path.open("r", encoding="utf-8") as f:
        sql = f.read()
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        conn.close()

def exec_get_one(sql: str, args=()):
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchone()
    finally:
        conn.close()

def exec_get_all(sql: str, args=()):
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()
    finally:
        conn.close()

def exec_get_one_dict(sql: str, args=()):
    conn = connect(dict_cursor=True)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchone()
    finally:
        conn.close()

def exec_get_all_dict(sql: str, args=()):
    conn = connect(dict_cursor=True)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()
    finally:
        conn.close()

def exec_commit(sql: str, args=()):
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()
