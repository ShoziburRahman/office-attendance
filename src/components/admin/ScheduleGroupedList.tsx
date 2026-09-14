"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteEmployeeSchedule } from "@/app/admin/employees/actions";
import { EmployeeGroupedList } from "./EmployeeGroupedList";

interface ScheduleRowProps {
  s: any;
  index: number;
  employeeName: string;
  onDeleteSuccess: () => void;
  onDeleteError: (err: string) => void;
}

function ScheduleRow({ s, index, employeeName, onDeleteSuccess, onDeleteError }: ScheduleRowProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

  const getStatus = (from: string, until: string | null) => {
    if (currentOfficeDate < from) return { label: "Future", tone: "neutral" as any };
    if (until === null || currentOfficeDate < until) return { label: "Active", tone: "present" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  const status = getStatus(s.effective_from, s.effective_until);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEmployeeSchedule(s.id);
      setIsConfirming(false);
      onDeleteSuccess();
      router.refresh();
    } catch (error: any) {
      onDeleteError(error.message || "Failed to delete schedule.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <td className="px-3 py-2 whitespace-nowrap">
        {s.effective_from} {s.effective_until ? ` → ${s.effective_until}` : " → Present"}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {s.start_time} {s.end_time}
      </td>
      <td className="px-3 py-2">{s.required_minutes}m</td>
      <td className="px-3 py-2">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/employees/${s.employee.id}`}
            className="text-xs text-teal-600 hover:underline"
          >
            Edit
          </Link>
          <button
            onClick={() => setIsConfirming(true)}
            className="text-xs text-status-late hover:underline"
          >
            Delete
          </button>
        </div>
      </td>

      <Dialog
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        title="Delete Work Schedule"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Are you sure you want to delete the work schedule for{" "}
            <span className="font-semibold text-ink-900">{employeeName}</span>?
          </p>
          <div className="bg-ink-50 p-3 rounded border border-ink-100 text-xs text-ink-500 space-y-1">
            <p><strong>Period:</strong> {s.effective_from} {s.effective_until ? ` → ${s.effective_until}` : " → Present"}</p>
            <p><strong>Shift:</strong> {s.start_time} - {s.end_time}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsConfirming(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Schedule"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

const ScheduleHeaderSummary = (active: any) => {
  if (!active) return <span className="text-ink-400 italic">No active schedule</span>;
  return (
    <span className="flex items-center gap-2">
      <Badge tone="present" className="text-[10px] px-1 py-0">Active</Badge>
      {active.start_time} - {active.end_time}
    </span>
  );
};

const ScheduleTableHeaders = () => (
  <>
    <th className="px-3 py-2 font-medium">Period</th>
    <th className="px-3 py-2 font-medium">Shift</th>
    <th className="px-3 py-2 font-medium">Req. Min</th>
    <th className="px-3 py-2 font-medium">Status</th>
    <th className="px-3 py-2 font-medium">Action</th>
  </>
);

export function ScheduleGroupedList({ groupedData }: { groupedData: any }) {
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showAlert = (message: string, type: "success" | "error") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="space-y-4">
      {alert && (
        <div className={`p-3 rounded-md text-sm font-medium ${
          alert.type === "success"
            ? "bg-teal-50 text-teal-700 border border-teal-100"
            : "bg-red-50 text-status-late border border-red-100"
        }`}>
          {alert.message}
        </div>
      )}

      <EmployeeGroupedList
        groupedData={groupedData}
        renderHeaderSummary={ScheduleHeaderSummary}
        renderTableHeaders={ScheduleTableHeaders}
        renderTableRow={(s, idx) => (
          <ScheduleRow
            s={s}
            index={idx}
            employeeName={groupedData[s.employee.id].employeeName}
            onDeleteSuccess={() => showAlert("Schedule deleted successfully.", "success")}
            onDeleteError={(err) => showAlert(err, "error")}
          />
        )}
      />
    </div>
  );
}
