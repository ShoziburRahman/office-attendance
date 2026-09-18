"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { buildMonthlyReportData } from "@/lib/reports/report-data-builder";
import type { SalaryCalculationRow } from "@/types/database";
export type { SalaryCalculationRow };

export interface SalaryDataPayload {
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  otherEarnings: number;
  salaryDays: number;
  workingDays: number;
  presentDays: number;
  paidLeave: number;
  unpaidLeave: number;
  unpaidLeaveDeduction: number;
  penaltyAmount: number;
  penaltyReason: string;
  otherDeductions: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: "Draft" | "Paid";
}

export interface EmployeeListEntry {
  id: string;
  full_name: string;
  employee_code: string;
}

export async function getEmployeesList() {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_code, profiles(full_name)")
    .eq("is_active", true)
    .order("profiles(full_name)", { ascending: true });

  if (error) {
    throw new Error(`Error fetching employee list: ${error.message}`);
  }

  return (data as any[]).map(emp => ({
    id: emp.id,
    full_name: emp.profiles.full_name,
    employee_code: emp.employee_code,
  }));
}

export async function loadSalaryData(employeeId: string, month: number, year: number) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  // Calculate actual calendar days in the selected month/year
  const salaryDays = new Date(year, month, 0).getDate();

  // 1. Fetch employee name
  const { data: empInfo } = await supabase
    .from("employees")
    .select("profiles(full_name)")
    .eq("id", employeeId)
    .single();

  if (!empInfo) {
    throw new Error("Employee not found");
  }

  // 2. Check if a saved salary record already exists
  const { data: savedSalary, error: salaryError } = await supabase
    .from("salary_calculations")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (salaryError && salaryError.code !== "PGRST116") {
    throw new Error(`Error fetching saved salary: ${salaryError.message}`);
  }

  // 3. Load current attendance/leave data as baseline
  const reportData = await buildMonthlyReportData(employeeId, month, year);

  // Convert overtime minutes to hours
  const overtimeHours = parseFloat((reportData.summary.totalOvertimeMinutes / 60).toFixed(2));

  const baseline: SalaryDataPayload = {
    employeeId,
    month,
    year,
    salaryDays,
    basicSalary: 0,
    overtimeHours,
    overtimeRate: 0,
    overtimeAmount: 0,
    otherEarnings: 0,
    workingDays: reportData.summary.totalWorkingDays,
    presentDays: reportData.summary.presentDays,
    paidLeave: reportData.summary.paidLeaveDays,
    unpaidLeave: reportData.summary.unpaidLeaveDays,
    unpaidLeaveDeduction: 0,
    penaltyAmount: 0,
    penaltyReason: "",
    otherDeductions: 0,
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
    status: "Draft",
  };

  // If saved record exists, it takes precedence over baseline
  if (savedSalary) {
    const savedSalaryAny = savedSalary as any;
    return {
      saved: true,
      employeeName: (empInfo as any).profiles.full_name,
      data: {
        employeeId: savedSalaryAny.employee_id,
        month: savedSalaryAny.month,
        year: savedSalaryAny.year,
        salaryDays: savedSalaryAny.salary_days || salaryDays,
        basicSalary: savedSalaryAny.basic_salary,
        overtimeHours: savedSalaryAny.overtime_hours,
        overtimeRate: savedSalaryAny.overtime_rate,
        overtimeAmount: savedSalaryAny.overtime_amount,
        otherEarnings: savedSalaryAny.other_earnings,
        workingDays: savedSalaryAny.working_days,
        presentDays: savedSalaryAny.present_days,
        paidLeave: savedSalaryAny.paid_leave,
        unpaidLeave: savedSalaryAny.unpaid_leave,
        unpaidLeaveDeduction: savedSalaryAny.unpaid_leave_deduction,
        penaltyAmount: savedSalaryAny.penalty_amount,
        penaltyReason: savedSalaryAny.penalty_reason || "",
        otherDeductions: savedSalaryAny.other_deductions,
        grossSalary: savedSalaryAny.gross_salary,
        totalDeductions: savedSalaryAny.total_deductions,
        netSalary: savedSalaryAny.net_salary,
        status: savedSalaryAny.status as "Draft" | "Paid",
      },
      baseline,
    };
  }

  return {
    saved: false,
    employeeName: (empInfo as any).profiles.full_name,
    data: baseline,
    baseline,
  };
}

export async function saveSalaryCalculation(data: SalaryDataPayload) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  const { error } = await (supabase.from("salary_calculations") as any).upsert({
    employee_id: data.employeeId,
    month: data.month,
    year: data.year,
    basic_salary: data.basicSalary,
    overtime_hours: data.overtimeHours,
    overtime_rate: data.overtimeRate,
    overtime_amount: data.overtimeAmount,
    other_earnings: data.otherEarnings,
    working_days: data.workingDays,
    present_days: data.presentDays,
    paid_leave: data.paidLeave,
    unpaid_leave: data.unpaidLeave,
    unpaid_leave_deduction: data.unpaidLeaveDeduction,
    penalty_amount: data.penaltyAmount,
    penalty_reason: data.penaltyReason,
    other_deductions: data.otherDeductions,
    gross_salary: data.grossSalary,
    total_deductions: data.totalDeductions,
    net_salary: data.netSalary,
    status: data.status,
    updated_by: currentUser.authId,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'employee_id,month,year'
  });

  if (error) {
    throw new Error(`Could not save salary calculation: ${error.message}`);
  }

  return { success: true };
}

export async function getSalaryHistory(employeeId: string) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("salary_calculations")
    .select("*")
    .eq("employee_id", employeeId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) {
    throw new Error(`Error fetching salary history: ${error.message}`);
  }

  return data as SalaryCalculationRow[];
}
