import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "present" | "late" | "leave" | "wfh" | "off" | "missing";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-50 text-ink-600",
  present: "bg-teal-50 text-teal-700",
  late: "bg-red-50 text-status-late",
  leave: "bg-amber-50 text-status-leave",
  wfh: "bg-indigo-50 text-status-wfh",
  off: "bg-ink-50 text-ink-600",
  missing: "bg-red-50 text-status-missing",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
