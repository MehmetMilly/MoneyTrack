# MoneyTrack Agent Notes

MoneyTrack is a React + TypeScript + Vite personal finance app with Firebase-backed auth and Firestore data flows. Treat it as an active prototype that handles sensitive personal finance data.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview: `npm run preview`
- E2E smoke test: `npm run test:e2e`
- Unit tests: `npm run test:unit`
- Full local tests: `npm test`
- Vercel deploy: `npm run host:vercel`

When the user says `host it on vercel`, work from `C:\Users\mehme\Desktop\MoneyTrack`, run `npm run build`, then run `npm run host:vercel`.

## Environment and Secrets

Firebase web app variables are listed in `.env.example`. Local values belong in `.env.local`, which must never be committed or printed. Do not commit `.vercel`, Firebase Admin SDK keys, tokens, real user data, screenshots with real finance data, or generated private artifacts.

The local Vercel link may exist in `.vercel/project.json`; reuse it locally but do not commit it. If the link is missing, relink to the existing Vercel project named `moneytrack`.

## Important Directories

- `src/app` - router, route guards, app shell.
- `src/features` - route-level UI for auth, dashboard, accounts, entries, goals, obligations, insights, and settings.
- `src/lib/data` - domain types, Zustand store, Firebase repositories, and demo seed data.
- `src/lib/firebase` - Firebase client, auth helpers, and Firestore helpers.
- `src/lib/i18n` - English and Arabic localization.
- `src/styles` - global styles, tokens, fonts, and animations.
- `docs` - architecture, data model, roadmap, and Codex/application docs.
- `tests/e2e` - Playwright auth-flow smoke tests.

Large generated/story/media artifacts were moved out of the repository during cleanup. If similar artifacts reappear, keep them out of commits unless the user explicitly asks to version them.

## Coding Conventions

Use existing React, CSS module, Zustand, and repository patterns. Keep changes small and reviewable. Prefer typed data helpers over ad hoc string manipulation. Do not invent claims, screenshots, users, metrics, or production readiness.

Use `rg` for searching. Use `apply_patch` for manual edits. Do not revert user changes in a dirty worktree.

## Financial Data Rules

Treat finance data as private. Demo data must be obviously fake. Do not log sensitive values. Do not add fake revenue, fake users, fake testimonials, or claims that the app is bank-grade or certified.

When changing account balances, transactions, debts, installments, or goals, look for paired create/delete behavior and add tests when practical. Firestore writes should remain under `users/{uid}` unless the data model is intentionally changed.

## Safe Areas to Modify

Docs, README, CI, tests, pure utilities, UI copy, empty/error states, and small route-level UI fixes are generally safe. Repository functions are safe when the behavior is clearly understood and build/lint/tests pass.

## Risky Areas

Auth flow, Firebase client configuration, Firestore rules, account balance mutation, transaction reversal, debt/installment payment reconciliation, and localization directionality can break core behavior. Make focused edits and verify thoroughly.

## Validation

At minimum, run `npm run lint` and `npm run build` after code changes. Run `npm run test:e2e` when Playwright browsers are available. For UI changes, start the dev server and verify the app in a browser at desktop and mobile widths.

The login screen also exposes a read-only local demo workspace for review without Firebase setup. Use it for UI QA, but do not treat it as equivalent to a real authenticated Firebase session when validating persistence or authorization behavior.

## Known Limitations

Arabic localization currently falls back to English and is hidden from the visible UI until the source can be repaired. E2E coverage focuses on auth/public flows and a narrow mobile viewport; authenticated finance flows still need coverage. Firestore rules are simple owner-only rules and have static invariant tests, but still need emulator-backed rules tests. Recurring obligations are represented but not fully automated.
