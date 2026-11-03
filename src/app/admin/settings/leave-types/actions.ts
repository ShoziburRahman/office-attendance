"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { LeaveTypeRow } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function getLeaveTypes() {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_types")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(`Error fetching leave types: ${error.message}`);
  return data as LeaveTypeRow[];
}

export async function upsertLeaveType(data: Partial<LeaveTypeRow>) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("leave_types") as any)
    .upsert({
      ...data,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(`Error saving leave type: ${error.message}`);

  revalidatePath("/admin/settings/leave-types");
  revalidatePath("/admin/leave");
  return { success: true };
}

export async function deleteLeaveType(id: string) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  // Check if any leaves are using this type before deleting
  const { data: existingLeaves } = await supabase
    .from("employee_leaves")
    .select("id")
    .eq("leave_type_id", id)
    .maybeSingle();

  if (existingLeaves) {
    throw new Error("Cannot delete leave type that is currently assigned to employees.");
  }

  const { error } = await supabase
    .from("leave_types")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Error deleting leave type: ${error.message}`);

  revalidatePath("/admin/settings/leave-types");
  revalidatePath("/admin/leave");
  return { success: true };
}
