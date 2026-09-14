"use client";

import { EmployeeGroupedList } from "./EmployeeGroupedList";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const LeaveHeaderSummary = (active: any) => {
  if (!active) return <span className="text-ink-400 italic">No active leave today</span>;
  return (
    <span className="flex items-center gap-2">
      <Badge tone="present" className="text-[10px] px-1 py-0">Active</Badge>
      {active.leave_type}
    </span>
  );
};

const LeaveTableHeaders = () => (
  <>
    <th className="px-3 py-2 font-medium">Date</th>
    <th className="px-3 py-2 font-medium">Type</th>
    <th className="px-3 py-2 font-medium">Reason</th>
    <th className="px-3 py-2 font-medium">Worked?</th>
    <th className="px-3 py-2 font-medium">Status</th>
    <th className="px-3 py-2 font-medium">Action</th>
  </>
);

const LeaveTableRow = (l: any, index: number) => {
  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

  const getStatus = (date: string) => {
    if (date === currentOfficeDate) return { label: "Active", tone: "present" as any };
    if (currentOfficeDate < date) return { label: "Future", tone: "neutral" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  const status = getStatus(l.leave_date);

  return (
    <>
      <td className="px-3 py-2 whitespace-nowrap">{l.leave_date}</td>
      <td className="px-3 py-2">
        <Badge tone={l.leave_type === "PAID" ? "present" : "neutral"}>
          {l.leave_type}
        </Badge>
      </td>
      <td className="px-3 py-2 text-ink-600">{l.reason || "N/A"}</td>
      <td className="px-3 py-2">
        {l.worked_on_leave ? (
          <span className="text-xs text-teal-600 font-medium">Yes</span>
        ) : (
          <span className="text-xs text-ink-400">No</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/admin/employees/${l.employee.id}`}
          className="text-xs text-teal-600 hover:underline"
        >
          Edit
        </Link>
      </td>
    </>
  );
};

export function LeaveGroupedList({ groupedData }: { groupedData: any }) {
  return (
    <EmployeeGroupedList
      groupedData={groupedData}
      renderHeaderSummary={LeaveHeaderSummary}
      renderTableHeaders={LeaveTableHeaders}
      renderTableRow={LeaveTableRow}
    />
  );
}
