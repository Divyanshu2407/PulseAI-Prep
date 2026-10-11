"use client"

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/Firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { signIn, signUp } from "@/lib/actions/auth.action";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/Components/ui/form";
import { FormField } from "@/Components/ui/form";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";

const authFormSchema = (type: FormType) => {
    return z.object({
        name: type === 'sign-up' ?
            z.string().trim().min(3).max(80, "Name must be 80 characters or fewer") :
            z.string().optional(),
        email: z.string().email(),
        password: z.string().min(6, "Password should be at least 6 characters"),
    })
}

const AuthForm = ({ type }:{ type : FormType}) => {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const formSchema = authFormSchema(type)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    })

    const isSignIn = type === "sign-in"

    // Submit handler
   async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "sign-up") {

                const {name, email, password} = values;

                const userCredential = await createUserWithEmailAndPassword( auth, email, password);
                const idToken = await userCredential.user.getIdToken();

                const result = await signUp({
                    uid: userCredential.user.uid,
                    name: name ?? "",
                    email,
                    idToken,
                });

                if(!result?.success){
                    toast.error(`Registration failed: ${result?.message || "Unknown error."}`);
                    return;
                }

                toast.success(`Account created successfully. Please sign in.`)
                router.push('/sign-in')
            } else {
                const{ email, password } = values;

                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                const idToken = await userCredential.user.getIdToken();

                if(!idToken){
                    toast.error('Sign-in failed. Please try again.')
                    return;
                }
                const result = await signIn({
                    email, idToken
                })

                if (!result?.success) {
                    toast.error(result?.message || "Sign-in failed.");
                    return;
                }

                toast.success(`Signed in successfully.`)
                router.push('/')
            }
        } catch (error: unknown) {
            console.error("Auth error:", error);
            const code = error instanceof FirebaseError ? error.code : "";

            // Error messages
            let message = "Something went wrong. Please try again.";
            if (code === "auth/email-already-in-use") {
                message = "Email is already in use. Try signing in instead.";
            } else if (code === "auth/invalid-email") {
                message = "Invalid email address.";
            } else if (code === "auth/user-not-found") {
                message = "No user found with this email.";
            } else if (code === "auth/wrong-password") {
                message = "Incorrect password.";
            } else if (code === "auth/weak-password") {
                message = "Password should be at least 6 characters.";
            }

            toast.error(message);
        }
    };


    return (
        <div className="app-card-shell w-full max-w-lg">
            <div className="app-card-surface flex flex-col gap-6 px-6 py-8 sm:gap-8 sm:px-10 sm:py-10">
                <header className="flex flex-col items-center text-center">
                    <Image src="/pulseai-prep-lockup.svg" alt="PulseAI Prep — AI interview practice" height={104} width={340} className="h-auto w-[min(100%,340px)] object-contain" priority />
                    <h1 className="mt-6 bg-gradient-to-r from-purple-200 to-pink-400 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
                        {isSignIn ? "Welcome back" : "Create your account"}
                    </h1>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                        Practice interviews and build confidence with every answer.
                    </p>
                </header>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="form w-full space-y-5">
                        {!isSignIn && (
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-white/80">Name</FormLabel>
                                        <FormControl>
                                            <Input autoComplete="name" placeholder="Your name" className="mt-2 h-11 rounded-xl border-white/15 bg-black/20 px-4 text-white placeholder:text-white/35" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium text-white/80">Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            className="mt-2 h-11 rounded-xl border-white/15 bg-black/20 px-4 text-white placeholder:text-white/35"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium text-white/80">Password</FormLabel>
                                    <div className="relative mt-2">
                                        <FormControl>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                autoComplete={isSignIn ? "current-password" : "new-password"}
                                                placeholder="Enter your password"
                                                className="h-11 rounded-xl border-white/15 bg-black/20 px-4 pr-12 text-white placeholder:text-white/35"
                                                {...field}
                                            />
                                        </FormControl>
                                        <button
                                            type="button"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            aria-pressed={showPassword}
                                            onClick={() => setShowPassword((visible) => !visible)}
                                            className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-lg text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                                        >
                                            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isSignIn && (
                            <div className="text-right">
                                <Link
                                    href="/sign-in/forgot-password"
                                    className="text-sm font-medium text-purple-200 underline-offset-4 hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        )}


                        <Button type="submit" disabled={form.formState.isSubmitting}
                            className="min-h-11 w-full rounded-full bg-gradient-to-r from-purple-200 to-pink-400 font-semibold text-black shadow-md hover:brightness-105 active:brightness-95">
                            {form.formState.isSubmitting
                                ? (isSignIn ? "Signing in…" : "Creating account…")
                                : (isSignIn ? "Sign in" : "Create account")}
                        </Button>
                    </form>
                </Form>

                <p className="text-center text-sm text-white/60">
                    {isSignIn ? "New to PulseAI Prep?" : "Already have an account?"}
                    <Link href={!isSignIn ? '/sign-in' : '/sign-up'} className="ml-1 font-semibold text-purple-200 underline-offset-4 hover:underline">
                        {!isSignIn ? "Sign in" : "Create account"}
                    </Link>
                </p>
                <p className="text-center text-xs text-white/40">
                    Made with{" "}
                    <span className="group">
                        <span role="img" aria-label="love" className="inline-block text-pink-300 transition-transform duration-200 group-hover:scale-125 group-hover:animate-pulse">❤️</span>{" "}
                        by{" "}
                        <span className="font-medium text-white/55 transition-colors duration-200 group-hover:text-pink-300">Divyanshu</span>
                    </span>
                </p>
            </div>
        </div>
    )
}

export default AuthForm
