# MoneyTrack Agent Notes

When the user says `host it on vercel`, work from the repository root: `C:\Users\mehme\Desktop\MoneyTrack`.

Use this order:

1. Run `npm run build`.
2. Run `npm run host:vercel`.

Important details:

- This repo has a local Vercel link in `.vercel/project.json`. Do not commit `.vercel`, but if it exists locally, reuse it.
- The deployment command is `npm run host:vercel`, which runs the repo-local Vercel CLI through `scripts/vercel-run.cjs`.
- If Vercel auth is needed, run `npm run vercel:login` first.
- If the local Vercel link is missing, relink the folder to the existing Vercel project named `moneytrack` before deploying.
- Required env keys are listed in `.env.example`.
- Do not print secret values from `.env.local`.
