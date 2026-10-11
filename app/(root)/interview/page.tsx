import InterviewSetup from "@/Components/InterviewSetup";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getPlanEntitlements } from "@/lib/entitlements";

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ practiceFocus?: string; role?: string; mode?: string; level?: string; subject?: string }> }) {
    const params = await searchParams;
    const user = await getCurrentUser();
    const plan = getPlanEntitlements(user?.plan).plan;
    const initialMode = params.mode === "subject" || params.mode === "cse" ? params.mode : "role";
    return (
        <section className="mx-auto w-full max-w-4xl py-10">
            <h1 className="text-center text-3xl font-bold">Practice with a voice interviewer</h1>
            <p className="mt-3 text-center text-gray-400">Choose a role interview, a focused CSE subject diagnostic, or a broad Full CSE survey. Your transcript and feedback are saved after the session.</p>
            <InterviewSetup plan={plan} initialPracticeFocus={params.practiceFocus || ""} initialRole={params.role || ""} initialMode={initialMode} initialLevel={params.level || "Mid-level"} initialSubject={params.subject || ""} />
        </section>
    );
}
