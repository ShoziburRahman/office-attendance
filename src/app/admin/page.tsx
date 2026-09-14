import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  try {
    const user = await requireUser();

    const adminName = user.profile.full_name || "Admin";
    const firstName = adminName.split(" ")[0];

    return (
      <div className="max-w-4xl space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-white shadow-lg">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-teal-100">{firstName}</span>! 👋
            </h1>
            <p className="mt-2 text-teal-100/80 text-lg">
              You are logged in as the system administrator.
            </p>
          </div>
          {/* Decorative elements for "fancy" style */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl"></div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold text-ink-900">Quick Management</h2>
              <p className="text-sm text-ink-600 mb-4">
                Access key areas of the office attendance system quickly.
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/attendance" className="text-sm text-teal-600 hover:underline">
                  → Daily Attendance Dashboard
                </Link>
                <Link href="/admin/employees" className="text-sm text-teal-600 hover:underline">
                  → Employee Directory
                </Link>
                <Link href="/admin/schedules" className="text-sm text-teal-600 hover:underline">
                  → Work Schedules
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold text-ink-900">System Status</h2>
              <p className="text-sm text-ink-600">
                All attendance systems are operational.
                Check the <Link href="/admin/attendance" className="text-teal-600 font-medium ml-1 hover:underline">attendance dashboard</Link> for today's live status.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    return null; // Layout handles redirect
  }
}
