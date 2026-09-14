import { redirect } from "next/navigation";
import { EmployeeTopBar } from "@/components/layout/EmployeeTopBar";
import { getCurrentUser } from "@/lib/auth/session";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.profile.role !== "EMPLOYEE") {
    redirect("/login");
  }

  if (!user.employee) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 text-center">
        <p className="max-w-sm text-sm text-ink-600">
          Your account isn&apos;t fully set up yet. Ask your admin to check your employee record.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <EmployeeTopBar profile={user.profile} />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
