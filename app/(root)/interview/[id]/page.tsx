import { notFound, redirect } from "next/navigation";
import { getFeedbackByInterviewId, getInterviewById } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import DisplayTechIcons from "@/Components/DisplayTechIcons";
import Agent from "@/Components/Agent";
import Link from "next/link";
import { Button } from "@/Components/ui/button";
import { BrainCircuit, BriefcaseBusiness, Code2, Crown, Database, MessageCircle, Server } from "lucide-react";
import { getPlanEntitlements } from "@/lib/entitlements";

const InterviewDetails = async ({params}: { params: Promise<{ id: string }> }) => {
    const {id} = await params;

    if (!id) {
        console.error("No interview ID provided in route params");
        redirect("/");
    }

    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");
    const isPremium = getPlanEntitlements(user.plan).plan === "premium";
    const interview = await getInterviewById(id);

    if (!interview || interview.userId !== user.id) {
        console.error(" Interview not found in Firestore for ID:", id);
        notFound();
    }

    let feedback = null;
    try {
        if (user?.id) {
            feedback = await getFeedbackByInterviewId({
                interviewId: id,
                userId: user.id,
            });
        } else {
            console.warn(" No user found while fetching feedback");
        }
    } catch (err) {
        console.error(" Error fetching feedback for interview:", id, err);
    }

    const interviewTitle = interview.mode === "cse"
        ? "Full CSE Survey"
        : interview.mode === "subject"
            ? `${interview.subject || interview.role} Subject Mastery`
            : `${interview.role} Interview`;
    const interviewCategory = interview.mode === "cse"
        ? "Full CSE Survey"
        : interview.mode === "subject"
            ? "Subject Mastery"
            : ({
                technical: "Technical",
                behavioral: "Behavioral",
                mixed: "Mixed",
            } as Record<string, string>)[String(interview.type || "mixed").trim().toLowerCase()]
                || String(interview.type || "mixed").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const interviewContext = `${interview.role} ${interview.subject || ""}`.toLowerCase();
    const InterviewFocusIcon = interview.mode === "cse"
        ? BrainCircuit
        : interview.mode === "subject"
            ? /database|sql/i.test(interviewContext)
                ? Database
                : /network|distributed/i.test(interviewContext)
                    ? Server
                    : /artificial intelligence|machine learning/i.test(interviewContext)
                        ? BrainCircuit
                        : Code2
            : /behavioral/i.test(interview.type)
                ? MessageCircle
                : /data analyst|data scientist|database|sql/i.test(interviewContext)
                    ? Database
                    : /devops|backend/i.test(interviewContext)
                        ? Server
                        : /frontend|full.?stack|software engineer|developer/i.test(interviewContext)
                            ? Code2
                            : BriefcaseBusiness;

    return (
        <main className={isPremium ? "premium-interview-page" : undefined}>
            <header className={`app-content-card flex flex-col gap-4 p-5 sm:p-6${isPremium ? " premium-session-header" : ""}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                        <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-fuchsia-200/25 bg-gradient-to-br from-fuchsia-300/15 to-violet-400/10 text-pink-100 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.03)]">
                            <InterviewFocusIcon className="size-6" strokeWidth={1.8} />
                        </div>
                        <h1 className="min-w-0 break-words text-xl font-bold leading-tight text-white sm:text-2xl">{interviewTitle}</h1>
                    </div>
                    <div className="flex w-fit shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
                        {isPremium && <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200/25 bg-gradient-to-r from-pink-200/[0.12] to-violet-200/[0.1] px-3 py-1 text-xs font-semibold text-pink-100 shadow-[0_0_24px_-14px_rgba(244,114,182,0.8)]"><Crown size={13} aria-hidden="true" />Premium session</span>}
                        <span className="w-fit rounded-full border border-purple-200/20 bg-purple-200/[0.08] px-3 py-1 text-sm font-semibold text-purple-100">
                            {interviewCategory}
                        </span>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-3 text-sm text-white/65">
                    {interview.mode === "subject"
                        ? <p><span className="font-semibold text-white/80">Topics:</span> {(interview.topics || []).join(", ") || "All subject topics"}</p>
                        : interview.mode === "cse"
                            ? <p>One core question from each CSE subject</p>
                            : <DisplayTechIcons techStack={interview.techstack} />}
                </div>
                {(interview.goal || interview.practiceFocus) && <p className="rounded-xl border border-pink-200/10 bg-pink-300/[0.045] px-3 py-2 text-sm text-pink-100/85"><span className="font-semibold">Practice goal:</span> {interview.goal || interview.practiceFocus}</p>}
                {interview.durationMinutes && <p className="text-xs text-white/45">Text-only session cap: {interview.durationMinutes} minutes</p>}
            </header>

            {feedback && feedback.generatedFeedback && (
                <section className="app-content-card mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200">Previous feedback</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">Your latest interview assessment</h2>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-white/70">
                        {feedback.generatedFeedback}
                        </p>
                    </div>
                    <Button asChild className="min-h-11 shrink-0 rounded-full bg-gradient-to-r from-purple-200 to-pink-400 px-5 font-semibold text-black shadow-md hover:brightness-105">
                        <Link href={`/interview/${id}/feedback`}>View full feedback</Link>
                    </Button>
                </section>
            )}

            <Agent
                userName={user.name}
                userId={user.id}
                interviewId={id}
                initialTranscript={!feedback ? interview.transcript || [] : []}
                initialSessionProgress={!feedback ? interview.sessionProgress : undefined}
            />
        </main>
    );
};

export default InterviewDetails;
