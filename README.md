# LifeOS

LifeOS is a stash-first budgeting and travel planning app.

## Stack

- Next.js App Router
- React + TypeScript
- CSS Modules
- Local browser persistence with optional Supabase cloud sync
- Ready to deploy on Vercel

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project.
2. In Supabase, enable anonymous sign-ins under Authentication providers.
3. Open the SQL editor and run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Add your project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

When the env vars are present, LifeOS signs in anonymously and syncs one protected `lifeos_states` row per user through Row Level Security.

## Current features

- Manual monthly stash amount
- Adjustable buying power percentage, starting at 25%
- Editable budget categories with optional sub-allocations
- Monthly obligations with fixed bills and debts that count down by start month
- Buy List for gear or personal purchase goals
- Travel goal form with destination, purpose, budget, and date range
- Calendar that highlights selected travel ranges and saved trips with optional image previews
