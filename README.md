# LifeOS

LifeOS is a stash-first budgeting and travel planning app.

## Stack

- Next.js App Router
- React + TypeScript
- CSS Modules
- Local browser persistence with optional Supabase cloud sync
- Server-side OpenAI Responses API route for Phil, the LifeOS advisor
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
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.4-mini
```

When the env vars are present, LifeOS signs in anonymously and syncs one protected `lifeos_states` row per user through Row Level Security.

`OPENAI_API_KEY` is only used by the `/api/phil` server route. Do not expose it with a `NEXT_PUBLIC_` prefix. Phil still appears without the key, but he will ask for the environment variable before answering.

## Current features

- Manual monthly stash amount
- Adjustable buying power percentage, starting at 25%
- Editable budget categories with optional sub-allocations
- Monthly obligations with fixed bills and debts that count down by start month
- Wants stack for personal purchase goals with Guilt-Free Spending allocation status
- Travel goal form with destination, purpose, budget, and date range
- Calendar that highlights selected travel ranges and saved trips with optional image previews
- Food planner with brunch and dinner calendar slots plus a saved Meals library for searchable meal reuse
- Phil, a draggable LifeOS advisor that can answer questions about the full synced app state
