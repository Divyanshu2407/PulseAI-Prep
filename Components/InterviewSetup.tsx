"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInterview } from "@/lib/actions/interview.action";
import { Button } from "@/Components/ui/button";
import { CSE_SUBJECTS } from "@/constants/cse-subjects";

const roleOptions = [
    "Frontend Developer",
    "Backend Developer",
    "Full-Stack Developer",
    "Software Engineer",
    "Data Analyst",
    "Data Scientist",
    "DevOps Engineer",
    "Other",
];

const skillsByRole: Record<string, string[]> = {
    "Frontend Developer": ["JavaScript", "TypeScript", "React", "Next.js", "HTML/CSS", "Accessibility", "UI testing"],
    "Backend Developer": ["Node.js", "Python", "Java", "C#", "REST APIs", "SQL / PostgreSQL", "MongoDB", "Authentication"],
    "Full-Stack Developer": ["JavaScript", "TypeScript", "React", "Node.js", "Next.js", "REST APIs", "SQL / PostgreSQL", "MongoDB"],
    "Software Engineer": ["JavaScript / TypeScript", "Python", "Java", "C#", "Data structures & algorithms", "System design", "API design", "Testing"],
    "Data Analyst": ["SQL", "Python", "Excel", "Tableau", "Power BI", "Statistics", "Data storytelling"],
    "Data Scientist": ["Python", "SQL", "Statistics", "Machine learning", "TensorFlow / PyTorch", "Experiment design", "Data visualization"],
    "DevOps Engineer": ["Linux", "Docker", "Kubernetes", "AWS", "Google Cloud", "CI/CD", "Terraform", "Monitoring"],
    Other: ["JavaScript", "Python", "Java", "C#", "SQL", "React", "Node.js", "System design", "Communication"],
};

const focusOptions = [
    { value: "technical", title: "Technical", description: "Skills, problem-solving, and technical depth" },
    { value: "behavioral", title: "Behavioral", description: "Experience, decisions, and communication" },
    { value: "mixed", title: "Mixed", description: "A balanced combination of both" },
] as const;

const levels = ["Junior", "Mid-level", "Senior"] as const;
const modeOptions = [
    { value: "role", title: "Role interview", description: "Practice for a job role and its interview skills." },
    { value: "subject", title: "CSE subject mastery", description: "Check fundamentals, application, and advanced understanding." },
    { value: "cse", title: "Full CSE survey", description: "Sample core knowledge across the CSE subject list." },
] as const;

const choiceClass = "flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-white/80 transition hover:border-pink-300/40 hover:bg-pink-300/[0.06] has-[:checked]:border-pink-300/70 has-[:checked]:bg-pink-300/[0.10] has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pink-300";
const controlClass = "accent-pink-400 focus-visible:outline-none";

