"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export default function FeedbackExport({ title, report }: { title: string; report: string }) {
    const [notice, setNotice] = useState("");
    const download = () => {
        const url = URL.createObjectURL(new Blob([`${title}\n\n${report}`], { type: "text/plain;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `pulseai-feedback-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "interview"}.txt`;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice("Feedback report downloaded.");
    };
    return <div className="flex flex-col items-center gap-1"><button type="button" onClick={download} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.11]"><Download size={16} aria-hidden="true" /> Download report</button><p className="text-xs text-white/50" aria-live="polite">{notice}</p></div>;
}
