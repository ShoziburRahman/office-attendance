"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { CorrectionActionState } from "@/types/actions/attendance";


export async function upsertAttendance(
  employeeId: string,
  prevState: CorrectionActionState,
  formData: FormData,
): Promise<CorrectionActionState> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Only admins can upsert attendance.", success: false };
  }

  const date = formData.get("date") as string;
  const checkIn = formData.get("checkIn") as string;
  const checkOut = formData.get("checkOut") as string;
  const type = formData.get("type") as any;
  const reason = formData.get("reason") as string;

  if (!date || !reason?.trim()) {
    return { error: "Date and reason are required.", success: false };
  }

  const supabase = await createClient();
  const { error } = await (supabase as any).rpc("fn_admin_upsert_attendance", {
    p_employee_id: employeeId,
    p_date: date,
    p_check_in_time: checkIn || null,
    p_check_out_time: checkOut || null,
    p_attendance_type: type || "OFFICE",
    p_reason: reason,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}

export async function correctAttendance(
  attendanceId: string,
  prevState: CorrectionActionState,
  formData: FormData,
): Promise<CorrectionActionState> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Only admins can correct attendance.", success: false };
  }

  const field = formData.get("field") as string;
  const newValue = formData.get("value") as string;
  const reason = formData.get("reason") as string;

  if (!field || !newValue || !reason?.trim()) {
    return { error: "Field, value, and reason are all required.", success: false };
  }

  const supabase = await createClient();
  const { error } = await (supabase as any).rpc("fn_admin_correct_attendance", {
    p_attendance_id: attendanceId,
    p_field: field,
    p_new_value: newValue,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}

export async function forceCheckOut(
  attendanceId: string,
  prevState: CorrectionActionState,
  formData: FormData,
): Promise<CorrectionActionState> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Only admins can force check-out.", success: false };
  }

  const reason = formData.get("reason") as string;

  if (!reason?.trim()) {
    return { error: "A reason is required for emergency check-out.", success: false };
  }

  const supabase = await createClient();
  const { error } = await (supabase as any).rpc("fn_admin_force_checkout", {
    p_attendance_id: attendanceId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
