"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import crypto from "crypto";
import type { AttendanceRow as Attendance, AdditionalAttendanceRequestRow as AdditionalAttendanceRequest } from "@/types/database";

export interface CheckInParams {
  type: 'OFFICE' | 'WORK_FROM_HOME';
  wifiSsid?: string | null;
  wifiBssid?: string | null;
  biometricSignature?: string;
  challengeId?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
}

export interface CheckOutParams {
  attendanceId: string;
  wifiSsid?: string | null;
  wifiBssid?: string | null;
  biometricSignature?: string;
  challengeId?: string;
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

  // Biometric Verification
  if (params.biometricSignature && params.challengeId) {
    await verifyBiometricSignature(params.biometricSignature, params.challengeId, "CHECK_IN");
  } else {
    // If no biometric, we can't verify identity.
    throw new Error("Identity verification required. Please use biometric authentication.");
  }

  const { data, error } = await (supabase as any).rpc('fn_check_in', {
    p_attendance_type: params.type,
    p_wifi_ssid: params.wifiSsid,
    p_wifi_bssid: params.wifiBssid,
    p_lat: params.latitude,
    p_lon: params.longitude,
    p_accuracy: params.locationAccuracy,
  });

  if (error) {
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

  // Biometric Verification
  if (params.biometricSignature && params.challengeId) {
    await verifyBiometricSignature(params.biometricSignature, params.challengeId, "CHECK_OUT");
  } else {
    throw new Error("Identity verification required. Please use biometric authentication.");
  }

  const { data, error } = await (supabase as any).rpc('fn_check_out', {
    p_attendance_id: params.attendanceId,
    p_wifi_ssid: params.wifiSsid,
    p_wifi_bssid: params.wifiBssid,
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

export interface DeviceRegistrationParams {
  publicKey: string;
  deviceName: string;
  deviceModel: string;
  appVersion: string;
}

export async function requestDeviceRegistration(params: DeviceRegistrationParams): Promise<{ id: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await (supabase as any).from("employee_devices").insert({
    employee_id: user.authId,
    public_key: params.publicKey,
    device_name: params.deviceName,
    device_model: params.deviceModel,
    app_version: params.appVersion,
    status: "PENDING",
  }).select().single();

  if (error) throw error;
  return { id: data.id };
}

export async function getBiometricChallenge(action: "CHECK_IN" | "CHECK_OUT"): Promise<{ challenge: string; challengeId: string; expiresAt: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  // Find an active device for the user
  const { data: deviceData } = await (supabase as any)
    .from("employee_devices")
    .select("id")
    .eq("employee_id", user.authId)
    .eq("status", "APPROVED")
    .limit(1);

  const device = deviceData?.[0];

  if (!device) {
    throw new Error("No approved device found. Please register your device first.");
  }

  const challenge = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: challengeData, error } = await (supabase as any).from("biometric_challenges").insert({
    employee_id: user.authId,
    device_id: device.id,
    challenge,
    action,
    expires_at: expiresAt,
  }).select().single();

  if (error) throw error;
  if (!challengeData) throw new Error("Failed to create biometric challenge.");

  return {
    challenge: challengeData.challenge,
    challengeId: challengeData.id,
    expiresAt: challengeData.expires_at
  };
}

async function verifyBiometricSignature(signature: string, challengeId: string, action: "CHECK_IN" | "CHECK_OUT") {
  const user = await requireUser();
  const supabase = await createClient();

  // 1. Get the challenge
  const { data: challengeRow, error: challengeError } = await (supabase as any)
    .from("biometric_challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (challengeError || !challengeRow) throw new Error("Invalid or expired challenge.");
  if (challengeRow.employee_id !== user.authId) throw new Error("Challenge does not belong to this user.");
  if (challengeRow.action !== action) throw new Error("Incorrect action for this challenge.");
  if (new Date() > new Date(challengeRow.expires_at)) throw new Error("Challenge has expired.");
  if (challengeRow.consumed_at) throw new Error("Challenge already consumed.");

  // 2. Get the associated device's public key
  const { data: device, error: deviceError } = await (supabase as any)
    .from("employee_devices")
    .select("public_key, status")
    .eq("id", challengeRow.device_id)
    .single();

  if (deviceError || !device) throw new Error("Associated device not found.");
  if (device.status !== "APPROVED") throw new Error("Device is not approved.");

  // 3. Verify the signature
  // The signed data is the challenge itself.
  try {
    const isVerified = crypto.verify(
      "sha256",
      Buffer.from(challengeRow.challenge),
      {
        key: crypto.createPublicKey({
          key: Buffer.from(device.public_key, "base64"),
          format: "der",
          type: "spki",
        }),
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      Buffer.from(signature, "base64")
    );

    if (!isVerified) {
      throw new Error("Cryptographic verification failed. Identity not confirmed.");
    }
  } catch (e: any) {
    console.error("Biometric verification error:", e);
    throw new Error(`Biometric security verification failed: ${e.message}`);
  }

  // 4. Consume the challenge to prevent replay
  await (supabase as any)
    .from("biometric_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challengeId);

  return true;
}

export async function checkDeviceStatus(): Promise<{ status: string; deviceName?: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("employee_devices")
    .select("status, device_name")
    .eq("employee_id", user.authId);

  if (error || !data || data.length === 0) {
    return { status: "UNREGISTERED" };
  }

  // Priority: APPROVED > PENDING > REVOKED > REJECTED
  const priority: Record<string, number> = {
    APPROVED: 1,
    PENDING: 2,
    REVOKED: 3,
    REJECTED: 4,
  };

  const bestDevice = data.reduce((prev: any, curr: any) => {
    const prevScore = priority[prev.status] || 99;
    const currScore = priority[curr.status] || 99;
    return currScore < prevScore ? curr : prev;
  });

  return {
    status: bestDevice.status === "APPROVED" ? "REGISTERED" : bestDevice.status,
    deviceName: bestDevice.device_name
  };
}

export async function getAllDevices(): Promise<any[]> {
  const user = await requireUser();
  if (user.profile.role !== "ADMIN") {
    throw new Error("Only admins can view device management.");
  }

  const supabase = await createClient();

  // Correct the join path: employee_devices -> employees -> profiles
  const { data, error } = await supabase
    .from("employee_devices")
    .select(`
      *,
      employees (
        employee_code,
        profiles (
          full_name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all devices:", error);
    throw new Error(`Failed to fetch devices: ${error.message}`);
  }
  return data;
}
