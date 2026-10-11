import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy and data | PulseAI Prep",
    description: "How PulseAI Prep handles interview audio, transcripts, feedback, and account data.",
};

export default function PrivacyPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 text-white sm:px-8">
            <Link href="/" className="text-sm font-semibold text-pink-200 underline-offset-4 hover:underline">Back to PulseAI Prep</Link>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy and data</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">This page describes the current behavior of this app preview. Review it before using real or confidential interview material.</p>

            <div className="mt-8 space-y-6 text-sm leading-7 text-white/75">
                <section>
                    <h2 className="text-lg font-semibold text-white">Microphone audio and transcripts</h2>
                    <p className="mt-2">When you choose a voice interview and give microphone permission, the app streams audio to Google Gemini Live to run the interview. The app does not save raw microphone audio. Recognized transcript turns, interview settings, and generated feedback are saved in the Firebase Firestore project configured for this app.</p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold text-white">AI processing</h2>
                    <p className="mt-2">Gemini receives the information needed to generate questions, conduct voice sessions, create feedback, and answer feedback-discussion questions. Google’s API terms and project-level quotas apply. Do not submit sensitive or confidential information until you have reviewed the terms for the API key and account you configured.</p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold text-white">Storage and deletion</h2>
                    <p className="mt-2">Saved interviews and feedback remain in the configured Firebase project until you delete an interview in the app or an administrator removes the stored account data. Deleting an interview also deletes its saved feedback and transcript. The app does not currently apply an automatic retention period or delete the Firebase Authentication account when an interview is removed.</p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold text-white">Plans and usage</h2>
                    <p className="mt-2">The app stores the Free or Premium plan in Firebase Authentication custom claims and mirrors it on the account profile. Daily AI request counts are stored in Firestore. Premium is manually assigned by a configured administrator in this preview; the app does not currently collect payments or create paid subscriptions. Daily usage counters are keyed by UTC date.</p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold text-white">Shared Firebase project</h2>
                    <p className="mt-2">The server checks the signed-in account and ownership before reading or changing interview records. This app uses Firebase Admin on the server, which bypasses Firestore Security Rules; protect the service-account credentials and Firebase project IAM access. If the same Firebase project is used by another app, deleting data or changing project-level rules can affect that app too.</p>
                </section>
            </div>
        </main>
    );
}
