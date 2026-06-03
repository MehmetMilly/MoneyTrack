# MoneyTrack Architecture

MoneyTrack is a Vite React application with TypeScript, React Router, Zustand, Firebase Authentication, and Cloud Firestore.

## App Structure

- `src/main.tsx` mounts the React app.
- `src/app/App.tsx` initializes the client store and renders the router.
- `src/app/Router.tsx` defines public auth routes and protected app routes.
- `src/app/RouteGuards.tsx` redirects users based on auth state.
- `src/app/layouts/AppLayout.tsx` provides the desktop sidebar and mobile navigation.
- `src/features/*` contains route-level screens for auth, dashboard, accounts, entries, goals, obligations, insights, and settings.
- `src/lib/data` contains domain types, Zustand state, Firebase repositories, and seed data.
- `src/lib/firebase` contains Firebase client, auth, and Firestore helpers.

## Routing

Public routes are `/login`, `/signup`, and `/forgot-password`. Authenticated users are redirected to `/dashboard`. App routes include `/accounts`, `/transactions`, `/transactions/new`, `/goals`, `/obligations`, `/insights`, and `/settings`.

## State and Data Flow

Zustand owns app state and exposes actions for auth, settings, accounts, transactions, planning entries, goals, debts, installments, and reminders. When Firebase auth reports a signed-in user, MoneyTrack bootstraps the user's Firestore document, seeds starter demo records for new users, and subscribes to the user's collections.

The store persists only UI settings in local storage under `moneytrack-ui-settings`. Finance data is intended to live under the signed-in user's Firestore document tree.

## Firebase

Firebase web app config is read from Vite environment variables. Authentication uses email/password and Google sign-in. Firestore data is currently organized under `users/{uid}` with nested collections.

The checked-in `firestore.rules` file restricts `users/{uid}` and its descendants to the matching authenticated user. Those rules still need broader validation before calling the app production-ready.

## Financial Entities

Implemented entities include accounts, transactions, categories, planning entries, debts, installments, reminders, goals, and goal contributions. Current finance logic includes account balance updates for income, expenses, transfers, debt totals, projected planner totals, and primary goal progress.

## Deployment

The app builds with `npm run build` and can be deployed through the repo-local Vercel script with `npm run host:vercel`. `vercel.json` rewrites SPA routes to `index.html` and proxies Firebase auth helper routes.

## Current Limitations

Arabic localization currently falls back to English and is hidden from the visible UI until the translation source can be repaired. E2E coverage focuses on auth/public routes and a narrow mobile viewport; authenticated finance flows still need coverage. Firestore rules are simple owner-only rules with static invariant coverage, but they should still be tested in the Firebase emulator against representative access cases. The app seeds clearly synthetic demo-like data for new users, which is useful for review but should be clearly disclosed.
