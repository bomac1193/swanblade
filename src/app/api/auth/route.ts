/**
 * Authentication API
 *
 * Simple auth for collaborative features:
 * - POST: Login / Register / Logout
 * - GET: Get current user
 *
 * Note: In production, use a proper auth provider (Auth.js, Clerk, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple in-memory user store (use a database in production)
const users = new Map<string, User>();
const sessions = new Map<string, Session>();

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

interface Session {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// Session duration: 7 days
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// ==================== GET ====================

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ authenticated: false });
  }

  const session = sessions.get(sessionId);
  if (!session || new Date(session.expiresAt) < new Date()) {
    // Session expired or not found
    sessions.delete(sessionId);
    const response = NextResponse.json({ authenticated: false });
    response.cookies.delete("session_id");
    return response;
  }

  const user = users.get(session.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Login
    if (action === "login") {
      const { email, password } = body;

      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      // Find user by email
      let user: User | undefined;
      for (const u of users.values()) {
        if (u.email === email) {
          user = u;
          break;
        }
      }

      // In a demo, auto-create user if not exists
      if (!user) {
        user = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          email,
          name: email.split("@")[0],
          createdAt: new Date().toISOString(),
        };
        users.set(user.id, user);
      }

      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      const session: Session = {
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
      };
      sessions.set(sessionId, session);

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });

      // Set session cookie
      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_MS / 1000,
        path: "/",
      });

      return response;
    }

    // Register
    if (action === "register") {
      const { email, name, password } = body;

      if (!email || !name) {
        return NextResponse.json(
          { error: "Email and name are required" },
          { status: 400 }
        );
      }

      // Check if email already exists
      for (const u of users.values()) {
        if (u.email === email) {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 400 }
          );
        }
      }

      // Create user
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email,
        name,
        createdAt: new Date().toISOString(),
      };
      users.set(user.id, user);

      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      const session: Session = {
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
      };
      sessions.set(sessionId, session);

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });

      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_MS / 1000,
        path: "/",
      });

      return response;
    }

    // Logout
    if (action === "logout") {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session_id")?.value;

      if (sessionId) {
        sessions.delete(sessionId);
      }

      const response = NextResponse.json({ success: true });
      response.cookies.delete("session_id");
      return response;
    }

    // Update profile
    if (action === "update_profile") {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session_id")?.value;

      if (!sessionId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }

      const user = users.get(session.userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { name, avatar } = body;
      if (name) user.name = name;
      if (avatar !== undefined) user.avatar = avatar;

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
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
