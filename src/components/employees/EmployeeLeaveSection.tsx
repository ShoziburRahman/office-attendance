"use client";

import React, { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import type { LeaveActionState } from "@/app/admin/employees/state";
import type { EmployeeLeaveRow } from "@/types/database";
import { calculatePaidLeaveStatus } from "@/lib/attendance/leave-calculations";

type ActionFn = (prevState: LeaveActionState, formData: FormData) => Promise<LeaveActionState>;

interface EmployeeLeaveSectionProps {
  action: ActionFn;
  initialState: LeaveActionState;
  leaves: EmployeeLeaveRow[];
  employeeId: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function EmployeeLeaveSection({ action, initialState, leaves, employeeId }: EmployeeLeaveSectionProps) {
  const [state, formAction] = useFormState(action, initialState);
  const [leaveStatus, setLeaveStatus] = useState<{
    limit: number;
    used: number;
    extra: number;
    isExceeded: boolean;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    async function fetchPaidLeaveStatus() {
      setIsLoadingStatus(true);
      try {
        const currentYear = new Date().getFullYear();
        const status = await calculatePaidLeaveStatus(employeeId, currentYear);
        setLeaveStatus(status);
      } catch (e) {
        console.error("Failed to fetch paid leave status:", e);
      } finally {
        setIsLoadingStatus(false);
      }
    }
    fetchPaidLeaveStatus();
  }, [employeeId]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink-900">Leave Management</p>
          {leaveStatus && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-400">Paid Leave:</span>
                <span className={`font-semibold ${leaveStatus.isExceeded ? "text-status-late" : "text-ink-900"}`}>
                  {leaveStatus.used} / {leaveStatus.limit} days
                </span>
              </div>
              {leaveStatus.isExceeded && (
                <p className="text-[10px] text-status-late font-bold uppercase">
                  Paid leave limit exceeded by {leaveStatus.extra} days
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-8">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Leave History</h4>
          {leaves.length === 0 ? (
            <p className="text-sm text-ink-400 italic">No leave recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-400 uppercase bg-ink-50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {leaves.sort((a, b) => b.leave_date.localeCompare(a.leave_date)).map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 whitespace-nowrap">{l.leave_date}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.leave_type === 'PAID' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {l.leave_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-600">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-ink-100 pt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4">Assign Leave</h4>
          <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {state.error && (
              <p role="alert" className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
                {state.error}
              </p>
            )}
            <Field label="Leave Date" htmlFor="leaveDate" required error={errors.leaveDate}>
              <Input id="leaveDate" name="leaveDate" type="date" required />
            </Field>
            <Field label="Leave Type" htmlFor="leaveType" required error={errors.leaveType}>
              <select
                id="leaveType"
                name="leaveType"
                className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                required
              >
                <option value="">Select type</option>
                <option value="PAID">Paid Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </Field>
            <Field label="Reason" htmlFor="reason" required error={errors.reason} className="sm:col-span-2">
              <Input id="reason" name="reason" placeholder="e.g. Family emergency" required />
            </Field>
            <div className="flex items-end">
              <SubmitButton label="Save Leave" />
            </div>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}
