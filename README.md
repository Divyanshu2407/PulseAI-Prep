# PulseAI Prep

PulseAI Prep is an AI interview practice app built with Next.js, Firebase, and Gemini. It supports role interviews, focused CSE subject practice, full CSE surveys, saved transcripts, and evidence-based feedback.

## Run locally

Use Node.js 22 or newer. From this folder:

```powershell
npm ci
npm run dev
```

Open <http://localhost:3000>. Microphone access requires localhost or HTTPS. Text-only practice is available if microphone access is unavailable.

## Environment setup

Copy `.env.example` to `.env.local` and fill in the values. Keep `.env.local` private; it is ignored by Git. The Gemini keys and Firebase Admin credentials are server-only and must not use a `NEXT_PUBLIC_` prefix.

- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL` are from the Firebase Admin service account.
- `GOOGLE_GENERATIVE_AI_API_KEY` is used for question generation, feedback, and the feedback discussion by default.
- `GEMINI_API_KEY` is used by the server to mint short-lived Gemini Live tokens.
- `GEMINI_DISCUSSION_API_KEY` is optional; set it only if the feedback discussion should use a separate Gemini key.
- `PREMIUM_ADMIN_EMAILS` is an optional comma-separated allowlist of administrators who can manually assign or revoke Premium in the dashboard. Do not put this value in a `NEXT_PUBLIC_` variable.
- `PREMIUM_COUPON_CODE` is an optional server-only coupon. Each account can redeem the configured code once; the code can be used by multiple accounts. Choose a value of at least 7 characters, keep it private, and never use a `NEXT_PUBLIC_` prefix.

## Account plans in this preview

Every new account starts on Free. Free includes 12 AI requests per UTC day, up to 10 minutes of text practice, 10-minute Gemini Live voice sessions, 2 requested extra voice questions, and 20 feedback-coach questions per report. Premium includes 60 AI requests per UTC day, up to 25 minutes of text practice, the same 10-minute Live voice cap, 8 requested extra voice questions, and 60 feedback-coach questions per report.

Premium can be activated with the configured coupon or assigned by an allowlisted administrator for this preview. Set `PREMIUM_COUPON_CODE` in the server environment to enable coupon redemption, and set `PREMIUM_ADMIN_EMAILS` to expose the plan-management form. Coupon codes are checked on the server, and a redemption is recorded under the signed-in account before Firebase Auth custom claims are updated. Rotating or removing the configured code stops new redemptions; existing Premium accounts remain active until an administrator changes their plan. Checkout and payment collection are not implemented yet, and are labeled as coming soon in the app.

Daily app request limits reduce per-account overuse but do not replace the quota limits set in Google AI Studio or Firebase. Failed AI attempts count toward the daily allowance. Gemini Live voice stays capped at 10 minutes while automatic session reconnection is not implemented.

## Firestore indexes

`firestore.indexes.json` includes the composite indexes used by the interview list and latest-feedback query. `firestore.rules` denies direct browser access because this app uses Firebase Admin on the server for Firestore and Firebase Auth in the browser. Admin SDK requests bypass Firestore Security Rules, so server actions and routes must keep their authentication and ownership checks.

**Before deploying rules:** Firebase rules apply to the whole Firebase project. This project may be shared with another app, so inspect and merge its existing rules first; deploying this default-deny file as-is will block direct Firestore access from every browser app using that project. Do not deploy it until you have confirmed the other app also uses server-side Firestore access or have safely merged its required client rules. A broad wildcard allow in merged rules can override a narrower deny rule.

The Firebase web configuration in `Firebase/client.ts` is intended for browser use. Restrict its API key and authorized domains in Google Cloud/Firebase settings.

## Checks and production build

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm run build
npm start
```

The development and production build scripts explicitly use Webpack. Deploy only after the production build succeeds and the Firebase/Gemini flows have been tested with the intended project and deployment environment.

## Data and voice notes

The app stores interview transcripts and feedback in Firestore; it does not store microphone audio. The current data handling summary is at `/privacy`. Review consent, retention, deletion, Firebase rules, API quotas, and provider terms before inviting real users. Gemini Live session resumption is not implemented, so voice practice remains capped at 10 minutes; see [GEMINI_VOICE_MIGRATION.md](GEMINI_VOICE_MIGRATION.md) for current limitations.
