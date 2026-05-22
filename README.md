# MoneyTrack

MoneyTrack is a React + TypeScript + Vite app for personal finance tracking, planning, goals, obligations, and Firebase-backed auth/data flows.

## Local Setup

1. Install dependencies with `npm install`.
2. Create `.env.local` from `.env.example`.
3. Run `npm run dev`.

## Vercel Hosting

This repository is prepared so an agent can deploy it from the project root with:

```bash
npm run host:vercel
```

Useful related commands:

- `npm run vercel:login` to authenticate the local Vercel CLI
- `npm run vercel:preview` for a preview deployment
- `npm run vercel:pull` to pull production environment settings

Notes:

- Required environment variable names are listed in `.env.example`.
- Local deployment linkage lives in `.vercel/project.json` and stays uncommitted.
- Upload exclusions for deployment are defined in `.vercelignore`.
- `scripts/vercel-run.cjs` works around a Windows hostname issue that can break Vercel CLI login on this machine.
