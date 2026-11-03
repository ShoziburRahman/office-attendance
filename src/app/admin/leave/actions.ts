"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { EmployeeLeaveRow, LeaveTypeRow } from "@/types/database";

export interface BulkLeavePayload {
  employeeIds: string[];
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
}

export async function assignBulkLeave(payload: BulkLeavePayload) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  // 1. Fetch Leave Type details for snapshotting
  const { data: leaveType, error: typeError } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", payload.leaveTypeId)
    .single();

  if (typeError || !leaveType) {
    throw new Error("Invalid leave type selected.");
  }

  // 2. Date Range Expansion
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);
  const dates: string[] = [];
  let current = new Date(startDate.getTime());
  while (current <= endDate) {
    const isoString = current.toISOString();
    const datePart = isoString.split('T')[0];
    if (datePart) {
      dates.push(datePart);
    }
    current.setDate(current.getDate() + 1);
  }

  // 3. Overlap Validation
  // Check if any employee already has leave on any of these dates
  const { data: overlaps, error: overlapError } = await supabase
    .from("employee_leaves")
    .select("employee_id, leave_date")
    .in("employee_id", payload.employeeIds)
    .in("leave_date", dates);

  if (overlapError) throw new Error(`Overlap check failed: ${overlapError.message}`);

  if (overlaps && overlaps.length > 0) {
    const conflicting = (overlaps as any[]).map(o => `${o.employee_id} on ${o.leave_date}`).join(", ");
    throw new Error(`Overlap detected for: ${conflicting}. Please resolve before assigning.`);
  }

  // 4. Bulk Insertion (Transactional-like behavior via Supabase .insert())
  const leavesToInsert: Partial<EmployeeLeaveRow>[] = [];

  const lt = leaveType as LeaveTypeRow;
  for (const empId of payload.employeeIds) {
    for (const date of dates) {
      leavesToInsert.push({
        employee_id: empId,
        leave_date: date,
        leave_type: lt.is_paid ? "PAID" : "UNPAID",
        leave_type_id: lt.id,
        snapshot_is_paid: lt.is_paid,
        snapshot_deducts_balance: lt.deducts_annual_balance,
        reason: payload.reason,
        notes: payload.notes,
        created_by: currentUser.authId,
        leave_counted: lt.deducts_annual_balance, // Default counting based on policy
      });
    }
  }

  const { error: insertError } = await supabase
    .from("employee_leaves")
    .insert(leavesToInsert as any);

  if (insertError) throw new Error(`Bulk assignment failed: ${insertError.message}`);

  revalidatePath("/admin/leave");
  return { success: true };
}

export async function deleteLeaveRange(employeeId: string, startDate: string, endDate: string) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_leaves")
    .delete()
    .eq("employee_id", employeeId)
    .gte("leave_date", startDate)
    .lte("leave_date", endDate);

  if (error) throw new Error(`Error deleting leave range: ${error.message}`);

  revalidatePath("/admin/leave");
  return { success: true };
}

export async function deleteSingleLeave(id: string, reason: string) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  // 1. Fetch the leave record
  const { data: leave, error: fetchError } = await supabase
    .from("employee_leaves")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !leave) {
    throw new Error("Leave record not found.");
  }

  const l = leave as EmployeeLeaveRow;

  // 2. Date Validation (Asia/Dhaka)
  const currentOfficeDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  if (l.leave_date <= currentOfficeDate) {
    throw new Error("Leave cannot be deleted on or after its start date.");
  }

  // 3. Audit Log
  const { error: auditError } = await (supabase.from("leave_audit_logs") as any).insert({
    employee_id: l.employee_id,
    leave_date: l.leave_date,
    leave_type: l.leave_type,
    deleted_by: currentUser.authId,
    reason: reason,
  });

  if (auditError) {
    console.error("Audit log error:", auditError);
    // We continue with deletion but log the error
  }

  // 4. Deletion
  const { error: deleteError } = await supabase
    .from("employee_leaves")
    .delete()
    .eq("id", id);

  if (deleteError) throw new Error(`Deletion failed: ${deleteError.message}`);

  // Check if something was actually deleted
  const { data: verify } = await supabase
    .from("employee_leaves")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (verify) {
    throw new Error("Leave was not deleted from the database. Please check your permissions.");
  }

  revalidatePath("/admin/leave");
  return { success: true };
}
export async function updateLeaveRecord(id: string, data: Partial<EmployeeLeaveRow>) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("employee_leaves") as any)
    .update(data)
    .eq("id", id);

  if (error) throw new Error(`Error updating leave record: ${error.message}`);

  revalidatePath("/admin/leave");
  return { success: true };
}
