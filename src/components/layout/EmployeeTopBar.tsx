import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { ProfileRow } from "@/types/database";
import { initials } from "@/lib/utils/format";

const NAV_ITEMS = [
  { href: "/employee", label: "Today" },
  { href: "/employee/profile", label: "Profile" },
] as const;

export function EmployeeTopBar({ profile }: { profile: ProfileRow }) {
  return (
    <header className="sticky top-0 z-10 border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-medium text-teal-700">
            {initials(profile.full_name)}
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-ink-400 hover:text-ink-800">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
