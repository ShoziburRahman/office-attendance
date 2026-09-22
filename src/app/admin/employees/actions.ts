"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import {
  validateEmployeeForm,
  hasErrors,
  type EmployeeFormInput,
  type ScheduleInput,
  type WeeklyOffInput,
  type LeaveInput,
  validateSchedule,
  validateWeeklyOff,
  validateLeave,
} from "@/lib/validation/employee";
import {
  type EmployeeActionState,
  type ScheduleActionState,
  type WeeklyOffActionState,
  type LeaveActionState,
} from "./state";

function readEmployeeForm(formData: FormData): EmployeeFormInput & { avatarFile?: File } {
  const avatar = formData.get("avatarFile");
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim(),
    employeeCode: String(formData.get("employeeCode") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    position: String(formData.get("position") ?? "").trim(),
    joiningDate: String(formData.get("joiningDate") ?? ""),
    allowMultipleSessions: formData.get("allowMultipleSessions") === "on",
    biometricRequired: formData.get("biometricRequired") === "on",
    baseSalary: String(formData.get("baseSalary") ?? "").trim(),
    avatarFile: avatar instanceof File ? avatar : undefined,
  };
}

function readScheduleForm(formData: FormData): ScheduleInput {
  return {
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    requiredMinutes: String(formData.get("requiredMinutes") ?? "").trim(),
    breakMinutes: String(formData.get("breakMinutes") ?? "").trim(),
    effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
  };
}

function readWeeklyOffForm(formData: FormData): WeeklyOffInput {
  return {
    dayOfWeek: String(formData.get("dayOfWeek") ?? "").trim(),
    effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
  };
}

function readLeaveForm(formData: FormData): LeaveInput {
  return {
    leaveDate: String(formData.get("leaveDate") ?? "").trim(),
    leaveType: String(formData.get("leaveType") ?? "") as "PAID" | "UNPAID",
    reason: String(formData.get("reason") ?? "").trim(),
  };
}

/** Generates a temporary password meeting Supabase's default minimum length. */
function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Creates a new employee.
 */
