# Contrapeso — versão Vercel + Supabase

Esta versão remove a dependência do servidor PocketBase e usa:

- **Vercel** para o site React/Vite;
- **Supabase** para login + PostgreSQL + RLS;
- domínio gratuito `*.vercel.app` no primeiro deploy.

## 1. Criar o banco

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Cole e execute `supabase/schema.sql`.
4. Em Authentication, mantenha o cadastro por e-mail/senha habilitado.
5. Para testar sem confirmação por e-mail, desative **Confirm Email** temporariamente. Para uso público, é preferível manter a confirmação ativada.

## 2. Pegar as chaves

No Supabase, copie o **Project URL** e a chave pública/publishable (ou anon, conforme o painel mostrar).

Crie `.env.local` a partir de `.env.example`:

```text
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

Nunca coloque uma `service_role` key no navegador.

## 3. Testar localmente

```bash
npm install
npm run dev
```

Abra a URL mostrada pelo Vite, normalmente `http://localhost:5173`.

## 4. Publicar na Vercel

A forma mais simples é subir esta pasta para um repositório GitHub e importar o repositório na Vercel.

Configuração:

- Framework: **Vite** (ou detecção automática)
- Build command: `npm run build`
- Output directory: `dist`

Em **Project Settings → Environment Variables**, adicione:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Depois faça um novo deploy.

## 5. URL de confirmação de e-mail

Se a confirmação de e-mail estiver ativada, no Supabase configure a URL do site da Vercel nas configurações de Authentication/URL Configuration. Durante o desenvolvimento, mantenha também `http://localhost:5173` nas URLs permitidas.

## Segurança

As tabelas têm Row Level Security (RLS). Cada registro é associado ao usuário autenticado por `user_id`, e as políticas permitem que cada usuário leia/edite/exclua somente os próprios registros.

## Observação

O projeto original recebido tinha a estrutura de monorepo incompleta no ZIP e fazia referência a um `pocketbaseClient` que não estava presente. Esta versão reorganiza o frontend em um projeto Vite normal e mantém a API interna compatível para reduzir as alterações nas páginas existentes.
