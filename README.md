# Blackjack Edge AI

Professional mathematical analysis and card counting for **Evolution Free Bet** and **Evolution Infinite Free Bet** Blackjack only.

## Stack

- **Web:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Math:** `@blackjack-edge/engine` (workspace package)
- **Data:** Supabase (client placeholder; migrations in `supabase/migrations/` — review before remote apply)

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `build` | Production build |
| `npm test` | Vitest (engine + UI smoke) |
| `npm run typecheck` | TypeScript (app + engine) |
| `npm run lint` | ESLint |

## Environment

Copy `.env.example` to `.env.local` and set Supabase keys when ready.

## Phases

Phase 1: design system, German UI shell, navigation to all product sections, engine **types only**.  
See Project store `docs/architecture.md` for the full roadmap.
