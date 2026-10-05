import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = pathname === "/login" || pathname.startsWith("/api/public");
  const isRootPath = pathname === "/";

  // 1. OPTIMIZATION: Skip heavy auth checks for public and root paths.
  // This prevents the "Loading..." hang by allowing the page to load instantly.
  // Client-side AuthProvider will handle the session check and redirects.
  if (isPublicPath || isRootPath) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isProd = process.env.NODE_ENV === "production";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const secure = isProd;
          request.cookies.set(name, value);
          response.cookies.set({ ...options, name, value, secure });
        },
        remove(name: string, options: CookieOptions) {
          const secure = isProd;
          request.cookies.set(name, "");
          response.cookies.set({ ...options, name, value: "", secure });
        },
      },
    }
  );

  // Only perform the heavy server-side check for protected routes
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  if (pathname === "/login") {
    const rootUrl = new URL("/", request.url);
    const redirectResponse = NextResponse.redirect(rootUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      const empUrl = new URL("/employee", request.url);
      const redirectResponse = NextResponse.redirect(empUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
    if (pathname.startsWith("/employee") && role !== "EMPLOYEE") {
      const adminUrl = new URL("/admin", request.url);
      const redirectResponse = NextResponse.redirect(adminUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
