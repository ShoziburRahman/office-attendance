"use client";

import { useState, useEffect } from "react";
import { getLeaveTypes, upsertLeaveType, deleteLeaveType } from "./actions";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";

function LeaveTypeForm({ type }: { type?: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    is_paid: true,
    deducts_annual_balance: true,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await upsertLeaveType(formData);
      setOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Leave Type</Button>
      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title={type ? "Edit Leave Type" : "Add Leave Type"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Leave Type Name"
            htmlFor="leave-type-name"
            required
          >
            <Input
              id="leave-type-name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g. Eid Leave"
            />
          </Field>
          <div className="flex items-center space-x-4 py-2">
            <label className="text-sm font-medium">Is Paid?</label>
            <input
              type="checkbox"
              checked={formData.is_paid}
              onChange={e => setFormData({...formData, is_paid: e.target.checked})}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center space-x-4 py-2">
            <label className="text-sm font-medium">Deduct from Annual Balance?</label>
            <input
              type="checkbox"
              checked={formData.deducts_annual_balance}
              onChange={e => setFormData({...formData, deducts_annual_balance: e.target.checked})}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center space-x-4 py-2">
            <label className="text-sm font-medium">Active?</label>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
          </div>
          <Button type="submit" isLoading={loading} className="w-full">Save Leave Type</Button>
        </form>
      </Dialog>
    </>
  );
}

function LeaveTypeEditModal({ type }: { type: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: type.name,
    is_paid: type.is_paid,
    deducts_annual_balance: type.deducts_annual_balance,
    is_active: type.is_active,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await upsertLeaveType({ ...formData, id: type.id });
      setOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Edit</Button>
      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit Leave Type"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Leave Type Name"
            htmlFor="leave-type-name"
            required
          >
            <Input
              id="leave-type-name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g. Eid Leave"
            />
          </Field>
          <div className="flex items-center space-x-4 py-2">
            <label className="text-sm font-medium">Is Paid?</label>
            <input
              type="checkbox"
              checked={formData.is_paid}
              onChange={e => setFormData({...formData, is_paid: e.target.checked})}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center space-x-4 py-2">
            <label className="text-sm font-medium">Deduct from Annual Balance?</label>
            <input
              type="checkbox"
              checked={formData.deducts_annual_balance}
              onChange={e => setFormData({...formData, deducts_annual_balance: e.target.checked})}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center space-x-4 py-2">
            <label className="text-sm font-medium">Is Active?</label>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={e => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
          </div>
          <Button type="submit" isLoading={loading} className="w-full">Update Leave Type</Button>
        </form>
      </Dialog>
    </>
  );
}

function DeleteLeaveTypeButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this leave type? This will fail if it is currently assigned to any employee.")) {
      return;
    }
    setLoading(true);
    try {
      await deleteLeaveType(id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleDelete} isLoading={loading} className="text-status-late">Delete</Button>
  );
}

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaveTypes();
        setLeaveTypes(data);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Leave Type Settings</h1>
          <p className="mt-1 text-sm text-ink-400">Define and manage custom leave types and their policies</p>
        </div>
        <LeaveTypeForm />
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-ink-900">Configured Leave Types</p>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-ink-400 uppercase bg-ink-50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Annual Deduction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((type) => (
                  <tr key={type.id} className="border-b border-ink-100">
                    <td className="px-4 py-3 font-medium text-ink-900">{type.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone={type.is_paid ? "present" : "neutral"}>
                        {type.is_paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={type.deducts_annual_balance ? "present" : "neutral"}>
                        {type.deducts_annual_balance ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={type.is_active ? "present" : "neutral"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <LeaveTypeEditModal type={type} />
                      <DeleteLeaveTypeButton id={type.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
