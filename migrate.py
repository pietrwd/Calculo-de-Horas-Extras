# Aplica o schema.sql no banco configurado em DATABASE_URL.
# Uso: python migrate.py  (ou: npm run migrate, se usar o script do package.json)
import os

from dotenv import load_dotenv

load_dotenv()

from db import get_conn, put_conn


def migrate():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            print("Aplicando schema.sql...")
            cur.execute(sql)
            conn.commit()
            print("Schema aplicado com sucesso.")

            # Garante que exista a linha default de dashboard_data
            cur.execute("SELECT 1 FROM dashboard_data WHERE workspace_id = 'default'")
            if not cur.fetchall():
                cur.execute(
                    "INSERT INTO dashboard_data (workspace_id, state, logo) "
                    "VALUES ('default', '{}'::jsonb, NULL)"
                )
                conn.commit()
                print("Linha inicial de dashboard_data criada.")
    except Exception as err:
        conn.rollback()
        raise err
    finally:
        put_conn(conn)


if __name__ == "__main__":
    try:
        migrate()
    except Exception as err:
        print("Falha ao migrar:", err)
        raise SystemExit(1)
