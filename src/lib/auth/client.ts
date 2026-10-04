import { createClient } from "@/lib/supabase/client";
import type { EmployeeRow, ProfileRow } from "@/types/database";

export interface CurrentUser {
  authId: string;
  profile: ProfileRow;
  employee: EmployeeRow | null;
}

/**
 * Synchronizes the client-side session (from localStorage) with the server-side cookies.
 * This is critical for Capacitor/Android environments where cookies might be lost on restart
 * but localStorage persists. Calling getSession() and getUser() triggers the @supabase/ssr
 * client to refresh the session and update the browser cookies.
 */
export async function syncSession(): Promise<boolean> {
  const supabase = createClient();

  try {
    console.log("[syncSession] Attempting to sync session...");

    // 1. Trigger a session get to load from localStorage
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[syncSession] getSession error:", sessionError);
      return false;
    }

    if (!session) {
      console.warn("[syncSession] No session found in localStorage");
      return false;
    }

    console.log("[syncSession] Session found in localStorage, verifying with server...");

    // 2. Verify the session with the server to ensure it's valid and refresh the cookie
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("[syncSession] getUser error (session might be expired):", userError);
      return false;
    }

    if (!user) {
      console.warn("[syncSession] No user returned from getUser()");
      return false;
    }

    console.log("[syncSession] Session successfully synced and verified for user:", user.id);
    return true;
  } catch (error) {
    console.error("[syncSession] Critical error during sync:", error);
    return false;
  }
}

/**
 * Resolves the signed-in user's profile + employee record on the client side.
 * This is the client-side equivalent of getCurrentUser from @/lib/auth/session.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();

  // Use getUser() which is more secure and verifies the session with the server
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Client auth session missing:", authError);
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile fetch error:", profileError);
    return null;
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { authId: user.id, profile, employee: employee ?? null };
}

/**
 * Throws-based variant for client-side validation.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("requireUser() called with no session. Please log in again.");
  }
  return user;
}
