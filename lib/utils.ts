import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { mappings } from "@/constants";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const normalizeTechName = (tech: string) => {
    if (!tech) return "";
    const key = tech.trim().toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
    // Only request a Devicon asset for an explicitly supported name. Unknown skills
    // are rendered as readable local abbreviation badges instead of broken URLs.
    return mappings[key as keyof typeof mappings] || "";
};

export const getTechLogos = (techArray: string[]) => {
    if (!Array.isArray(techArray)) return [];

    const seen = new Set<string>();
    return techArray.flatMap((rawTech) => {
        if (typeof rawTech !== "string" || !rawTech.trim()) return [];
        const tech = rawTech.trim();
        const key = tech.toLowerCase();
        if (seen.has(key)) return [];
        seen.add(key);
        const normalized = normalizeTechName(tech);
        return [{
            tech,
            url: normalized ? `${techIconBaseURL}/${normalized}/${normalized}-original.svg` : "",
        }];
    });
};

