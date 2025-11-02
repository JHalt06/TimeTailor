from pathlib import Path
from db.db_utils import connect

ROOT = Path(__file__).resolve().parent
print(ROOT)
SQL_FILES = [
    ROOT / "sql/tables.sql"#,
    # ROOT / "sql/seeds.sql",  # optional; applied if present
]

def apply_sql(conn, sql_text: str):
    # one cursor per file; handles multiple statements fine
    with conn.cursor() as cur:
        cur.execute(sql_text)
    conn.commit()

def main():
    conn = connect()
    try:
        for p in SQL_FILES:
            if p.exists():
                print(f"-> applying {p.name}")
                apply_sql(conn, p.read_text(encoding="utf-8"))
            else:
                print(f"-> skipping {p.name} (not found)")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
