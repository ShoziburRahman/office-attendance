import { createClient } from "@/lib/supabase/server";
import type { EmployeeRow, ProfileRow } from "@/types/database";

export interface CurrentUser {
  authId: string;
  profile: ProfileRow;
  /** Present only when the profile also has an employee record (all users
   * currently do, but this keeps the type honest if future roles are added
   * that aren't employees, e.g. a pure back-office admin). */
  employee: EmployeeRow | null;
}

/**
 * Resolves the signed-in user's profile + employee record for use in Server
 * Components, Server Actions, and Route Handlers. Returns null when there is
 * no session — callers decide whether that means "redirect to /login" or
 * "render a logged-out view".
 *
 * This performs real reads through the RLS-bound server client — a user can
 * only ever get their own profile back here, which is a useful sanity check
 * on top of the auth session itself.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  console.log("[getCurrentUser] Fetching auth user...");
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log(`[getCurrentUser] Auth user not found or error: ${authError?.message || "No user"}`);
    return null;
  }
  console.log(`[getCurrentUser] Auth user found: ${user.id}`);

  console.log(`[getCurrentUser] Fetching profile for ${user.id}...`);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() as any;

  if (profileError) {
    console.log(`[getCurrentUser] Profile error for ${user.id}: ${profileError.message}`);
    return null;
  }
  if (!profile) {
    console.log(`[getCurrentUser] Profile not found for ${user.id}`);
    return null;
  }
  console.log(`[getCurrentUser] Profile found: ${profile.role}`);

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { authId: user.id, profile, employee: employee ?? null };
}

/** Throws-based variant for pages that should never render without a session
 * — pair with middleware, which already redirects unauthenticated requests,
 * so reaching this branch means something is inconsistent (e.g. a deleted
 * profile) rather than "just log in". */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(
      "requireUser() called with no session — this should be unreachable behind middleware.",
    );
  }
  return user;
}
