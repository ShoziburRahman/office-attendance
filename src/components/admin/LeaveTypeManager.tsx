"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { getLeaveTypes, upsertLeaveType, deleteLeaveType } from "@/app/admin/settings/leave-types/actions";
import type { LeaveTypeRow } from "@/types/database";

export function LeaveTypeManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [selectedType, setSelectedType] = useState<LeaveTypeRow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    is_paid: true,
    deducts_annual_balance: true,
    is_active: true,
  });

  const fetchTypes = async () => {
    try {
      const data = await getLeaveTypes();
      setLeaveTypes(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
    }
  }, [isOpen]);

  const handleAddClick = () => {
    setSelectedType(null);
    setFormData({
      name: "",
      is_paid: true,
      deducts_annual_balance: true,
      is_active: true,
    });
    setView('form');
  };

  const handleEditClick = (type: LeaveTypeRow) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      is_paid: type.is_paid,
      deducts_annual_balance: type.deducts_annual_balance,
      is_active: type.is_active,
    });
    setView('form');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the leave type "${name}"? This will fail if it is currently assigned to any employee.`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteLeaveType(id);
      await fetchTypes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...formData, id: selectedType?.id };
      await upsertLeaveType(data);
      await fetchTypes();
      setView('list');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => { setIsOpen(true); setView('list'); }}>
        Manage Leave Types
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setView('list'); }}
        title={view === 'list' ? "Manage Leave Types" : (selectedType ? "Edit Leave Type" : "Add Leave Type")}
        className="max-w-2xl"
      >
        {view === 'list' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-ink-400">Configure your custom leave types and their policies.</p>
              <Button size="sm" onClick={handleAddClick}>Add New</Button>
            </div>
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-ink-400 uppercase bg-ink-50">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Deduction</th>
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
                        <Button variant="secondary" size="sm" onClick={() => handleEditClick(type)}>Edit</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleDelete(type.id, type.name)} isLoading={loading}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                  {leaveTypes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-400">No leave types found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Leave Type Name" htmlFor="lt-name" required>
              <Input
                id="lt-name"
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
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button variant="secondary" type="button" onClick={() => setView('list')}>Cancel</Button>
              <Button type="submit" isLoading={loading}>
                {selectedType ? "Update Leave Type" : "Save Leave Type"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
