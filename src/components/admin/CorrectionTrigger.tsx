"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AttendanceCorrectionModal } from "@/components/admin/AttendanceCorrectionModal";
import { ForceCheckOutModal } from "@/components/admin/ForceCheckOutModal";
import type { AttendanceRow } from "@/types/database";

export function CorrectionTrigger({ attendance, employeeName }: { attendance: AttendanceRow | null, employeeName: string }) {
  const [isCorrectOpen, setIsCorrectOpen] = useState(false);
  const [isForceOpen, setIsForceOpen] = useState(false);

  if (!attendance) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsCorrectOpen(true)}>
        Correct
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => setIsCorrectOpen(true)}>
        Correct
      </Button>
      {attendance.attendance_state === 'CHECKED_IN' && (
        <Button variant="danger" size="sm" onClick={() => setIsForceOpen(true)}>
          Force Out
        </Button>
      )}
      <AttendanceCorrectionModal
        isOpen={isCorrectOpen}
        onClose={() => setIsCorrectOpen(false)}
        attendanceId={attendance.id}
        fieldName="check_in_at"
        currentValue={attendance.check_in_at}
      />
      <ForceCheckOutModal
        isOpen={isForceOpen}
        onClose={() => setIsForceOpen(false)}
        attendanceId={attendance.id}
        employeeName={employeeName}
      />
    </div>
  );
}
