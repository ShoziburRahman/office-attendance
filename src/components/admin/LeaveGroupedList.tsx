"use client";

import { EmployeeGroupedList } from "./EmployeeGroupedList";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { deleteSingleLeave } from "@/app/admin/leave/actions";
import { useState } from "react";

const LeaveHeaderSummary = (active: any) => {
  if (!active) return <span className="text-ink-400 italic">No active leave today</span>;
  const typeName = active.leave_type?.name || active.leave_type || "Unknown";
  return (
    <span className="flex items-center gap-2">
      <Badge tone="present" className="text-[10px] px-1 py-0">Active</Badge>
      {typeName}
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

function LeaveTableRowComponent({ l, index }: { l: any, index: number }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

  const getStatus = (date: string) => {
    if (date === currentOfficeDate) return { label: "Active", tone: "present" as any };
    if (currentOfficeDate < date) return { label: "Future", tone: "neutral" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  const status = getStatus(l.leave_date);

  const handleDelete = async () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (!reason) return;

    if (!confirm(`Are you sure you want to delete this leave for ${l.employee?.profile?.full_name}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSingleLeave(l.id, reason);
      alert("Leave cancelled successfully.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <td className="px-3 py-2 whitespace-nowrap">{l.leave_date}</td>
      <td className="px-3 py-2">
        <Badge tone={l.leave_type?.is_paid || l.leave_type === "PAID" ? "present" : "neutral"}>
          {l.leave_type?.name || l.leave_type || "Unknown"}
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
      <td className="px-3 py-2 flex items-center gap-2">
        <Link
          href={`/admin/employees/${l.employee.id}`}
          className="text-xs text-teal-600 hover:underline"
        >
          Edit
        </Link>
        {status.label === "Future" ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-status-late hover:underline disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        ) : (
          <span
            className="text-[10px] text-ink-300 italic"
            title="Leave cannot be deleted after its start date"
          >
            Cannot Delete
          </span>
        )}
      </td>
    </>
  );
}

const LeaveTableRow = (l: any, index: number) => {
  return <LeaveTableRowComponent l={l} index={index} />;
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
