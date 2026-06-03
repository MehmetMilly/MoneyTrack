# Roadmap

## Short-Term Polish

- Add real dashboard screenshots and a short demo walkthrough to the README.
- Repair Arabic localization and re-enable RTL behavior after review.
- Remove or archive unrelated generated assets that are not part of MoneyTrack.
- Improve empty states for new users and failed Firebase access.

## Data Reliability

- Expand unit tests beyond the first finance calculation coverage for account balance changes, transfer movement, planner totals, and goal progress.
- Add validation around negative amounts, invalid dates, and missing linked records.
- Add import/export support for user-owned finance data.

## Better Budgeting

- Add first-class monthly budget entities.
- Track category-level limits and progress.
- Add budget calculation tests.

## Recurring Obligations

- Convert recurring flags into scheduled occurrences.
- Add recurring bill and installment automation.
- Make reminders easier to reconcile with actual transactions.

## Dashboard Insights

- Add clearer trend charts and category summaries.
- Add SAR-aware formatting everywhere.
- Add mobile-specific dashboard QA.

## Firebase Security

- Add Firebase emulator-backed Firestore rules tests.
- Document Firebase authorized domains, auth providers, and expected indexes.
- Review all user data paths for owner-only access.

## Testing

- Expand Playwright coverage beyond auth/public routes into protected dashboard, account, entries, goals, and settings flows.
- Add unit tests for pure finance utilities.
- Run CI on pull requests.

## Deployment and Demo

- Add a live demo link only when a real deployment is stable.
- Add screenshots generated from a non-sensitive demo account.
- Keep `.vercel` and environment files out of Git.

## Open-Source Improvements

- Add focused GitHub issues for future work.
- Add clearer contribution labels.
- Keep docs aligned with actual code behavior.
