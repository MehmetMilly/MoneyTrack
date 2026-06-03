# Backend Integration Plan

MoneyTrack uses Firebase Authentication and Cloud Firestore for user-owned personal finance data. This document records backend expectations in project-document form rather than as an agent prompt.

## Current Architecture

- Firebase client setup lives in `src/lib/firebase`.
- Firestore repository modules live in `src/lib/data/repositories`.
- Zustand coordinates auth state, subscriptions, loading states, errors, and user actions in `src/lib/data/store.ts`.
- Page components should call store actions rather than calling Firebase directly.

## Firestore Shape

All app-owned user data should stay below the authenticated user's document:

```text
users/{uid}
users/{uid}/accounts/{accountId}
users/{uid}/transactions/{transactionId}
users/{uid}/categories/{categoryId}
users/{uid}/debts/{debtId}
users/{uid}/debts/{debtId}/payments/{paymentId}
users/{uid}/installments/{installmentId}
users/{uid}/installments/{installmentId}/payments/{paymentId}
users/{uid}/goals/{goalId}
users/{uid}/goals/{goalId}/contributions/{contributionId}
users/{uid}/reminders/{reminderId}
```

## Behavior Expectations

- Signup creates a Firebase Auth user and bootstraps `users/{uid}`.
- Email/password, Google sign-in, logout, and password reset remain supported.
- New users receive clearly fake starter data for first-run UX.
- Protected app routes require an authenticated user.
- Auth routes redirect signed-in users to the dashboard.
- Settings persist to Firestore and update the UI immediately.
- Accounts, transactions, goals, obligations, installments, and reminders write through repository helpers.
- Money movement that touches more than one document should use Firestore batched writes or transactions.
- Firestore reads and writes must stay under the current authenticated user's path.

## High-Risk Flows

- Income increases the selected account balance.
- Expense decreases the selected account balance.
- Transfer decreases the source account and increases the destination account.
- Goal contribution decreases the source account and increases goal progress.
- Paying an obligation with a source account updates the obligation, creates a linked transaction, and updates balances.
- Paying an obligation without a source account updates only the obligation or reminder.

## Validation Targets

- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:e2e`
- New user signup initializes data.
- Existing user login survives refresh.
- Logout protects app routes.
- Password reset triggers Firebase email flow.
- User A cannot read or write User B's Firestore path.
- Theme settings persist across refresh/login. Language remains in the data model, but visible localization controls should stay disabled until Arabic is repaired.
- Offline persistence does not crash and reconnect syncs where Firebase supports it.
