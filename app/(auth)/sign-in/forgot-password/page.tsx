"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/Firebase/client";
import { Button } from "@/Components/ui/button";
import FormField from "@/Components/FormField";

export default function ForgotPasswordPage() {
    const form = useForm<{ email: string }>({ defaultValues: { email: "" } });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const onSubmit = async ({ email }: { email: string }) => {
        try {
            setLoading(true);
            setError(null);
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch {
            setError("We couldn’t send the reset email. Check the address and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="app-card-shell w-full max-w-lg">
            <div className="app-card-surface flex flex-col gap-6 px-6 py-8 sm:gap-8 sm:px-10 sm:py-10">
                <header className="flex flex-col items-center text-center">
                    <Image src="/pulseai-prep-lockup.svg" alt="PulseAI Prep — AI interview practice" height={104} width={340} className="h-auto w-[min(100%,340px)] object-contain" priority />
                    <h1 className="mt-6 bg-gradient-to-r from-purple-200 to-pink-400 bg-clip-text text-2xl font-semibold text-transparent">Reset your password</h1>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                        Enter the email address linked to your account and we’ll send a reset link if it exists.
                    </p>
                </header>

                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="form w-full space-y-5">
                        <FormField
                            control={form.control}
                            name="email"
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                        />

                        {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                        {success && (
                            <p role="status" aria-live="polite" className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                                If that email exists, a reset link has been sent. Check your inbox and spam folder.
                            </p>
                        )}

                        <Button type="submit" disabled={loading} className="min-h-11 w-full rounded-full bg-gradient-to-r from-purple-200 to-pink-400 font-semibold text-black shadow-md hover:brightness-105 active:brightness-95">
                            {loading ? "Sending reset link…" : "Send reset link"}
                        </Button>
                    </form>
                </FormProvider>

                <Link href="/sign-in" className="text-center text-sm font-medium text-purple-200 underline-offset-4 hover:underline">
                    Back to sign in
                </Link>
            </div>
        </section>
    );
}
