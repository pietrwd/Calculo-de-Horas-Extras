# Ajofer Dashboard — estrutura e deploy

```
ajofer-dashboard/
├── netlify.toml          (manda o Netlify publicar a pasta frontend)
├── .gitignore
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   ├── js/api.js, auth.js, dashboard.js
│   └── assets/logo.jpg
└── backend/              (Flask / Python)
    ├── app.py, db.py, migrate.py, schema.sql
    ├── requirements.txt, .python-version, .env.example
    ├── routes/ (auth.py, dashboard.py)
    └── middleware/ (auth.py)
```

## 1. Rodar o backend local
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # Mac/Linux: cp .env.example .env
```
Edite o `.env` (DATABASE_URL do Neon, DATABASE_SSL=true, JWT_SECRET longo), depois:
```bash
python migrate.py              # cria as tabelas (uma vez)
python app.py                  # sobe em http://localhost:3000
```

## 2. Backend no Render
- New + → Web Service → repositório → **Root Directory:** `backend`
- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
- Variáveis: `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, `FRONTEND_ORIGIN` (depois)

## 3. Ligar o frontend ao backend
Em `frontend/js/api.js`, troque `PRODUCTION_API` pela URL do Render e faça:
```bash
git add .
git commit -m "Configura URL da API"
git push
```

## 4. Frontend no Netlify
Importe o repositório. O `netlify.toml` já define `publish = "frontend"`; deixe o
Build command vazio. (Ou arraste a pasta `frontend` em app.netlify.com/drop.)

## 5. CORS
No Render, `FRONTEND_ORIGIN` = URL do Netlify, sem "/" no final, ex.:
`https://bucolic-semolina-cc6840.netlify.app`
