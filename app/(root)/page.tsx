import React from "react";
import { Button } from "@/Components/ui/button";
import Link from "next/link";
import Image from "next/image";
import InterviewCard from "@/Components/InterviewCard";
import InterviewSection from "@/Components/InterviewSection";
import { getInterviewsByUserId, getFeedbackByInterviewIds } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { ArrowRight, BookOpen, BrainCircuit, BriefcaseBusiness, ChevronDown, Star } from "lucide-react";
import ProgressOverview from "@/Components/ProgressOverview";
import InterviewLibrary from "@/Components/InterviewLibrary";
import { getQuestionBookmarks } from "@/lib/actions/general.action";
import AccountPlanCard from "@/Components/AccountPlanCard";
import { getPlanEntitlements, isPremiumAdminEmail } from "@/lib/entitlements";

function sortNewestFirst<T extends { createdAt?: unknown }>(items: readonly T[] | null | undefined): T[] {
    const timestamp = (value: unknown) => {
        let milliseconds = 0;
        if (value instanceof Date) {
            milliseconds = value.getTime();
        } else if (typeof value === "string") {
            milliseconds = Date.parse(value);
        } else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
            milliseconds = value.toDate().getTime();
        }
        return Number.isFinite(milliseconds) ? milliseconds : 0;
    };

    return [...(items ?? [])].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));
}

