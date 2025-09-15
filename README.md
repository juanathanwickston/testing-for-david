# ONEPOS Wizard (Next.js + Tailwind + TS)

A modular version of your canvas app, ready for GitHub & Vercel.

## Quickstart

```bash
npm i   # or pnpm i / yarn
npm run dev # http://localhost:3000
```

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. In Vercel, **New Project** → Import the repo → Framework = Next.js.
3. No env vars required. Build & deploy.

## Structure
- `app/` — Next.js App Router
- `components/` — UI components (Wizard + inputs)
- `lib/` — shared logic (`constants`, `utils`, `computeDerived`)
- `__tests__/` — minimal vitest for compute math

## Notes
- XLSX export uses a dynamic import; CSV fallback is built-in.
- All client-side code is under `'use client'` components.
