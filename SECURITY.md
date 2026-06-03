# Security Policy

MoneyTrack handles personal finance data, so contributors should be careful even though this repository is an open-source prototype.

Do not commit `.env.local`, Firebase credentials beyond public web app config, private keys, tokens, real user data, financial records, or screenshots containing private account details.

If you find a sensitive issue, avoid posting secrets or exploit details in a public issue. Contact the maintainer privately through GitHub, or open a minimal issue that says a private security report is needed.

Current assumptions:

- Firebase Authentication identifies users.
- Firestore rules restrict reads and writes to `users/{uid}` and nested documents for the signed-in user.
- Client-side validation improves UX but is not a security boundary.
- This project is not bank-grade software, financial advice, or a certified accounting tool.

Before changing auth, data access, or financial calculations, run the available checks and document any remaining risk in the pull request.
