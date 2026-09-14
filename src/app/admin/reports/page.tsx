"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import { CSVExportButton } from "@/components/reports/CSVExportButton";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // Default to last 30 days if no dates provided
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const finalStartDate = startDate || thirtyDaysAgo.toISOString().split("T")[0];
      const finalEndDate = endDate || today.toISOString().split("T")[0];

      let query = supabase
        .from("attendance")
        .select(`
          *,
          employee:employees!attendance_employee_id_fkey(
            profile:profiles!employees_id_fkey(*)
          )
        `);

      query = query
        .gte("attendance_date", finalStartDate)
        .lte("attendance_date", finalEndDate)
        .order("attendance_date", { ascending: false });

      const { data, error: fetchError } = await query.returns<any[]>();

      if (fetchError) {
        setError(`Error loading reports data: ${fetchError.message}`);
      } else {
        setAttendance(data || []);
      }
      setLoading(false);
    }

    fetchData();
  }, [startDate, endDate]);

  const totalRecords = attendance.length;
  const presentCount = attendance.filter(a => a.attendance_state === "CHECKED_OUT" || a.attendance_state === "CHECKED_IN").length;
  const lateCount = attendance.filter(a => a.is_late).length;
  const totalOvertime = attendance.reduce((sum, a) => sum + (a.overtime_minutes || 0), 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-400">
        Loading reports...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-status-late">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Attendance Reports</h1>
          <p className="mt-1 text-sm text-ink-400">High-level summaries of office attendance and compliance</p>
        </div>
      </div>

      <Card>
        <CardBody className="p-6 flex flex-wrap items-end justify-between gap-6">
          <ReportsFilters />
          <CSVExportButton data={attendance} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-6">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-1">Overall Presence</p>
            <p className="text-3xl font-bold text-teal-600">
              {totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0}%
            </p>
            <p className="text-xs text-ink-400 mt-1">{presentCount} / {totalRecords} sessions</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-6">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-1">Lateness Rate</p>
            <p className="text-3xl font-bold text-status-late">
              {totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0}%
            </p>
            <p className="text-xs text-ink-400 mt-1">{lateCount} late arrivals</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-6">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-1">Total Overtime</p>
            <p className="text-3xl font-bold text-ink-900">{totalOvertime}</p>
            <p className="text-xs text-ink-400 mt-1">cumulative minutes</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="px-6 py-4 border-b border-ink-100">
            <h3 className="text-sm font-medium text-ink-900">Detailed Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-400 uppercase bg-ink-50">
                <tr>
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">State</th>
                  <th className="px-6 py-3 font-medium">Overtime</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 font-medium text-ink-900">{a.employee.profile.full_name}</td>
                    <td className="px-6 py-4 text-ink-600">{a.attendance_date}</td>
                    <td className="px-6 py-4 text-ink-600">{a.attendance_state}</td>
                    <td className="px-6 py-4 font-mono">{a.overtime_minutes ?? 0}m</td>
                    <td className="px-6 py-4">
                      {a.is_late ? (
                        <Badge tone="late">Late</Badge>
                      ) : (
                        <Badge tone="present">On Time</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
