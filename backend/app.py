import os
import datetime

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp

app = Flask(__name__)
app.url_map.strict_slashes = False

PORT = int(os.environ.get("PORT", 3000))

# Em produção, defina FRONTEND_ORIGIN com a URL exata do site (ex: https://seusite.netlify.app)
# para restringir quem pode chamar a API. Sem essa variável, libera geral (útil em dev).
allowed_origin = os.environ.get("FRONTEND_ORIGIN")
origins = [s.strip() for s in allowed_origin.split(",")] if allowed_origin else "*"
CORS(app, origins=origins)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10mb por causa do logotipo em base64


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "ok": True,
            "service": "ajofer-dashboard-backend",
            "time": datetime.datetime.utcnow().isoformat() + "Z",
        }
    )


app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")


# 404 padrão para rotas de API não encontradas
@app.errorhandler(404)
def not_found(err):
    return jsonify({"error": "Rota não encontrada."}), 404


# Handler padrão para erros não tratados
@app.errorhandler(Exception)
def handle_error(err):
    from werkzeug.exceptions import HTTPException

    if isinstance(err, HTTPException):
        return jsonify({"error": err.description}), err.code

    print("Erro não tratado:", err)
    return jsonify({"error": "Erro interno do servidor."}), 500


if __name__ == "__main__":
    print(f"Ajofer Dashboard backend rodando na porta {PORT}")
    app.run(host="0.0.0.0", port=PORT)