const Page = async () => {
    const user = await getCurrentUser();

    if (!user) return <p>Please log in to see your interviews.</p>;

    const [userInterviews, bookmarks] = await Promise.all([
        getInterviewsByUserId(user.id),
        getQuestionBookmarks(),
    ]);

    const ownedInterviews = sortNewestFirst(userInterviews);
    const activeInterviews = ownedInterviews.filter((interview) => interview.archived !== true);
    const archivedInterviews = ownedInterviews.filter((interview) => interview.archived === true);
    const feedbackMap = await getFeedbackByInterviewIds(ownedInterviews.map((interview) => interview.id));
    const accountPlan = getPlanEntitlements(user.plan).plan;

    const hasPastInterviews = activeInterviews.length > 0;
    const pendingFeedbackInterviews = activeInterviews.filter((interview) => Boolean(interview.transcript?.length) && !feedbackMap[interview.id]);
    const latestPendingInterview = pendingFeedbackInterviews[0];

    return (
        <>
            <section className="relative isolate flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#191523] via-[#11121a] to-[#090a10] p-6 shadow-[0_24px_70px_-30px_rgba(168,85,247,0.48)] sm:p-8 md:min-h-[24rem] md:flex-row md:gap-10 md:px-12 lg:px-14">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                    <Star className="hero-star left-[46%] top-[13%] size-3 fill-purple-200/70 text-purple-200" />
                    <Star className="hero-star right-[5%] top-[38%] size-2.5 fill-pink-200/75 text-pink-200" />
                    <Star className="hero-star bottom-[12%] left-[51%] size-2.5 fill-fuchsia-200/70 text-fuchsia-200" />
                    <Star className="hero-star bottom-[28%] right-[44%] size-2 fill-purple-100/70 text-purple-100" />
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute -left-24 -top-32 size-80 rounded-full bg-purple-500/20 blur-[100px]" />
                    <div className="absolute -bottom-40 left-1/3 size-80 rounded-full bg-pink-500/10 blur-[100px]" />
                    <div className="absolute -right-24 -top-24 size-96 rounded-full bg-fuchsia-500/15 blur-[110px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.045)_1px,transparent_0)] [background-size:24px_24px] opacity-30" />
                </div>

                <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 text-center md:items-start md:text-left">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/20 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold tracking-[0.14em] text-pink-100/90 shadow-sm shadow-pink-950/30">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-pink-300 shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
                        AI INTERVIEW PRACTICE
                    </div>

                    <div className="relative w-full max-w-2xl">
                        <Star aria-hidden="true" className="hero-star -left-4 top-1 size-3 fill-purple-200/80 text-purple-200" />
                        <Star aria-hidden="true" className="hero-star -right-4 bottom-1 size-3 fill-pink-200/85 text-pink-200" />
                        <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[3.25rem] lg:leading-[1.08]">
                            Practice smarter. <br className="hidden sm:block" />
                            Interview with <span className="bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-300 bg-clip-text text-transparent">confidence.</span>
                        </h2>
                    </div>
                    <p className="max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
                        Realistic AI interviews, clear feedback, and steady progress.
                    </p>

                    <Button
                        asChild
                        className="relative mt-1 min-h-12 w-full justify-center rounded-full bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-300 px-12 font-bold text-[#17121d] shadow-lg shadow-fuchsia-950/30 hover:brightness-105 sm:w-52">
                        <Link href="/interview" className="flex w-full items-center justify-center gap-2">
                            <span>Start Interview</span>
                            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                        </Link>
                    </Button>
                </div>

                <div className="hero-artwork relative z-10 flex w-full max-w-md flex-1 items-center justify-center md:min-w-[18rem]">
                    <div aria-hidden="true" className="absolute size-56 rounded-full bg-gradient-to-br from-purple-500/25 to-pink-400/25 blur-3xl sm:size-72" />
                    <Star aria-hidden="true" className="hero-star left-[13%] top-[18%] size-4 fill-purple-200/80 text-purple-200" />
                    <Star aria-hidden="true" className="hero-star left-[31%] top-[7%] size-2.5 fill-pink-100/75 text-pink-100" />
                    <Star aria-hidden="true" className="hero-star right-[14%] top-[12%] size-3 fill-pink-200/90 text-pink-200" />
                    <Star aria-hidden="true" className="hero-star right-[31%] top-[5%] size-2 fill-purple-100/80 text-purple-100" />
                    <Star aria-hidden="true" className="hero-star left-[8%] top-[55%] size-3 fill-fuchsia-200/80 text-fuchsia-200" />
                    <Star aria-hidden="true" className="hero-star right-[8%] top-[58%] size-4 fill-purple-200/80 text-purple-200" />
                    <Star aria-hidden="true" className="hero-star right-[3%] top-[40%] size-2.5 fill-pink-100/80 text-pink-100" />
                    <Star aria-hidden="true" className="hero-star bottom-[12%] left-[27%] size-2.5 fill-pink-100/90 text-pink-100" />
                    <Star aria-hidden="true" className="hero-star bottom-[17%] right-[25%] size-3 fill-fuchsia-100/80 text-fuchsia-100" />
                    <Star aria-hidden="true" className="hero-star bottom-[7%] left-[15%] size-2 fill-purple-100/75 text-purple-100" />
                    <Image
                        src="/hero-interviewer-v2.png"
                        alt="AI interviewer robot with the PulseAI Prep logo on its laptop"
                        width={600}
                        height={600}
                        sizes="(max-width: 767px) 280px, (max-width: 1023px) 340px, 400px"
                        className="hero-sticker relative h-auto w-[17rem] object-contain sm:w-[20rem] md:w-[21rem] lg:w-[25rem]"
                    />
                </div>
            </section>

            <AccountPlanCard email={user.email} plan={accountPlan} isAdmin={isPremiumAdminEmail(user.email)} />

            <details className="app-content-card group mt-5 overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-base font-semibold text-white">Practice options</span>
                        <span className="text-sm text-white/55">Choose a mode or continue a saved interview.</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/60">
                            {pendingFeedbackInterviews.length > 0 ? `${pendingFeedbackInterviews.length} pending` : "3 modes"}
                        </span>
                        <ChevronDown aria-hidden="true" className="size-4 text-white/60 transition-transform group-open:rotate-180" />
                    </span>
                </summary>

                <div className="space-y-4 border-t border-white/10 p-4 sm:p-5">
                    {latestPendingInterview && (
                        <section className="rounded-2xl border border-pink-200/15 bg-gradient-to-r from-fuchsia-300/[0.07] via-white/[0.025] to-purple-300/[0.06] p-4 sm:p-5" aria-labelledby="resume-interview-heading">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-pink-200/15 bg-pink-300/[0.08] text-pink-100">
                                        <BriefcaseBusiness size={18} aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-200">Saved transcript · feedback pending</p>
                                        <h2 id="resume-interview-heading" className="mt-1 text-lg font-semibold text-white">Continue where you left off</h2>
                                        <p className="mt-1 text-sm leading-5 text-white/60">Resume this session or generate feedback from your saved answers.</p>
                                        <p className="mt-2 truncate text-sm font-medium text-white/80">
                                            {latestPendingInterview.mode === "subject"
                                                ? `${latestPendingInterview.subject || latestPendingInterview.role} · Subject Mastery`
                                                : latestPendingInterview.mode === "cse"
                                                    ? "Full CSE Survey"
                                                    : `${latestPendingInterview.role} · ${latestPendingInterview.type}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
                                    {pendingFeedbackInterviews.length > 1 && <span className="text-xs text-white/50">+{pendingFeedbackInterviews.length - 1} more</span>}
                                    <Link href={`/interview/${latestPendingInterview.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-300 px-4 text-sm font-bold text-[#17121d] shadow-md shadow-fuchsia-950/20 transition hover:brightness-105">
                                        Open saved interview <ArrowRight size={15} aria-hidden="true" />
                                    </Link>
                                    {pendingFeedbackInterviews.length > 1 && <Link href="#my-interviews" className="text-xs font-semibold text-purple-100 underline-offset-4 hover:underline">See all</Link>}
                                </div>
                            </div>
                        </section>
                    )}

                    <section aria-labelledby="quick-start-heading">
                        <div className="mb-3 flex items-baseline gap-3">
                            <h2 id="quick-start-heading" className="text-sm font-semibold text-white">Quick start</h2>
                            <p className="text-xs text-white/45">Choose a practice mode</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                                { mode: "role", title: "Role interview", subtitle: "Practice for a job role", Icon: BriefcaseBusiness },
                                { mode: "subject", title: "Subject mastery", subtitle: "Focus on one CSE subject", Icon: BookOpen },
                                { mode: "cse", title: "Full CSE survey", subtitle: "Sample core CSE subjects", Icon: BrainCircuit },
                            ].map(({ mode, title, subtitle, Icon }) => (
                                <Link key={mode} href={`/interview?mode=${mode}`} className="group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 transition hover:border-pink-200/25 hover:bg-pink-300/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-purple-200/15 bg-purple-300/[0.08] text-purple-100"><Icon size={18} aria-hidden="true" /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-white">{title}</span>
                                        <span className="mt-0.5 block text-xs text-white/50">{subtitle}</span>
                                    </span>
                                    <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-pink-100" />
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </details>

            <ProgressOverview interviews={ownedInterviews} feedbackByInterviewId={feedbackMap} bookmarks={bookmarks} isPremium={accountPlan === "premium"} />

            <InterviewSection
                id="my-interviews"
                title="My Interviews"
                description="Manage saved interview plans, practice sessions, and feedback."
                count={activeInterviews.length}
            >
                {hasPastInterviews ? (
                    <InterviewLibrary records={activeInterviews.map((interview) => ({
                        interview: {
                            id: interview.id,
                            role: interview.role,
                            type: interview.type,
                            mode: interview.mode,
                            subject: interview.subject,
                            techstack: interview.techstack || [],
                            createdAt: typeof interview.createdAt === "string"
                                ? interview.createdAt
                                : interview.createdAt instanceof Date
                                    ? interview.createdAt.toISOString()
                                    : "",
                            hasTranscript: Boolean(interview.transcript?.length),
                        },
                        feedback: feedbackMap[interview.id] || null,
                    }))} />
                ) : (
                    <p className="text-white/65">You haven&apos;t taken any interviews yet.</p>
                )}
            </InterviewSection>

            {archivedInterviews.length > 0 && (
                <InterviewSection title="Archived Interviews" count={archivedInterviews.length} initiallyOpen={false}>
                        {archivedInterviews.map((interview) => (
                            <InterviewCard
                                key={interview.id}
                                id={interview.id}
                                role={interview.role}
                                type={interview.type}
                                mode={interview.mode}
                                techstack={interview.techstack}
                                createdAt={String(interview.createdAt ?? "")}
                                feedback={feedbackMap[interview.id] || null}
                                hasTranscript={Boolean(interview.transcript?.length)}
                                canManage
                                isArchived
                            />
                        ))}
                </InterviewSection>
            )}

        </>
    );
};

export default Page;
