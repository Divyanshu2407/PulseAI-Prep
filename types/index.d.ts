interface Feedback {
    id: string;
    interviewId: string;
    totalScore: number | null;
    scoreScale?: 25 | 100;
    categoryScores: Array<{
        name: string;
        score: number | null;
        comment: string;
        assessed?: boolean;
        evidence?: string;
    }>;
    scoreCoverage?: { assessed: number; total: number };
    strengths: string[];
    areasForImprovement: string[];
    finalAssessment: string;
    subjectMastery?: Array<{
        subject?: string;
        topic: string;
        fundamentals: "Clear" | "Developing" | "Needs practice" | "Not assessed";
        application: "Clear" | "Developing" | "Needs practice" | "Not assessed";
        advanced: "Clear" | "Developing" | "Needs practice" | "Not assessed";
        evidence: string;
    }>;
    assessmentCoverage?: { assessedTopics: number; totalTopics: number; percentage: number };
    practicePlan?: Array<{
        focus: string;
        action: string;
        practiceQuestion: string;
    }>;
    completedPracticeSteps?: number[];
    sessionProgress?: SessionProgress;
    generatedFeedback: string;
    transcript?: Array<{ role: "user" | "assistant"; content: string }>;
    discussion?: Array<{ role: "user" | "assistant"; content: string; createdAt: string }>;
    createdAt: string | Date | FirebaseFirestore.Timestamp;
}

type InterviewEndReason = "planned_complete" | "candidate_requested" | "manual_finish" | "time_limit" | "connection_lost";

interface SessionProgress {
    status: "complete" | "partial";
    reason: InterviewEndReason;
    completedCoreQuestions: number;
    totalCoreQuestions: number;
    skippedCoreQuestions: number;
    completedExtraQuestions: number;
    queuedExtraQuestions: number;
    answeredCoreQuestionIndexes?: number[];
    skippedCoreQuestionIndexes?: number[];
}

type SessionProgressInput = Omit<SessionProgress, "status">;

interface Interview {
    id: string;
    role: string;
    level: string;
    questions: string[];
    techstack: string[];
    createdAt: string | Date | FirebaseFirestore.Timestamp;
    userId: string;
    type: string;
    mode?: "role" | "subject" | "cse";
    subject?: string | null;
    topics?: string[];
    subjectCoverage?: Array<{ subject: string; topics: string[] }>;
    questionPlan?: Array<{ subject?: string; topic: string; difficulty: "fundamental" | "applied" | "advanced"; question: string }>;
    finalized: boolean;
    transcript?: Array<{ role: "user" | "assistant"; content: string }>;
    sessionProgress?: SessionProgressInput;
    questionPlanVersion?: string;
    archived?: boolean;
    archivedAt?: string | Date | FirebaseFirestore.Timestamp;
    goal?: string;
    durationMinutes?: 10 | 15 | 25;
    practiceFocus?: string;
}

interface CreateFeedbackParams {
    interviewId: string;
    userId: string;
    transcript: { role: string; content: string }[];
    sessionProgress?: SessionProgressInput;
    feedbackId?: string;
}

interface User {
    name: string;
    email: string;
    id: string;
    plan: "free" | "premium";
}

interface InterviewCardProps {
    id?: string;
    userId?: string;
    role: string;
    type: string;
    techstack: string[];
    createdAt?: string | FirebaseFirestore.Timestamp;
}

interface AgentProps {
    userName: string;
    userId?: string;
    interviewId?: string;
    feedbackId?: string;
    type: "generate" | "interview";
    questions?: string[];
}

interface RouteParams {
    params: Record<string, string>;
    searchParams: Record<string, string>;
}

interface GetFeedbackByInterviewIdParams {
    interviewId: string;
    userId: string;
}

interface SignInParams {
    email: string;
    idToken: string;
}

interface SignUpParams {
    uid: string;
    name: string;
    email: string;
    idToken: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
    interviewId: string;
    role: string;
    level: string;
    type: string;
    techstack: string[];
    amount: number;
}

interface TechIconProps {
    techStack: string[];
}
interface Message {
    role: "user" | "assistant";
    content: string;
}
