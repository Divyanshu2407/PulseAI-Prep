import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Award, BookOpenCheck, ChevronDown, Info, Minus, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { BookmarksSection } from "@/Components/QuestionBookmarks";
import PracticeMilestones from "@/Components/PracticeMilestones";

type ProgressRecord = { interview: Interview; feedback: Feedback; timestamp: number };
type SavedQuestion = { id: string; interviewId: string; questionIndex: number; question: string; title: string };

function PracticeToolsDetails({ bookmarks, children }: { bookmarks: SavedQuestion[]; children?: React.ReactNode }) {
    return (
        <details className="group/practice-tools mt-5 border-t border-white/10 pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-lg font-semibold text-white">More practice tools</span>
                    <span className="text-sm leading-5 text-white/55">Follow a recommendation, review subject coverage, or revisit saved questions.</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60 sm:px-3 sm:text-xs">
                        {bookmarks.length} saved {bookmarks.length === 1 ? "question" : "questions"}
                    </span>
                    <ChevronDown aria-hidden="true" className="size-5 text-white/60 transition-transform duration-200 group-open/practice-tools:rotate-180" />
                </span>
            </summary>
            <div className="space-y-4 px-1 pb-1 pt-3 sm:px-3">
                {children}
                <BookmarksSection items={bookmarks} />
            </div>
        </details>
    );
}

function timestamp(value: unknown): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "string") return Date.parse(value) || 0;
    if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
    return 0;
}

function focusKey(interview: Interview): string {
    const mode = interview.mode || "role";
    const context = mode === "subject"
        ? String(interview.subject || interview.role).toLowerCase()
        : mode === "cse" ? "full cse" : String(interview.role || "general").toLowerCase();
    const scope = mode === "role"
        ? [String(interview.type || "mixed").toLowerCase(), ...(interview.techstack || []).map((skill) => skill.toLowerCase()).sort()].join("|")
        : mode === "subject"
            ? [...(interview.topics || [])].map((topic) => topic.toLowerCase()).sort().join("|")
            : "all subjects";
    return [mode, context, scope, String(interview.level || "unspecified").toLowerCase()].join("::");
}

const scaleOf = (feedback: Feedback) => feedback.scoreScale ?? 100;

