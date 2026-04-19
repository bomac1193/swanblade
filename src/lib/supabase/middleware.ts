/**
 * Supabase Middleware Client
 *
 * Use this in middleware.ts for auth checks.
 * Uses lazy import of @supabase/ssr to avoid Turbopack compilation hangs.
 */

import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next({ request });
  }

  if (!supabaseUrl || !supabaseKey || supabaseUrl === "your_supabase_project_url") {
    const protectedPaths = ["/studio", "/member", "/settings"];
    const isProtectedPath = protectedPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      url.searchParams.set("error", "auth_not_configured");
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Pages that require login
  const authProtectedPaths = ["/studio", "/member", "/settings"];
  const isAuthProtected = authProtectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // API routes that require active membership
  const membershipGatedAPIs = [
    "/api/remix",
    "/api/training",
    "/api/generate-sound",
    "/api/generate-lora",
  ];
  const isMembershipGatedAPI = membershipGatedAPIs.some((path) =>
    pathname.startsWith(path)
  );

  // Allow training/models (read-only, needed for UI state) without membership
  const isAllowedWithoutMembership =
    pathname === "/api/training/models" ||
    pathname === "/api/training/active-job";

  // Redirect unauthenticated users from protected pages
  if (isAuthProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login
  if (pathname.startsWith("/login") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/studio";
    return NextResponse.redirect(url);
  }

  // Membership gate: check for active subscription on gated routes
  if (user && (pathname === "/studio" || (isMembershipGatedAPI && !isAllowedWithoutMembership))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_status")
      .eq("id", user.id)
      .single();

    const status = profile?.membership_status;

    if (status !== "active") {
      // API routes: return 403
      if (isMembershipGatedAPI) {
        return NextResponse.json(
          { error: "Active membership required", membership_status: status || "pending" },
          { status: 403 }
        );
      }

      // Studio page: redirect to pricing
      if (pathname === "/studio" || pathname.startsWith("/studio/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/pricing";
        url.searchParams.set("reason", "membership_required");
        return NextResponse.redirect(url);
      }
    }
  }

  // API routes without user: return 401
  if (isMembershipGatedAPI && !isAllowedWithoutMembership && !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return supabaseResponse;
}
