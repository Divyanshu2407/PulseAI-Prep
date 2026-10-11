"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import InterviewCard from "@/Components/InterviewCard";

type LibraryInterview = {
    id: string;
    role: string;
    type: string;
    mode?: "role" | "subject" | "cse";
    subject?: string | null;
    techstack: string[];
    createdAt: string;
    hasTranscript: boolean;
};

export default function InterviewLibrary({ records }: { records: Array<{ interview: LibraryInterview; feedback: Feedback | null }> }) {
    const [query, setQuery] = useState("");
    const [mode, setMode] = useState("all");
    const [status, setStatus] = useState("all");
    const [dateRange, setDateRange] = useState("all");
    const [scoreStatus, setScoreStatus] = useState("all");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [todayMs, setTodayMs] = useState<number | null>(null);
    const filtered = useMemo(() => records.filter(({ interview, feedback }) => {
        const title = `${interview.role} ${interview.subject || ""} ${(interview.techstack || []).join(" ")}`.toLowerCase();
        const created = Date.parse(interview.createdAt) || 0;
        const ageDays = created && todayMs !== null ? (todayMs - created) / 86_400_000 : Number.POSITIVE_INFINITY;
        return title.includes(query.trim().toLowerCase())
            && (mode === "all" || (interview.mode || "role") === mode)
            && (status === "all" || (status === "feedback" ? Boolean(feedback) : !feedback))
            && (dateRange === "all" || ageDays <= Number(dateRange))
            && (scoreStatus === "all" || (scoreStatus === "scored" ? typeof feedback?.totalScore === "number" : typeof feedback?.totalScore !== "number"));
    }), [records, query, mode, status, dateRange, scoreStatus, todayMs]);

    return <div className="col-span-full w-full">
        <div className="mb-3 flex justify-end">
            <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="interview-library-filters"
                onClick={() => setFiltersOpen((open) => !open)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            >
                <SlidersHorizontal aria-hidden="true" className="size-4 text-pink-200" />
                {filtersOpen ? "Hide search & filters" : "Show search & filters"}
                <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
        </div>
        {filtersOpen && <div id="interview-library-filters" className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-black/10 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem_10rem]">
            <label className="sr-only" htmlFor="interview-filter-search">Search interviews</label>
            <input id="interview-filter-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role, subject, or skill" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
            <label className="sr-only" htmlFor="interview-filter-mode">Filter by practice mode</label>
            <select id="interview-filter-mode" value={mode} onChange={(event) => setMode(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#17131f] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"><option value="all">All practice modes</option><option value="role">Role interviews</option><option value="subject">CSE subject</option><option value="cse">Full CSE survey</option></select>
            <label className="sr-only" htmlFor="interview-filter-status">Filter by feedback status</label>
            <select id="interview-filter-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#17131f] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"><option value="all">All feedback states</option><option value="feedback">Feedback ready</option><option value="pending">Needs feedback</option></select>
            <label className="sr-only" htmlFor="interview-filter-date">Filter by date</label>
            <select id="interview-filter-date" value={dateRange} onChange={(event) => { setDateRange(event.target.value); setTodayMs(Date.now()); }} className="h-10 rounded-xl border border-white/10 bg-[#17131f] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"><option value="all">Any date</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
            <label className="sr-only" htmlFor="interview-filter-score">Filter by score</label>
            <select id="interview-filter-score" value={scoreStatus} onChange={(event) => setScoreStatus(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#17131f] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"><option value="all">Any score</option><option value="scored">Scored</option><option value="unscored">Not scored</option></select>
        </div>
        }
        <p className="mb-3 text-xs text-white/45" aria-live="polite">Showing {filtered.length} of {records.length} interviews</p>
        {filtered.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ interview, feedback }) => <InterviewCard key={interview.id} id={interview.id} role={interview.role} type={interview.type} mode={interview.mode} techstack={interview.techstack || []} createdAt={interview.createdAt} feedback={feedback} hasTranscript={interview.hasTranscript} canManage />)}
        </div> : <p className="rounded-xl border border-white/10 bg-black/10 p-5 text-sm text-white/60">No interviews match those filters.</p>}
    </div>;
}
