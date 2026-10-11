"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

type InterviewSectionProps = {
    title: string;
    description?: string;
    count: number;
    children: React.ReactNode;
    initiallyOpen?: boolean;
    maxVisible?: number;
    id?: string;
};

const InterviewSection = ({
    title,
    description,
    count,
    children,
    initiallyOpen = true,
    maxVisible,
    id,
}: InterviewSectionProps) => {
    const [showAll, setShowAll] = useState(false);
    const cards = React.Children.toArray(children);
    const canExpand = typeof maxVisible === "number" && cards.length > maxVisible;
    const visibleCards = canExpand && !showAll ? cards.slice(0, maxVisible) : cards;

    return (
        <details id={id} className="mt-8 group/section" open={initiallyOpen}>
            <summary className="app-content-card flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                    <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-xl font-semibold text-white sm:text-2xl">{title}</span>
                        {description && <span className="text-sm leading-5 text-white/55">{description}</span>}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-white/70">
                        {count}
                    </span>
                </span>
                <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-white/60 transition-transform duration-200 group-open/section:rotate-180" />
            </summary>

            <div className="pt-5">
                <div className="interviews-section">{visibleCards}</div>
                {canExpand && (
                    <button
                        type="button"
                        onClick={() => setShowAll((value) => !value)}
                        className="mx-auto mt-5 flex min-h-10 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                    >
                        {showAll ? "Show fewer" : `Show all ${count} interviews`}
                    </button>
                )}
            </div>
        </details>
    );
};

export default InterviewSection;
