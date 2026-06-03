# Contributing to MoneyTrack

Thanks for taking a look at MoneyTrack. This is an active prototype, so the best contributions are focused, reviewable improvements that make the app more reliable or easier to understand.

## Local Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in Firebase web app values for a project you control.
4. Run `npm run dev`.

## Branches and Pull Requests

Create a branch from the latest `master` or `main` branch, keep the scope small, and describe the user-facing change in the pull request. Include screenshots for UI work and list the checks you ran.

Useful checks:

- `npm run lint`
- `npm run build`
- `npm run test:e2e` when Playwright browsers are installed

## Good Contribution Areas

Bug fixes, accessibility improvements, Firebase error handling, finance calculation tests, docs improvements, dashboard polish, mobile layout fixes, and import/export support are all welcome.

## Security and Privacy

Do not include real credentials, Firebase private keys, `.env.local`, real financial records, or screenshots that expose private data. If a security issue involves sensitive details, avoid posting exploit steps or secrets publicly; use the process in `SECURITY.md`.
