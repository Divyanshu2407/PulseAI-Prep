"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Target } from "lucide-react";
import { setPracticeStepCompleted } from "@/lib/actions/general.action";

type PracticeItem = { focus: string; action: string; practiceQuestion: string };
type PracticeInterview = {
    role: string;
    mode?: "role" | "subject" | "cse";
    level: string;
    subject?: string | null;
};

export default function PracticePlan({
    plan,
    areasForImprovement,
    categoryScores,
    transcript,
    feedbackId,
    completedSteps = [],
    interview,
}: {
    plan?: PracticeItem[];
    areasForImprovement: string[];
    categoryScores: Feedback["categoryScores"];
    transcript?: Feedback["transcript"];
    feedbackId: string;
    completedSteps?: number[];
    interview: PracticeInterview;
}) {
    const [completed, setCompleted] = useState(completedSteps);
    const [error, setError] = useState("");
    const hasCandidateEvidence = Boolean(transcript?.some((turn) => turn.role === "user" && turn.content.trim()));
    const improvementPlan: PracticeItem[] = hasCandidateEvidence ? (areasForImprovement || []).slice(0, 3).map((area) => ({
        focus: area.length > 100 ? `${area.slice(0, 97)}…` : area,
        action: "Spend 10–15 minutes revisiting this feedback. Outline a clearer approach, then explain it aloud and note how you would check your result.",
        practiceQuestion: "How would you solve a new problem in this area? Explain your approach, relevant trade-offs, and how you would verify your result.",
    })) : [];
    const scoredPlan: PracticeItem[] = hasCandidateEvidence ? (categoryScores || [])
        .filter((category) => category.assessed && typeof category.score === "number")
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .slice(0, 3)
        .map((category) => ({
            focus: category.name,
            action: category.comment || "Review the related interview feedback, then practice explaining your approach aloud with a clear validation step.",
            practiceQuestion: `Practice a fresh interview question that tests ${category.name.toLowerCase()}. Explain your reasoning and how you would validate your answer.`,
        })) : [];
    const items = plan?.length ? plan.slice(0, 3) : improvementPlan.length ? improvementPlan : scoredPlan;

    const toggleStep = async (index: number) => {
        setError("");
        const nextCompleted = !completed.includes(index);
        setCompleted((current) => nextCompleted ? [...current, index] : current.filter((item) => item !== index));
        const result = await setPracticeStepCompleted(feedbackId, index, nextCompleted);
        if (!result.success) {
            setCompleted((current) => nextCompleted ? current.filter((item) => item !== index) : [...current, index]);
            setError(result.error || "Could not save this practice step.");
        }
    };

    return (
        <section className="app-content-card p-5 sm:p-6" aria-labelledby="practice-plan-heading">
            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-pink-200/15 bg-pink-300/[0.08] text-pink-200"><Target size={19} aria-hidden="true" /></div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200">Your next steps</p>
                    <h2 id="practice-plan-heading" className="mt-1 text-lg font-semibold text-white sm:text-xl">Personalized practice plan</h2>
                    <p className="mt-1 text-sm text-white/55">Use these focused exercises to prepare for your next session.</p>
                </div>
            </div>
            {items.length ? (
        <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item, index) => (
                        <li key={`${item.focus}-${index}`} className={`rounded-xl border bg-black/15 p-4 ${completed.includes(index) ? "border-emerald-200/20" : "border-white/10"}`}>
                            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pink-200"><Check size={14} aria-hidden="true" /> Step {index + 1}</div><button type="button" onClick={() => void toggleStep(index)} aria-pressed={completed.includes(index)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/[0.07]">{completed.includes(index) ? "Completed" : "Mark done"}</button></div>
                            <h3 className="mt-2 line-clamp-2 min-h-[3rem] font-semibold leading-6 text-white">{item.focus}</h3>
                            <p className="mt-2 text-sm leading-6 text-white/65">{item.action}</p>
                            <div className="mt-3 rounded-lg border border-purple-200/10 bg-purple-300/[0.045] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-100/70">Practice question</p>
                                <p className="mt-1 text-sm leading-5 text-white/75">{item.practiceQuestion}</p>
                            </div>
                            <Link href={`/interview?${new URLSearchParams({ practiceFocus: item.focus, role: interview.role, mode: interview.mode || "role", level: interview.level || "Mid-level", subject: interview.subject || "" }).toString()}`} className="mt-3 inline-flex min-h-9 items-center rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-3.5 text-xs font-bold text-[#17121d] transition hover:brightness-105">Practice this focus</Link>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-white/60">
                    A practice plan will appear after your next feedback report. This older report did not include evidence-based next steps.
                </p>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
        </section>
    );
}
