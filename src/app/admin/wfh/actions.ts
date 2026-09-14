"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { WfhStatus } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function updateWfhRequest(
  requestId: string,
  status: WfhStatus,
  adminNotes?: string,
): Promise<{ error: string | null }> {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    return { error: "Only admins can update WFH requests." };
  }

  const supabase = await createClient();

  // Use any cast to bypass the 'never' type error caused by the missing table definition in the Supabase client's generic
  const { error } = await (supabase as any)
    .from("wfh_requests")
    .update({
      status,
      admin_notes: adminNotes,
      approved_by: currentUser.authId,
      approved_at: status === "APPROVED" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { error: error.message || "Could not update WFH request." };
  }

  revalidatePath("/admin/wfh");
  return { error: null };
}
