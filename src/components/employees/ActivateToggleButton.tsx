"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { setEmployeeActive } from "@/app/admin/employees/actions";

export function ActivateToggleButton({
  employeeId,
  isActive,
}: {
  employeeId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await setEmployeeActive(employeeId, !isActive);
      } catch {
        setError("Could not update status. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={isActive ? "danger" : "primary"}
        size="md"
        onClick={handleClick}
        isLoading={isPending}
      >
        {isActive ? "Deactivate employee" : "Reactivate employee"}
      </Button>
      {error && <p className="text-xs text-status-late">{error}</p>}
    </div>
  );
}
