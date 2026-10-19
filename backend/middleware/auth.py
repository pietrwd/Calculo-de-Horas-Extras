import os
import re
import sys
import datetime
from functools import wraps

import jwt
from flask import request, jsonify, g

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    print("ERRO: variável de ambiente JWT_SECRET não definida. Veja o README.md.", file=sys.stderr)
    sys.exit(1)

TOKEN_EXPIRY_HOURS = 12

# Regras de senha: mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial
SPECIAL_RE = re.compile(r"[_/@.#$%&*!?-]")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def sign_token(user):
    payload = {
        "sub": str(user["id"]),
        "username": user["username"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def is_password_valid(pw):
    if not isinstance(pw, str):
        return False
    return (
        len(pw) >= 8
        and re.search(r"[A-Z]", pw) is not None
        and re.search(r"[0-9]", pw) is not None
        and SPECIAL_RE.search(pw) is not None
    )


def authenticate_token(f):
    """Decorator equivalente ao authenticateToken do Express."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else None
        if not token:
            return jsonify({"error": "Token de autenticação ausente."}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            g.user = {
                "id": payload["sub"],
                "username": payload["username"],
                "role": payload["role"],
            }
        except jwt.PyJWTError:
            return jsonify({"error": "Token inválido ou expirado."}), 401
        return f(*args, **kwargs)

    return wrapper
