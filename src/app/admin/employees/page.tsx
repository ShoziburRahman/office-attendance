import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmployeeStatusBadge } from "@/components/employees/EmployeeStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils/format";
import type { EmployeeWithProfile } from "@/types/database";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const status = params.status || "active";

  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select("*, profile:profiles!employees_id_fkey(*)")
    .order("created_at", { ascending: false });

  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data: employees, error: employeesError } = await query.returns<EmployeeWithProfile[]>();

  if (employeesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink-900">Employees</h1>
            <p className="mt-1 text-sm text-ink-400">Error loading employees</p>
          </div>
          <Link href="/admin/employees/new">
            <Button>Add employee</Button>
          </Link>
        </div>
        <div className="rounded-md bg-red-50 p-4 text-sm text-status-late">
          Could not load employees. Please try again.
        </div>
      </div>
    );
  }

  // Fetch today's attendance for the filtered set to show status on cards
  const today = new Date().toISOString().slice(0, 10);
  const { data: attendance } = await supabase
    .from("attendance")
    .select("employee_id, attendance_state, day_classification")
    .eq("attendance_date", today)
    .returns<any[]>();

  const attendanceMap = new Map((attendance || []).map(a => [a.employee_id, a]));

  const filteredEmployees = (employees || []).filter((employee) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      employee.profile.full_name.toLowerCase().includes(needle) ||
      employee.employee_code.toLowerCase().includes(needle) ||
      employee.profile.email.toLowerCase().includes(needle) ||
      employee.department.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Employees</h1>
          <p className="mt-1 text-sm text-ink-400">{filteredEmployees.length} shown</p>
        </div>
        <Link href="/admin/employees/new">
          <Button>Add employee</Button>
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/employees">
        <div className="w-64">
          <Input name="q" defaultValue={q} placeholder="Search name, ID, email, department" />
        </div>
        <div className="flex gap-1 rounded-md border border-ink-100 bg-white p-1">
          {(["active", "inactive", "all"] as const).map((option) => (
            <StatusTab key={option} value={option} current={status} q={q} />
          ))}
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-sm text-ink-400">
          No employees match this view. Try a different filter, or add your first employee.
        </div>
      )}

      {filteredEmployees.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => {
            const att = attendanceMap.get(employee.id);
            const statusBadge = att
              ? (att.attendance_state === 'CHECKED_IN' ? 'Checked In' : att.day_classification === 'ABSENT' ? 'Absent' : 'Present')
              : (employee.is_active ? 'No Record' : 'Inactive');

            return (
              <Link
                key={employee.id}
                href={`/admin/employees/${employee.id}`}
                className="group block"
              >
                <Card className="h-full transition-all hover:ring-2 hover:ring-teal-500">
                  <CardBody className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-base font-medium text-teal-700">
                        {initials(employee.profile.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {employee.profile.full_name}
                          </p>
                          <EmployeeStatusBadge isActive={employee.is_active} />
                        </div>
                        <p className="truncate text-xs text-ink-500 mt-1">
                          {employee.position} • {employee.department}
                        </p>
                        <p className="text-xs text-ink-400 mt-1">
                          ID: {employee.employee_code}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
                      <span className="text-xs text-ink-400">Today's Status:</span>
                      <Badge tone={statusBadge === 'Checked In' ? 'present' : statusBadge === 'Absent' ? 'late' : 'neutral'}>
                        {statusBadge}
                      </Badge>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusTab({
  value,
  current,
  q,
}: {
  value: "active" | "inactive" | "all";
  current: string;
  q: string;
}) {
  const label = value === "active" ? "Active" : value === "inactive" ? "Inactive" : "All";
  const isCurrent = value === current;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("status", value);

  return (
    <Link
      href={`/admin/employees?${params.toString()}`}
      className={
        isCurrent
          ? "rounded-sm bg-teal-500 px-3 py-1 text-sm font-medium text-white"
          : "rounded-sm px-3 py-1 text-sm text-ink-600 hover:bg-ink-50"
      }
    >
      {label}
    </Link>
  );
}
