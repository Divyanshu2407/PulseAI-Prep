import { ReactNode } from 'react'
import Link from "next/link";
import Image from "next/image";
import {isAuthenticated} from "@/lib/actions/auth.action";
import SignOutButton from "@/Components/SignOutButton";
import { redirect } from "next/navigation";


const RootLayout = async ({children}: {children : ReactNode})  => {
    const isUserAuthenticated = await isAuthenticated();
    if (!isUserAuthenticated) redirect('/sign-in');
    return (
        <div className = "root-layout">
            <nav className="flex min-h-14 items-center justify-between border-b border-white/10 px-1 pb-3">
                <Link href="/" aria-label="PulseAI Prep home" className="flex min-w-0 items-center">
                    <Image src="/pulseai-prep-lockup.svg" alt="PulseAI Prep — AI interview practice" width={230} height={70} className="h-auto w-[min(52vw,230px)] object-contain" priority />
                </Link>

                <SignOutButton />
            </nav>
                    {children}
            </div>
    )
}
export default RootLayout
