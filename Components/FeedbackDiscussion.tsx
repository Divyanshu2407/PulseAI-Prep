"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { askFeedbackQuestion } from "@/lib/actions/general.action";

type DiscussionTurn = { role: "user" | "assistant"; content: string; createdAt: string };

const questionStarters = [
    "Which part of my answer needs the most work?",
    "What would a stronger answer include?",
    "Can you explain one of my improvement areas?",
];

export default function FeedbackDiscussion({
    feedbackId,
    initialMessages,
    questionLimit = 20,
    isPremium = false,
}: {
    feedbackId: string;
    initialMessages: DiscussionTurn[];
    questionLimit?: number;
    isPremium?: boolean;
}) {
    const [messages, setMessages] = useState(initialMessages);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const questionsAsked = messages.filter((message) => message.role === "user").length;
    const limitReached = questionsAsked >= questionLimit;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, isSending]);

    const sendQuestion = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const question = draft.trim();
        if (!question || isSending || limitReached) return;

        setIsSending(true);
        setError("");
        try {
            const result = await askFeedbackQuestion({ feedbackId, question });
            if (!result.success) {
                setError(result.error || "Could not send your question. Please try again.");
                return;
            }
            setMessages(result.messages);
            setDraft("");
        } catch {
            setError("Could not send your question. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <section className="app-content-card overflow-hidden p-5 sm:p-6" aria-labelledby="feedback-discussion-heading">
            <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-pink-200/15 bg-pink-300/[0.08] text-pink-100">
                    <MessageCircle size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-200">Keep learning</p>
                        {isPremium && <span className="inline-flex items-center gap-1 rounded-full border border-pink-200/20 bg-pink-200/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pink-100"><Sparkles size={11} aria-hidden="true" />Premium</span>}
                    </div>
                    <h2 id="feedback-discussion-heading" className="mt-1 text-lg font-semibold text-white sm:text-xl">Discuss your feedback</h2>
                    <p className="mt-2 text-sm leading-6 text-white/60">{isPremium ? `Ask up to ${questionLimit} follow-up questions about what was accurate, what was missing, or how to improve. This discussion won’t change your saved score.` : "Ask what was accurate, what was missing, or how to give a stronger answer. This discussion won’t change your saved score."}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] text-white/50 sm:px-3 sm:text-xs">
                    <Sparkles size={13} aria-hidden="true" />
                    {questionsAsked}/{questionLimit}
                </span>
            </div>

            {messages.length > 0 ? (
                <div className="mt-5 max-h-[30rem] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-3 sm:p-4" aria-live="polite" aria-label="Feedback discussion">
                    {messages.map((message, index) => (
                        <article key={`${message.createdAt}-${index}`} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[84%] ${message.role === "user" ? "ml-auto rounded-br-md border border-purple-200/15 bg-purple-300/[0.10] text-white/85" : "mr-auto rounded-bl-md border border-pink-200/10 bg-pink-300/[0.07] text-white/80"}`}>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{message.role === "user" ? "You" : "AI Coach"}</p>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </article>
                    ))}
                    {isSending && <p className="text-sm text-white/50" role="status">AI Coach is thinking…</p>}
                    <div ref={messagesEndRef} />
                </div>
            ) : (
                <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-sm text-white/70">Start with a question, or pick a suggestion:</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {questionStarters.map((starter) => (
                            <button key={starter} type="button" onClick={() => setDraft(starter)} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs leading-5 text-white/70 transition hover:border-purple-200/25 hover:bg-purple-200/[0.07] hover:text-white">
                                {starter}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <p className="mt-3 text-sm text-amber-200" role="alert">{error}</p>}
            {limitReached ? (
                <p className="mt-4 text-sm text-white/50">You’ve reached the {questionLimit}-question limit for this discussion.</p>
            ) : (
                <form onSubmit={sendQuestion} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="sr-only" htmlFor="feedback-discussion-question">Ask about your feedback</label>
                    <textarea
                        id="feedback-discussion-question"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                        maxLength={1000}
                        rows={2}
                        placeholder="Ask about an answer, correction, or improvement…"
                        className="min-h-12 w-full resize-y rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm leading-6 text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                    />
                    <button type="submit" disabled={!draft.trim() || isSending} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-5 text-sm font-bold text-[#17121d] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
                        <Send size={15} aria-hidden="true" />
                        {isSending ? "Sending…" : "Ask"}
                    </button>
                </form>
            )}
            <p className="mt-2 text-right text-[11px] text-white/35">{questionsAsked} of {questionLimit} follow-up questions used</p>
        </section>
    );
}
