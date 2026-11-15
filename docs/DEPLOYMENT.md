# Deployment (Vercel + Supabase)

## Stack

- **Hosting:** Vercel (GitHub `main` → production)
- **Database / Auth:** Supabase project `Blackjack Edge` (`zzlxqoiavnqpvsadfvrl`)

## Vercel project settings

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Node.js | 22.x (see `package.json` `engines`) |
| Build command | `bash scripts/restore-lockfile.sh && npm ci && npm run build` |
| Install command | *(default — lockfile restored in build)* |

Alternatively rely on CI’s split lockfile flow: the repo commit runs `bash scripts/restore-lockfile.sh` before `npm ci` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Required environment variables

Set in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Name | Description |
|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zzlxqoiavnqpvsadfvrl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** (legacy JWT) or **publishable** key from Dashboard → API |

Do **not** set `SUPABASE_SERVICE_ROLE_KEY` in the frontend project.

## Local development

```bash
cp .env.example .env.local
# Paste anon key into NEXT_PUBLIC_SUPABASE_ANON_KEY
npm ci
npm run dev
```

## Database

Migrations live in `supabase/migrations/`. Remote schema is applied via Supabase MCP / CLI; regenerate types with Supabase `generate_typescript_types` into `src/lib/supabase/database.types.ts`.

RLS scopes all rows by `auth.uid()`; persistence server actions require a signed-in user.

## Verify

```bash
bash scripts/restore-lockfile.sh && npm ci
npm run lint && npm run typecheck && npm test && npm run build
```