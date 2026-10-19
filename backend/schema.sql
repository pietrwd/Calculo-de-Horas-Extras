-- Schema do banco de dados - Dashboard de Horas Extras (Transportadora Ajofer)
-- Execute este arquivo uma vez no banco Postgres (Neon, Supabase, Render, local, etc.)

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'funcionario', -- 'admin' | 'funcionario'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guarda o estado inteiro do dashboard (meses/semanas/lançamentos) como JSON,
-- além do logotipo customizado (base64) quando trocado pela interface.
-- Existe uma única linha (workspace_id = 'default') porque é um dashboard
-- compartilhado por toda a empresa. Se no futuro vocês quiserem múltiplas
-- empresas/filiais, basta usar workspace_id diferentes.
CREATE TABLE IF NOT EXISTS dashboard_data (
  workspace_id TEXT PRIMARY KEY DEFAULT 'default',
  state JSONB NOT NULL,
  logo TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));
