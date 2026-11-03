"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { assignBulkLeave } from "@/app/admin/leave/actions";
import { createClient } from "@/lib/supabase/client";
import type { LeaveTypeRow } from "@/types/database";

export function BulkLeaveAssignmentModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [selectedType, setSelectedType] = useState<LeaveTypeRow | null>(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    notes: "",
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: emps } = await supabase
        .from("employees")
        .select("id, profiles(full_name)")
        .eq("is_active", true);

      setEmployees((emps as any[] || []).map(e => ({ id: e.id, name: e.profiles.full_name })));

      const { data: types } = await supabase
        .from("leave_types")
        .select("*")
        .eq("is_active", true);

      setLeaveTypes((types as LeaveTypeRow[]) || []);
    }
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0 || !selectedType || !formData.startDate || !formData.endDate) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await assignBulkLeave({
        employeeIds: selectedEmployees,
        leaveTypeId: selectedType.id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        notes: formData.notes,
      });
      setOpen(false);
      setSelectedEmployees([]);
      setFormData({ startDate: "", endDate: "", reason: "", notes: "" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Bulk Assign Leave</Button>
      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Bulk Assign Leave">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Employees</label>
            <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selectedEmployees.length === employees.length) setSelectedEmployees([]);
                    else setSelectedEmployees(employees.map(e => e.id));
                  }}
                >
                  {selectedEmployees.length === employees.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                      else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                    }}
                  />
                  <span className="text-sm">{emp.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Leave Type</label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={selectedType?.id || ""}
              onChange={e => setSelectedType(leaveTypes.find(t => t.id === e.target.value) || null)}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedType && (
              <div className="flex space-x-2 mt-2">
                <Badge tone={selectedType.is_paid ? "present" : "neutral"}>
                  {selectedType.is_paid ? "Paid" : "Unpaid"}
                </Badge>
                <Badge tone={selectedType.deducts_annual_balance ? "present" : "neutral"}>
                  {selectedType.deducts_annual_balance ? "Deducts Balance" : "No Deduction"}
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Start Date"
              htmlFor="bulk-start-date"
              required
            >
              <Input
                id="bulk-start-date"
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </Field>
            <Field
              label="End Date"
              htmlFor="bulk-end-date"
              required
            >
              <Input
                id="bulk-end-date"
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                required
              />
            </Field>
          </div>

          <Field
            label="Reason"
            htmlFor="bulk-leave-reason"
            required
          >
            <Input
              id="bulk-leave-reason"
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
              required
            />
          </Field>
          <Field
            label="Admin Notes"
            htmlFor="bulk-leave-notes"
          >
            <Input
              id="bulk-leave-notes"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </Field>

          <Button onClick={handleSubmit} isLoading={loading} className="w-full">Assign Leave</Button>
        </div>
      </Dialog>
    </>
  );
}
