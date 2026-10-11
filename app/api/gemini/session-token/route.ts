import { GoogleGenAI, Modality } from "@google/genai";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/Firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { GEMINI_LIVE_MODEL } from "@/lib/gemini-live";
import { CSE_SUBJECTS, isCSESubject } from "@/constants/cse-subjects";
import { getPlanEntitlements } from "@/lib/entitlements";
import { aiUsageLimitMessage, reserveAiUsage } from "@/lib/server/ai-usage";

const QUESTION_PLAN_VERSION = "2026-10-10-v4";

const adaptiveInterviewTools = [{
    functionDeclarations: [
        {
            name: "get_core_question",
            description: "Fetch the exact next prepared interview question from the app. You must call this before asking each prepared question, then ask the returned question verbatim.",
            parametersJsonSchema: {
                type: "object",
                properties: { questionIndex: { type: "integer", description: "One-based index of the next prepared question." } },
                required: ["questionIndex"],
            },
        },
        {
            name: "complete_core_question",
            description: "Record that the candidate has answered one prepared interview question. Call once per answered question, in order, after any needed follow-up. Do not use this for a skipped or unanswered question.",
            parametersJsonSchema: {
                type: "object",
                properties: { questionIndex: { type: "integer", description: "One-based index of the prepared question just answered." } },
                required: ["questionIndex"],
            },
        },
        {
            name: "skip_core_question",
            description: "Record that the candidate explicitly chose to skip the current prepared question. This advances the interview but does not count as an answered question for assessment.",
            parametersJsonSchema: {
                type: "object",
                properties: { questionIndex: { type: "integer", description: "One-based index of the prepared question the candidate skipped." } },
                required: ["questionIndex"],
            },
        },
        {
            name: "request_extra_question",
            description: "Queue one relevant extra question only when the candidate explicitly asks to continue during the interview. The app enforces the current account's requested-extra limit; never offer extras automatically.",
            parametersJsonSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
            name: "complete_extra_question",
            description: "Record that the candidate answered one queued extra question.",
            parametersJsonSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
            name: "finish_interview",
            description: "Request session completion after all prepared and queued questions, or immediately when the candidate explicitly asks to end the interview. Do not call for ordinary phrases meaning only that the current answer is finished.",
            parametersJsonSchema: {
                type: "object",
                properties: {
                    reason: { type: "string", enum: ["planned_complete", "candidate_requested"] },
                },
                required: ["reason"],
            },
        },
    ],
}];

function makeFallbackQuestions(interview: FirebaseFirestore.DocumentData): string[] {
    const role = typeof interview.role === "string" && interview.role.trim()
        ? interview.role.trim()
        : "this role";
    const skills = Array.isArray(interview.techstack)
        ? interview.techstack.filter((skill: unknown): skill is string => typeof skill === "string" && skill.trim().length > 0)
        : [];
    const focusSkill = skills[0] || role;
    const technical = [
        `A user-facing ${role} feature built with ${focusSkill} has become noticeably slower. What would you measure first, what hypotheses would you test, and how would you verify a fix?`,
        `An input contains three records: {id: 1}, {id: 2, value: "ok"}, and {id: 3, value: ""}. Walk through validation that keeps only records with a non-empty value, and explain the result and relevant edge cases.`,
        `For a feature relevant to a ${role} role, describe the tests you would write for normal input, empty input, malformed input, and a boundary case. Explain what each test protects against.`,
        `At the ${interview.level || "selected"} level, how would you design a reliable ${focusSkill}-based feature for this role? Explain one trade-off involving maintainability, performance, or user experience.`,
        `A bug in a ${role} project appears only intermittently. How would you reproduce it, narrow down its cause, and verify that the fix does not create a regression?`,
        `A service relevant to this ${role} role is approaching its capacity. What signals would you inspect and what changes would you consider before scaling it?`,
        `How would you protect a ${focusSkill}-based feature from invalid or hostile input while keeping errors useful to users?`,
        `A production issue affects only some users. What logs, metrics, and alerts would help you diagnose it without exposing sensitive data?`,
    ];
    const behavioral = [
        `Tell me about a project relevant to a ${role} role. What was the situation, what were you responsible for, what actions did you take, and what was the result?`,
        "Describe a time you received difficult feedback. What did you change, and what happened afterward?",
        "Tell me about a disagreement with a teammate. How did you understand the other perspective and reach an outcome?",
        "Describe a time a project did not go as planned. What did you own, what did you learn, and what would you do differently?",
        "Tell me about a time you had to make a decision with incomplete information. How did you decide and what was the outcome?",
        "Describe a time you changed your mind after learning new information. What evidence shifted your view and how did you communicate the change?",
        "Tell me about a time you helped another person or team make progress. What did you do and what impact followed?",
        "Describe a time you had competing priorities. How did you make the trade-off and keep people informed?",
    ];

    const type = typeof interview.type === "string" ? interview.type.toLowerCase() : "mixed";
    const count = 4;
    if (type === "technical") return technical.slice(0, count);
    if (type === "behavioral") return behavioral.slice(0, count);
    return [technical[0], technical[1], technical[3], behavioral[0], behavioral[2], technical[5], behavioral[5], technical[6]].slice(0, count);
}

