"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AttendanceCorrectionModal } from "@/components/admin/AttendanceCorrectionModal";
import { ForceCheckOutModal } from "@/components/admin/ForceCheckOutModal";
import type { AttendanceRow } from "@/types/database";

export function CorrectionTrigger({
  attendance,
  employeeName,
  employeeId,
  date
}: {
  attendance: AttendanceRow | null,
  employeeName: string,
  employeeId: string,
  date: string
}) {
  const [isCorrectOpen, setIsCorrectOpen] = useState(false);
  const [isForceOpen, setIsForceOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => setIsCorrectOpen(true)}>
        Correct
      </Button>
      {attendance && attendance.attendance_state === 'CHECKED_IN' && (
        <Button variant="danger" size="sm" onClick={() => setIsForceOpen(true)}>
          Force Out
        </Button>
      )}
      <AttendanceCorrectionModal
        isOpen={isCorrectOpen}
        onClose={() => setIsCorrectOpen(false)}
        attendance={attendance}
        employeeId={employeeId}
        date={date}
        employeeName={employeeName}
      />
      {attendance && (
        <ForceCheckOutModal
          isOpen={isForceOpen}
          onClose={() => setIsForceOpen(false)}
          attendanceId={attendance.id}
          employeeName={employeeName}
        />
      )}
    </div>
  );
}
