You are redesigning and building the front-end for MoneyTrack, a bilingual personal finance app.

Before coding, think like a senior product designer and front-end engineer. Do not rush into implementation. Study the app, understand the product model, research strong UI/UX patterns if you have browsing access, then make deliberate design decisions. I want a genuinely excellent, distinctive app interface, not a generic finance dashboard.

Context:
- App name: MoneyTrack.
- Product type: personal finance tracker, not a stock trading app, crypto app, or generic banking clone.
- Primary user: an individual who wants clear control over personal money, assets/accounts, expenses, debts, installments, savings goals, and upcoming obligations.
- Backend direction later: Firebase Auth + Firestore.
- Web hosting later: Vercel.
- Mobile packaging later: Capacitor Android.
- The front-end must be suitable for both desktop web and Android mobile.
- The app supports open signup with email + password, but this task is focused on the front-end experience.
- The app must support full English and Arabic language switching. Arabic must switch the whole UI into proper RTL layout, not just translate labels.
- Currency: SAR / Saudi Riyal.
- Input model for v1: manual entry.
- Reminders for v1: in-app reminders.
- Analytics for v1: actionable basics, not advanced financial reporting.
- Legacy data migration is not required. You may use realistic seeded demo data.

Existing app:
- There is an old single-file prototype at C:\Users\mehme\Desktop\MoneyTrack\MoneyTrack.html.
- Treat it as a rough product reference only, not as a design or architecture constraint.
- It currently tracks expenses, assets, a tablet purchase goal, a keyboard installment, local save/import/export, and basic totals.

Visual references:
- Primary visual direction: C:\Users\mehme\Desktop\MoneyTrack\generated-visual-directions\03_tactile_ledger_studio.png
- Secondary influence: C:\Users\mehme\Desktop\MoneyTrack\generated-visual-directions\04_cinematic_dark_command.png

Use direction 03 as the foundation:
- Tactile ledger studio.
- Calm, premium, personal, organized, and trustworthy.
- Soft off-white surfaces, ink-like typography, fine ruled lines, ledger rows, tabs, precise spacing, subtle physical texture, and a sense of a premium digital notebook.
- Strong information hierarchy, readable rows, practical forms, goal progress, debt/installment timelines, and clean settings.
- It should feel crafted and mature, not old-fashioned.

Borrow selectively from direction 04:
- Stronger depth and focus.
- More cinematic contrast where useful.
- More fluid motion energy.
- More premium command-center feeling for desktop.
- Better dramatic emphasis for key financial states.
- Do not simply make the app dark. Use dark mode as one possible theme, but the primary design should remain grounded in the tactile ledger direction unless you have a clearly better reason.

Creative freedom:
- You are not required to copy either reference exactly.
- You should rethink the UI if a better structure serves the product.
- You may redesign navigation, dashboard layout, goal flows, forms, reminders, account summaries, and mobile tab structure.
- Be creative, but stay practical and buildable.
- The result should feel unique, memorable, and designed specifically for this app.
- Avoid default dashboard tropes. Do not produce a generic card grid with a sidebar and charts unless you make it meaningfully better.

Research and design thinking:
- If you can browse, research modern examples of excellent finance apps, personal accounting tools, productivity tools, Arabic/RTL interfaces, mobile-first financial UX, and premium dashboard design.
- Do not copy any brand. Extract principles: information density, typography, rhythm, navigation, progressive disclosure, form ergonomics, responsive behavior, and motion.
- Consider how a real user opens the app daily: checking available money, seeing obligations, adding a transaction, marking a payment as paid, updating a goal, switching language, and trusting sync/offline state.
- Think through the hierarchy before choosing visuals.

Core screens to design and implement:
1. Auth shell:
   - Login.
   - Signup.
   - Forgot password.
   - Language switch available before login.

2. Main dashboard:
   - Available money.
   - Total assets/accounts.
   - Total debts.
   - Upcoming obligations.
   - Savings goals.
   - This month summary.
   - Sync/offline status.
   - Clear primary action to add a new item.

3. Accounts/assets:
   - List of accounts/assets.
   - Balances.
   - Account type.
   - Quick edit.
   - Empty state.

4. Transactions/manual entries:
   - Income.
   - Expense.
   - Transfer if useful.
   - Category.
   - Account.
   - Amount.
   - Date.
   - Notes.
   - Recurring toggle if useful.

5. Debts and loans:
   - Who/what the debt is for.
   - Amount owed.
   - Paid amount.
   - Due date.
   - Status.
   - Mark payment.