type SubjectQuestion = { subject: string; topic: string; difficulty: "fundamental" | "applied" | "advanced"; question: string };
type SubjectQuestionLevel = SubjectQuestion["difficulty"];

function getDifficultyPlan(level: string, count: number, fullCse = false): SubjectQuestionLevel[] {
    if (fullCse) {
        const proportions: Record<string, Record<SubjectQuestionLevel, number>> = {
            Junior: { fundamental: 0.6, applied: 0.33, advanced: 0.07 },
            "Mid-level": { fundamental: 0.34, applied: 0.33, advanced: 0.33 },
            Senior: { fundamental: 0.2, applied: 0.4, advanced: 0.4 },
        };
        const weights = proportions[level] || proportions["Mid-level"];
        const target = {
            fundamental: Math.floor(count * weights.fundamental),
            applied: Math.floor(count * weights.applied),
            advanced: 0,
        };
        target.advanced = count - target.fundamental - target.applied;
        return (["fundamental", "applied", "advanced"] as const).flatMap((difficulty) => Array(target[difficulty]).fill(difficulty));
    }
    const depths: SubjectQuestionLevel[] = level === "Junior"
        ? ["fundamental", "applied"]
        : ["fundamental", "applied", "advanced"];
    return Array.from({ length: count }, () => depths).flat();
}

function makeSubjectFallbackQuestions(items: Array<{ subject: string; topic: string }>, level: string, fullCse = false): SubjectQuestion[] {
    const difficultyPlan = getDifficultyPlan(level, fullCse ? items.length : items.length * (level === "Junior" ? 2 : 3), fullCse);
    const entries = fullCse ? items.map((item, index) => ({ ...item, difficulty: difficultyPlan[index] }))
        : items.flatMap((item) => getDifficultyPlan(level, 1).map((difficulty) => ({ ...item, difficulty })));
    return entries.map(({ subject, topic, difficulty }) => {
        const question = difficulty === "fundamental"
            ? `In ${subject}, explain the fundamental idea of ${topic} and give a simple example.`
            : difficulty === "applied"
                ? `In ${subject}, apply ${topic} to a practical scenario. Talk through your steps and reasoning.`
                : `In ${subject}, explain an advanced trade-off or limitation related to ${topic}, and how you would reason about it in a real system.`;
        return { subject, topic, difficulty, question };
    });
}

function hasDifficultyRange(plan: SubjectQuestion[], level: string) {
    const levels = new Set(plan.map((item) => item.difficulty));
    const expected = level === "Junior" ? ["fundamental", "applied"] : ["fundamental", "applied", "advanced"];
    return expected.every((difficulty) => levels.has(difficulty as SubjectQuestionLevel));
}

