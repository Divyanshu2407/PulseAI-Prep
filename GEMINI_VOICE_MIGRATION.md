# Gemini Live voice interview copy

This is an isolated copy of `ai-interview-platform` with Vapi replaced by a Gemini Live voice flow. The source repository folder and GitHub repository were left unchanged.

## What changed

- Replaced Vapi call setup/event handling in `Components/Agent.tsx` with a Gemini Live WebSocket session, browser microphone capture through `AudioWorklet`, streamed PCM input, spoken PCM output, and transcript event handling.
- Added `app/api/gemini/session-token/route.ts`. It authenticates the Firebase session, checks interview ownership, creates a short-lived Gemini token, generates and saves interview questions when needed, and returns the session instructions.
- Added an interview setup form and server action so a candidate can choose role, experience level, interview focus, and skills before the interview.
- Autosaves text transcript turns to the owned interview record during the session, then includes a transcript copy with generated feedback.
- Adds server-side ownership checks to interview and feedback reads/writes and validates the Firebase ID token against the submitted email.
- Adds explicit consent before microphone streaming and transcript storage.
- Removes Vapi-specific routes, SDK imports, assistant configuration, types, and package dependencies.
- Adds `.env.example` and fixes the unresolved feedback type declaration.

## Setup

1. Copy `.env.example` to `.env.local` and set the Firebase Admin values.
2. Set `GOOGLE_GENERATIVE_AI_API_KEY` for the existing AI SDK question and feedback generation.
3. Set `GEMINI_API_KEY` for short-lived Live API tokens. Keep this server-side; never rename it with a `NEXT_PUBLIC_` prefix.
4. Install packages with `npm install`, then run the app with `npm run dev`.
5. Test in a modern browser over localhost or HTTPS and grant microphone access.

## Flow

The candidate creates an interview. The voice session endpoint confirms that the signed-in user owns it, generates the question list if missing, then returns a single-use, short-lived Gemini token. The browser streams 16 kHz mono PCM audio to Gemini Live. Input and output transcription events are shown in the transcript. On completion, the app saves text turns to Firestore and generates rubric feedback from those turns. Raw audio is not stored.

## Notes and limitations

- The Gemini 3.8 Live model is stable, while ephemeral tokens remain a preview feature. Models, quotas, and free-tier availability can change. Confirm current limits and terms in Google AI Studio before deployment. Google’s free tier may use submitted data to improve products; do not use it for confidential interview content without reviewing the applicable terms.
- Session resumption and context compression are not implemented. Gemini Live connections may reset after around 10 minutes, and audio-only sessions without compression are limited to 15 minutes. Voice is therefore capped at 10 minutes for every plan; text-only sessions can use the plan's 15- or 25-minute limit. Premium currently adds extra requested voice questions and a larger feedback discussion, not a longer Live connection.
- Account plans are server-enforced. New accounts start on Free; Premium is manually granted to an existing account by an email allowlisted in `PREMIUM_ADMIN_EMAILS`. There is no checkout or payment integration yet. Daily app request allowances are separate from Google's project-level Gemini quotas.
- The browser microphone must support `AudioWorklet` and `getUserMedia`. Permission denial, unsupported browsers, and network interruption currently surface as an error; a text-only fallback and reconnect/resume UX would be good follow-up work.
- This implementation captures recognized input and generated output text but does not retain microphone audio. Review transcript retention, consent, and deletion requirements before production.
- The original Vapi assistant’s prompt lived in the Vapi dashboard and is not part of this repo. The Gemini interviewer prompt is now in the session-token route and should be tuned against real interview sessions.
- Local lint, TypeScript, and production-build checks pass for this app copy. They do not verify live Firebase/Gemini credentials, microphone behavior, API quota, or the provider’s current Live session behavior; test those in the target project before deployment.
