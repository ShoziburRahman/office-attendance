import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. This BYPASSES Row Level Security entirely.
 *
 * `import "server-only"` guarantees a build-time failure if this module is
 * ever imported from client code.
 *
 * Use this ONLY for `supabase.auth.admin.*` calls (there is no self-service
 * sign-up in this app; only an admin can provision an employee's login).
 * Never use this client to read or write business tables (employees,
 * attendance, etc.) — those must always go through the RLS-bound server
 * client in server.ts so policies stay the single source of truth for who
 * can see or change what.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured — admin user creation is unavailable.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
