"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Preferences } from "@capacitor/preferences";
import type { Database } from "@/types/database";

/**
 * Custom storage adapter for Supabase that uses Capacitor Preferences.
 * This ensures that the session is stored in native Android preferences,
 * which are far more reliable than WebView localStorage or cookies.
 */
const CapacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client.
 * Configured to use Capacitor Preferences for native Android persistence.
 */
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: CapacitorStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }
    );
    console.log("[SupabaseClient] Browser client initialized with Native Capacitor Storage");
  }
  return client;
}
