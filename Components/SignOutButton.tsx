"use client";

import { signOut as signOutFirebase } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/Firebase/client";
import { signOut as clearSessionCookie } from "@/lib/actions/auth.action";
import { Button } from "@/Components/ui/button";

export default function SignOutButton() {
    const router = useRouter();

    async function handleSignOut() {
        await Promise.all([signOutFirebase(auth), clearSessionCookie()]);
        router.replace("/sign-in");
        router.refresh();
    }

    return <Button type="button" onClick={handleSignOut} className="h-12 min-w-32 shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-semibold text-white shadow-md hover:bg-white/[0.1]">Log out</Button>;
}
