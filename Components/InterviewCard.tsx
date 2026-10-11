"use client";

import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import Image from "next/image";
import { cn, getTechLogos } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, BookOpen, BrainCircuit, BriefcaseBusiness, Code2, Cpu, Database, GitBranch, MessageCircle, MoreVertical, Network, RotateCcw, Server, ShieldCheck, Trash2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import DisplayTechIcons from "@/Components/DisplayTechIcons";
import { deleteInterview, setInterviewArchived } from "@/lib/actions/general.action";

type InterviewCardProps = {
    id: string;
    role: string;
    type: string;
    mode?: "role" | "subject" | "cse";
    techstack: string[];
    createdAt: string | Date | null;
    feedback: Feedback | null;
    hasTranscript?: boolean;
    actionLabel?: string;
    canManage?: boolean;
    isArchived?: boolean;
};

const InterviewCard =  ({
                           id,
                           role,
                           type,
                           mode = "role",
                           techstack,
                           createdAt,
                           feedback,
                           hasTranscript = false,
                           actionLabel,
                           canManage = false,
                           isArchived = false,
                       }: InterviewCardProps) => {
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [menuOpen]);

    const handleArchive = async () => {
        setIsPending(true);
        setMenuOpen(false);
        try {
            const result = await setInterviewArchived({ interviewId: id, archived: !isArchived });
            if (!result.success) throw new Error(result.error || "Could not update this interview.");
            toast.success(isArchived ? "Interview restored." : "Interview archived.");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update this interview.");
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async () => {
        setIsPending(true);
        try {
            const result = await deleteInterview(id);
            if (!result.success) throw new Error(result.error || "Could not delete this interview.");
            toast.success("Interview and its feedback deleted.");
            setConfirmDelete(false);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete this interview.");
        } finally {
            setIsPending(false);
        }
    };

    // Firestore records can contain either lower-case API values or display labels.
    // Normalize once so the badge text and color do not depend on stored casing.
    const typeKey = type.trim().toLowerCase();
    const normalizedType = ({
        technical: "Technical",
        behavioral: "Behavioral",
        mixed: "Mixed",
    } as Record<string, string>)[typeKey] || type.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const emptyFocusLabel = mode === "subject"
        ? "Subject focus"
        : mode === "cse"
            ? "CSE survey"
            : /behavioral/i.test(normalizedType)
                ? "Behavioral focus"
                : "General role focus";

    const badgeColor =
        {
            Behavioral: "bg-light-400",
            Mixed: "bg-light-600",
            Technical: "bg-light-800",
        }[normalizedType] || "bg-light-600";

    // ✅ Normalize Firestore Timestamp | Date | string
    const rawDate = feedback?.createdAt || createdAt;
    const dateForFormatting = typeof rawDate === "object" && rawDate !== null && "toDate" in rawDate
        ? rawDate.toDate()
        : rawDate;
    const formattedDate = rawDate ? dayjs(dateForFormatting).format("MMM D, YYYY") : "Date unavailable";

    const techIcons = getTechLogos(techstack || []);
    const normalizedContext = `${role} ${mode === "cse" ? "CSE" : ""}`.toLowerCase();
    const subjectCoverRules: Array<[string, LucideIcon]> = [
        ["artificial intelligence", BrainCircuit], ["machine learning", BrainCircuit],
        ["cybersecurity", ShieldCheck], ["security", ShieldCheck],
        ["data structures", GitBranch], ["algorithms", GitBranch],
        ["database", Database], ["sql", Database],
        ["network", Network], ["distributed systems", Network],
        ["architecture", Cpu], ["operating systems", Cpu],
        ["theory", BookOpen], ["discrete mathematics", BookOpen],
        ["compiler", Code2], ["programming language", Code2], ["software engineering", Code2],
    ];
    const hasKnownRoleIcon = /behavioral|data analyst|data scientist|database|sql|devops|backend|frontend|full.?stack|software engineer|developer/i.test(`${normalizedType} ${normalizedContext}`);
    const useBrandFallback = mode === "role" && !hasKnownRoleIcon;
    const CoverIcon = mode === "cse"
        ? BrainCircuit
        : mode === "subject"
            ? subjectCoverRules.find(([keyword]) => normalizedContext.includes(keyword))?.[1] || Code2
            : /behavioral/i.test(normalizedType)
                ? MessageCircle
                : /data analyst|data scientist|database|sql/i.test(normalizedContext)
                    ? Database
                    : /devops|backend/i.test(normalizedContext)
                        ? Server
                        : /frontend|full.?stack|software engineer|developer/i.test(normalizedContext)
                            ? Code2
                            : BriefcaseBusiness;
    const scoreScale = feedback?.scoreScale ?? 100;
    const hasLegacyScoreScale = Boolean(feedback && scoreScale !== 25);
    const cardAction = feedback?.id
        ? "View Feedback"
        : hasTranscript
            ? "Open Interview"
            : actionLabel || "Attempt Interview";

    return (
        <>
        <div className={cn("app-card-shell interview-card w-full min-w-0 min-h-[27rem] h-full", menuOpen && "relative z-30")}>
            <div className="card-interview relative flex h-full flex-col p-4">
                {canManage && (
                    <div className="absolute left-3 top-3 z-30" ref={menuRef}>
                        <button
                            type="button"
                            aria-label={`Actions for ${role} interview`}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            disabled={isPending}
                            onClick={() => setMenuOpen((open) => !open)}
                            className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 disabled:opacity-50"
                        >
                            <MoreVertical size={18} aria-hidden="true" />
                        </button>
                        {menuOpen && (
                            <div role="menu" className="absolute left-0 top-11 z-40 min-w-44 rounded-xl border border-white/10 bg-[#111217] p-1.5 text-white shadow-xl">
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleArchive}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                                >
                                    {isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                    {isArchived ? "Restore interview" : "Archive interview"}
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                                >
                                    <Trash2 size={16} />
                                    Delete interview
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <div>
                    {/* Badge */}
                    <div
                        className={cn(
                            "absolute top-0 right-0 px-4 py-2 rounded-bl-lg",
                            badgeColor
                        )}
                    >
                        <p className="bg-gradient-to-r from-purple-200 to-pink-400 text-transparent bg-clip-text font-bold">
                            {mode === "subject" ? "Subject Mastery" : mode === "cse" ? "Full CSE Survey" : normalizedType}
                        </p>
                    </div>

                    {/* Role and subject icon */}
                    <div className="mt-7 flex flex-col items-center">
                        <div className="interview-card-icon" aria-hidden="true">
                            {useBrandFallback
                                ? <Image src="/logo.svg" alt="" width={48} height={48} className="size-11 object-contain" />
                                : <CoverIcon className="size-7" strokeWidth={1.8} />}
                        </div>

                        <h3 className="mt-3 line-clamp-2 min-h-[3.5rem] w-full max-w-[18rem] text-center text-lg font-semibold capitalize leading-7">
                            {mode === "subject" ? `${role} Mastery` : mode === "cse" ? "Full CSE Survey" : `${role} Interview`}
                        </h3>
                    </div>

                    {/* Aligned score and date fields */}
                    <div className="mt-4 grid min-h-[3.75rem] grid-cols-2 divide-x divide-white/10 rounded-xl border border-white/10 bg-black/10">
                        <div className="flex flex-col items-center justify-center gap-0.5 px-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45" title={hasLegacyScoreScale ? `Historical score using the earlier ${scoreScale}-point scale; compare cautiously.` : "Current interview score, out of 25."}>
                                {hasLegacyScoreScale ? `Legacy · /${scoreScale}` : "Score · /25"}
                            </p>
                            <p className="text-sm font-semibold text-white">{feedback?.totalScore !== null && feedback?.totalScore !== undefined
                                ? <>{feedback.totalScore}<span className="font-normal text-white/50"> / {scoreScale}</span></>
                                : feedback ? <span className="text-xs font-medium text-white/60">Not scored</span> : <span className="font-normal text-white/50">—</span>}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-0.5 px-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{feedback?.createdAt ? "Feedback" : "Created"}</p>
                            <p className="text-sm font-medium text-white/85">{formattedDate}</p>
                        </div>
                    </div>

                    {/* Summary on Interview Card */}
                    {feedback?.finalAssessment ? (
                        <div className="mt-4 flex h-[6.5rem] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-200">
                                Feedback preview
                            </p>
                            <p className="line-clamp-2 text-sm leading-relaxed text-white/80">
                                {feedback.finalAssessment}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 flex h-[6.5rem] flex-col justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-200">
                                {hasTranscript ? "Transcript saved" : "Ready to practice"}
                            </p>
                            <p className="text-sm leading-relaxed text-white/80">
                                {hasTranscript
                                    ? "Your answers are saved, but feedback hasn’t been generated yet."
                                    : "Start this interview to practice and get personalized feedback."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Focus logos and aligned action */}
                <div className="mt-auto flex min-h-[4.5rem] items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <DisplayTechIcons techIcons={techIcons} fallbackLabel={emptyFocusLabel} />

                    <Link className="shrink-0" href={feedback?.id ? `/interview/${id}/feedback` : `/interview/${id}`}>
                        <Button
                            className="btn-primary relative min-h-10 overflow-hidden px-4 text-sm text-white font-bold rounded-full shadow-md
                                           bg-gradient-to-r from-purple-200 to-pink-400
                                           transition-all duration-200 ease-out"
                        >
                            {cardAction}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
        {canManage && confirmDelete && (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) setConfirmDelete(false); }}
            >
                <section
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby={`delete-interview-title-${id}`}
                    aria-describedby={`delete-interview-description-${id}`}
                    className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111217] p-6 text-white shadow-2xl"
                >
                    <h2 id={`delete-interview-title-${id}`} className="text-xl font-semibold">Delete this interview?</h2>
                    <p id={`delete-interview-description-${id}`} className="mt-3 text-sm leading-6 text-white/70">
                        This permanently deletes the interview and its saved feedback. This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setConfirmDelete(false)}
                            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={handleDelete}
                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                        >
                            {isPending ? "Deleting…" : "Delete permanently"}
                        </button>
                    </div>
                </section>
            </div>
        )}
        </>
    );
};

export default InterviewCard;
