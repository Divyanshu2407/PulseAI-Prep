import "server-only";

import { db } from "@/Firebase/admin";
import { getPlanEntitlements } from "@/lib/entitlements";
import admin from "firebase-admin";

export async function reserveAiUsage(userId: string, planValue: unknown) {
    const { plan, dailyAiRequests } = getPlanEntitlements(planValue);
    const day = new Date().toISOString().slice(0, 10);
    const usageRef = db.collection("users").doc(userId).collection("dailyAiUsage").doc(day);

    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(usageRef);
        const used = Math.max(0, Number(snapshot.data()?.used) || 0);
        if (used >= dailyAiRequests) {
            return { allowed: false, used, limit: dailyAiRequests, plan, day };
        }

        const nextUsed = used + 1;
        transaction.set(usageRef, {
            day,
            used: nextUsed,
            limit: dailyAiRequests,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { allowed: true, used: nextUsed, limit: dailyAiRequests, plan, day };
    });
}

export function aiUsageLimitMessage(planValue: unknown, limit: number) {
    const plan = getPlanEntitlements(planValue).plan;
    return plan === "premium"
        ? `You have used today's Premium AI allowance (${limit} requests). It resets at midnight UTC.`
        : `You have used today's Free AI allowance (${limit} requests). It resets at midnight UTC; Premium includes a larger daily allowance.`;
}
