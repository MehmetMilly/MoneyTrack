You are working in C:\\Users\\mehme\\Desktop\\MoneyTrack.



The frontend is done. Your task is to integrate the real backend and actual data features using Firebase Auth + Cloud Firestore.



First, inspect the codebase thoroughly. It is a Vite + React + TypeScript app. Current data lives in src/lib/data/store.ts using Zustand + localStorage demo data. Types are in src/lib/data/types.ts. Pages already exist for auth, dashboard, accounts, transactions, goals, obligations, insights, and settings.



Do not redesign the UI. Preserve the existing frontend and replace the mock/demo backend layer cleanly.



Use Firebase:

\- Firebase Auth for email/password signup, login, logout, and password reset.

\- Cloud Firestore for user data.

\- Firebase Web SDK modular API.

\- Enable Firestore offline persistence where supported.

\- No Cloud Functions unless absolutely necessary.



Firebase env vars are available in .env.local:

VITE\_FIREBASE\_API\_KEY

VITE\_FIREBASE\_AUTH\_DOMAIN

VITE\_FIREBASE\_PROJECT\_ID

VITE\_FIREBASE\_STORAGE\_BUCKET

VITE\_FIREBASE\_MESSAGING\_SENDER\_ID

VITE\_FIREBASE\_APP\_ID



Required architecture:

\- Add src/lib/firebase/client.ts for Firebase app initialization.

\- Add src/lib/firebase/auth.ts for auth helpers.

\- Add src/lib/firebase/firestore.ts for Firestore helpers.

\- Add repository/service modules under src/lib/data/repositories.

\- Keep Firebase calls out of page components where possible.

\- Refactor src/lib/data/store.ts to coordinate app state, auth state, subscriptions, actions, loading, and errors.



Firestore shape:

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



Security assumption:

Firestore rules isolate all data under users/{uid}; the client must only read/write the current authenticated user’s path.



Feature requirements:

1\. Signup creates Firebase Auth user, then creates users/{uid} profile doc.

2\. Signup seeds default categories and reasonable starter data if needed for first-run UX.

3\. Login uses Firebase Auth and routes to /dashboard.

4\. Logout signs out and routes to /login.

5\. Forgot password sends Firebase password reset email.

6\. App routes are protected. Auth routes redirect logged-in users to dashboard.

7\. Settings language/theme/currency persist to Firestore and still update the UI immediately.

8\. Accounts CRUD writes to Firestore.

9\. Transactions CRUD writes to Firestore.

10\. Income increases account balance.

11\. Expense decreases account balance.

12\. Transfer decreases source account and increases destination account.

13\. Goal contributions require a source account by default, decrease that account, and increase goal currentAmount.

14\. Debt/installment/reminder payments default to requiring a source account, decrease that account, create a linked transaction, and update the obligation.

15\. Obligation payment must also support “mark paid without source account,” which updates the obligation/reminder only.

16\. Use Firestore batched writes or transactions for multi-document money movement.

17\. Add loading/error states where async backend operations affect UI.

18\. Keep existing EN/AR and RTL behavior working.

19\. Fix existing lint errors.

20\. Do not commit secrets or hardcode Firebase config.
21. Google sign-in is also enabled in Firebase Authentication. Implement it as an additional auth option using the Firebase Web SDK, preferably with the popup flow for the Vite SPA. Keep email/password auth working exactly as planned. Do not change the Firestore schema for Google users; they should use the same users/{uid} bootstrap flow, profile doc creation, and default category seeding as email/password users. If an account-linking edge case appears, handle it cleanly without breaking first-time login.





Acceptance criteria:

\- npm run build passes.

\- npm run lint passes.

\- New user can sign up and see initialized app data.

\- Existing user can log in, refresh, and remain authenticated.

\- Logout protects app routes.

\- Password reset triggers Firebase reset email.

\- Creating income/expense/transfer updates account balances correctly.

\- Adding a goal contribution updates source account and goal progress.

\- Marking an obligation paid with a source account creates a linked transaction and updates balances.

\- Marking an obligation paid without source account updates only the obligation/reminder.

\- Data persists in Firestore after refresh.

\- User A cannot access User B’s data path.

\- Language and theme persist across refresh/login.

\- Offline mode does not crash and reconnect sync works where Firebase supports it.



