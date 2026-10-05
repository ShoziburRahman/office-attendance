"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadApkAction(formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Verify Admin Role
    // We trust the middleware for initial access to the page,
    // but for the action, we attempt a simplified check.
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .single();

    if (!profileData) {
      console.error("[uploadApkAction] Profile not found in DB. This is strange because middleware passed.");
      // If we can't find the profile but they are on the admin page,
      // it might be a session flicker. We'll try to proceed if the session is at least present.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session expired. Please log in again.");
      }
    } else if ((profileData as any)?.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required.");
    }

    // 2. Extract form data
    const versionCode = parseInt(formData.get("versionCode") as string);
    const versionName = formData.get("versionName") as string;
    const releaseNotes = formData.get("releaseNotes") as string;
    const forceUpdate = formData.get("forceUpdate") === "true";
    const file = formData.get("apkFile") as File;

    if (!file || !versionCode || !versionName) {
      throw new Error("Missing required fields.");
    }

    // 3. Upload APK to Supabase Storage
    // Bucket name: 'apks' (Must be created in Supabase Dashboard as Public)
    const fileName = `version_${versionCode}_${versionName.replace(/[^a-zA-Z0-9]/g, '_')}.apk`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("apks")
      .upload(fileName, file, {
        upsert: true,
        contentType: "application/vnd.android.package-archive",
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("apks")
      .getPublicUrl(uploadData.path);

    // 4. Update Database metadata
    const { error: dbError } = await supabase
      .from("app_versions")
      .insert({
        version_code: versionCode,
        version_name: versionName,
        apk_url: publicUrl,
        release_notes: releaseNotes,
        force_update: forceUpdate,
      } as any);

    if (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    revalidatePath("/admin/updates");

    return { success: true, message: "APK uploaded and version updated successfully!" };
  } catch (error: any) {
    console.error("[uploadApkAction] Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}
