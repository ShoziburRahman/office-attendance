"use client";

import { EmployeeGroupedList } from "./EmployeeGroupedList";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const WeeklyOffHeaderSummary = (active: any) => {
  if (!active) return <span className="text-ink-400 italic">No active off-day</span>;
  const dayLabel = DAYS.find(d => d.value === String(active.day_of_week))?.label || "Unknown";
  return (
    <span className="flex items-center gap-2">
      <Badge tone="present" className="text-[10px] px-1 py-0">Active</Badge>
      {dayLabel}
    </span>
  );
};

const WeeklyOffTableHeaders = () => (
  <>
    <th className="px-3 py-2 font-medium">Off-Day</th>
    <th className="px-3 py-2 font-medium">Period</th>
    <th className="px-3 py-2 font-medium">Status</th>
    <th className="px-3 py-2 font-medium">Action</th>
  </>
);

const WeeklyOffTableRow = (off: any, index: number) => {
  const statusLabel = off.status?.label || "Historical";
  const statusTone = off.status?.tone || "neutral";

  return (
    <>
      <td className="px-3 py-2">
        {DAYS.find(d => d.value === String(off.day_of_week))?.label || `Day ${off.day_of_week}`}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {off.effective_from} {off.effective_until ? ` → ${off.effective_until}` : " → Present"}
      </td>
      <td className="px-3 py-2">
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/admin/employees/${off.employee.id}`}
          className="text-xs text-teal-600 hover:underline"
        >
          Edit
        </Link>
      </td>
    </>
  );
};

export function WeeklyOffGroupedList({ groupedData }: { groupedData: any }) {
  return (
    <EmployeeGroupedList
      groupedData={groupedData}
      renderHeaderSummary={WeeklyOffHeaderSummary}
      renderTableHeaders={WeeklyOffTableHeaders}
      renderTableRow={WeeklyOffTableRow}
    />
  );
}