function formatDate(value: unknown) {
    const milliseconds = timestamp(value);
    if (!milliseconds) return "—";
    return new Date(milliseconds).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function ProgressOverview({ interviews, feedbackByInterviewId, bookmarks, isPremium }: { interviews: Interview[]; feedbackByInterviewId: Record<string, Feedback>; bookmarks: SavedQuestion[]; isPremium: boolean }) {
    const records: ProgressRecord[] = interviews.flatMap((interview) => {
        const feedback = feedbackByInterviewId[interview.id];
        return feedback ? [{ interview, feedback, timestamp: timestamp(feedback.createdAt || interview.createdAt) }] : [];
    }).sort((a, b) => a.timestamp - b.timestamp);
    const completedRecords = records.filter(({ feedback }) => feedback.sessionProgress?.status !== "partial"
        && typeof feedback.totalScore === "number"
        && Number.isFinite(feedback.totalScore));
    const newestRecord = records.at(-1);
    const latest = completedRecords.at(-1) ?? newestRecord;
    const showingLatestCompleted = Boolean(latest && newestRecord && latest.interview.id !== newestRecord.interview.id);

    const completedSessions = completedRecords.length;
    const milestones = [1, 3, 5, 10, 25];
    const milestoneContent = <PracticeMilestones completedSessions={completedSessions} milestones={milestones} />;

    if (!latest) return (
        <>
        <section className="app-content-card p-5 sm:p-6" aria-labelledby="progress-heading">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-purple-200/15 bg-purple-300/[0.08] text-purple-100"><TrendingUp size={19} aria-hidden="true" /></div>
                <div><h2 id="progress-heading" className="text-lg font-semibold text-white">Your progress</h2><p className="mt-1 text-sm text-white/55">Your completed, scored interviews will appear here.</p></div>
            </div>
            {milestoneContent}
            <PracticeToolsDetails bookmarks={bookmarks}>
                <section className="rounded-2xl border border-pink-200/10 bg-gradient-to-br from-pink-300/[0.07] to-purple-300/[0.035] p-4 sm:p-5" aria-labelledby="next-practice-heading">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-pink-200/15 bg-pink-300/[0.08] text-pink-100"><Target size={18} aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-pink-200">Next practice</p>
                            <h3 id="next-practice-heading" className="mt-1 font-semibold text-white">Your personal recommendation appears after your first feedback</h3>
                            <p className="mt-1 text-sm leading-5 text-white/55">Complete an interview to get a practice focus based on your answers.</p>
                            <Link href="/interview" className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-4 text-xs font-bold text-[#17121d] transition hover:brightness-105">Start an interview <ArrowRight size={14} aria-hidden="true" /></Link>
                        </div>
                    </div>
                </section>
                <section className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5" aria-labelledby="subject-evidence-heading">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/15 bg-violet-300/[0.08] text-violet-100"><BookOpenCheck size={18} aria-hidden="true" /></span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Subject coverage</p>
                            <h3 id="subject-evidence-heading" className="mt-1 font-semibold text-white">See which topics your answers demonstrate</h3>
                            <p className="mt-1 text-sm leading-5 text-white/55">Coverage appears after a subject or full CSE interview has scored feedback.</p>
                        </div>
                    </div>
                </section>
            </PracticeToolsDetails>
        </section>
        </>
    );

    const matching = completedRecords.filter((record) => focusKey(record.interview) === focusKey(latest.interview));
    const latestScale = scaleOf(latest.feedback);
    const scoredFocusRecords = matching.filter(({ feedback }) => feedback.totalScore !== null
        && typeof feedback.totalScore === "number"
        && scaleOf(feedback) === latestScale);
    const scoreRecords = scoredFocusRecords.slice(-5);
    const previousScore = scoreRecords.length > 1 ? scoreRecords[scoreRecords.length - 2].feedback.totalScore : null;
    const currentScore = scoreRecords.at(-1)?.feedback.totalScore ?? null;
    const scoreDelta = currentScore !== null && previousScore !== null ? currentScore - previousScore : null;
    const latestScorePercentage = currentScore === null ? 0 : Math.max(0, Math.min(100, (currentScore / latestScale) * 100));
    const bestScore = scoredFocusRecords.reduce<number | null>((best, record) => {
        const score = record.feedback.totalScore;
        return typeof score === "number" && (best === null || score > best) ? score : best;
    }, null);
    const maxCategoryScore = latestScale === 25 ? 5 : 100;
    const previousFeedback = scoreRecords.length > 1 ? scoreRecords[scoreRecords.length - 2].feedback : null;
    const comparableLatestFeedback = scoreRecords.at(-1)?.feedback;
    const categoryRows = (comparableLatestFeedback?.categoryScores || []).flatMap((category) => {
        const previous = previousFeedback?.categoryScores.find((item) => item.name === category.name && item.assessed !== false && typeof item.score === "number");
        if (category.assessed === false || typeof category.score !== "number") return [];
        return [{ ...category, previousScore: previous?.score ?? null }];
    }).slice(0, 5);
    const skillHistory = new Map<string, number[]>();
    for (const record of scoreRecords) {
        for (const category of record.feedback.categoryScores || []) {
            if (category.assessed === false || typeof category.score !== "number") continue;
            const scores = skillHistory.get(category.name) || [];
            scores.push(category.score);
            skillHistory.set(category.name, scores);
        }
    }
    const skillTrendRows = [...skillHistory.entries()]
        .filter(([, scores]) => scores.length > 1)
        .slice(0, 5)
        .map(([name, scores]) => ({ name, scores }));
    const skillTrendEmptyMessage = scoreRecords.length < 2
        ? `You have ${scoreRecords.length} matching scored session${scoreRecords.length === 1 ? "" : "s"}. Complete ${2 - scoreRecords.length} more with this same focus to start skill trends.`
        : "Skill trends appear when the same competency has scores in multiple matching sessions.";
    const coverageHistory = matching.filter(({ feedback }) => typeof feedback.assessmentCoverage?.percentage === "number");
    const coverageRecords = coverageHistory.slice(-5);
    const latestCoverageRecord = coverageHistory.at(-1);
    const latestCoverage = latestCoverageRecord?.feedback.assessmentCoverage;
    const coveragePercentage = latestCoverage ? Math.max(0, Math.min(100, latestCoverage.percentage)) : 0;
    const showingPreviousCoverage = Boolean(latestCoverageRecord && latestCoverageRecord.interview.id !== latest.interview.id);
    const isSubjectFocus = latest.interview.mode === "subject" || latest.interview.mode === "cse";
    const progressTitle = latest.interview.mode === "cse"
        ? "Full CSE survey"
        : latest.interview.mode === "subject"
            ? `${latest.interview.subject || latest.interview.role} mastery`
            : `${latest.interview.role} · ${latest.interview.type}`;
    const nextPlanStep = latest.feedback.practicePlan?.[0];
    const fallbackNextFocus = latest.feedback.areasForImprovement?.[0];
    const practiceMode = latest.interview.mode === "subject" || latest.interview.mode === "cse" ? latest.interview.mode : "role";
    const practiceParams = new URLSearchParams({
        mode: practiceMode,
        level: latest.interview.level || "Mid-level",
        practiceFocus: String(nextPlanStep?.focus || fallbackNextFocus || ""),
    });
    if (practiceMode === "role") practiceParams.set("role", latest.interview.role);
    if (practiceMode === "subject") practiceParams.set("subject", latest.interview.subject || latest.interview.role);
    const focusedPracticeHref = `/interview?${practiceParams.toString()}`;
    const practiceFocus = nextPlanStep?.focus || fallbackNextFocus;
    const hasPracticePlan = Boolean(latest.feedback.practicePlan?.length);
    const nextPracticePanel = (
        <section className="relative overflow-hidden rounded-2xl border border-pink-200/15 bg-gradient-to-br from-pink-300/[0.08] via-purple-300/[0.045] to-white/[0.02] p-4 sm:p-5" aria-labelledby="next-practice-heading">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-pink-300/[0.08] blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-pink-200/20 bg-pink-300/[0.09] text-pink-100"><Target size={18} aria-hidden="true" /></span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-pink-200">Next practice</p>
                            {practiceFocus && <span className="rounded-full border border-pink-100/15 bg-pink-200/[0.06] px-2 py-0.5 text-[10px] font-medium text-pink-100/75">From your feedback</span>}
                        </div>
                        <h3 id="next-practice-heading" className="mt-1 font-semibold text-white">{practiceFocus || "Build your next practice focus"}</h3>
                        <p className="mt-1 max-w-2xl text-sm leading-5 text-white/60">{nextPlanStep?.action || (practiceFocus ? "Revisit this area in your next session and apply the feedback." : "A personalized recommendation will appear when feedback includes improvement guidance.")}</p>
                    </div>
                </div>
                <div className="relative flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    {hasPracticePlan && <Link className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.11]" href={`/interview/${latest.interview.id}/feedback#practice-plan-heading`}>View plan</Link>}
                    <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-4 text-sm font-bold text-[#17121d] transition hover:brightness-105" href={practiceFocus ? focusedPracticeHref : "/interview"}>{practiceFocus ? "Practice this focus" : "Start an interview"}<ArrowRight size={15} aria-hidden="true" /></Link>
                </div>
            </div>
        </section>
    );
    const subjectCoveragePanel = isSubjectFocus ? (
        <section className="rounded-2xl border border-violet-200/10 bg-gradient-to-br from-violet-300/[0.07] via-black/15 to-fuchsia-300/[0.035] p-4 sm:p-5" aria-labelledby="subject-evidence-heading">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/15 bg-violet-300/[0.08] text-violet-100"><BookOpenCheck size={18} aria-hidden="true" /></span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Subject coverage</p>
                        <h3 id="subject-evidence-heading" className="mt-1 font-semibold text-white">Topic evidence</h3>
                        <p className="mt-1 text-sm leading-5 text-white/55">How many selected topics appeared in your answers</p>
                    </div>
                </div>
                {latestCoverage && <span className="shrink-0 rounded-full border border-violet-100/15 bg-violet-200/[0.07] px-3 py-1.5 text-sm font-bold text-violet-100">{coveragePercentage}%</span>}
            </div>
            {latestCoverage ? <>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                    <span className="text-white/65">{latestCoverage.assessedTopics} of {latestCoverage.totalTopics} topics with evidence</span>
                    <span className="text-white/40">{formatDate(latestCoverageRecord?.feedback.createdAt || latestCoverageRecord?.interview.createdAt)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-label="Subject topic evidence coverage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={coveragePercentage}>
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-300 transition-[width] duration-500" style={{ width: `${coveragePercentage}%` }} />
                </div>
                {showingPreviousCoverage && <p className="mt-2 text-[11px] text-white/40">Showing your latest available coverage result.</p>}
                {coverageRecords.length > 1 && <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/15 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Recent coverage</span><span className="text-[10px] text-white/35">Last {coverageRecords.length} sessions</span></div>
                    <div className="flex h-16 items-end gap-2" role="img" aria-label={`Recent subject coverage: ${coverageRecords.map(({ feedback }) => `${feedback.assessmentCoverage?.percentage}%`).join(", ")}`}>
                        {coverageRecords.map((record, index) => {
                            const percentage = Math.max(4, Math.min(100, record.feedback.assessmentCoverage?.percentage || 0));
                            return <div key={record.interview.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${percentage}% · ${formatDate(record.feedback.createdAt || record.interview.createdAt)}`}>
                                <div className={`w-full max-w-10 rounded-t-md bg-gradient-to-t from-violet-400/75 to-fuchsia-300 transition-[height,opacity] duration-500 ${index === coverageRecords.length - 1 ? "opacity-100" : "opacity-55"}`} style={{ height: `${percentage}%` }} />
                                <span className="text-[9px] text-white/40">{formatDate(record.feedback.createdAt || record.interview.createdAt)}</span>
                            </div>;
                        })}
                    </div>
                </div>}
            </> : <p className="mt-4 rounded-xl border border-white/[0.07] bg-black/15 p-3 text-sm leading-5 text-white/55">Coverage will appear when subject feedback includes evidence for selected topics.</p>}
            <p className="mt-3 text-[11px] leading-5 text-white/40">This measures transcript evidence, not complete subject mastery.</p>
        </section>
    ) : null;

    return (
        <>
        <section className="app-content-card p-5 sm:p-6" aria-labelledby="progress-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-purple-200/15 bg-purple-300/[0.08] text-purple-100"><TrendingUp size={19} aria-hidden="true" /></div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200">{completedRecords.length ? "Latest completed focus" : "Latest feedback"}</p>
                        <h2 id="progress-heading" className="mt-1 text-lg font-semibold text-white sm:text-xl">Your progress</h2>
                        <p className="mt-1 text-sm text-white/55">{progressTitle} · {latest.interview.level}</p>
                        {showingLatestCompleted && <p className="mt-2 text-xs leading-5 text-white/45">Showing your latest completed score. Newer feedback will appear after it has a complete score.</p>}
                    </div>
                </div>
                <details className="group/progress-info relative self-end sm:self-start">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/65 transition hover:border-purple-200/20 hover:bg-purple-200/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 [&::-webkit-details-marker]:hidden">
                        <Info size={14} aria-hidden="true" />
                        <span>How progress works</span>
                        <ChevronDown size={14} aria-hidden="true" className="transition-transform duration-200 group-open/progress-info:rotate-180" />
                    </summary>
                    <div className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-white/10 bg-[#17111f] p-4 shadow-2xl shadow-black/40">
                        <p className="text-sm font-semibold text-white">About your progress</p>
                        <p className="mt-2 text-xs leading-5 text-white/60">Scores compare completed, scored interviews with the same role, level, format and skills or subject focus. Partial and unscored sessions are excluded.</p>
                        {(scoreRecords.length === 1 || (!isSubjectFocus && !previousFeedback)) && <p className="mt-2 text-xs leading-5 text-white/60">{isSubjectFocus ? "Another matching interview adds a score comparison." : "Another matching interview adds score and competency comparisons."}</p>}
                    </div>
                </details>
            </div>

            {milestoneContent}

            <div className={`mt-5 grid grid-cols-1 gap-4 ${isSubjectFocus ? "" : "lg:grid-cols-2"}`}>
                <div className="rounded-2xl border border-purple-200/10 bg-gradient-to-br from-purple-300/[0.07] via-black/20 to-pink-300/[0.035] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Progress snapshot</p>
                            <p className="mt-1 text-sm text-white/45">{scoredFocusRecords.length ? `${scoredFocusRecords.length} scored session${scoredFocusRecords.length === 1 ? "" : "s"} in this focus` : "Waiting for a completed score"}</p>
                        </div>
                        {scoreDelta !== null && <p className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${scoreDelta > 0 ? "border-emerald-200/15 bg-emerald-300/10 text-emerald-200" : scoreDelta < 0 ? "border-amber-200/15 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.06] text-white/55"}`}>
                            {scoreDelta > 0 ? <ArrowUpRight size={14} /> : scoreDelta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                            {scoreDelta > 0 ? "+" : ""}{scoreDelta} vs previous
                        </p>}
                    </div>

                    {currentScore !== null ? <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="relative overflow-hidden rounded-2xl border border-pink-100/15 bg-gradient-to-br from-fuchsia-300/[0.12] to-purple-300/[0.06] p-4">
                            <div aria-hidden="true" className="absolute -right-5 -top-8 size-24 rounded-full bg-pink-300/10 blur-2xl" />
                            <div className="relative flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-white/55">Latest score</p>
                                    <p className="mt-2 text-3xl font-bold tracking-tight text-white">{currentScore}<span className="ml-1 text-sm font-medium text-white/45">/ {latestScale}</span></p>
                                    <p className="mt-1 text-[11px] text-white/40">{formatDate(scoreRecords.at(-1)?.feedback.createdAt || scoreRecords.at(-1)?.interview.createdAt)}</p>
                                </div>
                                <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full p-[3px]" style={{ background: `conic-gradient(from -90deg, #f0abfc ${latestScorePercentage}%, rgba(255,255,255,0.10) ${latestScorePercentage}% 100%)` }}>
                                    <div className="grid size-full place-items-center rounded-full bg-[#171321] text-[10px] font-bold text-pink-100">{Math.round(latestScorePercentage)}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                            <div className="flex items-center gap-2 text-purple-100"><Award size={15} aria-hidden="true" /><p className="text-xs font-medium text-white/55">Best in this focus</p></div>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-white">{bestScore}<span className="ml-1 text-sm font-medium text-white/45">/ {latestScale}</span></p>
                            <p className="mt-1 text-[11px] text-white/40">Across {scoredFocusRecords.length} scored session{scoredFocusRecords.length === 1 ? "" : "s"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                            <div className="flex items-center gap-2 text-fuchsia-100"><Activity size={15} aria-hidden="true" /><p className="text-xs font-medium text-white/55">Recent trend</p></div>
                            <p className="mt-2 text-xl font-bold tracking-tight text-white">{scoreDelta === null ? "Building" : scoreDelta > 0 ? `+${scoreDelta} points` : `${scoreDelta} points`}</p>
                            <p className="mt-1 text-[11px] text-white/40">{scoreDelta === null ? "Complete another matching interview to compare" : "Compared with your previous matching result"}</p>
                        </div>
                    </div> : <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                        <div className="flex items-center gap-2 text-purple-100"><Target size={16} aria-hidden="true" /><p className="text-sm font-semibold text-white">Your first score will appear here</p></div>
                        <p className="mt-1 text-sm leading-6 text-white/55">Complete an interview and generate scored feedback to start a progress trend for this focus.</p>
                    </div>}

                    {scoreRecords.length > 1 ? <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Recent score trend</p>
                            <span className="text-[10px] text-white/35">Last {scoreRecords.length} completed, matching sessions</span>
                        </div>
                        <div className="mt-4 flex h-28 items-end gap-2 border-b border-white/10 pb-1" role="img" aria-label={`Recent comparable scores: ${scoreRecords.map(({ feedback }) => `${feedback.totalScore} out of ${scaleOf(feedback)}`).join(", ")}`}>
                            {scoreRecords.map((record, index) => {
                                const percentage = Math.max(4, Math.min(100, ((record.feedback.totalScore || 0) / scaleOf(record.feedback)) * 100));
                                return <div key={record.interview.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${record.feedback.totalScore}/${scaleOf(record.feedback)} · ${formatDate(record.feedback.createdAt || record.interview.createdAt)}`}>
                                    <span className="text-[10px] text-white/55">{record.feedback.totalScore}</span>
                                    <div className={`w-full max-w-10 rounded-t-md bg-gradient-to-t from-purple-400/75 to-pink-300 transition-[height,opacity] duration-500 ${index === scoreRecords.length - 1 ? "opacity-100" : "opacity-55"}`} style={{ height: `${percentage}%` }} />
                                    <span className="text-[10px] text-white/40">{formatDate(record.feedback.createdAt || record.interview.createdAt)}</span>
                                </div>;
                            })}
                        </div>
                    </div> : scoreRecords.length === 1 ? <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs leading-5 text-white/45">Your next matching interview will add a score comparison here.</div> : null}
                </div>

                {!isSubjectFocus && (
                    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{categoryRows.some((category) => category.previousScore !== null) ? "Competency changes" : "Latest competency scores"}</p>
                        {categoryRows.length ? <ul className="mt-2 flex flex-col divide-y divide-white/[0.06]">
                            {categoryRows.map((category) => {
                                const score = typeof category.score === "number" ? category.score : 0;
                                const delta = category.previousScore === null ? null : score - category.previousScore;
                                return <li key={category.name} className="py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="min-w-0 text-sm text-white/75">{category.name}</span>
                                        <span className="shrink-0 text-right text-sm font-semibold text-white">{score}/{maxCategoryScore}{delta !== null && <span className={`ml-2 text-xs ${delta > 0 ? "text-emerald-200" : delta < 0 ? "text-amber-100" : "text-white/40"}`}>{delta > 0 ? "+" : ""}{delta}</span>}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-label={`${category.name} competency score`} aria-valuemin={0} aria-valuemax={maxCategoryScore} aria-valuenow={score}>
                                        <div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-300 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, (score / maxCategoryScore) * 100))}%` }} />
                                    </div>
                                </li>;
                            })}
                        </ul> : <p className="mt-3 text-sm leading-6 text-white/55">Competency scores will appear after an interview has enough recorded evidence.</p>}
                    </div>
                )}
            </div>

            {isPremium ? (
                <section className="mt-5 rounded-2xl border border-pink-200/15 bg-gradient-to-br from-pink-300/[0.07] via-purple-300/[0.035] to-white/[0.02] p-4 sm:p-5" aria-labelledby="premium-skill-trends-heading">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-200">Premium insight</p>
                            <h3 id="premium-skill-trends-heading" className="mt-1 font-semibold text-white">Skill-by-skill trends</h3>
                            <p className="mt-1 text-xs leading-5 text-white/50">Uses completed, scored interviews with this same role or subject, level, and focus.</p>
                        </div>
                        <span className="rounded-full border border-pink-200/20 bg-pink-200/[0.07] px-2.5 py-1 text-[10px] font-semibold text-pink-100">Up to 5 matching scores</span>
                    </div>
                    {skillTrendRows.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {skillTrendRows.map(({ name, scores }) => {
                            const delta = scores[scores.length - 1] - scores[scores.length - 2];
                            return <div key={name} className="rounded-xl border border-white/[0.08] bg-black/[0.12] px-3 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="min-w-0 truncate text-xs font-semibold text-white/80">{name}</span>
                                    <span className="shrink-0 text-xs font-semibold text-white/65">{scores.at(-1)}/{maxCategoryScore}<span className={`ml-1.5 ${delta > 0 ? "text-emerald-200" : delta < 0 ? "text-amber-100" : "text-white/40"}`}>{delta > 0 ? "+" : ""}{delta}</span></span>
                                </div>
                                <div className="mt-2 flex h-9 items-end gap-1.5" role="img" aria-label={`${name} scores across matching interviews: ${scores.map((score) => `${score} out of ${maxCategoryScore}`).join(", ")}`}>
                                    {scores.map((score, index) => <span key={`${name}-${index}`} title={`${score}/${maxCategoryScore}`} className={`min-w-2 flex-1 max-w-8 rounded-t-sm bg-gradient-to-t from-purple-400/80 to-pink-300 ${index === scores.length - 1 ? "opacity-100" : "opacity-55"}`} style={{ height: `${Math.max(8, Math.min(100, (score / maxCategoryScore) * 100))}%` }} />)}
                                </div>
                            </div>;
                        })}
                    </div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs leading-5 text-white/50">{skillTrendEmptyMessage}</p>}
                </section>
            ) : (
                <details className="group/skill-trends mt-5 border-t border-white/10 pt-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.035] hover:text-white [&::-webkit-details-marker]:hidden">
                        <span><span className="mr-2 rounded-full border border-pink-200/20 bg-pink-200/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pink-100">Premium</span>Skill trends across interviews</span>
                        <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-white/50 transition-transform group-open/skill-trends:rotate-180" />
                    </summary>
                    <div className="px-3 pb-2 pt-1 text-xs leading-5 text-white/50">
                        <p>Premium compares competency scores across up to five matching interviews.</p>
                        <Link href="/#account-plan" className="mt-2 inline-block font-semibold text-pink-100 underline-offset-4 hover:underline">Explore Premium</Link>
                    </div>
                </details>
            )}

            <PracticeToolsDetails
                bookmarks={bookmarks}
            >
                {nextPracticePanel}
                {subjectCoveragePanel}
            </PracticeToolsDetails>
        </section>
        </>
    );
}
