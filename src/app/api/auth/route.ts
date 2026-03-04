/**
 * Authentication API
 *
 * Server-side auth operations using Supabase
 *
 * POST: Login / Register / Logout / Update Profile
 * GET: Get current user
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ==================== GET ====================

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ authenticated: false });
  }

  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name || user.email?.split("@")[0],
      avatar: profile?.avatar_url || user.user_metadata?.avatar_url,
      membership_tier: profile?.membership_tier || "pending",
      membership_status: profile?.membership_status || "pending",
      invite_code: profile?.invite_code,
    },
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const supabase = await createClient();

    // Login with email/password
    if (action === "login") {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    }

    // Register
    if (action === "register") {
      const { email, password, name } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        message: "Check your email to confirm your account",
      });
    }

    // Logout
    if (action === "logout") {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Update profile
    if (action === "update_profile") {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      const { name, avatar_url } = body;
      const updates: Record<string, string> = {};
      if (name) updates.name = name;
      if (avatar_url) updates.avatar_url = avatar_url;

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Auth API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
