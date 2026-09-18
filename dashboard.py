import datetime
import json

from flask import Blueprint, request, jsonify, g
from psycopg2.extras import Json

from db import query
from middleware.auth import authenticate_token

dashboard_bp = Blueprint("dashboard", __name__)
WORKSPACE_ID = "default"


# GET /api/dashboard  (requer token) -> { state, logo, updatedAt }
@dashboard_bp.route("", methods=["GET"])
@authenticate_token
def get_dashboard():
    try:
        rows = query(
            "SELECT state, logo, updated_at, updated_by FROM dashboard_data WHERE workspace_id = %s",
            (WORKSPACE_ID,),
        )
        if not rows:
            return jsonify({"state": None, "logo": None, "updatedAt": None})

        row = rows[0]
        return jsonify(
            {
                "state": row["state"],
                "logo": row["logo"],
                "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
            }
        )
    except Exception as err:
        print("Erro em GET /dashboard:", err)
        return jsonify({"error": "Erro interno ao carregar o dashboard."}), 500


# PUT /api/dashboard  (requer token)  { state, logo }
# Usado pelo botão "Salvar alterações" e pela troca de logotipo.
@dashboard_bp.route("", methods=["PUT"])
@authenticate_token
def put_dashboard():
    try:
        body = request.get_json(silent=True) or {}
        state = body.get("state")
        logo = body.get("logo")

        if not state or not isinstance(state, dict):
            return jsonify({"error": "Estado do dashboard inválido."}), 400

        query(
            """INSERT INTO dashboard_data (workspace_id, state, logo, updated_by, updated_at)
               VALUES (%s, %s, %s, %s, now())
               ON CONFLICT (workspace_id)
               DO UPDATE SET state = EXCLUDED.state, logo = EXCLUDED.logo,
                             updated_by = EXCLUDED.updated_by, updated_at = now()""",
            (WORKSPACE_ID, Json(state), logo or None, g.user["id"]),
        )

        return jsonify({"ok": True, "updatedAt": datetime.datetime.utcnow().isoformat()})
    except Exception as err:
        print("Erro em PUT /dashboard:", err)
        return jsonify({"error": "Erro interno ao salvar o dashboard."}), 500
