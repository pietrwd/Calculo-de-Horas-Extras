import os
import sys
from psycopg2 import pool as pg_pool
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERRO: variável de ambiente DATABASE_URL não definida. Veja o README.md.", file=sys.stderr)
    sys.exit(1)

# Neon/Render/Supabase geralmente exigem SSL. Em banco local (sem SSL) isso é ignorado.
DATABASE_SSL = os.environ.get("DATABASE_SSL", "true").lower() != "false"
_sslmode = "require" if DATABASE_SSL else "disable"

_pool = pg_pool.SimpleConnectionPool(
    1,
    10,
    dsn=DATABASE_URL,
    sslmode=_sslmode,
    cursor_factory=RealDictCursor,
)


def get_conn():
    return _pool.getconn()


def put_conn(conn):
    _pool.putconn(conn)


def query(sql, params=None):
    """Executa uma query e retorna as linhas (lista de dicts), como o pool.query do 'pg'."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            conn.commit()
            if cur.description:
                return cur.fetchall()
            return []
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)
