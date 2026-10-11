"use server";

import { auth, db } from "@/Firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { isPremiumAdminEmail, normalizeAccountPlan } from "@/lib/entitlements";
import admin from "firebase-admin";
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function normalizeCoupon(value: string) {
    return value.trim().toUpperCase();
}

function couponMatches(candidate: string, configured: string) {
    const candidateDigest = createHash("sha256").update(candidate).digest();
    const configuredDigest = createHash("sha256").update(configured).digest();
    return timingSafeEqual(candidateDigest, configuredDigest);
}

export async function redeemPremiumCoupon(input: { code: string }) {
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "Sign in to activate a Premium coupon." };

    const parsed = z.object({ code: z.string().trim().min(7).max(128) }).safeParse(input);
    if (!parsed.success) return { success: false, error: "Coupon codes must be at least 7 characters." };

    const configuredCode = process.env.PREMIUM_COUPON_CODE;
    if (!configuredCode?.trim() || normalizeCoupon(configuredCode).length < 7) {
        return { success: false, error: "Premium coupon activation is not configured yet." };
    }

    const submittedCode = normalizeCoupon(parsed.data.code);
    const expectedCode = normalizeCoupon(configuredCode);
    if (!couponMatches(submittedCode, expectedCode)) {
        return { success: false, error: "That coupon code is not valid." };
    }

    const profileRef = db.collection("users").doc(caller.id);
    const couponId = createHash("sha256").update(expectedCode).digest("hex");
    const redemptionRef = profileRef.collection("couponRedemptions").doc(couponId);

    try {
        const redemptionState = await db.runTransaction(async (transaction) => {
            const [profile, redemption] = await Promise.all([
                transaction.get(profileRef),
                transaction.get(redemptionRef),
            ]);
            if (!profile.exists) return "missing-profile" as const;

            if (!redemption.exists) {
                transaction.set(redemptionRef, {
                    couponId,
                    redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
                    source: "premium-coupon",
                });
            }
            transaction.set(profileRef, {
                plan: "premium",
                planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                planUpdatedBy: "premium-coupon",
            }, { merge: true });
            return redemption.exists ? "already-redeemed" as const : "redeemed" as const;
        });

        if (redemptionState === "missing-profile") {
            return { success: false, error: "Complete account setup before redeeming a coupon." };
        }

        // Firebase Auth custom claims are the source of truth for plan access.
        // Keep this idempotent so a retry can repair the claim if Auth was
        // temporarily unavailable after the Firestore transaction succeeded.
        const authUser = await auth.getUser(caller.id);
        await auth.setCustomUserClaims(caller.id, {
            ...authUser.customClaims,
            plan: "premium",
            premiumCouponId: couponId,
        });
        revalidatePath("/");

        return {
            success: true,
            message: redemptionState === "already-redeemed"
                ? "Premium is active on your account."
                : "Coupon accepted. Premium is now active on your account.",
        };
    } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
        console.error("Premium coupon redemption failed:", code);
        return {
            success: false,
            error: "The coupon could not be activated right now. If you entered a valid code, submit it again in a moment.",
        };
    }
}

export async function setAccountPlanByEmail(input: { email: string; plan: "free" | "premium" }) {
    const caller = await getCurrentUser();
    if (!caller || !isPremiumAdminEmail(caller.email)) {
        return { success: false, error: "Only a configured plan administrator can change account access." };
    }

    const parsed = z.object({
        email: z.string().trim().email().max(254),
        plan: z.enum(["free", "premium"]),
    }).safeParse(input);
    if (!parsed.success) return { success: false, error: "Enter a valid account email." };

    try {
        const target = await auth.getUserByEmail(parsed.data.email);
        const profileRef = db.collection("users").doc(target.uid);
        const profile = await profileRef.get();
        if (!profile.exists) return { success: false, error: "That account has not completed PulseAI Prep sign-up." };

        const plan = normalizeAccountPlan(parsed.data.plan);
        await auth.setCustomUserClaims(target.uid, { ...target.customClaims, plan });
        await profileRef.set({
            plan,
            planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            planUpdatedBy: caller.id,
        }, { merge: true });

        revalidatePath("/");
        return { success: true, message: `${target.email || parsed.data.email} is now on the ${plan === "premium" ? "Premium" : "Free"} plan.` };
    } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
        console.error("Account plan update failed:", code);
        return { success: false, error: code === "auth/user-not-found" ? "No Firebase account was found for that email." : "Could not update the account plan." };
    }
}
