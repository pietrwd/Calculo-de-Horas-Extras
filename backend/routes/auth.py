import bcrypt
from flask import Blueprint, request, jsonify, g

from db import query
from middleware.auth import sign_token, authenticate_token, is_password_valid, EMAIL_RE

auth_bp = Blueprint("auth", __name__)
SALT_ROUNDS = 10


# POST /api/auth/register  { nome, email, username, password }
# Usado pela tela "Cadastro de funcionário"
@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        body = request.get_json(silent=True) or {}
        nome = body.get("nome")
        email = body.get("email")
        username = body.get("username")
        password = body.get("password")

        if not nome or not isinstance(nome, str) or not nome.strip():
            return jsonify({"error": "Informe o nome completo."}), 400
        if not email or not EMAIL_RE.match(email):
            return jsonify({"error": "Informe um e-mail válido."}), 400
        if not username or not isinstance(username, str) or len(username.strip()) < 3:
            return jsonify({"error": "O nome de usuário deve ter ao menos 3 caracteres."}), 400
        if not is_password_valid(password):
            return jsonify(
                {
                    "error": "A senha deve ter ao menos 8 caracteres, uma letra maiúscula, "
                    "um número e um caractere especial (_ / @ . # $ % & *)."
                }
            ), 400

        username_norm = username.strip()
        email_norm = email.strip().lower()

        existing = query(
            "SELECT id FROM users WHERE lower(username) = lower(%s) OR lower(email) = %s",
            (username_norm, email_norm),
        )
        if existing:
            return jsonify({"error": "Já existe um usuário com este login ou e-mail."}), 409

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(SALT_ROUNDS)).decode("utf-8")

        rows = query(
            """INSERT INTO users (nome, email, username, password_hash)
               VALUES (%s, %s, %s, %s)
               RETURNING id, nome, email, username, role, created_at""",
            (nome.strip(), email_norm, username_norm, password_hash),
        )

        return jsonify({"user": rows[0]}), 201
    except Exception as err:
        print("Erro em /register:", err)
        return jsonify({"error": "Erro interno ao cadastrar funcionário."}), 500


# POST /api/auth/login  { username, password }
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        body = request.get_json(silent=True) or {}
        username = body.get("username")
        password = body.get("password")

        if not username or not password:
            return jsonify({"error": "Informe login e senha."}), 400

        rows = query(
            "SELECT id, nome, email, username, password_hash, role FROM users WHERE lower(username) = lower(%s)",
            (username.strip(),),
        )
        user = rows[0] if rows else None
        if not user:
            return jsonify({"error": "Login ou senha inválidos."}), 401

        ok = bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8"))
        if not ok:
            return jsonify({"error": "Login ou senha inválidos."}), 401

        token = sign_token(user)
        return jsonify(
            {
                "token": token,
                "user": {
                    "id": user["id"],
                    "nome": user["nome"],
                    "email": user["email"],
                    "username": user["username"],
                    "role": user["role"],
                },
            }
        )
    except Exception as err:
        print("Erro em /login:", err)
        return jsonify({"error": "Erro interno ao entrar."}), 500


# POST /api/auth/forgot-password  { username, email, newPassword }
# Redefine a senha após confirmar login + e-mail cadastrados (sem envio de e-mail real).
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    try:
        body = request.get_json(silent=True) or {}
        username = body.get("username")
        email = body.get("email")
        new_password = body.get("newPassword")

        if not username or not email:
            return jsonify({"error": "Informe login e e-mail cadastrados."}), 400
        if not is_password_valid(new_password):
            return jsonify(
                {
                    "error": "A nova senha deve ter ao menos 8 caracteres, uma letra maiúscula, "
                    "um número e um caractere especial."
                }
            ), 400

        rows = query(
            "SELECT id FROM users WHERE lower(username) = lower(%s) AND lower(email) = lower(%s)",
            (username.strip(), email.strip()),
        )
        user = rows[0] if rows else None
        if not user:
            return jsonify({"error": "Não encontramos um usuário com esse login e e-mail."}), 404

        password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt(SALT_ROUNDS)).decode("utf-8")
        query("UPDATE users SET password_hash = %s WHERE id = %s", (password_hash, user["id"]))

        return jsonify({"ok": True})
    except Exception as err:
        print("Erro em /forgot-password:", err)
        return jsonify({"error": "Erro interno ao redefinir senha."}), 500


# GET /api/auth/me  (requer token) - útil para validar sessão ao recarregar a página
@auth_bp.route("/me", methods=["GET"])
@authenticate_token
def me():
    rows = query(
        "SELECT id, nome, email, username, role FROM users WHERE id = %s",
        (g.user["id"],),
    )
    if not rows:
        return jsonify({"error": "Usuário não encontrado."}), 404
    return jsonify({"user": rows[0]})
