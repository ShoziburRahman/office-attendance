import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { ProfileRow } from "@/types/database";
import { initials } from "@/lib/utils/format";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/schedules", label: "Work Schedules" },
  { href: "/admin/weekly-off", label: "Weekly Off" },
  { href: "/admin/leave", label: "Leave Management" },
  { href: "/admin/wfh", label: "WFH Requests" },
  { href: "/admin/office-qr", label: "Office QR Code" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
] as const;

/**
 * Navigation items for the Admin panel.
 */
export function AdminSidebar({ profile }: { profile: ProfileRow }) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-ink-100 bg-white">
      <div className="border-b border-ink-100 px-5 py-4">
        <p className="text-sm font-semibold text-ink-900">Office Attendance</p>
        <p className="text-xs text-ink-400">Admin</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-ink-100 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-sm font-medium text-teal-700">
          {initials(profile.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{profile.full_name}</p>
          <form action={signOut}>
            <button type="submit" className="text-xs text-ink-400 hover:text-ink-800">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