export async function createEmployee(
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Only admins can add employees." };
  }

  const input = readEmployeeForm(formData);
  const fieldErrors = validateEmployeeForm(input);
  if (hasErrors(fieldErrors)) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  const adminClient = createAdminClient();
  const temporaryPassword = generateTemporaryPassword();

  const { data: created, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (authError || !created.user) {
    const message = authError?.message.includes("already registered")
      ? "An account with this email already exists."
      : authError?.message || "Could not create the login account. Please try again.";
    return { error: message };
  }

  const newUserId = created.user.id;
  const supabase = await createClient();

  const { error: profileError } = await (supabase as any).from("profiles").insert({
    id: newUserId,
    role: "EMPLOYEE",
    full_name: input.fullName,
    email: input.email,
    phone: input.phone || null,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    return { error: "Could not save the employee's profile. Please try again." };
  }

  const { error: employeeError } = await (supabase as any).from("employees").insert({
    id: newUserId,
    employee_code: input.employeeCode,
    department: input.department,
    position: input.position,
    joining_date: input.joiningDate,
    allow_multiple_sessions: input.allowMultipleSessions,
    biometric_required: input.biometricRequired,
    base_salary: input.baseSalary ? parseFloat(input.baseSalary) : null,
  });

  if (employeeError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    const message = employeeError.message.includes("employees_employee_code_key")
      ? "That employee ID is already in use."
      : "Could not save employment details. Please try again.";
    return { error: message };
  }

  revalidatePath("/admin/employees");
  return { error: null, temporaryPassword };
}

/** Updates an existing employee. */
export async function updateEmployee(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Only admins can edit employees." };
  }

  const input = readEmployeeForm(formData);
  const fieldErrors = validateEmployeeForm(input);
  if (hasErrors(fieldErrors)) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();

  // Handle profile picture upload
  let avatarUrl = null;

  // Get current avatar if no new one is provided
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", employeeId)
    .single();
  avatarUrl = (currentProfile as any)?.avatar_url || null;

  if (input.avatarFile) {
    const file = input.avatarFile;
    const fileExt = file.name.split(".").pop();
    const fileName = `${employeeId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) {
      return { error: `Failed to upload profile picture: ${uploadError.message}` };
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    avatarUrl = publicUrl;
  }

  const { error: profileError } = await (supabase as any).from("profiles")
    .update({
      full_name: input.fullName,
      phone: input.phone || null,
      avatar_url: avatarUrl
    })
    .eq("id", employeeId);

  if (profileError) {
    return { error: "Could not update the employee's profile." };
  }

  const { error: employeeError } = await (supabase as any).from("employees")
    .update({
      employee_code: input.employeeCode,
      department: input.department,
      position: input.position,
      joining_date: input.joiningDate,
      allow_multiple_sessions: input.allowMultipleSessions,
      biometric_required: input.biometricRequired,
      base_salary: input.baseSalary ? parseFloat(input.baseSalary) : null,
    })
    .eq("id", employeeId);

  if (employeeError) {
    const message = employeeError.message.includes("employees_employee_code_key")
      ? "That employee ID is already in use."
      : "Could not update employment details.";
    return { error: message };
  }

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
  return { error: null };
}

/** Deactivates or reactivates an employee. */
export async function setEmployeeActive(employeeId: string, isActive: boolean): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Only admins can change employee status.");
  }

  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("employees")
    .update({
      is_active: isActive,
      deactivated_at: isActive ? null : new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error("Could not update employee status.");
  }

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
}

// --- Phase 3 Actions ---

/**
 * Adds a new work schedule for an employee.
 * Implements "Close-and-Create" temporal logic via RPC.
 */
export async function addEmployeeSchedule(
  employeeId: string,
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const currentUser = await requireUser();

  const input = readScheduleForm(formData);
  const fieldErrors = validateSchedule(input);
  if (hasErrors(fieldErrors)) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();

  const { error: rpcError } = await (supabase as any).rpc("upsert_employee_schedule", {
    p_employee_id: employeeId,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_required_minutes: parseInt(input.requiredMinutes),
    p_break_minutes: parseInt(input.breakMinutes),
    p_effective_from: input.effectiveFrom,
    p_created_by: currentUser.authId,
  });

  if (rpcError) {
    // Map "Unauthorized" from RPC to a user-friendly error
    const message = rpcError.message.includes("Unauthorized")
      ? "Unauthorized."
      : rpcError.message;
    return { error: message };
  }

  revalidatePath(`/admin/employees/${employeeId}`);
  return { error: null };
}

export async function deleteEmployeeSchedule(scheduleId: string): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") throw new Error("Unauthorized.");

  const adminClient = createAdminClient();
  const { error, data } = await adminClient
    .from("employee_schedules")
    .delete()
    .eq("id", scheduleId)
    .select();

  if (error) {
    if (error.code === "23503") {
      throw new Error("This schedule cannot be deleted because it is referenced by existing attendance records. Please close the schedule instead.");
    }
    throw new Error(`Could not delete schedule: ${error.message}`);
  }
  if (!data || data.length === 0) throw new Error("Schedule not found or already deleted.");

  revalidatePath("/admin/schedules");
  revalidatePath("/admin/employees");
}

/**
 * Adds a new weekly off configuration.
 * Implements "Close-and-Create" temporal logic.
 */
export async function addWeeklyOff(
  employeeId: string,
  _prevState: WeeklyOffActionState,
  formData: FormData,
): Promise<WeeklyOffActionState> {
  const currentUser = await requireUser();

  const input = readWeeklyOffForm(formData);
  const fieldErrors = validateWeeklyOff(input);
  if (hasErrors(fieldErrors)) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();

  const { error: rpcError } = await (supabase as any).rpc("upsert_weekly_off", {
    p_employee_id: employeeId,
    p_day_of_week: parseInt(input.dayOfWeek),
    p_effective_from: input.effectiveFrom,
    p_created_by: currentUser.authId,
  });

  if (rpcError) {
    // Map "Unauthorized" from RPC to a user-friendly error
    const message = rpcError.message.includes("Unauthorized")
      ? "Unauthorized."
      : rpcError.message;
    return { error: message };
  }

  revalidatePath(`/admin/employees/${employeeId}`);
  return { error: null };
}

export async function removeWeeklyOff(offId: string): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") throw new Error("Unauthorized.");

  const adminClient = createAdminClient();
  const { error, data } = await adminClient
    .from("weekly_off_schedules")
    .delete()
    .eq("id", offId)
    .select();

  if (error) throw new Error(`Could not remove weekly off: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Weekly off record not found or already removed.");
}

/**
 * Adds a leave entry.
 */
export async function addEmployeeLeave(
  employeeId: string,
  _prevState: LeaveActionState,
  formData: FormData,
): Promise<LeaveActionState> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Unauthorized." };
  }

  const input = readLeaveForm(formData);
  const fieldErrors = validateLeave(input);
  if (hasErrors(fieldErrors)) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { error: insertError } = await (supabase as any).from("employee_leaves").insert({
    employee_id: employeeId,
    leave_date: input.leaveDate,
    leave_type: input.leaveType,
    reason: input.reason,
    created_by: currentUser.authId,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/admin/employees/${employeeId}`);
  return { error: null };
}

export async function deleteEmployeeLeave(leaveId: string): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") throw new Error("Unauthorized.");

  const adminClient = createAdminClient();
  const { error, data } = await adminClient
    .from("employee_leaves")
    .delete()
    .eq("id", leaveId)
    .select();

  if (error) throw new Error(`Could not delete leave record: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Leave record not found or already deleted.");
}
