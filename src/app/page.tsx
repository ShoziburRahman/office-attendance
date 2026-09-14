import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RootPage() {
  try {
    console.log(`[RootPage] Checking session for GET /`);
    const user = await getCurrentUser();
    console.log(`[RootPage] getUser() result: ${user ? `FOUND (User ID: ${user.authId}, Role: ${user.profile.role})` : "NOT FOUND"}`);

    if (!user) {
      console.log(`[RootPage] No user found -> Redirecting to /login`);
      redirect("/login");
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
    redirect("/login");
  }
}
