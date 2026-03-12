# LibreIC

Biblioteca de conhecimento pessoal com feed social, temas colaborativos e suporte a PDFs/mídia.

## Stack

- **Next.js 16** (App Router)
- **PostgreSQL** via Supabase + Drizzle ORM
- **NextAuth v5** (credentials + Google OAuth)
- **Tailwind CSS v4**
- Deploy: **Vercel**

---

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Banco de dados (Supabase — usar URL do pooler, não a direta)
DATABASE_URL=postgresql://postgres.[ref]:[senha]@aws-0-[region].pooler.supabase.com:5432/postgres

# Auth
AUTH_SECRET=sua_chave_secreta_aqui

# Google OAuth (opcional)
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

# Supabase Storage — necessário para upload de arquivos (PDF, imagem, áudio)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Settings → API → service_role no Supabase
```

### Configurar upload de arquivos (Supabase Storage)

1. No painel do Supabase, vá em **Storage**
2. Crie um bucket chamado `blocks`
3. Marque o bucket como **público** (Public bucket)
4. Adicione `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do Vercel

---

## Banco de dados

### Criar tabelas (primeira vez)

```bash
psql $DATABASE_URL -f lib/db/migrations/0000_init.sql
```

### Migrations incrementais

```bash
# Temas privados / grupos colaborativos
psql $DATABASE_URL -f lib/db/migrations/0002_private_themes.sql

# Feed social / follows
psql $DATABASE_URL -f lib/db/migrations/0003_follows.sql
```

Ou cole o conteúdo de cada arquivo diretamente no **SQL Editor** do Supabase.

---

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Deploy

O projeto é deployado automaticamente via **Vercel** a cada push na branch `main`.

Certifique-se de configurar todas as variáveis de ambiente no painel do Vercel antes do primeiro deploy.
