"use client";

import { useState } from "react";

export default function PracticeMilestones({ completedSessions, milestones }: { completedSessions: number; milestones: number[] }) {
    const nextMilestone = milestones.find((target) => completedSessions < target);
    const visibleMilestones = milestones.filter((target) => target <= completedSessions || target === nextMilestone);
    const defaultTarget = nextMilestone ?? milestones.at(-1) ?? 1;
    const [selectedTarget, setSelectedTarget] = useState(defaultTarget);
    const activeTarget = visibleMilestones.includes(selectedTarget) ? selectedTarget : defaultTarget;
    const reached = completedSessions >= activeTarget;
    const remaining = Math.max(0, activeTarget - completedSessions);
    const progress = Math.min(100, Math.round((completedSessions / activeTarget) * 100));
    const description = reached
        ? `${activeTarget} scored-interview milestone reached.`
        : `${remaining} more scored interview${remaining === 1 ? "" : "s"} to reach ${activeTarget}.`;

    return (
        <div className="mt-5 border-t border-white/10 pt-4" aria-labelledby="milestones-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-200">Practice milestones</p>
                    <h3 id="milestones-heading" className="mt-1 text-sm font-semibold text-white">{completedSessions} scored session{completedSessions === 1 ? "" : "s"} overall</h3>
                    <p className="mt-1 text-xs text-white/50" aria-live="polite">{description}</p>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Select a practice milestone">
                    {visibleMilestones.map((target) => {
                        const isReached = completedSessions >= target;
                        const isSelected = activeTarget === target;
                        return <button
                            key={target}
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`${target} scored-session milestone${isReached ? ", completed" : ", next goal"}`}
                            onClick={() => setSelectedTarget(target)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${isReached
                                ? "border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.14]"
                                : "border-white/15 bg-white/[0.04] text-white/65 hover:bg-white/[0.09]"
                            } ${isSelected ? "ring-1 ring-pink-200/60" : ""}`}
                        >
                            {target}{isReached ? " ✓" : ""}
                        </button>;
                    })}
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2" role="progressbar" aria-label={`Progress to the ${activeTarget}-scored-session milestone`} aria-valuemin={0} aria-valuemax={activeTarget} aria-valuenow={Math.min(completedSessions, activeTarget)}>
                <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-300 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="shrink-0 text-[11px] text-white/45">{Math.min(completedSessions, activeTarget)}/{activeTarget}</span>
            </div>
        </div>
    );
}
