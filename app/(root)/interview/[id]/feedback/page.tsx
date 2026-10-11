import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getFeedbackByInterviewId, getInterviewById } from "@/lib/actions/general.action";
import { Button } from "@/Components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import PracticePlan from "@/Components/PracticePlan";
import TranscriptTools from "@/Components/TranscriptTools";
import { QuestionBookmarkList } from "@/Components/QuestionBookmarks";
import FeedbackExport from "@/Components/FeedbackExport";
import FeedbackDiscussion from "@/Components/FeedbackDiscussion";
import { getQuestionBookmarkIds } from "@/lib/actions/general.action";
import { getPlanEntitlements } from "@/lib/entitlements";

interface FeedbackPageProps {
    params: Promise<{ id: string }>;
}

const panelClass = "app-content-card p-5 sm:p-6";

const Feedback = async ({ params }: FeedbackPageProps) => {
    const { id: interviewId } = await params;
    const user = await getCurrentUser();

    if (!user) redirect("/sign-in");

    const interview = await getInterviewById(interviewId);
    if (!interview) {
        return <p className="mx-auto mt-10 max-w-3xl text-center text-white/70">Interview not found. It may have been deleted or not created.</p>;
    }

    const feedback = await getFeedbackByInterviewId({ interviewId, userId: user.id });
    if (!feedback) {
        return <p className="mx-auto mt-10 max-w-3xl text-center text-white/70">No feedback found for this interview.</p>;
    }
    const questionBookmarkIds = await getQuestionBookmarkIds(interviewId);
    const preparedQuestions = Array.isArray(interview.questions) ? interview.questions : (interview.questionPlan || []).map((item) => item.question);
    const entitlements = getPlanEntitlements(user.plan);

    // Existing feedback documents predate the 1–5 rubric and remain displayed on their 100-point scale.
    const scoreScale = feedback.scoreScale === 25 ? 25 : 100;
    const partialReasonLabel: Record<InterviewEndReason, string> = {
        planned_complete: "The session ended after its planned questions were handled, but one or more were skipped.",
        candidate_requested: "You chose to end the interview early.",
        manual_finish: "The interview was ended before all planned questions were complete.",
        time_limit: "The session reached its time limit.",
        connection_lost: "The voice connection ended before the interview was confirmed complete.",
    };
    const interviewTitle = interview.mode === "cse"
        ? "Full CSE survey"
        : interview.mode === "subject"
            ? `${interview.subject || interview.role} mastery`
            : `${interview.role} interview`;

    let createdAt: string | null = null;
    if (feedback.createdAt) {
        if (typeof feedback.createdAt === "string") {
            createdAt = feedback.createdAt;
        } else if ("toDate" in feedback.createdAt) {
            createdAt = feedback.createdAt.toDate().toISOString();
        } else if (feedback.createdAt instanceof Date) {
            createdAt = feedback.createdAt.toISOString();
        }
    }

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
            <header className={`${panelClass} flex flex-col gap-5 sm:p-7`}>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Interview report</p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                        {interview.mode === "cse"
                            ? <>Full CSE survey report</>
                            : interview.mode === "subject"
                            ? <><span className="capitalize">{interview.subject || interview.role}</span> mastery report</>
                            : <><span className="capitalize">{interview.role}</span> interview feedback</>}
                    </h1>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3">
                        <Image src="/star.svg" width={22} height={22} alt="" aria-hidden="true" />
                        <div>
                            <p className="text-xs text-white/50">{feedback.sessionProgress?.status === "partial" ? "Provisional score" : "Overall score"}</p>
                            <p className="font-semibold text-white">{feedback.totalScore !== null && feedback.totalScore !== undefined
                                ? <>{feedback.totalScore}<span className="font-normal text-white/55"> / {scoreScale}</span></>
                                : <span className="text-sm font-medium text-white/65">Not scored · insufficient evidence</span>}</p>
                            {feedback.scoreCoverage && <p className="text-xs text-white/45">Evidence for {feedback.scoreCoverage.assessed} of {feedback.scoreCoverage.total} competencies</p>}
                        </div>
                    </div>
                    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3">
                        <Image src="/calendar.svg" width={22} height={22} alt="" aria-hidden="true" />
                        <div>
                            <p className="text-xs text-white/50">Generated</p>
                            <p className="font-medium text-white/85">{createdAt ? dayjs(createdAt).format("MMM D, YYYY · h:mm A") : "Date unavailable"}</p>
                        </div>
                    </div>
                </div>
            </header>

            {feedback.sessionProgress?.status === "partial" && (
                <section className={`${panelClass} border border-amber-200/20 bg-amber-300/[0.06]`} role="note" aria-label="Partial interview assessment">
                    <p className="text-sm font-semibold text-amber-100">Partial interview feedback · provisional assessment</p>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                        {partialReasonLabel[feedback.sessionProgress.reason]} {feedback.sessionProgress.totalCoreQuestions > 0
                            ? <>Recorded progress: {feedback.sessionProgress.completedCoreQuestions} answered, {feedback.sessionProgress.skippedCoreQuestions} skipped, and {Math.max(0, feedback.sessionProgress.totalCoreQuestions - feedback.sessionProgress.completedCoreQuestions - feedback.sessionProgress.skippedCoreQuestions)} unanswered of {feedback.sessionProgress.totalCoreQuestions} core questions; {feedback.sessionProgress.completedExtraQuestions} of {feedback.sessionProgress.queuedExtraQuestions} requested extra questions answered.</>
                            : "Question progress was not recorded for this session; this report uses the saved transcript."}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/60">This report uses recorded answers only. Unanswered questions are not treated as incorrect, and this score should not be compared directly with a completed interview.</p>
                </section>
            )}

            {(interview.mode === "subject" || interview.mode === "cse") && feedback.assessmentCoverage && (
                <section className={panelClass} aria-label="Assessment coverage">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Topic evidence coverage</p>
                        <p className="text-sm font-semibold text-purple-100">{feedback.assessmentCoverage.assessedTopics} / {feedback.assessmentCoverage.totalTopics} topics · {feedback.assessmentCoverage.percentage}%</p>
                    </div>
                    <div role="progressbar" aria-label="Topic evidence coverage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={feedback.assessmentCoverage.percentage} className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-400" style={{ width: `${feedback.assessmentCoverage.percentage}%` }} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                        {feedback.assessmentCoverage.percentage < 100
                            ? "This is a partial assessment. Treat the score as provisional; topics without transcript evidence are marked Not assessed."
                            : interview.mode === "cse"
                                ? "This is a broad survey with one planned core question per CSE subject, not a comprehensive exam of every subject."
                                : "Coverage means the transcript contained evidence for each planned topic; some difficulty levels may still be marked Not assessed."}
                    </p>
                </section>
            )}

            <section className={panelClass} aria-labelledby="summary-heading">
                <h2 id="summary-heading" className="text-lg font-semibold text-white sm:text-xl">Summary</h2>
                <p className="mt-3 text-sm leading-7 text-white/75 sm:text-base">
                    {feedback.finalAssessment || "A feedback summary is not available for this interview."}
                </p>
            </section>

            <PracticePlan
                plan={feedback.practicePlan}
                areasForImprovement={feedback.areasForImprovement || []}
                categoryScores={feedback.categoryScores || []}
                transcript={feedback.transcript}
                feedbackId={feedback.id}
                completedSteps={feedback.completedPracticeSteps || []}
                interview={{
                    role: interview.role,
                    mode: interview.mode,
                    level: interview.level,
                    subject: interview.subject,
                }}
            />

            <QuestionBookmarkList interviewId={interviewId} title={interviewTitle} questions={preparedQuestions} initialIds={questionBookmarkIds} />

            {(interview.mode === "subject" || interview.mode === "cse") && (
                <section className={panelClass} aria-labelledby="subject-mastery-heading">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200">{interview.mode === "cse" ? "Cross-subject assessment" : "Topic-by-topic assessment"}</p>
                    <h2 id="subject-mastery-heading" className="mt-1 text-lg font-semibold text-white sm:text-xl">{interview.mode === "cse" ? "Full CSE survey" : "Subject mastery"}</h2>
                    {interview.mode === "cse" && <p className="mt-2 text-sm text-white/55">This is a broad diagnostic across CSE subjects, with one planned core question per subject.</p>}
                    <p className="mt-2 text-sm text-white/55">Not assessed means the session did not gather enough evidence at that difficulty.</p>
                    {feedback.subjectMastery?.length ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {feedback.subjectMastery.map((item) => (
                                <article key={`${item.subject || interview.subject || "CSE"}-${item.topic}`} className="rounded-xl border border-white/10 bg-black/15 p-4">
                                    <h3 className="font-semibold text-white">{interview.mode === "cse" ? item.subject || "CSE subject" : item.topic}</h3>
                                    {interview.mode === "cse" && <p className="mt-1 text-xs text-white/55">{item.topic}</p>}
                                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                                        <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-white/75"><span className="block text-xs text-white/45">Fundamentals</span>{item.fundamentals}</p>
                                        <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-white/75"><span className="block text-xs text-white/45">Application</span>{item.application}</p>
                                        <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-white/75"><span className="block text-xs text-white/45">Advanced</span>{item.advanced}</p>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/65">{item.evidence}</p>
                                </article>
                            ))}
                        </div>
                    ) : <p className="mt-3 text-sm text-white/60">Topic-level results are not available for this session.</p>}
                </section>
            )}

            {feedback.transcript?.length ? <TranscriptTools transcript={feedback.transcript} interviewTitle={interviewTitle} /> : null}

            <section className={panelClass} aria-labelledby="breakdown-heading">
                <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200">Detailed results</p>
                        <h2 id="breakdown-heading" className="mt-1 text-lg font-semibold text-white sm:text-xl">Interview breakdown</h2>
                    </div>
                    <span className="text-xs text-white/50">{scoreScale === 25 ? "Ratings out of 5" : "Scores out of 100"}</span>
                </div>
                {feedback.categoryScores?.length ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {feedback.categoryScores.map((category, index) => {
                            const categoryScale = feedback.scoreScale === 25 ? 5 : 100;
                            const assessed = category.assessed ?? typeof category.score === "number";
                            const score = assessed && typeof category.score === "number"
                                ? Math.min(categoryScale, Math.max(0, category.score))
                                : null;
                            const progress = score === null ? 0 : (score / categoryScale) * 100;
                            return (
                                <article key={`${category.name}-${index}`} className="rounded-xl border border-white/10 bg-black/15 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-white sm:text-base">{category.name}</h3>
                                        <span className="shrink-0 rounded-full border border-purple-200/20 bg-purple-200/10 px-2.5 py-1 text-xs font-semibold text-purple-100">{score === null ? "Not assessed" : `${score}/${categoryScale}`}</span>
                                    </div>
                                    {score !== null && <div role="progressbar" aria-label={`${category.name} score`} aria-valuemin={0} aria-valuemax={categoryScale} aria-valuenow={score} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-400" style={{ width: `${progress}%` }} />
                                    </div>}
                                    <p className="mt-3 text-sm leading-6 text-white/70">{category.comment}</p>
                                    {category.evidence && (
                                        <div className="mt-3 rounded-lg border border-purple-200/10 bg-purple-300/[0.045] px-3 py-2.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-100/70">What in the transcript supports this</p>
                                            <blockquote className="mt-1.5 border-l-2 border-purple-200/35 pl-2.5 text-xs leading-5 text-white/65">{category.evidence}</blockquote>
                                            {(() => {
                                                const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
                                                const quotedText = (category.evidence || "").match(/["“]([^"”]{8,})["”]/)?.[1] || "";
                                                const quote = normalize(quotedText);
                                                const turnIndex = (feedback.transcript || []).findIndex((turn) => turn.role === "user" && quote.length >= 18 && normalize(turn.content).includes(quote));
                                                return turnIndex >= 0 ? <a href={`#transcript-turn-${turnIndex}`} className="mt-2 inline-block text-xs font-semibold text-purple-200 underline-offset-4 hover:underline">Jump to the supporting answer</a> : null;
                                            })()}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-white/60">No category scores are available.</p>
                )}
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <section className={panelClass} aria-labelledby="strengths-heading">
                    <h2 id="strengths-heading" className="text-lg font-semibold text-white sm:text-xl">Strengths</h2>
                    {feedback.strengths?.length ? (
                        <ul className="mt-3 flex flex-col gap-2">
                            {feedback.strengths.map((strength, index) => (
                                <li key={index} className="list-none rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm leading-6 text-white/75">{strength}</li>
                            ))}
                        </ul>
                    ) : <p className="mt-3 text-sm text-white/60">No strengths were listed.</p>}
                </section>

                <section className={panelClass} aria-labelledby="improvements-heading">
                    <h2 id="improvements-heading" className="text-lg font-semibold text-white sm:text-xl">Areas to improve</h2>
                    {feedback.areasForImprovement?.length ? (
                        <ul className="mt-3 flex flex-col gap-2">
                            {feedback.areasForImprovement.map((area, index) => (
                                <li key={index} className="list-none rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm leading-6 text-white/75">{area}</li>
                            ))}
                        </ul>
                    ) : <p className="mt-3 text-sm text-white/60">No improvement areas were listed.</p>}
                </section>
            </div>

            <FeedbackDiscussion feedbackId={feedback.id} initialMessages={feedback.discussion || []} questionLimit={entitlements.feedbackDiscussionQuestions} isPremium={entitlements.plan === "premium"} />

            <nav aria-label="Feedback actions" className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-3">
                <Button asChild className="w-full min-h-11 rounded-full bg-gradient-to-r from-purple-200 to-pink-400 font-semibold text-black shadow-md hover:brightness-105">
                    <Link href="/">
                        Return to dashboard
                    </Link>
                </Button>
                <Button asChild className="w-full min-h-11 rounded-full border border-white/15 bg-white/[0.06] font-semibold text-white shadow-md hover:bg-white/[0.1]">
                    <Link href={`/interview/${interviewId}`}>
                        Reattempt interview
                    </Link>
                </Button>
                <FeedbackExport title={interviewTitle} report={[
                    `Interview: ${interviewTitle}`,
                    `Date: ${createdAt ? dayjs(createdAt).format("MMM D, YYYY h:mm A") : "Unavailable"}`,
                    `Score: ${feedback.totalScore ?? "Not scored"} / ${scoreScale}`,
                    `Summary: ${feedback.finalAssessment || "Unavailable"}`,
                    "",
                    "Competencies:",
                    ...(feedback.categoryScores || []).map((item) => `- ${item.name}: ${item.score ?? "Not assessed"}${item.comment ? ` — ${item.comment}` : ""}${item.evidence ? ` Evidence: ${item.evidence}` : ""}`),
                    "",
                    "Strengths:", ...(feedback.strengths || []).map((item) => `- ${item}`),
                    "",
                    "Areas to improve:", ...(feedback.areasForImprovement || []).map((item) => `- ${item}`),
                    "",
                    "Practice plan:", ...(feedback.practicePlan || []).map((item) => `- ${item.focus}: ${item.action} Practice: ${item.practiceQuestion}`),
                ].join("\n")} />
            </nav>
        </main>
    );
};

export default Feedback;
