import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for use inside Server Components, Server
 * Actions, and Route Handlers. This is bound to the current user's session
 * cookie, so it is STILL subject to Row Level Security — it is not the
 * service-role client. Use this for everything except the one admin-only
 * user-creation path (see admin.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // In non-production environments (HTTP), we must ensure the 'Secure' flag is false
            // otherwise the browser will reject the cookie.
            const isProd = process.env.NODE_ENV === "production";
            cookieStore.set({
              name,
              value,
              ...options,
              secure: isProd
            });
          } catch {
            // Called from a Server Component during render — Next.js
            // forbids cookie writes there. Safe to ignore because the
            // session is refreshed in middleware on every request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            const isProd = process.env.NODE_ENV === "production";
            cookieStore.set({
              name,
              value: "",
              ...options,
              secure: isProd
            });
          } catch {
            // See note above.
          }
        },
      },
    },
  );
}
