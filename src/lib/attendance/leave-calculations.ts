import { createClient } from "@/lib/supabase/client";

export interface PaidLeaveStatus {
  limit: number;
  used: number;
  extra: number;
  remaining: number;
  isExceeded: boolean;
}

/**
 * Calculates the paid leave status for an employee for a specific year.
 * This is used for visual indicators in the admin panel.
 */
export async function calculatePaidLeaveStatus(employeeId: string, year: number): Promise<PaidLeaveStatus> {
  const supabase = createClient();

  // 1. Get the global limit from office_settings
  const { data: settings, error: settingsError } = await supabase
    .from("office_settings")
    .select("annual_paid_leave_limit")
    .single() as any;

  if (settingsError) {
    console.error("Error fetching paid leave limit:", settingsError);
    throw new Error("Could not retrieve paid leave limit settings.");
  }

  const limit = settings?.annual_paid_leave_limit ?? 10;

  // 2. Count paid leaves for the given year
  // We filter by leave_type = 'PAID' and leave_counted = true.
  const { count, error: countError } = await supabase
    .from("employee_leaves")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("leave_type", "PAID")
    .eq("leave_counted", true)
    .gte("leave_date", `${year}-01-01`)
    .lte("leave_date", `${year}-12-31`);

  if (countError) {
    console.error("Error counting paid leaves:", countError);
    throw new Error("Could not calculate paid leave usage.");
  }

  const used = count ?? 0;
  const extra = Math.max(0, used - limit);
  const remaining = Math.max(0, limit - used);
  const isExceeded = used > limit;

  return {
    limit,
    used,
    extra,
    remaining,
    isExceeded,
  };
}
