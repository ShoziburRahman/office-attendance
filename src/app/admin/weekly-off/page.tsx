import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { calculateNextWeeklyOff } from "@/lib/utils/weekly-off";
import { WeeklyOffGroupedList } from "@/components/admin/WeeklyOffGroupedList";

export default async function WeeklyOffPage() {
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
    .from("weekly_off_schedules")
    .select(`
      *,
      employee:employees!weekly_off_schedules_employee_id_fkey(
        *,
        profile:profiles!employees_id_fkey(*)
      )
    `)
    .order("effective_from", { ascending: false })
    .returns<any[]>();

  if (schedulesError) {
    return (
      <div className="p-6">
        <p className="text-status-late">Error loading weekly off schedules: {schedulesError.message}</p>
      </div>
    );
  }

  const timezone = officeSettings?.office_timezone || "Asia/Dhaka";
  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  const offSchedules = schedulesData || [];
  const groupedData: Record<string, any> = {};
  offSchedules.forEach(off => {
    if (!off.employee || !off.employee.profile) return;
    const empId = off.employee.id;
    if (!groupedData[empId]) {
      groupedData[empId] = {
        employeeId: empId,
        employeeName: off.employee.profile.full_name,
        records: [],
        activeRecord: null
      };
    }
    groupedData[empId].records.push(off);
  });

  const getStatus = (off: any, nextOffId: string | undefined) => {
    if (off.id === nextOffId) return { label: "Active", tone: "present" as any };
    if (currentOfficeDate < off.effective_from) return { label: "Future", tone: "neutral" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  Object.keys(groupedData).forEach(empId => {
    const group = groupedData[empId];
    const empSchedules = group.records.map((s: any) => ({
      id: s.id,
      day_of_week: s.day_of_week,
      effective_from: s.effective_from,
      effective_until: s.effective_until
    }));

    const nextOff = calculateNextWeeklyOff(currentOfficeDate, empSchedules);
    const activeId = nextOff?.scheduleId;
    group.activeRecord = group.records.find((r: any) => r.id === activeId) || null;

    const priority: Record<string, number> = { "Active": 1, "Future": 2, "Expired": 3 };
    group.records.sort((a: any, b: any) => {
      const statusA = getStatus(a, activeId).label;
      const statusB = getStatus(b, activeId).label;
      if (statusA !== statusB) {
        return (priority[statusA] || 99) - (priority[statusB] || 99);
      }
      return b.effective_from.localeCompare(a.effective_from);
    });

    group.records.forEach((r: any) => {
      r.status = getStatus(r, activeId);
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Weekly Off Management</h1>
          <p className="mt-1 text-sm text-ink-400">Global view of employee off-day configurations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-ink-900">Next Weekly Offs</p>
            </CardHeader>
            <CardBody className="space-y-4">
              {offSchedules.length === 0 ? (
                <p className="text-sm text-ink-400 italic">No schedules configured.</p>
              ) : (
                <div className="space-y-4">
                  {Object.values(groupedData).map((group: any) => {
                    const empSchedules = group.records.map((s: any) => ({
                      id: s.id,
                      day_of_week: s.day_of_week,
                      effective_from: s.effective_from,
                      effective_until: s.effective_until
                    }));
                    const nextOff = calculateNextWeeklyOff(currentOfficeDate, empSchedules);
                    return (
                      <div key={group.employeeId} className="flex items-center justify-between p-2 rounded-lg bg-ink-50 border border-ink-100">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink-900 truncate">
                            {group.employeeName}
                          </p>
                          <p className="text-[10px] text-ink-400">
                            {nextOff ? `${nextOff.dayLabel}, ${nextOff.dateFormatted}` : "No upcoming off-day"}
                          </p>
                        </div>
                        <Badge tone="neutral" className="text-[10px] py-0 px-2">
                          {nextOff ? nextOff.dayLabel : "N/A"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <p className="text-sm font-medium text-ink-900">All Weekly Off Records</p>
          </CardHeader>
          <CardBody>
            <WeeklyOffGroupedList groupedData={groupedData} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
