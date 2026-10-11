"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn, getTechLogos } from "@/lib/utils";
import { BriefcaseBusiness } from "lucide-react";

interface IconEntry {
    tech: string;
    url: string;
}

interface DisplayTechIconsProps {
    // Accept precomputed icons OR a simple tech stack array for convenience.
    techIcons?: IconEntry[];
    techStack?: string[];
    fallbackLabel?: string;
}

const DisplayTechIcons = ({ techIcons, techStack, fallbackLabel }: DisplayTechIconsProps) => {
    const icons: IconEntry[] = techIcons && techIcons.length > 0 ? techIcons : getTechLogos(techStack || []);

    if (!icons || icons.length === 0) {
        if (!fallbackLabel) return null;
        return (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 text-xs font-medium text-white/65">
                <BriefcaseBusiness size={14} aria-hidden="true" className="text-fuchsia-200/80" />
                {fallbackLabel}
            </span>
        );
    }

    return (
        <div className="flex min-w-0 flex-row items-center" aria-label="Interview technology focus">
            {icons.slice(0, 3).map(({ tech, url }, index) => (
                <TechIconBadge key={`${tech}-${index}`} tech={tech} url={url} index={index} />
            ))}
            {icons.length > 3 && (
                <span
                    className="ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-[10px] font-semibold text-white/75"
                    title={icons.slice(3).map(({ tech }) => tech).join(", ")}
                    aria-label={`${icons.length - 3} more technologies: ${icons.slice(3).map(({ tech }) => tech).join(", ")}`}
                >
                    +{icons.length - 3}
                </span>
            )}
        </div>
    );
};

function getTechAbbreviation(tech: string) {
    const cleaned = tech.trim().replace(/\.js/gi, "");
    const specialAbbreviations: Record<string, string> = {
        "javascript / typescript": "JS/TS",
        "html/css": "H/C",
        "sql / postgresql": "SQL",
        "tensorflow / pytorch": "ML",
        "ci/cd": "CI",
        "ui testing": "UI",
        "data storytelling": "DS",
        "experiment design": "ED",
        "system design": "SD",
        "api design": "API",
    };
    const special = specialAbbreviations[cleaned.toLowerCase()];
    if (special) return special;
    const words = cleaned.match(/[A-Za-z0-9]+/g) || [];
    if (words.length > 1) return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
    return (words[0] || "?").slice(0, 3).toUpperCase();
}

function TechIconBadge({ tech, url, index }: { tech: string; url: string; index: number }) {
    const [loadFailed, setLoadFailed] = useState(!url);
    return (
        <div
            className={cn(
                "relative group flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#29213a] to-[#15131d] text-pink-100 shadow-sm ring-2 ring-[#111217]",
                index > 0 && "-ml-2"
            )}
            title={tech}
            role="img"
            aria-label={tech}
        >
            <span className="tech-tooltip">{tech}</span>
            {url && !loadFailed ? (
                <Image
                    src={url}
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                    className="size-5 object-contain"
                    onError={() => setLoadFailed(true)}
                />
            ) : (
                <span aria-hidden="true" className="px-0.5 text-[9px] font-bold tracking-tight text-white/90">
                    {getTechAbbreviation(tech)}
                </span>
            )}
        </div>
    );
}

export default DisplayTechIcons;
