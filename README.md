# Dashboard de Horas Extras — Transportadora Ajofer

Aplicação web para **controle de ponto e folha de colaboradores PJ**, com lançamento de horas extras por semana, cálculo automático de custos, gráficos e exportação de relatórios. Os dados ficam em um banco PostgreSQL na nuvem, compartilhados entre todos os usuários autorizados.

**Site:** https://ajoferhorasextras.netlify.app

---

## Funcionalidades

**Autenticação**
- Cadastro de funcionário (nome, e-mail, usuário e senha)
- Login com sessão por token (JWT, validade de 12 horas)
- Recuperação de senha informando login e e-mail cadastrados
- Regras de senha: mínimo de 8 caracteres, uma letra maiúscula, um número e um caractere especial
- Senhas armazenadas com hash (bcrypt)

**Dashboard de horas extras**
- Visão por mês, com opção de criar um novo mês copiando colaboradores e valores/hora
- Cartões de ponto semanais, com lançamento de horas por colaborador e por dia da semana
- Marcação de feriado e observação por lançamento
- Valor/hora normal e valor/hora de domingo/feriado por colaborador
- Indicadores do mês: total de horas extras, custo total, destaque do mês e horas em domingo/feriado
- Filtro por colaborador
- Gráficos de horas por colaborador e por semana
- Troca do logotipo pela interface
- Botão **Salvar alterações**, que grava tudo no banco de dados

**Exportação e backup**
- Exportar relatório do mês em Excel (uma aba por colaborador)
- Exportar e importar os dados em JSON

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS e JavaScript puro (sem framework) |
| Gráficos | Chart.js 4 |
| Exportação Excel | SheetJS (xlsx) |
| Backend | Python 3, Flask, Flask-CORS |
| Autenticação | PyJWT e bcrypt |
| Servidor de produção | Gunicorn |
| Banco de dados | PostgreSQL (Neon), acessado com psycopg2 |
| Hospedagem do site | Netlify |
| Hospedagem da API | Render |
| Versionamento | Git e GitHub |

---

## Arquitetura

```
Navegador (Netlify)  ──HTTPS──▶  API Flask (Render)  ──SSL──▶  PostgreSQL (Neon)
  frontend/                        backend/
```

O frontend é um site estático que conversa com a API por `fetch`. A API valida o token de cada requisição, e o estado completo do dashboard é guardado como JSON em uma única linha da tabela `dashboard_data`, compartilhada por toda a empresa.

---

## Estrutura do projeto

```
ajofer-dashboard/
├── netlify.toml              Publica a pasta frontend no Netlify
├── .gitignore
├── frontend/
│   ├── index.html            Telas de login, cadastro, recuperação e dashboard
│   ├── css/style.css         Layout e cores
│   ├── js/
│   │   ├── api.js            URL da API e função de requisição
│   │   ├── auth.js           Login, cadastro e recuperação de senha
│   │   └── dashboard.js      Lógica do dashboard, gráficos e exportação
│   └── assets/logo.jpg
└── backend/
    ├── app.py                Aplicação Flask e configuração de CORS
    ├── db.py                 Conexão com o PostgreSQL
    ├── migrate.py            Aplica o schema.sql no banco
    ├── schema.sql            Estrutura das tabelas
    ├── requirements.txt
    ├── .env.example          Modelo das variáveis de ambiente
    ├── routes/
    │   ├── auth.py           Cadastro, login, recuperação de senha e /me
    │   └── dashboard.py      Carregar e salvar o dashboard
    └── middleware/
        └── auth.py           Geração e validação do token JWT
```

---

## Endpoints da API

| Método | Rota | Descrição | Requer token |
|---|---|---|---|
| GET | `/api/health` | Verifica se a API está no ar | Não |
| POST | `/api/auth/register` | Cadastra um funcionário | Não |
| POST | `/api/auth/login` | Faz login e retorna o token | Não |
| POST | `/api/auth/forgot-password` | Redefine a senha | Não |
| GET | `/api/auth/me` | Retorna o usuário logado | Sim |
| GET | `/api/dashboard` | Carrega os dados do dashboard | Sim |
| PUT | `/api/dashboard` | Salva os dados do dashboard | Sim |

---

## Como rodar localmente

**Pré-requisitos:** Git, Python 3.12 ou superior e um banco PostgreSQL (por exemplo, um projeto gratuito no [Neon](https://neon.tech)).

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # Mac/Linux: cp .env.example .env
```

Preencha o `.env`:

```
DATABASE_URL=postgresql://usuario:senha@host/neondb?sslmode=require
DATABASE_SSL=true
JWT_SECRET=um-texto-longo-e-aleatorio
FRONTEND_ORIGIN=
```

Crie as tabelas e suba a API:

```bash
python migrate.py
python app.py                    # http://localhost:3000
```

### Frontend

Abra a pasta `frontend` com a extensão **Live Server** do VS Code, ou rode:

```bash
cd frontend
python -m http.server 8080       # http://localhost:8080
```

Em ambiente local, o `api.js` usa `http://localhost:3000` automaticamente.

---

## Deploy

### Banco de dados (Neon)
1. Crie um projeto e copie a connection string.
2. No SQL Editor, execute o conteúdo de `backend/schema.sql` (ou rode `python migrate.py` localmente).

### Backend (Render)
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
- **Variáveis de ambiente:**

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Connection string do Neon |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | Texto longo e aleatório |
| `FRONTEND_ORIGIN` | URL do site no Netlify, sem `/` no final |

### Frontend (Netlify)
- Conecte o repositório. O `netlify.toml` já define `publish = "frontend"`.
- **Base directory:** deixe vazio (se preencher `frontend`, o caminho vira `frontend/frontend` e o deploy falha).
- **Build command:** vazio.
- Em `frontend/js/api.js`, defina `PRODUCTION_API` com a URL do backend no Render.

---

## Solução de problemas

| Sintoma | Causa provável |
|---|---|
| Página sem estilo e logo quebrada | Netlify publicando a pasta errada; confira Base e Publish directory |
| "A URL do backend ainda não foi configurada" | `PRODUCTION_API` em `api.js` ainda com o valor de exemplo |
| Erro de CORS no console | `FRONTEND_ORIGIN` no Render diferente da URL exata do site |
| "Não foi possível conectar ao servidor" | Backend gratuito do Render dormindo; aguarde cerca de 1 minuto |
| Deploy do Render falha com `invalid dsn` | `DATABASE_URL` mal formatada (aspas, espaços ou comando `psql` junto) |
| Erro ao cadastrar usuário | Tabelas ainda não criadas no banco |

---

## Segurança

- O arquivo `.env` nunca deve ir para o GitHub (já está no `.gitignore`).
- Senhas são salvas com hash bcrypt; o token JWT expira em 12 horas.
- Defina `FRONTEND_ORIGIN` em produção para que somente o seu site possa chamar a API.
- O cadastro é aberto a quem tiver o link do site. Para restringir o acesso, o backend pode passar a exigir um administrador para criar usuários.
- A recuperação de senha confirma apenas login e e-mail, sem envio de e-mail real.

---

## Observações

- Todos os usuários compartilham o mesmo dashboard (`workspace_id = 'default'`). A última pessoa a clicar em **Salvar alterações** define o estado salvo.
