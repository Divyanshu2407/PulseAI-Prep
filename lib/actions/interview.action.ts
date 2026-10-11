"use server";

import { db } from "@/Firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import admin from "firebase-admin";
import { CSE_SUBJECTS, isCSESubject } from "@/constants/cse-subjects";
import { getPlanEntitlements } from "@/lib/entitlements";

export async function createInterview(input: {
    mode?: "role" | "subject" | "cse";
    role: string;
    level: string;
    type: "technical" | "behavioral" | "mixed";
    techstack: string;
    subject?: string;
    topics?: string[];
    goal?: string;
    durationMinutes?: number;
    practiceFocus?: string;
    consent: boolean;
}) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in to create an interview.");

    const mode = input.mode ?? "role";
    if (mode !== "role" && mode !== "subject" && mode !== "cse") throw new Error("Choose a valid practice mode.");
    const subject = typeof input.subject === "string" ? input.subject.trim() : "";
    if (mode === "subject" && !isCSESubject(subject)) throw new Error("Choose a valid CSE subject.");
    const allowedTopics: readonly string[] = mode === "subject" ? CSE_SUBJECTS[subject as keyof typeof CSE_SUBJECTS] : [];
    const requestedTopics = Array.isArray(input.topics) ? input.topics : [];
    if (mode === "subject" && requestedTopics.some((topic) => !allowedTopics.includes(topic))) {
        throw new Error("Choose topics from the selected subject.");
    }
    const topics = mode === "subject"
        ? requestedTopics.length ? [...new Set(requestedTopics)].slice(0, 10) : [...allowedTopics]
        : [];
    const role = (mode === "subject" ? subject : mode === "cse" ? "Full CSE Survey" : typeof input.role === "string" ? input.role : "").trim().slice(0, 100);
    if (!role) throw new Error("Enter a job role or choose a CSE practice mode.");
    if (input.consent !== true) throw new Error("Consent is required to start a voice interview.");
    const level = typeof input.level === "string" ? input.level.trim() : "";
    if (!["Junior", "Mid-level", "Senior"].includes(level)) {
        throw new Error("Choose a valid experience level.");
    }
    if (!["technical", "behavioral", "mixed"].includes(input.type)) {
        throw new Error("Choose a valid interview focus.");
    }
    const techstack = (typeof input.techstack === "string" ? input.techstack : "").split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 12);
    const { maxTextDurationMinutes } = getPlanEntitlements(user.plan);
    const requestedDuration = input.durationMinutes === undefined ? maxTextDurationMinutes : Number(input.durationMinutes);
    if (![10, 25].includes(requestedDuration)) {
        throw new Error("Choose one of the available interview time limits.");
    }
    if (requestedDuration > maxTextDurationMinutes) {
        throw new Error(`The ${requestedDuration}-minute text practice limit is available on Premium. Your plan supports up to ${maxTextDurationMinutes} minutes.`);
    }
    const durationMinutes = requestedDuration;
    const goal = typeof input.goal === "string" ? input.goal.trim().slice(0, 180) : "";
    const practiceFocus = typeof input.practiceFocus === "string" ? input.practiceFocus.trim().slice(0, 180) : "";

    const ref = await db.collection("interviews").add({
        mode,
        role,
        subject: mode === "subject" ? subject : null,
        topics,
        subjectCoverage: mode === "cse" ? Object.entries(CSE_SUBJECTS).map(([name, subjectTopics]) => ({ subject: name, topics: [...subjectTopics] })) : [],
        questionPlan: [],
        level,
        durationMinutes,
        goal,
        practiceFocus,
        type: input.type,
        techstack,
        questions: [],
        userId: user.id,
        finalized: false,
        consentGivenAt: admin.firestore.FieldValue.serverTimestamp(),
        transcriptPolicyVersion: "2026-09-30-v1",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { interviewId: ref.id };
}
