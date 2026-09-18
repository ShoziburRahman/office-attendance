"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { SalaryCalculationForm } from "@/components/admin/SalaryCalculationForm";
import { SalaryHistoryTable } from "@/components/admin/SalaryHistoryTable";
import { EmployeeCombobox } from "@/components/admin/EmployeeCombobox";
import { loadSalaryData, saveSalaryCalculation, getSalaryHistory, getEmployeesList } from "@/app/admin/salary/actions";
import type { SalaryDataPayload, SalaryCalculationRow, EmployeeListEntry } from "@/app/admin/salary/actions";

export default function SalaryCalculationPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeListEntry[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [salaryData, setSalaryData] = useState<SalaryDataPayload | null>(null);
  const [baselineData, setBaselineData] = useState<SalaryDataPayload | null>(null);
  const [history, setHistory] = useState<SalaryCalculationRow[]>([]);
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const list = await getEmployeesList();
        setEmployees(list);
      } catch (e: any) {
        toast(e.message || "Failed to load employees list.", "ERROR");
      }
    }
    fetchEmployees();
  }, []);

  async function handleLoadData() {
    if (!employeeId) {
      toast("Please select an employee.", "ERROR");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loadSalaryData(employeeId, month, year);
      setSalaryData(result.data);
      setBaselineData(result.baseline);
      setEmployeeName(result.employeeName);

      // Fetch history too
      const historyData = await getSalaryHistory(employeeId);
      setHistory(historyData);

      toast("Employee salary data loaded.", "SUCCESS");
    } catch (e: any) {
      toast(e.message || "Failed to load salary data.", "ERROR");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(data: SalaryDataPayload) {
    setIsSaving(true);
    try {
      await saveSalaryCalculation(data);
      // Refresh history
      const updatedHistory = await getSalaryHistory(employeeId);
      setHistory(updatedHistory);
    } catch (e: any) {
      throw e; // Let the form handle the toast
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSelectHistory(record: SalaryCalculationRow) {
    const salaryDays = new Date(record.year, record.month, 0).getDate();
    setSalaryData({
      employeeId: record.employee_id,
      month: record.month,
      year: record.year,
      salaryDays,
      basicSalary: record.basic_salary,
      overtimeHours: record.overtime_hours,
      overtimeRate: record.overtime_rate,
      overtimeAmount: record.overtime_amount,
      otherEarnings: record.other_earnings,
      workingDays: record.working_days,
      presentDays: record.present_days,
      paidLeave: record.paid_leave,
      unpaidLeave: record.unpaid_leave,
      unpaidLeaveDeduction: record.unpaid_leave_deduction,
      penaltyAmount: record.penalty_amount,
      penaltyReason: record.penalty_reason || "",
      otherDeductions: record.other_deductions,
      grossSalary: record.gross_salary,
      totalDeductions: record.total_deductions,
      netSalary: record.net_salary,
      status: record.status as "Draft" | "Paid",
    });
    setMonth(record.month);
    setYear(record.year);
    toast("Loaded historical record.", "INFO");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink-900">Salary Calculation</h1>
        <p className="text-sm text-ink-400">Calculate and manage monthly payroll for employees.</p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">Selection</p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <EmployeeCombobox
            value={employeeId}
            onChange={setEmployeeId}
            employees={employees}
          />
          <Field label="Month" htmlFor="salaryMonth">
            <select
              id="salaryMonth"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, i, 1))}
                </option>
              )).map(opt => opt)}
            </select>
          </Field>
          <Field label="Year" htmlFor="salaryYear">
            <Input
              id="salaryYear"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            />
          </Field>
          <Button onClick={handleLoadData} isLoading={isLoading}>
            Load Data
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          {salaryData ? (
            <SalaryCalculationForm
              initialData={salaryData}
              baselineData={baselineData!}
              onSave={handleSave}
              employeeName={employeeName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-ink-100 rounded-xl bg-ink-50 text-center">
              <p className="text-ink-400 italic">Select an employee and period, then click "Load Data" to start calculation.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SalaryHistoryTable
            history={history}
            onSelect={handleSelectHistory}
            selectedId={salaryData?.employeeId} // This is not quite right, should be record id
          />
        </div>
      </div>
    </div>
  );
}
