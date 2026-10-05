"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, syncSession, type CurrentUser } from "@/lib/auth/client";

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<'restoring' | 'authenticated' | 'unauthenticated'>('restoring');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    async function initAuth() {
      try {
        console.log("[AuthProvider] Initializing auth flow...");

        // 1. Attempt to sync session from native storage to cookies
        const synced = await syncSession();
        console.log("[AuthProvider] syncSession result:", synced);

        // 2. Resolve the current user (profile + employee)
        const currentUser = await getCurrentUser();
        console.log("[AuthProvider] getCurrentUser result:", currentUser ? "found" : "not found");

        if (currentUser) {
          setUser(currentUser);
          setStatus('authenticated');
        } else {
          console.warn("[AuthProvider] No user found after sync. Redirecting to login...");
          setStatus('unauthenticated');
          // ONLY redirect to login if we are NOT already on the login page
          if (pathname !== "/login") {
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("[AuthProvider] Auth initialization error:", error);
        setStatus('unauthenticated');
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    }

    initAuth();
  }, []); // Removed [pathname] dependency to prevent loop on redirect

  return (
    <AuthContext.Provider value={{ user, isLoading: status === 'restoring' }}>
      {!mounted || status === 'restoring' ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium text-gray-600">Restoring session...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
