"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, BookmarkCheck, ChevronDown, Search, Trash2 } from "lucide-react";
import { toggleQuestionBookmark } from "@/lib/actions/general.action";

type BookmarkItem = { id: string; interviewId: string; questionIndex: number; question: string; title: string };

export function QuestionBookmarkButton({ interviewId, questionIndex, question, title, initiallyBookmarked = false }: { interviewId: string; questionIndex: number; question: string; title: string; initiallyBookmarked?: boolean }) {
    const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const toggle = async () => {
        setBusy(true); setError("");
        try {
            const result = await toggleQuestionBookmark({ interviewId, questionIndex, question, title, bookmarked: !bookmarked });
            if (!result.success) throw new Error(result.error || "Could not update bookmark.");
            setBookmarked(!bookmarked);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update bookmark."); }
        finally { setBusy(false); }
    };
    return <div className="flex flex-col items-end gap-1"><button type="button" disabled={busy} onClick={toggle} aria-pressed={bookmarked} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-50">{bookmarked ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}{bookmarked ? "Saved" : "Save question"}</button>{error && <span role="alert" className="text-[10px] text-amber-200">{error}</span>}</div>;
}

export function QuestionBookmarkList({ interviewId, title, questions, initialIds = [] }: { interviewId: string; title: string; questions: string[]; initialIds?: number[] }) {
    return <section className="app-content-card p-5 sm:p-6" aria-labelledby="questions-to-review-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200">Build a review list</p><h2 id="questions-to-review-heading" className="mt-1 text-lg font-semibold text-white">Questions from this interview</h2>
        {questions.length ? <ol className="mt-4 flex flex-col gap-3">{questions.map((question, index) => <li id={`bookmarked-question-${index}`} key={`${index}-${question}`} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-semibold text-white/45">Question {index + 1}</p><p className="mt-1 text-sm leading-6 text-white/80">{question}</p></div><QuestionBookmarkButton interviewId={interviewId} questionIndex={index} question={question} title={title} initiallyBookmarked={initialIds.includes(index)} /></li>)}</ol> : <p className="mt-3 text-sm text-white/55">Prepared questions are not available for this report.</p>}
    </section>;
}

export function BookmarksSection({ items }: { items: BookmarkItem[] }) {
    const [bookmarks, setBookmarks] = useState(items);
    const [busyId, setBusyId] = useState("");
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");

    const remove = async (item: BookmarkItem) => {
        setBusyId(item.id);
        setError("");
        try {
            const result = await toggleQuestionBookmark({ ...item, title: item.title || "Interview", bookmarked: false });
            if (result.success) setBookmarks((current) => current.filter((saved) => saved.id !== item.id));
            else setError(result.error || "Could not remove this saved question. Please try again.");
        } catch {
            setError("Could not remove this saved question. Please try again.");
        } finally { setBusyId(""); }
    };

    const normalizedQuery = query.trim().toLowerCase();
    const filteredBookmarks = normalizedQuery
        ? bookmarks.filter((item) => `${item.title} ${item.question}`.toLowerCase().includes(normalizedQuery))
        : bookmarks;

    return <details className="app-content-card group/saved-questions overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-purple-200/15 bg-purple-300/[0.08] text-purple-100"><BookmarkCheck size={17} aria-hidden="true" /></span>
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">Saved Questions</span>
                    <span className="mt-0.5 block truncate text-xs text-white/50">{bookmarks.length ? "Search and revisit questions you saved" : "Save a question from any feedback report"}</span>
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-medium text-white/60">{bookmarks.length} saved</span>
                <ChevronDown size={16} aria-hidden="true" className="text-white/50 transition-transform group-open/saved-questions:rotate-180" />
            </span>
        </summary>
        <div className="border-t border-white/10 p-4 sm:p-5">
            {bookmarks.length ? <>
                <label className="relative block">
                    <span className="sr-only">Search saved questions</span>
                    <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions or interview focus" className="h-10 w-full rounded-xl border border-white/10 bg-black/15 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200/60" />
                </label>
                {filteredBookmarks.length ? <ul className="mt-3 grid max-h-96 gap-2 overflow-y-auto pr-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))" }} aria-label={`${filteredBookmarks.length} saved questions`}>
                    {filteredBookmarks.map((item) => <li key={item.id} className="group/bookmark flex min-w-0 flex-col rounded-xl border border-white/10 bg-black/10 p-3 transition hover:border-purple-200/20 hover:bg-purple-200/[0.025]">
                        <div className="flex items-start gap-2"><Bookmark size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-purple-200/80" /><p className="min-w-0 text-[11px] font-semibold text-purple-200">{item.title || "Interview question"}</p></div>
                        <p className="mt-1.5 flex-1 text-sm leading-5 text-white/80">{item.question}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2">
                            <Link className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-pink-200 underline-offset-4 transition hover:gap-2 hover:underline" href={`/interview/${item.interviewId}/feedback#bookmarked-question-${item.questionIndex}`}>Open feedback <ArrowRight size={13} aria-hidden="true" /></Link>
                            <button type="button" disabled={busyId === item.id} onClick={() => void remove(item)} aria-label={`Remove saved question: ${item.question.slice(0, 60)}`} aria-busy={busyId === item.id} title="Remove saved question" className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-rose-200/20 hover:bg-rose-300/[0.08] hover:text-rose-100 disabled:cursor-wait disabled:opacity-50"><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                    </li>)}
                </ul> : <p className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-white/55">No saved questions match “{query.trim()}”.</p>}
                {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200/15 bg-rose-300/[0.05] px-3 py-2 text-sm text-rose-100">{error}</p>}
            </> : <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-black/10 p-3">
                <Bookmark size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-white/45" />
                <p className="text-sm leading-5 text-white/55">Your review list is ready. Save questions from feedback reports to collect them here.</p>
            </div>}
        </div>
    </details>;
}
