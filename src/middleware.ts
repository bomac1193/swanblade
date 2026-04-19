/**
 * Swanblade Auth + Membership Middleware
 *
 * In production: protects /studio, /member, /settings and refreshes Supabase sessions.
 * Membership-gated routes require active subscription.
 * In dev: no-op pass-through.
 */

import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next({ request });
  }

  const { updateSession } = await import("@/lib/supabase/middleware");
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/member/:path*",
    "/settings/:path*",
    "/login",
    "/api/remix/:path*",
    "/api/training/:path*",
    "/api/generate-sound/:path*",
    "/api/generate-lora/:path*",
  ],
};
