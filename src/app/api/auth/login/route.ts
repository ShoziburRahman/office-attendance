import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    console.log(`[Login API] Attempting login for: ${email}`);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`[Login API] Auth error: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.log(`[Login API] Auth successful. User ID: ${data.user?.id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[Login API] Internal error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