export default function InterviewSetup({ plan = "free", initialPracticeFocus = "", initialRole = "", initialMode = "role", initialLevel = "Mid-level", initialSubject = "" }: { plan?: "free" | "premium"; initialPracticeFocus?: string; initialRole?: string; initialMode?: "role" | "subject" | "cse"; initialLevel?: string; initialSubject?: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState(roleOptions.includes(initialRole) ? initialRole : initialRole ? "Other" : "Frontend Developer");
    const [customRole, setCustomRole] = useState(roleOptions.includes(initialRole) ? "" : initialRole);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedMode, setSelectedMode] = useState<"role" | "subject" | "cse">(initialMode);
    const [selectedSubject, setSelectedSubject] = useState<keyof typeof CSE_SUBJECTS>(initialSubject in CSE_SUBJECTS ? initialSubject as keyof typeof CSE_SUBJECTS : "Data Structures & Algorithms");
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<(typeof levels)[number]>(levels.includes(initialLevel as (typeof levels)[number]) ? initialLevel as (typeof levels)[number] : "Mid-level");
    const maxTextDurationMinutes = plan === "premium" ? 25 : 10;
    const availableDurations = plan === "premium" ? [10, 25] : [10];
    const subjectTopicCount = selectedTopics.length || CSE_SUBJECTS[selectedSubject].length;
    const subjectQuestionCount = subjectTopicCount * (selectedLevel === "Junior" ? 2 : 3);

    async function submit(formData: FormData) {
        setBusy(true);
        setError(null);
        try {
            const roleChoice = String(formData.get("role") || "");
            const customRole = String(formData.get("customRole") || "").trim();
            const customSkills = String(formData.get("customTechstack") || "").trim();
            const techstack = [...formData.getAll("techstack").map(String), ...customSkills.split(",").map((skill) => skill.trim()).filter(Boolean)];
            const mode = String(formData.get("mode") || "role") as "role" | "subject" | "cse";
            const subject = String(formData.get("subject") || "");
            const { interviewId } = await createInterview({
                mode,
                role: mode === "subject" ? subject : mode === "cse" ? "Full CSE Survey" : roleChoice === "Other" ? customRole : roleChoice,
                level: String(formData.get("level") || "Mid-level"),
                type: mode !== "role" ? "technical" : String(formData.get("type") || "mixed") as "technical" | "behavioral" | "mixed",
                subject: mode === "subject" ? subject : "",
                topics: mode === "subject" ? formData.getAll("topics").map(String) : [],
                goal: String(formData.get("goal") || ""),
                practiceFocus: String(formData.get("practiceFocus") || ""),
                durationMinutes: Number(formData.get("durationMinutes") || maxTextDurationMinutes),
                techstack: mode === "role" ? techstack.join(", ") : "",
                consent: formData.get("consent") === "on",
            });
            router.push(`/interview/${interviewId}`);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not create the interview.");
            setBusy(false);
        }
    }

    function toggleSkill(skill: string) {
        setSelectedSkills((current) => current.includes(skill)
            ? current.filter((item) => item !== skill)
            : [...current, skill]);
    }

    function toggleTopic(topic: string) {
        setSelectedTopics((current) => current.includes(topic)
            ? current.filter((item) => item !== topic)
            : [...current, topic]);
    }

    return (
        <form action={submit} className="app-content-card mx-auto mt-8 flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-8">
            <div>
                <h2 className="text-xl font-semibold text-white">Set up your practice session</h2>
                <p className="mt-1 text-sm leading-6 text-gray-400">Choose a role interview, a focused CSE subject diagnostic, or a broad survey across CSE subjects.</p>
            </div>

            <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">What would you like to practice?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {modeOptions.map((option) => (
                        <label key={option.value} className={`${choiceClass} items-start`}>
                            <input className={`${controlClass} mt-0.5`} type="radio" name="mode" value={option.value} checked={selectedMode === option.value} onChange={() => setSelectedMode(option.value)} />
                            <span>
                                <span className="block font-medium">{option.title}</span>
                                <span className="mt-1 block text-xs leading-5 text-white/50">{option.description}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {selectedMode === "role" ? <>
            <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">What role are you preparing for?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {roleOptions.map((role) => (
                        <label key={role} className={choiceClass}>
                            <input
                                className={controlClass}
                                type="radio"
                                name="role"
                                value={role}
                                checked={selectedRole === role}
                                onChange={() => {
                                    setSelectedRole(role);
                                    setSelectedSkills([]);
                                }}
                            />
                            <span>{role === "Other" ? "Another role" : role}</span>
                        </label>
                    ))}
                </div>
                {selectedRole === "Other" && (
                    <input name="customRole" required maxLength={100} value={customRole} onChange={(event) => setCustomRole(event.target.value)} placeholder="Enter the role you want to practice" className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
                )}
            </fieldset>

            </> : selectedMode === "subject" ? <>
            <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">Choose a CSE subject</legend>
                <select name="subject" value={selectedSubject} onChange={(event) => { setSelectedSubject(event.target.value as keyof typeof CSE_SUBJECTS); setSelectedTopics([]); }} className="h-11 w-full rounded-xl border border-white/15 bg-[#17131f] px-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300">
                    {Object.keys(CSE_SUBJECTS).map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
                <p className="mt-2 text-xs leading-5 text-white/50">Choose specific topics, or leave them all unchecked to cover every topic in this subject.</p>
                <p className="mt-2 text-xs leading-5 text-white/50">This plan covers {subjectTopicCount} topic{subjectTopicCount === 1 ? "" : "s"} with {selectedLevel === "Junior" ? "fundamental and applied" : "fundamental, applied, and advanced"} questions ({subjectQuestionCount} planned questions). Choose a smaller topic set for a deeper, shorter session. Questions stay within the selected subject.</p>
            </fieldset>
            <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">Topics <span className="font-normal text-white/45">(optional)</span></legend>
                <div className="flex flex-wrap gap-2">
                    {CSE_SUBJECTS[selectedSubject].map((topic) => (
                        <label key={topic} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-white/75 transition hover:border-pink-300/40 has-[:checked]:border-pink-300/70 has-[:checked]:bg-pink-300/[0.10] has-[:checked]:text-white">
                            <input className={controlClass} type="checkbox" name="topics" value={topic} checked={selectedTopics.includes(topic)} onChange={() => toggleTopic(topic)} />
                            {topic}
                        </label>
                    ))}
                </div>
            </fieldset>
            </> : <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/65">
                The Full CSE survey asks one representative question from each of {Object.keys(CSE_SUBJECTS).length} core CSE areas. It is a breadth diagnostic, not a deep assessment of every topic. Use CSE subject mastery to cover all topics and difficulty levels within a subject.
            </div>}

            <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">Target difficulty</legend>
                <div className="grid grid-cols-3 gap-2">
                    {levels.map((level) => (
                        <label key={level} className={`${choiceClass} justify-center px-2 text-center`}>
                            <input className={controlClass} type="radio" name="level" value={level} checked={selectedLevel === level} onChange={() => setSelectedLevel(level)} />
                            <span>{level}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">Text practice time limit</legend>
                <div className={`grid gap-2 ${availableDurations.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {availableDurations.map((minutes) => <label key={minutes} className={`${choiceClass} justify-center px-2 text-center`}>
                        <input className={controlClass} type="radio" name="durationMinutes" value={minutes} defaultChecked={minutes === maxTextDurationMinutes} />
                        <span className="flex flex-wrap items-center justify-center gap-1.5">
                            <span>{minutes} min{plan === "free" ? " · Free max" : ""}</span>
                            {minutes === 25 && <span className="rounded-full border border-pink-200/20 bg-pink-200/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pink-100">Premium</span>}
                        </span>
                    </label>)}
                </div>
                <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.025]">
                    <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-white/75 marker:text-pink-200">
                        Session limits <span className="font-normal text-white/45">· Free 10 min, Premium up to 25 min</span>
                    </summary>
                    <p className="border-t border-white/10 px-3 py-3 text-xs leading-5 text-white/55">You can finish text practice early. Gemini Live voice is currently limited to 10 minutes on both plans. Premium includes more requested follow-up questions and a longer feedback discussion. Unanswered questions are not scored.</p>
                </details>
            </fieldset>

            <label className="block text-sm font-medium text-white">Your interview goal <span className="font-normal text-white/45">(optional)</span>
                <input name="goal" maxLength={180} placeholder="e.g. Explain trade-offs more clearly" className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
            </label>
            {initialPracticeFocus && <>
                <input type="hidden" name="practiceFocus" value={initialPracticeFocus} />
                <p className="-mt-4 rounded-xl border border-pink-200/15 bg-pink-300/[0.06] p-3 text-sm text-pink-100">Focused practice: {initialPracticeFocus}</p>
            </>}

            {selectedMode === "role" && <fieldset>
                <legend className="mb-3 text-sm font-medium text-white">What kind of questions should the AI Interviewer ask?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {focusOptions.map((option) => (
                        <label key={option.value} className={`${choiceClass} items-start`}>
                            <input className={`${controlClass} mt-0.5`} type="radio" name="type" value={option.value} defaultChecked={option.value === "mixed"} />
                            <span>
                                <span className="block font-medium">{option.title}</span>
                                <span className="mt-1 block text-xs leading-5 text-white/50">{option.description}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>}

            {selectedMode === "role" && <fieldset>
                <legend className="mb-1 text-sm font-medium text-white">Choose skills or technologies to focus on <span className="font-normal text-white/45">(optional)</span></legend>
                <p className="mb-3 text-xs text-white/50">Select any that matter for your interview.</p>
                <div className="flex flex-wrap gap-2">
                    {skillsByRole[selectedRole].map((skill) => (
                        <label key={skill} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-white/75 transition hover:border-pink-300/40 has-[:checked]:border-pink-300/70 has-[:checked]:bg-pink-300/[0.10] has-[:checked]:text-white">
                            <input className={controlClass} type="checkbox" name="techstack" value={skill} checked={selectedSkills.includes(skill)} onChange={() => toggleSkill(skill)} />
                            {skill}
                        </label>
                    ))}
                </div>
                <input name="customTechstack" maxLength={300} placeholder="Add another skill (optional, separate multiple with commas)" className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
            </fieldset>}

            <label className="flex items-start gap-3 text-sm leading-6 text-gray-300">
                <input name="consent" type="checkbox" required className="mt-1 accent-pink-400" />
                <span>I agree to stream my microphone audio to Google for this interview and store the transcript with my interview and feedback. This app does not save raw audio; Google’s API data terms apply.</span>
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <Button
                type="submit"
                disabled={busy}
                className="min-h-12 rounded-full bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-300 px-7 font-bold text-[#17121d] shadow-lg shadow-fuchsia-950/30 hover:brightness-105"
            >
                {busy ? "Preparing interview…" : "Start interview"}
            </Button>
        </form>
    );
}
