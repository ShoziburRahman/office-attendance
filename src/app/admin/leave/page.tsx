import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LeaveGroupedList } from "@/components/admin/LeaveGroupedList";

export default async function LeavePage() {
  const supabase = await createClient();

  const { data: officeSettings, error: settingsError } = await supabase
    .from("office_settings")
    .select("office_timezone")
    .single()
    .returns<any>();

  if (settingsError) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading settings: {settingsError.message}</p>
      </div>
    );
  }

  const { data: leaveData, error: leaveError } = await supabase
    .from("employee_leaves")
    .select(`
      *,
      employee:employees!employee_leaves_employee_id_fkey(
        *,
        profile:profiles!employees_id_fkey(*)
      )
    `)
    .order("leave_date", { ascending: false })
    .returns<any[]>();

  if (leaveError) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading leaves: {leaveError.message}</p>
      </div>
    );
  }

  const timezone = (officeSettings as any)?.office_timezone || "Asia/Dhaka";
  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  const groupedData: Record<string, any> = {};
  (leaveData || []).forEach(l => {
    if (!l.employee || !l.employee.profile) return;
    const empId = l.employee.id;
    if (!groupedData[empId]) {
      groupedData[empId] = {
        employeeId: empId,
        employeeName: l.employee.profile.full_name,
        records: [],
        activeRecord: null
      };
    }
    groupedData[empId].records.push(l);
  });

  const getStatus = (date: string) => {
    if (date === currentOfficeDate) return { label: "Active", tone: "present" as any };
    if (currentOfficeDate < date) return { label: "Future", tone: "neutral" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  Object.keys(groupedData).forEach(empId => {
    const group = groupedData[empId];
    const active = group.records.find((l: any) => l.leave_date === currentOfficeDate);
    group.activeRecord = active || null;

    const priority: Record<string, number> = { "Active": 1, "Future": 2, "Expired": 3 };
    group.records.sort((a: any, b: any) => {
      const statusA = getStatus(a.leave_date).label;
      const statusB = getStatus(b.leave_date).label;
      if (statusA !== statusB) {
        return (priority[statusA] || 99) - (priority[statusB] || 99);
      }
      return b.leave_date.localeCompare(a.leave_date);
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Leave Management</h1>
          <p className="mt-1 text-sm text-ink-400">Global overview of all employee leaves</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">Leave Records</p>
        </CardHeader>
        <CardBody>
          <LeaveGroupedList groupedData={groupedData} />
        </CardBody>
      </Card>
    </div>
  );
}
