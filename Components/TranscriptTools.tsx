"use client";

import { useMemo, useState } from "react";
import { Clipboard, Download, Search } from "lucide-react";

type TranscriptTurn = { role: "user" | "assistant"; content: string };

export default function TranscriptTools({ transcript, interviewTitle }: { transcript: TranscriptTurn[]; interviewTitle: string }) {
    const [query, setQuery] = useState("");
    const [notice, setNotice] = useState("");
    const filteredTranscript = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return transcript.map((turn, index) => ({ ...turn, originalIndex: index }));
        return transcript
            .map((turn, index) => ({ ...turn, originalIndex: index }))
            .filter((turn) => `${turn.role} ${turn.content}`.toLowerCase().includes(normalizedQuery));
    }, [query, transcript]);

    const toPlainText = () => transcript.map((turn) => `${turn.role === "assistant" ? "AI Interviewer" : "You"}: ${turn.content}`).join("\n\n");

    const copyTranscript = async () => {
        try {
            await navigator.clipboard.writeText(toPlainText());
            setNotice("Transcript copied.");
        } catch {
            setNotice("Copy was blocked by the browser. Select and copy the transcript text instead.");
        }
    };

    const downloadTranscript = () => {
        const blob = new Blob([`${interviewTitle}\n\n${toPlainText()}`], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `pulseai-transcript-${interviewTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "interview"}.txt`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setNotice("Transcript downloaded as a text file.");
    };

    return (
        <section className="app-content-card p-5 sm:p-6" aria-labelledby="transcript-heading">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 id="transcript-heading" className="text-lg font-semibold text-white sm:text-xl">Interview transcript</h2>
                        <p className="mt-1 text-sm text-white/55">Search, copy, or download the recorded conversation.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={copyTranscript} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-white transition hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300">
                            <Clipboard size={15} aria-hidden="true" /> Copy transcript
                        </button>
                        <button type="button" onClick={downloadTranscript} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-200 to-pink-400 px-4 text-sm font-semibold text-black shadow-md transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200">
                            <Download size={15} aria-hidden="true" /> Download
                        </button>
                    </div>
                </div>

                <label className="relative block">
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <span className="sr-only">Search transcript</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search words or speaker…" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
                </label>
                <p className="text-xs text-white/45" aria-live="polite">{notice || `${filteredTranscript.length} of ${transcript.length} turns shown`}</p>

                {filteredTranscript.length ? (
                    <ol className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto pr-1">
                        {filteredTranscript.map((turn) => (
                            <li id={`transcript-turn-${turn.originalIndex}`} key={turn.originalIndex} className={`scroll-mt-24 list-none rounded-xl border border-white/10 border-l-2 px-4 py-3 text-sm leading-6 text-white/80 sm:text-base ${turn.role === "assistant" ? "border-l-pink-300/80 bg-fuchsia-300/[0.055]" : "border-l-violet-300/80 bg-violet-300/[0.055]"}`}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <p className={`text-xs font-semibold uppercase tracking-wide ${turn.role === "assistant" ? "text-pink-200" : "text-violet-200"}`}>{turn.role === "assistant" ? "AI Interviewer" : "You"}</p>
                                    {turn.originalIndex === transcript.length - 1 && <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">Latest</span>}
                                </div>
                                <p className="whitespace-pre-wrap break-words">{turn.content}</p>
                            </li>
                        ))}
                    </ol>
                ) : <p className="rounded-xl border border-white/10 bg-black/10 px-4 py-6 text-center text-sm text-white/55">No transcript turns match “{query}”.</p>}
            </div>
        </section>
    );
}
