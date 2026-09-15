"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import type { SalaryDataPayload } from "@/app/admin/salary/actions";

interface SalaryCalculationFormProps {
  initialData: SalaryDataPayload;
  baselineData: SalaryDataPayload;
  onSave: (data: SalaryDataPayload) => Promise<void>;
  employeeName: string;
}

export function SalaryCalculationForm({ initialData, baselineData, onSave, employeeName }: SalaryCalculationFormProps) {
  const [formData, setFormData] = useState<SalaryDataPayload>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Recalculate totals whenever relevant fields change
  useEffect(() => {
    const otAmount = formData.overtimeHours * formData.overtimeRate;

    // Calculate daily salary for unpaid leave deduction
    const dailySalary = formData.salaryDays > 0 ? formData.basicSalary / formData.salaryDays : 0;
    const calculatedUnpaidDeduction = formData.unpaidLeave * dailySalary;

    const gross = formData.basicSalary + otAmount + formData.otherEarnings;

    // We use the current value of unpaidLeaveDeduction (which might have been manually overridden)
    const totalDeductions = formData.unpaidLeaveDeduction + formData.penaltyAmount + formData.otherDeductions;
    const net = gross - totalDeductions;

    setFormData(prev => {
      // Only update unpaidLeaveDeduction if the drivers changed and it hasn't been manually overridden?
      // To keep it simple and responsive as requested: update it automatically.
      // If the admin wants to override, they can. If they change basicSalary, the override is lost.
      return {
        ...prev,
        unpaidLeaveDeduction: calculatedUnpaidDeduction,
        overtimeAmount: otAmount,
        grossSalary: gross,
        totalDeductions: totalDeductions,
        netSalary: net,
      };
    });
  }, [formData.basicSalary, formData.overtimeHours, formData.overtimeRate, formData.otherEarnings, formData.salaryDays, formData.unpaidLeave, formData.penaltyAmount, formData.otherDeductions]);

  const handleFieldChange = (field: keyof SalaryDataPayload, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(baselineData);
    toast("Reset to loaded baseline data.", "INFO");
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      toast("Salary calculation saved successfully.", "SUCCESS");
    } catch (e: any) {
      toast(e.message || "Failed to save salary calculation.", "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-ink-900">Salary Calculation: {employeeName}</h2>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleReset}>Reset to Loaded Data</Button>
          <Button onClick={handleSave} isLoading={isLoading}>Save Calculation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">Earnings</p>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Basic Salary (৳)" htmlFor="basicSalary">
                <Input
                  id="basicSalary"
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) => handleFieldChange("basicSalary", parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field label="Other Earnings (৳)" htmlFor="otherEarnings">
                <Input
                  id="otherEarnings"
                  type="number"
                  value={formData.otherEarnings}
                  onChange={(e) => handleFieldChange("otherEarnings", parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field label="Overtime Hours" htmlFor="otHours">
                <Input
                  id="otHours"
                  type="number"
                  step="0.1"
                  value={formData.overtimeHours}
                  onChange={(e) => handleFieldChange("overtimeHours", parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field label="Per Overtime Hour (৳)" htmlFor="otRate">
                <Input
                  id="otRate"
                  type="number"
                  value={formData.overtimeRate}
                  onChange={(e) => handleFieldChange("overtimeRate", parseFloat(e.target.value) || 0)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">Attendance & Leave</p>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Salary Days (Calendar)" htmlFor="salaryDays">
                <Input
                  id="salaryDays"
                  type="number"
                  value={formData.salaryDays}
                  readOnly
                  className="bg-ink-50 cursor-not-allowed"
                />
              </Field>
              <Field label="Working Days" htmlFor="workingDays">
                <Input
                  id="workingDays"
                  type="number"
                  value={formData.workingDays}
                  onChange={(e) => handleFieldChange("workingDays", parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label="Present Days" htmlFor="presentDays">
                <Input
                  id="presentDays"
                  type="number"
                  value={formData.presentDays}
                  onChange={(e) => handleFieldChange("presentDays", parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label="Paid Leave" htmlFor="paidLeave">
                <Input
                  id="paidLeave"
                  type="number"
                  value={formData.paidLeave}
                  onChange={(e) => handleFieldChange("paidLeave", parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label="Unpaid Leave" htmlFor="unpaidLeave">
                <Input
                  id="unpaidLeave"
                  type="number"
                  value={formData.unpaidLeave}
                  onChange={(e) => handleFieldChange("unpaidLeave", parseInt(e.target.value) || 0)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">Deductions</p>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Unpaid Leave Deduction (৳)" htmlFor="unpaidDed">
                <Input
                  id="unpaidDed"
                  type="number"
                  value={formData.unpaidLeaveDeduction}
                  onChange={(e) => handleFieldChange("unpaidLeaveDeduction", parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field label="Penalty / Fine (৳)" htmlFor="penaltyAmt">
                <Input
                  id="penaltyAmt"
                  type="number"
                  value={formData.penaltyAmount}
                  onChange={(e) => handleFieldChange("penaltyAmount", parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field label="Penalty Reason" htmlFor="penaltyReason" className="sm:col-span-2">
                <Input
                  id="penaltyReason"
                  value={formData.penaltyReason}
                  onChange={(e) => handleFieldChange("penaltyReason", e.target.value)}
                />
              </Field>
              <Field label="Other Deduction (৳)" htmlFor="otherDed">
                <Input
                  id="otherDed"
                  type="number"
                  value={formData.otherDeductions}
                  onChange={(e) => handleFieldChange("otherDeductions", parseFloat(e.target.value) || 0)}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <Card className="bg-ink-50 border-teal-200">
            <CardHeader>
              <p className="text-sm font-bold uppercase tracking-wider text-teal-800">Salary Summary</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-600">Basic Salary:</span>
                <span className="font-medium">৳{formData.basicSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-600">Overtime ({formData.overtimeHours}h × {formData.overtimeRate}):</span>
                <span className="font-medium">৳{formData.overtimeAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-600">Other Earnings:</span>
                <span className="font-medium">৳{formData.otherEarnings.toLocaleString()}</span>
              </div>
              <div className="border-t border-ink-200 pt-2 flex justify-between font-bold text-sm">
                <span className="text-ink-900">Gross Salary:</span>
                <span className="text-ink-900">৳{formData.grossSalary.toLocaleString()}</span>
              </div>
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Unpaid Leave Ded:</span>
                  <span>৳{formData.unpaidLeaveDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Penalty/Fine:</span>
                  <span>৳{formData.penaltyAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Other Deductions:</span>
                  <span>৳{formData.otherDeductions.toLocaleString()}</span>
                </div>
                <div className="border-t border-ink-200 pt-2 flex justify-between font-bold text-sm text-status-late">
                  <span>Total Deductions:</span>
                  <span>৳{formData.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-teal-200 shadow-sm flex justify-between items-center">
                <span className="text-base font-bold text-ink-900">NET SALARY:</span>
                <span className="text-2xl font-black text-teal-700">৳{formData.netSalary.toLocaleString()}</span>
              </div>

              <div className="pt-4">
                <Field label="Payment Status" htmlFor="status">
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleFieldChange("status", e.target.value as "Draft" | "Paid")}
                    className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Paid">Paid</option>
                  </select>
                </Field>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
