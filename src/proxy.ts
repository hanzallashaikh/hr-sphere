import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedEmployee = request.nextUrl.pathname.startsWith("/employee");
  const isProtectedHR = request.nextUrl.pathname.startsWith("/hr");
  const isLoginPage = request.nextUrl.pathname === "/";

  // Not logged in — trying to access protected page
  if (!user && (isProtectedEmployee || isProtectedHR)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Logged in
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    // On login page — redirect to correct dashboard
    if (isLoginPage) {
      if (role === "hr") {
        return NextResponse.redirect(new URL("/hr/dashboard", request.url));
      } else {
        return NextResponse.redirect(
          new URL("/employee/dashboard", request.url),
        );
      }
    }

    // HR trying to access employee pages — block
    if (role === "hr" && isProtectedEmployee) {
      return NextResponse.redirect(new URL("/hr/dashboard", request.url));
    }

    // Employee trying to access HR pages — block
    if (role === "employee" && isProtectedHR) {
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/employee/:path*", "/hr/:path*"],
};