function hasSubjectDifficultyDistribution(plan: SubjectQuestion[], level: string) {
    if (!plan.length) return false;
    const expectedDepths = level === "Junior" ? ["fundamental", "applied"] : ["fundamental", "applied", "advanced"];
    const topics = new Set(plan.map((item) => item.topic));
    return topics.size > 0 && [...topics].every((topic) => {
        const levels = plan.filter((item) => item.topic === topic).map((item) => item.difficulty);
        return levels.length === expectedDepths.length && expectedDepths.every((difficulty) => levels.includes(difficulty as SubjectQuestionLevel));
    });
}

function hasSurveyDifficultyDistribution(plan: SubjectQuestion[], level: string) {
    const target = getDifficultyPlan(level, plan.length, true).reduce<Record<SubjectQuestionLevel, number>>((result, difficulty) => {
        result[difficulty] += 1;
        return result;
    }, { fundamental: 0, applied: 0, advanced: 0 });
    const counts = plan.reduce<Record<SubjectQuestionLevel, number>>((result, item) => {
        result[item.difficulty] += 1;
        return result;
    }, { fundamental: 0, applied: 0, advanced: 0 });
    return counts.fundamental === target.fundamental && counts.applied === target.applied && counts.advanced === target.advanced;
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const entitlements = getPlanEntitlements(user.plan);

    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
        }
        const requestBody = await request.json();
        const { interviewId } = requestBody;
        const textOnly = requestBody.textOnly === true;
        const extraQuestion = requestBody.extraQuestion === true;
        if (extraQuestion && !textOnly) {
            return NextResponse.json({ error: "Additional questions are only available in text-only practice mode." }, { status: 400 });
        }
        if (typeof interviewId !== "string" || !interviewId) {
            return NextResponse.json({ error: "A valid interviewId is required." }, { status: 400 });
        }

        const interviewRef = db.collection("interviews").doc(interviewId);
        const interviewSnapshot = await interviewRef.get();
        if (!interviewSnapshot.exists || interviewSnapshot.data()?.userId !== user.id) {
            return NextResponse.json({ error: "Interview not found." }, { status: 404 });
        }

        const interview = interviewSnapshot.data()!;
        let questions = Array.isArray(interview.questions)
            ? interview.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
            : [];
        let questionPlan: SubjectQuestion[] = Array.isArray(interview.questionPlan)
            ? interview.questionPlan.filter((item: unknown) => Boolean(item)
                && typeof item === "object"
                && typeof (item as SubjectQuestion).topic === "string"
                && typeof (item as SubjectQuestion).question === "string"
                && ["fundamental", "applied", "advanced"].includes((item as SubjectQuestion).difficulty))
                .map((item: SubjectQuestion) => ({
                    ...item,
                    subject: typeof item.subject === "string" ? item.subject : (typeof interview.subject === "string" ? interview.subject : ""),
                }))
            : [];
        const isSubjectSession = interview.mode === "subject" || interview.mode === "cse";
        const isFullCseSession = interview.mode === "cse";
        const persistedTopics = Array.isArray(interview.topics)
            ? interview.topics.filter((topic: unknown): topic is string => typeof topic === "string")
            : [];
        const storedPlanValid = !isSubjectSession || (
            questionPlan.length === (isFullCseSession ? Object.keys(CSE_SUBJECTS).length : questionPlan.length)
            && questionPlan.length > 0
            && questionPlan.every((item) => item.question.trim().length >= 12)
            && (isFullCseSession
                ? new Set(questionPlan.map((item) => item.subject)).size === Object.keys(CSE_SUBJECTS).length
                    && questionPlan.every((item) => isCSESubject(item.subject) && (CSE_SUBJECTS[item.subject] as readonly string[]).includes(item.topic))
                    && hasSurveyDifficultyDistribution(questionPlan, interview.level || "Mid-level")
                : questionPlan.every((item) => item.subject === interview.subject && persistedTopics.includes(item.topic))
                    && persistedTopics.length > 0
                    && persistedTopics.every((topic) => questionPlan.some((item) => item.topic === topic))
                    && hasSubjectDifficultyDistribution(questionPlan, interview.level || "Mid-level"))
            && questions.length === questionPlan.length
            && questions.every((question, index) => question === questionPlan[index].question)
        );
        const expectedRoleQuestionCount = 4;
        const questionsNeedRefresh = interview.questionPlanVersion !== QUESTION_PLAN_VERSION
            || (isSubjectSession ? !storedPlanValid : questions.length !== expectedRoleQuestionCount);
        if (!questions.length || questionsNeedRefresh) {
            const usage = await reserveAiUsage(user.id, user.plan);
            if (!usage.allowed) {
                return NextResponse.json({ error: aiUsageLimitMessage(user.plan, usage.limit) }, { status: 429 });
            }
            if (isSubjectSession) {
                const level = typeof interview.level === "string" ? interview.level : "Mid-level";
                const fullCse = interview.mode === "cse";
                const singleSubject = typeof interview.subject === "string" && isCSESubject(interview.subject) ? interview.subject : "Data Structures & Algorithms";
                const allowedTopics: readonly string[] = fullCse ? [] : CSE_SUBJECTS[singleSubject];
                const requestedTopics = Array.isArray(interview.topics)
                    ? interview.topics.filter((topic: unknown): topic is string => typeof topic === "string" && allowedTopics.includes(topic))
                    : [];
                const topics = fullCse ? [] : requestedTopics.length ? requestedTopics : [...allowedTopics];
                const depthsPerTopic = level === "Junior" ? 2 : 3;
                const questionCount = fullCse ? Object.keys(CSE_SUBJECTS).length : topics.length * depthsPerTopic;
                const targetCounts = getDifficultyPlan(level, questionCount, fullCse)
                    .reduce<Record<SubjectQuestionLevel, number>>((result, difficulty) => { result[difficulty] += 1; return result; }, { fundamental: 0, applied: 0, advanced: 0 });
                const difficultyGuidance = `Use exactly ${targetCounts.fundamental} fundamental, ${targetCounts.applied} applied, and ${targetCounts.advanced} advanced questions.`;
                const requiredItems = fullCse
                    ? Object.entries(CSE_SUBJECTS).map(([subject, subjectTopics]) => {
                        const interviewSeed = interviewId.split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
                        return { subject, topic: subjectTopics[(interviewSeed + subject.length) % subjectTopics.length] };
                    })
                    : topics.map((topic) => ({ subject: singleSubject, topic }));
                try {
                    const { object } = await generateObject({
                        model: google("gemini-3.8-flash"),
                        schema: z.object({ questions: z.array(z.object({
                            subject: z.string(),
                            topic: z.string(),
                            difficulty: z.enum(["fundamental", "applied", "advanced"]),
                            question: z.string().min(12),
                        })).length(questionCount) }),
                        prompt: fullCse
                            ? `Create exactly one oral interview question for each of these CSE subjects. Use the exact subject/topic pairs in this order: ${requiredItems.map(({ subject, topic }) => `${subject}: ${topic}`).join("\n")}. Return exactly ${questionCount} questions in that order. Candidate level: ${level}. ${difficultyGuidance} Candidate goal: ${String(interview.goal || interview.practiceFocus || "balanced understanding").slice(0, 180)}. Keep all questions in their assigned subject/topic. Label each as fundamental, applied, or advanced, calibrated to the selected level. Questions must be answerable aloud, concise, technically accurate, and assess useful understanding rather than trivia. Never imply spoken code or SQL was executed. This is a broad CSE survey, not an in-depth exam in one subject.`
                            : `Create exactly ${questionCount} original oral-exam questions for ONLY the CSE subject ${singleSubject}. Every selected topic must have ${depthsPerTopic} questions: ${level === "Junior" ? "one fundamental and one applied" : "one fundamental, one applied, and one advanced"}. Use each exact topic name and difficulty exactly once per topic. Candidate level: ${level}; candidate goal: ${String(interview.goal || interview.practiceFocus || "balanced understanding").slice(0, 180)}. If a practice focus is set, prioritize it within its matching selected topic while preserving the required coverage. Calibrate the complexity and expected depth to that level (advanced is a stretch probe for a junior, not a senior-level prerequisite). ${difficultyGuidance} Fundamentals should ask for a core explanation/example; applied questions should require a practical scenario, trace, or query; advanced questions should probe edge cases, trade-offs, or limitations. Keep every prompt distinct, concise, and answerable aloud. Return the exact subject name, exact topic, difficulty, and question. Never imply spoken code or SQL was executed; avoid trivia and copied company question-bank wording.`,
                    });
                    const generatedPlan = object.questions;
                    const coverageValid = fullCse
                        ? generatedPlan.length === questionCount
                            && new Set(generatedPlan.map((item) => item.subject)).size === questionCount
                            && generatedPlan.every((item, index) => item.subject === requiredItems[index].subject && item.topic === requiredItems[index].topic && isCSESubject(item.subject))
                            && hasSurveyDifficultyDistribution(generatedPlan, level)
                            : generatedPlan.length === questionCount
                            && generatedPlan.every((item) => item.subject === singleSubject && topics.includes(item.topic))
                            && topics.every((topic) => generatedPlan.some((item) => item.topic === topic))
                            && generatedPlan.every((item) => generatedPlan.filter((candidate) => candidate.topic === item.topic && candidate.difficulty === item.difficulty).length === 1)
                            && hasSubjectDifficultyDistribution(generatedPlan, level);
                    if (!coverageValid || !hasDifficultyRange(generatedPlan, level)) {
                        throw new Error("Generated CSE questions did not match the requested subject coverage and difficulty range.");
                    }
                    questionPlan = generatedPlan;
                } catch {
                    console.warn("Gemini CSE question generation failed validation; using balanced prepared questions.");
                    questionPlan = makeSubjectFallbackQuestions(requiredItems, level, fullCse);
                }
                questions = questionPlan.map((item) => item.question);
            } else {
              try {
                const skills = Array.isArray(interview.techstack) ? interview.techstack.join(", ") : "general";
                const type = typeof interview.type === "string" ? interview.type.toLowerCase() : "mixed";
                const levelGuidance = interview.level === "Junior"
                    ? "Junior: expect sound fundamentals, a clear approach, simple examples, basic tests, and willingness to learn; do not require production-scale architecture or extensive ownership."
                    : interview.level === "Senior"
                        ? "Senior: probe ambiguous requirements, architecture and operational trade-offs, failure modes, verification, and technical leadership where relevant; do not reward jargon without a reasoned example."
                        : "Mid-level: expect independent problem solving, practical implementation choices, meaningful edge cases and tests, and ownership of a feature or service; do not require organization-wide architecture."
                const questionCategories = type === "technical"
                    ? ["role_scenario", "dry_run", "testing_and_edge_cases", "design_tradeoff", "debugging", "performance_scaling", "security_reliability", "operational_monitoring"] as const
                    : type === "behavioral"
                        ? ["project_example", "feedback_learning", "collaboration", "setback", "ambiguity", "decision_making", "leadership_ownership", "prioritization"] as const
                        : ["role_scenario", "dry_run_and_testing", "technical_tradeoff", "behavioral_ownership", "behavioral_collaboration", "system_reliability", "ambiguity_judgment", "learning_growth"] as const;
                const categoryGuidance = type === "technical"
                    ? "role_scenario = realistic role-specific investigation/problem; dry_run = trace a small concrete input/output; testing_and_edge_cases = tests and boundary cases; design_tradeoff = role-level design choice and trade-off; debugging = reproduce, isolate, and verify a fix; performance_scaling = capacity and bottlenecks; security_reliability = safe input/failure handling; operational_monitoring = logs, metrics, and incident diagnosis."
                    : type === "behavioral"
                        ? "project_example = relevant past work and contribution; feedback_learning = difficult feedback and change; collaboration = disagreement or cross-team work; setback = failure, ownership, and learning; ambiguity = decision with incomplete information; decision_making = evidence-based changed decision; leadership_ownership = help another person or team; prioritization = competing priorities. Each question must elicit a specific past example with the candidate's actions and outcome."
                        : "role_scenario = applied technical scenario; dry_run_and_testing = concrete trace plus tests/edge cases; technical_tradeoff = level-appropriate design choice; behavioral_ownership = past example about ownership/results; behavioral_collaboration = past example about conflict, teamwork, or feedback; system_reliability = incident/failure trade-offs; ambiguity_judgment = choice with uncertain requirements; learning_growth = applying new evidence or learning.";
                const targetQuestionCount = 4;
                const selectedCategories = questionCategories.slice(0, targetQuestionCount);
                const { object } = await generateObject({
                    model: google("gemini-3.8-flash"),
                    schema: z.object({ questions: z.array(z.object({
                        category: z.enum(questionCategories),
                        question: z.string().min(12),
                    })).length(targetQuestionCount) }),
                    prompt: `Create exactly ${targetQuestionCount} concise, original, realistic interview questions for a ${interview.role || "general"} role at ${interview.level || "unspecified"} level. Selected focus: ${type}. Relevant skills: ${skills || "general"}. Candidate's stated goal: ${String(interview.goal || interview.practiceFocus || "balanced interview practice")}. Level expectations: ${levelGuidance} Return one question per category, using each category once: ${selectedCategories.join(", ")}. Category requirements: ${categoryGuidance} Questions should test job-relevant reasoning and evidence, not recall of company-specific question banks. Keep them role/skill-specific, answerable verbally in a voice-only interview, and calibrate each prompt's expected complexity to the chosen level. For coding-oriented questions, ask the candidate to explain an approach or verbally trace a small example; never imply spoken code was compiled or executed. Avoid trivia, trick questions, and copied company question-bank wording. If practice focus is set, make at least one question directly target it.`,
                });
                const generatedCategories = object.questions.map((item) => item.category);
                if (new Set(generatedCategories).size !== selectedCategories.length
                    || selectedCategories.some((category) => !generatedCategories.includes(category))) {
                    throw new Error("Generated role questions did not cover each required interview category exactly once.");
                }
                questions = object.questions.map((item) => item.question);
              } catch {
                // Keep the interview usable when the text-generation quota is exhausted.
                console.warn("Gemini question generation failed; using prepared fallback questions.");
                questions = makeFallbackQuestions(interview);
              }
            }
            await interviewRef.update({ questions, questionPlan, questionPlanVersion: QUESTION_PLAN_VERSION, finalized: true });
        }

        if (extraQuestion) {
            if (!questions.length) return NextResponse.json({ error: "The prepared questions are not available for this interview." }, { status: 409 });

            let reservedCount = 0;
            let limitReached = false;
            await db.runTransaction(async (transaction) => {
                reservedCount = 0;
                limitReached = false;
                const latestInterview = await transaction.get(interviewRef);
                const currentCount = Number(latestInterview.data()?.textExtraQuestionCount) || 0;
                if (currentCount >= entitlements.extraVoiceQuestions) {
                    limitReached = true;
                    return;
                }
                reservedCount = currentCount + 1;
                transaction.update(interviewRef, { textExtraQuestionCount: reservedCount });
            });
            if (limitReached) return NextResponse.json({ error: `This practice session has reached its ${entitlements.extraVoiceQuestions}-question extra limit.` }, { status: 429 });

            const extraQuestionUsage = await reserveAiUsage(user.id, user.plan);
            if (!extraQuestionUsage.allowed) {
                await db.runTransaction(async (transaction) => {
                    const latestInterview = await transaction.get(interviewRef);
                    const currentCount = Number(latestInterview.data()?.textExtraQuestionCount) || 0;
                    if (currentCount === reservedCount) transaction.update(interviewRef, { textExtraQuestionCount: Math.max(0, currentCount - 1) });
                });
                return NextResponse.json({ error: aiUsageLimitMessage(user.plan, extraQuestionUsage.limit) }, { status: 429 });
            }

            const answerHistory = Array.isArray(requestBody.history)
                ? requestBody.history.slice(-6).flatMap((item: unknown) => {
                    if (!item || typeof item !== "object") return [];
                    const question = typeof (item as { question?: unknown }).question === "string" ? (item as { question: string }).question.trim().slice(0, 400) : "";
                    const answer = typeof (item as { answer?: unknown }).answer === "string" ? (item as { answer: string }).answer.trim().slice(0, 1600) : "";
                    return question && answer ? [`Question: ${question}\nCandidate answer: ${answer}`] : [];
                })
                : [];
            const isFullCse = interview.mode === "cse";
            const subjectScope = interview.mode === "subject"
                ? `This is a single-subject interview for ${interview.subject}. Use only these selected topics: ${[...new Set(questionPlan.map((item) => item.topic))].join(", ")}.`
                : isFullCse
                    ? `This is a broad CSE survey. Use only these prepared subject/topic pairs: ${questionPlan.map((item) => `${item.subject}: ${item.topic}`).join("; ")}.`
                    : "";
            const focus = interview.mode === "role"
                ? `Role: ${interview.role || "general practice"}. Focus: ${interview.type || "mixed"}. Skills: ${(interview.techstack || []).join(", ") || "general"}.`
                : subjectScope;
            try {
                const { object } = await generateObject({
                    model: google("gemini-3.8-flash"),
                    schema: z.object({ question: z.string().min(12) }),
                    prompt: `Write exactly one new, concise oral interview practice question for a ${interview.level || "Mid-level"} candidate. ${focus} Candidate goal: ${String(interview.goal || interview.practiceFocus || "balanced practice").slice(0, 180)}. Use the candidate's previous answers to choose a useful area to probe further, but do not make unsupported assumptions about their ability. Avoid repeating any prepared question or asking trivia. Keep the question answerable aloud. For a role interview, stay relevant to the role and selected skills. For a CSE interview, stay strictly inside the allowed subject/topic scope above and do not switch subjects. Never imply that spoken code or SQL is executed. Previous questions and answers:\n${answerHistory.join("\n\n") || "No answers are available; choose an uncovered area from the prepared plan."}`,
                });
                return NextResponse.json({ textOnly: true, extraQuestion: true, question: object.question });
            } catch (questionError) {
                // Release the reservation if generation fails so the user can retry.
                await db.runTransaction(async (transaction) => {
                    const latestInterview = await transaction.get(interviewRef);
                    const currentCount = Number(latestInterview.data()?.textExtraQuestionCount) || 0;
                    if (currentCount === reservedCount) {
                        transaction.update(interviewRef, { textExtraQuestionCount: Math.max(0, currentCount - 1) });
                    }
                });
                console.error("Could not generate an additional text interview question:", questionError instanceof Error ? questionError.name : "UnknownError");
                const status = /quota|rate.?limit|resource_exhausted/i.test(questionError instanceof Error ? questionError.message : "") ? 429 : 502;
                return NextResponse.json({ error: status === 429 ? "Gemini's current API quota is exhausted. You can finish this interview for feedback." : "Could not prepare another question. Try again or finish for feedback." }, { status });
            }
        }

        const subject = typeof interview.subject === "string" ? interview.subject : "";
        const isFullCse = interview.mode === "cse";
        const subjectPlan = isSubjectSession
            ? `${isFullCse ? "This is a broad CSE survey spanning the listed subjects" : `This is a single-subject CSE mastery interview for ${subject}`}. Planned questions: ${questionPlan.map((item, i) => `${i + 1}. [${item.subject} · ${item.topic} · ${item.difficulty}] ${item.question}`).join("\n")}. Keep every core question, follow-up, and clarification within the subject and topic of the current planned item. For single-subject mode, never ask about a different CSE subject or an unselected topic. For Full CSE mode, use only subject/topic pairs listed in this plan. Approved extra questions may only probe a subject/topic already listed in this plan. Do not introduce unrelated general CSE questions. Match follow-up depth to the candidate level (${interview.level || "Mid-level"}); move from fundamentals to applied reasoning and advanced probes when the plan provides those levels. If a level was not tested, it must not be judged as weak.`
            : `Role: ${interview.role || "general practice"}. Focus: ${interview.type || "mixed"}. Skills: ${(interview.techstack || []).join(", ") || "general"}. Prepared questions: ${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}.`;
        const selectedDuration = [10, 25].includes(Number(interview.durationMinutes)) ? Number(interview.durationMinutes) : entitlements.maxTextDurationMinutes;
        const durationMinutes = Math.min(selectedDuration, textOnly ? entitlements.maxTextDurationMinutes : entitlements.maxLiveDurationMinutes);
        const extraQuestionLimit = entitlements.extraVoiceQuestions;
        const candidateGoal = String(interview.goal || interview.practiceFocus || "balanced interview practice").slice(0, 180);
        const instruction = `You are a professional, realistic, supportive mock interviewer. Interview candidate ${user.name}. ${subjectPlan} Level: ${interview.level || "unspecified"}. Candidate goal: ${candidateGoal}. The session has a ${durationMinutes}-minute time cap. There are ${questions.length} prepared core questions, listed in order. For role interviews, this is a fixed four-question mock interview. Before asking each prepared question, call get_core_question with its one-based index. Ask the exact question returned by the app; do not replace it, broaden it, or switch subjects. Start with a brief greeting, then retrieve question one. Let the candidate finish each answer. Ask at most one concise follow-up when an answer needs clarification; in subject mode, keep it on the current planned topic. After the candidate answers each core question (including a follow-up if used), call complete_core_question with its one-based index. If the candidate explicitly skips the current question, call skip_core_question with its one-based index and continue; never count a skipped question as answered. Continue in order and do not repeat questions. Never offer extra questions automatically. If the candidate explicitly asks for more questions before the interview is complete, queue up to ${extraQuestionLimit} relevant extras with request_extra_question and ask them after all prepared questions. Record each extra answer with complete_extra_question; after the final prepared or explicitly requested extra question is answered or skipped, call finish_interview with reason planned_complete immediately. Do not ask whether they want more at the end. Keep any requested extra questions within the selected role or planned subject/topic scope. Do not mistake “I'm done with that answer” for a request to end the interview. If the candidate clearly asks to end early, call finish_interview with reason candidate_requested immediately, even if some questions remain. After finish_interview is accepted, give a brief spoken closing and wait for the app to end the session. Do not give hints, scores, or coaching during the interview; detailed discussion happens after the feedback report. This is voice-only: never claim code was run, compiled, or verified.`;

        if (textOnly) return NextResponse.json({ textOnly: true, questions, questionPlan, durationMinutes });

        const tokenUsage = await reserveAiUsage(user.id, user.plan);
        if (!tokenUsage.allowed) {
            return NextResponse.json({ error: aiUsageLimitMessage(user.plan, tokenUsage.limit) }, { status: 429 });
        }
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const token = await client.authTokens.create({
            config: {
                uses: 1,
                                expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
                liveConnectConstraints: {
                    model: GEMINI_LIVE_MODEL,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        tools: adaptiveInterviewTools,
                    },
                },
            },
        });

        return NextResponse.json({
            token: token.name,
            questions,
            questionPlan,
            durationMinutes,
            extraQuestionLimit,
            questionPlanVersion: QUESTION_PLAN_VERSION,
            mode: interview.mode,
            subject,
            topics: Array.isArray(interview.topics) ? interview.topics : [],
            instructions: instruction,
            tools: adaptiveInterviewTools,
        });
    } catch (error) {
        console.error("Failed to create Gemini Live session:", error instanceof Error ? error.name : "UnknownError");
        const message = error instanceof Error ? error.message : "";
        if (/quota|rate.?limit|resource_exhausted/i.test(message)) {
            return NextResponse.json({ error: "Gemini's current API quota is exhausted. Wait for the quota to reset, then try again." }, { status: 429 });
        }
        return NextResponse.json({ error: "Could not prepare the voice interview. Check the server log for details." }, { status: 500 });
    }
}
