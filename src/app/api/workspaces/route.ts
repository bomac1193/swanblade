/**
 * Workspaces API
 *
 * CRUD operations for collaborative workspaces:
 * - GET: List workspaces or get specific workspace
 * - POST: Create workspace, add members, add sounds
 * - PUT: Update workspace, member roles
 * - DELETE: Delete workspace, remove members, remove sounds
 */

import { NextRequest, NextResponse } from "next/server";
import { workspaceManager, type WorkspaceRole } from "@/lib/collaboration/workspace";
import { PermissionChecker } from "@/lib/collaboration/permissions";
import type { SoundGeneration } from "@/types";

// Helper to get user from request (in production, use proper auth)
function getUser(request: NextRequest): { id: string; name: string; email: string } | null {
  const userId = request.headers.get("x-user-id");
  const userName = request.headers.get("x-user-name");
  const userEmail = request.headers.get("x-user-email");

  if (!userId || !userName) return null;

  return { id: userId, name: userName, email: userEmail || "" };
}

// ==================== GET ====================

export async function GET(request: NextRequest) {
  const user = getUser(request);
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("id");

  // Get specific workspace
  if (workspaceId) {
    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Check if user has access
    if (user) {
      const member = workspace.members.find((m) => m.userId === user.id);
      if (!member && !workspace.settings.isPublic) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (!workspace.settings.isPublic) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get activity
    const activities = workspaceManager.getActivities(workspaceId, 20);

    return NextResponse.json({
      workspace,
      activities,
      userRole: user
        ? workspace.members.find((m) => m.userId === user.id)?.role
        : null,
    });
  }

  // List user's workspaces
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const workspaces = workspaceManager.getUserWorkspaces(user.id);

  return NextResponse.json({
    workspaces: workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      description: ws.description,
      memberCount: ws.members.length,
      soundCount: ws.palette.sounds.filter((s) => s.status === "approved").length,
      pendingCount: ws.palette.sounds.filter((s) => s.status === "pending").length,
      lastActivityAt: ws.lastActivityAt,
      userRole: ws.members.find((m) => m.userId === user.id)?.role,
    })),
    total: workspaces.length,
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  const user = getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, workspaceId } = body;

    // Create workspace
    if (action === "create") {
      const { name, description, settings } = body;
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }

      const workspace = workspaceManager.createWorkspace(
        user.id,
        user.name,
        name,
        settings
      );

      if (description) {
        workspaceManager.updateWorkspace(workspace.id, { description });
      }

      return NextResponse.json({ workspace, created: true });
    }

    // Get workspace and check permissions for other actions
    const workspace = workspaceId ? workspaceManager.getWorkspace(workspaceId) : null;
    if (!workspace && workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const member = workspace?.members.find((m) => m.userId === user.id);
    const userRole = member?.role || "viewer";

    // Invite member
    if (action === "invite" && workspace) {
      if (!PermissionChecker.canPerform(userRole, "invite_member")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { inviteEmail, inviteName, inviteId, role } = body;
      if (!inviteId || !inviteName) {
        return NextResponse.json(
          { error: "inviteId and inviteName are required" },
          { status: 400 }
        );
      }

      const newMember = workspaceManager.addMember(
        workspaceId,
        inviteId,
        inviteName,
        inviteEmail || "",
        role
      );

      if (!newMember) {
        return NextResponse.json(
          { error: "Failed to add member (may already exist)" },
          { status: 400 }
        );
      }

      return NextResponse.json({ member: newMember, invited: true });
    }

    // Add sound to palette
    if (action === "add_sound" && workspace) {
      if (!PermissionChecker.canPerform(userRole, "add_sound")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { sound, categoryId, notes, tags } = body as {
        sound: SoundGeneration;
        categoryId?: string;
        notes?: string;
        tags?: string[];
      };

      if (!sound) {
        return NextResponse.json({ error: "sound is required" }, { status: 400 });
      }

      const paletteSound = workspaceManager.addSoundToPalette(
        workspaceId,
        sound,
        user.id,
        { categoryId, notes, tags }
      );

      if (!paletteSound) {
        return NextResponse.json({ error: "Failed to add sound" }, { status: 400 });
      }

      return NextResponse.json({ paletteSound, added: true });
    }

    // Approve sound
    if (action === "approve_sound" && workspace) {
      if (!PermissionChecker.canPerform(userRole, "approve_sound")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { paletteSoundId } = body;
      const approved = workspaceManager.approveSoundInPalette(
        workspaceId,
        paletteSoundId,
        user.id
      );

      if (!approved) {
        return NextResponse.json({ error: "Failed to approve sound" }, { status: 400 });
      }

      return NextResponse.json({ paletteSound: approved, approved: true });
    }

    // Reject sound
    if (action === "reject_sound" && workspace) {
      if (!PermissionChecker.canPerform(userRole, "reject_sound")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { paletteSoundId } = body;
      const rejected = workspaceManager.rejectSoundInPalette(
        workspaceId,
        paletteSoundId,
        user.id
      );

      if (!rejected) {
        return NextResponse.json({ error: "Failed to reject sound" }, { status: 400 });
      }

      return NextResponse.json({ paletteSound: rejected, rejected: true });
    }

    // Add category
    if (action === "add_category" && workspace) {
      if (!PermissionChecker.canPerform(userRole, "create_category")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { categoryName, categoryColor } = body;
      if (!categoryName) {
        return NextResponse.json({ error: "categoryName is required" }, { status: 400 });
      }

      const category = workspaceManager.addCategory(
        workspaceId,
        categoryName,
        categoryColor || "#6b7280",
        user.id
      );

      if (!category) {
        return NextResponse.json({ error: "Failed to add category" }, { status: 400 });
      }

      return NextResponse.json({ category, created: true });
    }

    // Export palette
    if (action === "export" && workspace) {
      if (!PermissionChecker.canPerform(userRole, "export_palette")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const sounds = workspaceManager.exportPalette(workspaceId, user.id);

      return NextResponse.json({
        sounds,
        total: sounds.length,
        exportedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Workspaces API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== PUT ====================

export async function PUT(request: NextRequest) {
  const user = getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { workspaceId, action } = body;

    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const member = workspace.members.find((m) => m.userId === user.id);
    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Update workspace details
    if (action === "update_workspace") {
      if (!PermissionChecker.canPerform(member.role, "edit_workspace")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { name, description, settings } = body;
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (settings) updates.settings = { ...workspace.settings, ...settings };

      const updated = workspaceManager.updateWorkspace(workspaceId, updates);
      return NextResponse.json({ workspace: updated, updated: true });
    }

    // Update member role
    if (action === "update_role") {
      if (!PermissionChecker.canPerform(member.role, "change_role")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { targetUserId, newRole } = body;
      const targetMember = workspace.members.find((m) => m.userId === targetUserId);

      if (!targetMember) {
        return NextResponse.json({ error: "Target member not found" }, { status: 404 });
      }

      if (!PermissionChecker.canChangeRole(member.role, targetMember.role, newRole)) {
        return NextResponse.json({ error: "Cannot assign this role" }, { status: 403 });
      }

      const updated = workspaceManager.updateMemberRole(
        workspaceId,
        targetUserId,
        newRole,
        user.id
      );

      return NextResponse.json({ member: updated, updated: true });
    }

    // Update category
    if (action === "update_category") {
      if (!PermissionChecker.canPerform(member.role, "edit_category")) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const { categoryId, updates } = body;
      const updated = workspaceManager.updateCategory(
        workspaceId,
        categoryId,
        updates,
        user.id
      );

      if (!updated) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }

      return NextResponse.json({ category: updated, updated: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Workspaces API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================

export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const action = searchParams.get("action");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const workspace = workspaceManager.getWorkspace(workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const member = workspace.members.find((m) => m.userId === user.id);
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Delete workspace
  if (action === "workspace") {
    if (!PermissionChecker.canPerform(member.role, "delete_workspace")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const deleted = workspaceManager.deleteWorkspace(workspaceId);
    return NextResponse.json({ deleted, workspaceId });
  }

  // Remove member
  if (action === "member") {
    const targetUserId = searchParams.get("userId");
    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Users can remove themselves
    if (targetUserId !== user.id && !PermissionChecker.canPerform(member.role, "remove_member")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const removed = workspaceManager.removeMember(workspaceId, targetUserId, user.id);
    return NextResponse.json({ removed, userId: targetUserId });
  }

  // Remove sound
  if (action === "sound") {
    const paletteSoundId = searchParams.get("soundId");
    if (!paletteSoundId) {
      return NextResponse.json({ error: "soundId is required" }, { status: 400 });
    }

    const sound = workspace.palette.sounds.find((s) => s.id === paletteSoundId);
    const canRemove = PermissionChecker.canPerform(member.role, "remove_sound", {
      ownerId: sound?.addedBy,
      userId: user.id,
    });

    if (!canRemove) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const removed = workspaceManager.removeSoundFromPalette(
      workspaceId,
      paletteSoundId,
      user.id
    );
    return NextResponse.json({ removed, soundId: paletteSoundId });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
