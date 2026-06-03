# Data Model

MoneyTrack stores user-owned data under `users/{uid}` in Firestore. The model below reflects the current TypeScript types and repository code.

## Implemented

`User`

- Stored at `users/{uid}`.
- Contains name, email, optional avatar, settings, timestamps, and migration metadata.

`Account`

- Stored in `users/{uid}/accounts`.
- Tracks account name, type, balance, color, and timestamps.
- Supported types are bank, cash, wallet, investment, and savings.

`Transaction`

- Stored in `users/{uid}/transactions`.
- Supports income, expense, and transfer records.
- Creating or deleting transactions updates related account balances inside a Firestore transaction.

`Category`

- Stored in `users/{uid}/categories`.
- Tracks name, Arabic name, icon, type, and color.

`PlanningEntry`

- Stored in `users/{uid}/planningEntries`.
- Represents expected or confirmed positive and negative money movements for goal planning.
- Supports expected amount, actual amount, due date, notes, and links to accounts or transactions.

`Goal`

- Stored in `users/{uid}/goals`.
- Tracks target amount, current amount, target date, monthly contribution, icon, color, and creation date.
- Contributions are stored in `users/{uid}/goals/{goalId}/contributions`.

`Debt`

- Stored in `users/{uid}/debts`.
- Tracks money owed by the user or owed to the user, total amount, paid amount, creditor, due date, status, and notes.
- Payments are stored in `users/{uid}/debts/{debtId}/payments`.

`Installment`

- Stored in `users/{uid}/installments`.
- Tracks total amount, monthly amount, installment counts, provider, next due date, status, and notes.
- Payments are stored in `users/{uid}/installments/{installmentId}/payments`.

`Reminder`

- Stored in `users/{uid}/reminders`.
- Tracks bills, custom reminders, debt reminders, and installment reminders with due date, amount, status, and recurrence flag.

`Settings`

- Stored on the user document and partially persisted in local storage for UI continuity.
- Current settings include language, theme, currency, planner dashboard mode, goal progress mode, expected-entry inclusion, advanced page visibility, and primary goal.

## Planned or Incomplete

Recurring payments are represented in some types but are not fully automated. Account or wallet import/export is not implemented. Budget entities are not currently a first-class model, although planning entries and goals cover some budgeting behavior. Multi-currency support is not implemented; SAR is the only supported currency.
