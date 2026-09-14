import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScheduleGroupedList } from "@/components/admin/ScheduleGroupedList";

export default async function SchedulesPage() {
  const supabase = await createClient();

  const { data: officeSettings, error: settingsError } = await supabase
    .from("office_settings")
    .select("office_timezone")
    .single() as any;

  if (settingsError) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading settings: {settingsError.message}</p>
      </div>
    );
  }

  const { data: schedulesData, error: schedulesError } = await supabase
    .from("employee_schedules")
    .select(`
      *,
      employee:employees!employee_schedules_employee_id_fkey(
        *,
        profile:profiles!employees_id_fkey(*)
      )
    `)
    .order("effective_from", { ascending: false })
    .returns<any[]>();

  if (schedulesError) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading schedules: {schedulesError.message}</p>
      </div>
    );
  }

  const timezone = officeSettings?.office_timezone || "Asia/Dhaka";
  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  const schedules = schedulesData || [];
  const groupedData: Record<string, any> = {};
  schedules.forEach(s => {
    if (!s.employee || !s.employee.profile) return;
    const empId = s.employee.id;
    if (!groupedData[empId]) {
      groupedData[empId] = {
        employeeId: empId,
        employeeName: s.employee.profile.full_name,
        records: [],
        activeRecord: null
      };
    }
    groupedData[empId].records.push(s);
  });

  const getStatus = (from: string, until: string | null) => {
    if (currentOfficeDate < from) return { label: "Future", tone: "neutral" as any };
    if (until === null || currentOfficeDate < until) return { label: "Active", tone: "present" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  Object.keys(groupedData).forEach(empId => {
    const group = groupedData[empId];
    const active = group.records.find((s: any) => {
      const status = getStatus(s.effective_from, s.effective_until);
      return status.label === "Active";
    });
    group.activeRecord = active;

    const priority: Record<string, number> = { "Active": 1, "Future": 2, "Expired": 3 };
    group.records.sort((a: any, b: any) => {
      const statusA = getStatus(a.effective_from, a.effective_until).label;
      const statusB = getStatus(b.effective_from, b.effective_until).label;
      if (statusA !== statusB) {
        return (priority[statusA] || 99) - (priority[statusB] || 99);
      }
      return b.effective_from.localeCompare(a.effective_from);
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Work Schedules</h1>
          <p className="mt-1 text-sm text-ink-400">Global view of employee shift configurations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">All Schedules</p>
        </CardHeader>
        <CardBody>
          <ScheduleGroupedList groupedData={groupedData} />
        </CardBody>
      </Card>
    </div>
  );
}