6. Installments:
   - Monthly amount.
   - Total amount.
   - Remaining installments.
   - Next due date.
   - Paid/upcoming timeline.

7. Goals:
   - Goal amount.
   - Current saved amount.
   - Remaining amount.
   - Target date.
   - Contribution plan.
   - Progress visualization.

8. Reminders:
   - Upcoming obligations.
   - Due soon.
   - Overdue.
   - Paid history.
   - In-app reminder states.

9. Insights:
   - Actionable basics only.
   - Monthly cash flow.
   - Category totals.
   - Goal progress.
   - Debt/installment burden.
   - Avoid stock-market style analytics.

10. Settings/profile:
   - Profile.
   - Language switch EN/AR.
   - Currency SAR.
   - Theme light/dark/system.
   - Sync/offline status.
   - Account/security controls.

Design requirements:
- Build the actual usable app surface, not a landing page.
- The first screen after login must be the product dashboard.
- Desktop should feel like a premium command center, but not bloated.
- Mobile should feel native, fast, thumb-friendly, and fluid.
- Arabic RTL must be designed intentionally: mirrored layout, proper alignment, correct navigation direction, and Arabic-friendly typography.
- English LTR must also feel first-class.
- Use high-quality typography and spacing. Do not rely on browser defaults.
- Use consistent design tokens: colors, surfaces, borders, radii, elevation, spacing, typography, motion.
- Make controls tactile: rows, segmented controls, bottom sheets, tabs, drawers, forms, toggles, and inline editing should feel coherent.
- Use icons only where they improve scanning or affordance.
- Use charts sparingly and make them readable.
- Show realistic data in SAR.

Motion requirements:
- Add polished, purposeful animation.
- Use motion for navigation transitions, add/edit flows, bottom sheets, row expansion, paid-state confirmation, goal progress, and language/theme transitions.
- Motion should feel fluid and premium, not noisy.
- Respect prefers-reduced-motion.
- Avoid constant looping decorative animations.

Frontend implementation expectations:
- Prefer React + Vite + TypeScript unless the existing project already dictates a different setup.
- Structure the app as real components, not one huge file.
- Include a clear app shell, feature modules, reusable UI primitives, demo data, localization setup, theme handling, and responsive layouts.
- Use local state/demo persistence for now if backend integration is not part of this task.
- Leave Firebase integration points cleanly prepared, but do not fake a half-working backend unless explicitly asked.
- The UI should be ready to connect to Firebase Auth and Firestore later.
- Keep the implementation accessible: labels, focus states, keyboard support, contrast, reduced motion, and semantic structure.

Suggested front-end architecture:
- src/app for shell/routing/state providers.
- src/features/auth for auth screens.
- src/features/dashboard for dashboard surfaces.
- src/features/accounts for assets/accounts.
- src/features/entries for transactions and manual entry flows.
- src/features/goals for savings goals.
- src/features/obligations for debts, loans, installments, and reminders.
- src/features/settings for profile, language, theme, and sync settings.
- src/components/ui for shared primitives.
- src/lib for formatting, demo data, i18n, dates, currency, and helpers.
- src/styles or CSS modules for design tokens and global styles.

Quality bar:
- This should look like a carefully designed premium product, not a template.
- Avoid generic AI design habits: purple-blue gradients, blurry blobs, glass cards everywhere, random 3D coins, fake stock charts, crypto aesthetics, oversized hero sections, floating bento cards, meaningless badges, generic "AI assistant" widgets, and tiny unreadable labels.
- Do not overuse beige or make the whole UI one-note. The tactile ledger direction should be refined, not dull.
- Do not let creativity break usability.
- Every screen should answer: what does the user need to decide or do here?

Process:
1. Inspect the old app and the two visual reference images.
2. Research or reason through strong UI/UX patterns before designing.
3. Propose a concise design strategy:
   - visual thesis,
   - information architecture,
   - key interaction patterns,
   - motion language,
   - theme and localization approach.
4. Design the core app screens as a coherent system.
5. Implement the front-end.
6. Verify desktop and mobile responsiveness.
7. Verify English and Arabic layout switching.
8. Verify the core flows:
   - login/signup visual flow,
   - dashboard scan,
   - add entry,
   - update goal,
   - mark obligation paid,
   - switch language,
   - switch theme.

Final deliverable:
- A complete, working front-end for MoneyTrack.
- A short explanation of the design direction and major decisions.
- A list of implemented screens and flows.
- Any remaining backend integration TODOs clearly separated from completed front-end work.
