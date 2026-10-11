'use server';

import { db, auth } from "@/Firebase/admin";
import { cookies } from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7;

function errorCode(error: unknown): string {
    return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "unknown";
}

export async function signUp(params: SignUpParams){
    const { uid, name, email, idToken } = params;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const displayName = typeof name === "string" ? name.trim().slice(0, 80) : "";

    try{
        if (!uid || !idToken || !displayName || !normalizedEmail) {
            return { success: false, message: "Enter valid account details and try again." };
        }
        const decodedToken = await auth.verifyIdToken(idToken, true);
        if (decodedToken.uid !== uid || decodedToken.email?.toLowerCase() !== normalizedEmail) {
            return { success: false, message: "Account details do not match the authenticated user." };
        }
        const authUser = await auth.getUser(uid);
        if (authUser.email?.toLowerCase() !== normalizedEmail) {
            return { success: false, message: "Account details do not match the authenticated user." };
        }
        const userRecord = await db.collection('users').doc(uid).get();

        if(userRecord.exists){
            return {
                success: false,
                message: `User already exists!`,
            };
        }
        const plan = authUser.customClaims?.plan === "premium" ? "premium" : "free";
        await auth.setCustomUserClaims(uid, { ...authUser.customClaims, plan });
        await db.collection('users').doc(uid).set({ name: displayName, email: normalizedEmail, plan });

        return {
        success: true,
        message: "Account created successfully. Please sign in.",
        };
    } catch (error: unknown) {
        const code = errorCode(error);
        console.error("Error creating user profile:", code);
        if(code === 'auth/email-already-exists'){
            return{
                success: false,
                message: "Email already exists",
            };
        }
        return {
            success: false,
            message: "Failed to create an account. Please sign in again.",
        };
    }
}

export async function signIn(params: SignInParams){
    const {email, idToken} = params;

    try {
        const userRecord = await auth.getUserByEmail(email);
        const decodedToken = await auth.verifyIdToken(idToken, true);
        if (decodedToken.uid !== userRecord.uid || decodedToken.email?.toLowerCase() !== email.toLowerCase()) {
            return {
                success: false,
                message: "Sign-in credentials do not match.",
            }
        };

        await setSessionCookie(idToken);
        return {
            success: true,
            message: `Successfully logged in!`,
        };

    } catch (error: unknown){
        console.error("Sign-in failed:", errorCode(error));

        return {
            success: false,
            message: "Failed to log into account. Please try again.",
        };
    }
}

export async function setSessionCookie(idToken: string){
    const cookieStore = await cookies();
try{
    const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: ONE_WEEK*1000,
    })

    cookieStore.set('session', sessionCookie, {
        maxAge: ONE_WEEK,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax'

    });
} catch(error){
    console.error("Error creating session cookie:", errorCode(error));
    throw new Error("Failed to create session cookie.");
}
}

export async function getCurrentUser(): Promise<User | null >{

    const cookieStore = await cookies();

     const sessionCookie  = cookieStore.get('session')?.value;
     if(!sessionCookie) return null;

     try{
         const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

         const [userRecord, authUser] = await Promise.all([
             db.collection('users').doc(decodedClaims.uid).get(),
             auth.getUser(decodedClaims.uid),
         ]);

         if(!userRecord.exists) return null;

         return{
             ...userRecord.data(),
             id: userRecord.id,
             // Account tier and administrator email come from Firebase Auth,
             // not client-editable profile fields.
             email: authUser.email || decodedClaims.email || "",
             plan: authUser.customClaims?.plan === "premium" ? "premium" : "free",
         } as User;


     }catch(error){
         console.warn("Could not verify the session cookie:", errorCode(error));

         return null;
     }
}

export async function isAuthenticated() {
    const user = await getCurrentUser();

    return !!user;
}

 // Sign Out (clear session cookie)
export async function signOut() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    return { success: true, message: "Signed out successfully." };
}
