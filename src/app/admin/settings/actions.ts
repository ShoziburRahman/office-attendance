"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export async function updateSettings(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Only admins can update settings.");
  }

  const updates: any = {};
  if (formData.get("office_timezone")) updates.office_timezone = formData.get("office_timezone");
  if (formData.get("default_required_minutes")) updates.default_required_minutes = parseInt(formData.get("default_required_minutes") as string);
  if (formData.get("default_break_minutes")) updates.default_break_minutes = parseInt(formData.get("default_break_minutes") as string);
  if (formData.get("min_minutes_before_checkout")) updates.min_minutes_before_checkout = parseInt(formData.get("min_minutes_before_checkout") as string);
  if (formData.get("max_session_minutes")) updates.max_session_minutes = parseInt(formData.get("max_session_minutes") as string);
  if (formData.get("qr_token_ttl_seconds")) updates.qr_token_ttl_seconds = parseInt(formData.get("qr_token_ttl_seconds") as string);
  if (formData.get("office_latitude")) updates.office_latitude = parseFloat(formData.get("office_latitude") as string);
  if (formData.get("office_longitude")) updates.office_longitude = parseFloat(formData.get("office_longitude") as string);
  if (formData.get("allowed_radius")) updates.allowed_radius = parseInt(formData.get("allowed_radius") as string);
  if (formData.get("location_accuracy_threshold")) updates.location_accuracy_threshold = parseInt(formData.get("location_accuracy_threshold") as string);
  if (formData.get("fixed_qr_token")) updates.fixed_qr_token = formData.get("fixed_qr_token");

  const wifiSsid = formData.get("office_wifi_ssids") as string;
  if (wifiSsid !== null) {
    updates.office_wifi_ssids = wifiSsid.split(",").map(s => s.trim()).filter(Boolean);
  }

  const wifiBssid = formData.get("office_wifi_bssids") as string;
  if (wifiBssid !== null) {
    updates.office_wifi_bssids = wifiBssid.split(",").map(s => s.trim()).filter(Boolean);
  }

  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("office_settings")
      .update(updates)
      .eq("id", 1) // Assuming a single-row settings table with id=1
      .single();

    if (error) {
      throw new Error(error.message || "Could not update settings.");
    }
  } catch (error: any) {
    throw error;
  }
}
