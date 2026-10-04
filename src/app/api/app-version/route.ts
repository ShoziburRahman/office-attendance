import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch the record with the highest version_code
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .order("version_code", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error("[app-version API] Error fetching latest version:", error);
      // Return a default "no update" response to avoid breaking the app
      return NextResponse.json({
        versionCode: 0,
        versionName: "0.0.0",
        apkUrl: "",
        releaseNotes: "",
        forceUpdate: false
      }, { status: 200 });
    }

    // Map database columns to the JSON format expected by the app
    return NextResponse.json({
      versionCode: (data as any).version_code,
      versionName: (data as any).version_name,
      apkUrl: (data as any).apk_url,
      releaseNotes: (data as any).release_notes,
      forceUpdate: (data as any).force_update,
    });
  } catch (error) {
    console.error("[app-version API] Critical error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
