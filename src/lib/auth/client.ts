import { createClient } from "@/lib/supabase/client";
import type { EmployeeRow, ProfileRow } from "@/types/database";

export interface CurrentUser {
  authId: string;
  profile: ProfileRow;
  employee: EmployeeRow | null;
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
