"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { redeemPremiumCoupon, setAccountPlanByEmail } from "@/lib/actions/account.action";

type AccountPlanCardProps = {
    email: string;
    plan: "free" | "premium";
    isAdmin: boolean;
};

export default function AccountPlanCard({ email, plan, isAdmin }: AccountPlanCardProps) {
    const router = useRouter();
    const [targetEmail, setTargetEmail] = useState("");
    const [targetPlan, setTargetPlan] = useState<"free" | "premium">("premium");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponStatus, setCouponStatus] = useState("");
    const [redeeming, setRedeeming] = useState(false);

    const redeemCoupon = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setRedeeming(true);
        setCouponStatus("");
        try {
            const result = await redeemPremiumCoupon({ code: couponCode });
            setCouponStatus(result.success ? result.message || "Premium is active." : result.error || "Could not activate this coupon.");
            if (result.success) {
                setCouponCode("");
                router.refresh();
            }
        } catch {
            setCouponStatus("Could not activate this coupon. Please try again.");
        } finally {
            setRedeeming(false);
        }
    };

    const updatePlan = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setStatus("");
        try {
            const result = await setAccountPlanByEmail({ email: targetEmail, plan: targetPlan });
            setStatus(result.success ? result.message || "Plan updated." : result.error || "Could not update this plan.");
            if (result.success) {
                setTargetEmail("");
                router.refresh();
            }
        } catch {
            setStatus("Could not update this plan. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <details id="account-plan" className="app-content-card group mt-5 overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl border text-pink-50 ${plan === "premium" ? "border-pink-100/35 bg-gradient-to-br from-purple-300/40 to-pink-300/40 shadow-[0_0_22px_rgba(244,114,182,0.18)]" : "border-pink-200/15 bg-pink-300/[0.08] text-pink-100"}`}><Crown size={17} aria-hidden="true" /></span>
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{plan === "premium" ? "Premium account" : "Free account"}</span>
                        <span className="mt-0.5 block text-xs text-white/50">{plan === "premium" ? "60 daily AI requests · up to 25-minute text practice" : "12 daily AI requests · up to 10-minute text practice"}</span>
                    </span>
                </span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-white/55 transition-transform group-open:rotate-180" />
            </summary>

            <div className="space-y-4 border-t border-white/10 p-4 sm:p-5">
                {plan === "premium" ? (
                    <section className="relative overflow-hidden rounded-2xl border border-pink-200/35 bg-gradient-to-br from-pink-300/[0.13] via-purple-300/[0.08] to-white/[0.035] p-4 shadow-[0_16px_48px_rgba(217,70,180,0.10)] sm:p-5" aria-labelledby="active-premium-heading">
                        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-pink-300/15 blur-3xl" />
                        <div className="relative">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-pink-100/25 bg-gradient-to-br from-purple-200/15 to-pink-200/20 text-pink-100 shadow-[0_0_20px_rgba(244,114,182,0.10)]"><Sparkles size={16} aria-hidden="true" /></span>
                                    <div>
                                        <h2 id="active-premium-heading" className="font-semibold text-white">Premium</h2>
                                        <p className="mt-0.5 text-[11px] text-white/50">More room to practice and reflect</p>
                                    </div>
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-pink-100/30 bg-pink-200/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-pink-100"><Check size={12} aria-hidden="true" />Active</span>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {[
                                    ["60 daily AI requests", "5× the Free allowance"],
                                    ["25-minute text practice", "Free includes up to 10 minutes"],
                                    ["Up to 8 extra voice questions", "Free includes up to 2"],
                                    ["60 feedback-coach questions", "Free includes up to 20 per report"],
                                ].map(([title, detail]) => <div key={title} className="rounded-xl border border-white/[0.08] bg-black/[0.12] px-3 py-2.5">
                                    <p className="text-sm font-semibold text-white/90">{title}</p>
                                    <p className="mt-0.5 text-xs text-white/50">{detail}</p>
                                </div>)}
                            </div>
                            <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-pink-100/15 bg-pink-200/[0.05] px-3 py-2.5">
                                <Sparkles size={15} className="mt-0.5 shrink-0 text-pink-200" aria-hidden="true" />
                                <div><p className="text-sm font-semibold text-white/85">Skill-by-skill progress</p><p className="mt-0.5 text-xs text-white/50">Compare competency scores across up to 5 matching interviews.</p></div>
                            </div>
                            <details className="mt-3 rounded-xl border border-white/10 bg-black/[0.12]">
                                <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-white/70 marker:text-pink-200">Compare with Free</summary>
                                <ul className="grid gap-2 border-t border-white/10 p-3 text-xs leading-5 text-white/60 sm:grid-cols-2">
                                    {["12 Gemini requests each day", "Up to 10 minutes of text practice", "2 requested extra voice questions", "20 feedback-coach questions per report"].map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-white/35" aria-hidden="true" /><span>{feature}</span></li>)}
                                </ul>
                            </details>
                        </div>
                    </section>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <section className="rounded-2xl border border-purple-200/25 bg-purple-300/[0.06] p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div><h2 className="font-semibold text-white">Free</h2><p className="mt-0.5 text-[11px] text-white/45">Core practice essentials</p></div>
                                    <span className="shrink-0 rounded-full border border-purple-200/20 bg-purple-200/[0.06] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-100">Active</span>
                                </div>
                                <p className="mt-3 text-xs leading-5 text-white/55">12 daily AI requests · up to 10 minutes of text practice</p>
                                <details className="mt-3 rounded-xl border border-white/10 bg-black/[0.12]">
                                    <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-white/70 marker:text-purple-200">Free plan details</summary>
                                    <ul className="grid gap-2 border-t border-white/10 p-3 text-xs leading-5 text-white/65">
                                        {["12 Gemini requests each day", "Up to 10 minutes of text practice", "10-minute Gemini Live voice sessions", "2 requested extra voice questions", "20 feedback-coach questions per report"].map((feature) => <li key={feature} className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2"><Check size={14} className="mt-0.5 shrink-0 text-purple-200" aria-hidden="true" /><span>{feature}</span></li>)}
                                    </ul>
                                </details>
                            </section>

                            <section className="relative overflow-hidden rounded-2xl border border-pink-200/35 bg-gradient-to-br from-pink-300/[0.13] via-purple-300/[0.08] to-white/[0.035] p-4 shadow-[0_16px_48px_rgba(217,70,180,0.10)] sm:p-5">
                                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-pink-300/15 blur-3xl" />
                                <div className="relative">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-pink-100/25 bg-gradient-to-br from-purple-200/15 to-pink-200/20 text-pink-100"><Sparkles size={16} aria-hidden="true" /></span>
                                            <div><h2 className="font-semibold text-white">Premium</h2><p className="mt-0.5 text-[11px] text-white/45">More room to practice and reflect</p></div>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs leading-5 text-white/55">60 daily AI requests · up to 25 minutes of text practice</p>
                                    <details className="mt-3 rounded-xl border border-white/10 bg-black/[0.12]">
                                        <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-white/70 marker:text-pink-200">Premium features</summary>
                                        <ul className="grid gap-2 border-t border-white/10 p-3 text-xs leading-5 text-white/65">
                                            {["60 Gemini requests each day", "Up to 25 minutes of text practice", "8 requested extra voice questions", "60 feedback-coach questions per report", "Skill trends across matching interviews"].map((feature) => <li key={feature} className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2"><Check size={14} className="mt-0.5 shrink-0 text-pink-200" aria-hidden="true" /><span>{feature}</span></li>)}
                                        </ul>
                                    </details>
                                </div>
                            </section>
                        </div>

                        <section className="rounded-2xl border border-pink-200/15 bg-pink-300/[0.035] p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold text-white">Unlock Premium with a coupon</h2>
                                <p className="text-xs text-white/45">Paid checkout isn’t available yet</p>
                            </div>
                            <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-white/50 marker:text-pink-200">Coupon details</summary>
                                <p className="mt-1 text-xs leading-5 text-white/55">Enter your custom code to activate these features on your account. Each account can redeem it once.</p>
                            </details>
                            <form onSubmit={redeemCoupon} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <label className="sr-only" htmlFor="premium-coupon-code">Premium coupon code</label>
                                <input id="premium-coupon-code" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={128} value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="h-10 min-w-0 rounded-xl border border-white/15 bg-black/20 px-3 text-sm uppercase tracking-wide text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
                                <button type="submit" disabled={redeeming || !couponCode.trim()} className="min-h-10 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-4 text-sm font-bold text-[#17121d] disabled:cursor-wait disabled:opacity-60">{redeeming ? "Activating…" : "Activate Premium"}</button>
                            </form>
                            {couponStatus && <p role="status" className="mt-2 text-xs text-white/70">{couponStatus}</p>}
                        </section>
                    </>
                )}

                <details className="rounded-xl border border-white/10 bg-white/[0.02]">
                    <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-white/60 marker:text-pink-200">Voice and usage limits</summary>
                    <p className="border-t border-white/10 px-3 py-3 text-xs leading-5 text-white/50">Gemini Live voice sessions are limited to 10 minutes on both plans. Daily AI request allowances reset at midnight UTC.</p>
                </details>

                {isAdmin && <section className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck size={16} className="text-emerald-200" aria-hidden="true" />Plan administrator</div>
                    <p className="mt-1 text-xs leading-5 text-white/50">Signed in as {email}. Assign or remove Premium for an existing PulseAI Prep account.</p>
                    <form onSubmit={updatePlan} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <label className="sr-only" htmlFor="plan-target-email">Account email</label>
                        <input id="plan-target-email" type="email" required maxLength={254} value={targetEmail} onChange={(event) => setTargetEmail(event.target.value)} placeholder="Account email" className="h-10 min-w-0 rounded-xl border border-white/15 bg-black/20 px-3 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" />
                        <label className="sr-only" htmlFor="plan-target-value">Plan to assign</label>
                        <select id="plan-target-value" value={targetPlan} onChange={(event) => setTargetPlan(event.target.value as "free" | "premium")} className="h-10 rounded-xl border border-white/15 bg-[#17131f] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300">
                            <option value="premium">Premium</option>
                            <option value="free">Free</option>
                        </select>
                        <button type="submit" disabled={busy || !targetEmail.trim()} className="min-h-10 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-4 text-sm font-bold text-[#17121d] disabled:cursor-wait disabled:opacity-60">{busy ? "Saving…" : "Update plan"}</button>
                    </form>
                    {status && <p role="status" className="mt-2 text-xs text-white/70">{status}</p>}
                </section>}
            </div>
        </details>
    );
}
