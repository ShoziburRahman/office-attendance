"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { AttendanceRow as Attendance, AdditionalAttendanceRequestRow as AdditionalAttendanceRequest } from "@/types/database";

export interface CheckInParams {
  type: 'OFFICE' | 'WORK_FROM_HOME';
  wifiSsid?: string | null;
  wifiBssid?: string | null;
  qrToken?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
}

export interface CheckOutParams {
  attendanceId: string;
  wifiSsid?: string | null;
  wifiBssid?: string | null;
  qrToken?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
}

/**
 * Server actions for employee attendance.
 * These replace the AttendanceService to maintain the server/client boundary.
 */

export async function checkIn(params: CheckInParams): Promise<Attendance> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await (supabase as any).rpc('fn_check_in', {
    p_attendance_type: params.type,
    p_wifi_ssid: params.wifiSsid,
    p_wifi_bssid: params.wifiBssid,
    p_qr_token: params.qrToken,
    p_lat: params.latitude,
    p_lon: params.longitude,
    p_accuracy: params.locationAccuracy,
  });

  if (error) {
    // Extract only the message from the Postgres error to avoid sending the whole object to the client
    const message = error.message || "An unexpected error occurred during check-in.";
    throw new Error(message);
  }
  if (!data) throw new Error("Check-in failed: No record returned.");

  revalidatePath("/employee");
  return data;
}

export async function checkOut(params: CheckOutParams): Promise<Attendance> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await (supabase as any).rpc('fn_check_out', {
    p_attendance_id: params.attendanceId,
    p_wifi_ssid: params.wifiSsid,
    p_wifi_bssid: params.wifiBssid,
    p_qr_token: params.qrToken,
    p_lat: params.latitude,
    p_lon: params.longitude,
    p_accuracy: params.locationAccuracy,
  });

  if (error) {
    const message = error.message || "An unexpected error occurred during check-out.";
    throw new Error(message);
  }
  if (!data) throw new Error("Check-out failed: No record returned.");

  revalidatePath("/employee");
  return data;
}

export async function requestAdditionalSession(reason: string): Promise<AdditionalAttendanceRequest> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await (supabase as any).rpc('fn_request_additional_checkin', {
    p_reason: reason,
  });

  if (error) throw error;
  if (!data) throw new Error("Request failed: No record returned.");

  return data;
}

export async function requestWfh(reason: string): Promise<{ id: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  // Use the database's fn_office_today() to ensure the request date matches the
  // office's timezone-aware "today", preventing timezone mismatches between
  // server UTC and office local time.
  const { data: dateData, error: dateError } = await (supabase as any).rpc("fn_office_today");

  let officeToday: string;
  if (dateError) {
    console.error("Error fetching office today date:", dateError);
    officeToday = new Date().toISOString().slice(0, 10);
  } else {
    officeToday = dateData;
  }

  const { data, error } = await (supabase as any).from("wfh_requests").insert({
    employee_id: user.authId,
    request_date: officeToday,
    reason: reason,
    status: "PENDING",
  }).select().single();

  if (error) throw error;
  if (!data) throw new Error("WFH request failed: No record returned.");

  return { id: data.id };
}
