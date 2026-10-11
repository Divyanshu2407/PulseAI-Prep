import "server-only";

export type AccountPlan = "free" | "premium";

export const PLAN_ENTITLEMENTS: Record<AccountPlan, {
    label: string;
    maxTextDurationMinutes: number;
    maxLiveDurationMinutes: number;
    extraVoiceQuestions: number;
    feedbackDiscussionQuestions: number;
    dailyAiRequests: number;
}> = {
    free: {
        label: "Free",
        maxTextDurationMinutes: 10,
        // Gemini Live may reset its WebSocket after roughly ten minutes. Keep
        // both plans inside the reliable limit until session resumption ships.
        maxLiveDurationMinutes: 10,
        extraVoiceQuestions: 2,
        feedbackDiscussionQuestions: 20,
        dailyAiRequests: 12,
    },
    premium: {
        label: "Premium",
        maxTextDurationMinutes: 25,
        maxLiveDurationMinutes: 10,
        extraVoiceQuestions: 8,
        feedbackDiscussionQuestions: 60,
        dailyAiRequests: 60,
    },
};

export function normalizeAccountPlan(value: unknown): AccountPlan {
    return value === "premium" ? "premium" : "free";
}

export function getPlanEntitlements(value: unknown) {
    const plan = normalizeAccountPlan(value);
    return { plan, ...PLAN_ENTITLEMENTS[plan] };
}

export function isPremiumAdminEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    const allowlist = (process.env.PREMIUM_ADMIN_EMAILS || "")
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    return allowlist.includes(email.trim().toLowerCase());
}
