"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ReportsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const handleFilterChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.push(`/admin/reports?${params.toString()}`);
  };

  const handleReset = () => {
    router.push("/admin/reports");
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      <Field label="Start Date" htmlFor="startDate">
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
        />
      </Field>
      <Field label="End Date" htmlFor="endDate">
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
