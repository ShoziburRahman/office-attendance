"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/client";

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
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    async function initAuth() {
      // Use a timeout to prevent hanging indefinitely if the network is slow/dead
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth initialization timed out")), 5000)
      );

      try {
        console.log("[AuthProvider] Checking current user...");
        await Promise.race([
          (async () => {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              setStatus('authenticated');
            } else {
              setStatus('unauthenticated');
              if (pathname !== "/login") {
                router.push("/login");
              }
            }
          })(),
          timeoutPromise,
        ]);
      } catch (error) {
        console.error("[AuthProvider] Auth error or timeout:", error);
        setStatus('unauthenticated');
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    }

    initAuth();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading: status === 'loading' }}>
      {(!mounted || status === 'loading') && pathname !== "/login" ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium text-gray-600">Loading...</p>
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
