"use client";

import { Button } from "@/components/ui/Button";

interface CSVExportButtonProps {
  data: any[];
}

export function CSVExportButton({ data }: CSVExportButtonProps) {
  const downloadCSV = () => {
    if (data.length === 0) return;

    const headers = ["Employee", "Date", "State", "Overtime (min)", "Status"];
    const rows = data.map((a) => [
      `"${a.employee?.profile?.full_name || "Unknown"}"`,
      a.attendance_date,
      a.attendance_state,
      a.overtime_minutes ?? 0,
      a.is_late ? "Late" : "On Time",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={downloadCSV} variant="secondary">
      Export CSV
    </Button>
  );
}
