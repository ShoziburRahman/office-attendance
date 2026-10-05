import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  try {
    console.log(`[RootPage] Checking session for GET /`);
    const user = await getCurrentUser();
    console.log(`[RootPage] getUser() result: ${user ? `FOUND (User ID: ${user.authId}, Role: ${user.profile.role})` : "NOT FOUND"}`);

    if (!user) {
      // Do NOT redirect to /login here.
      // We return a simple page that allows the client-side AuthProvider to take over.
      return (
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (user.profile.role === "ADMIN") {
      console.log(`[RootPage] Admin detected -> Redirecting to /admin`);
      redirect("/admin");
    } else {
      console.log(`[RootPage] Employee detected -> Redirecting to /employee`);
      redirect("/employee");
    }
  } catch (error) {
    console.log(`[RootPage] Error during session check:`, error);
    // Instead of redirecting to login, show the loading state to let client-side recovery try first
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
}
