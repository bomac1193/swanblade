/**
 * Workspace Management
 *
 * Manage collaborative workspaces for team sound design:
 * - Create, update, delete workspaces
 * - Manage workspace members
 * - Handle workspace settings and preferences
 */

import type { SoundGeneration } from "@/types";

// ==================== Types ====================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerName: string;

  // Settings
  settings: WorkspaceSettings;

  // Members
  members: WorkspaceMember[];

  // Sound palette
  palette: SoundPalette;

  // Activity
  lastActivityAt: string;
  activityCount: number;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowInvites: boolean;
  allowExports: boolean;
  defaultRole: WorkspaceRole;
  branding?: {
    color: string;
    logo?: string;
  };
  tags: string[];
}

export interface WorkspaceMember {
  userId: string;
  userName: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
  lastActiveAt: string;
  avatar?: string;
  status: "online" | "offline" | "away";
}

export type WorkspaceRole = "owner" | "lead" | "designer" | "viewer";

export interface SoundPalette {
  id: string;
  name: string;
  sounds: PaletteSound[];
  categories: PaletteCategory[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PaletteSound {
  id: string;
  soundId: string; // Reference to SoundGeneration
  sound?: SoundGeneration;
  addedBy: string;
  addedAt: string;
  categoryId?: string;
  notes?: string;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
}

export interface PaletteCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
}

// Activity types
export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  type: ActivityType;
  data: Record<string, unknown>;
  timestamp: string;
}

export type ActivityType =
  | "sound_added"
  | "sound_approved"
  | "sound_rejected"
  | "sound_removed"
  | "member_joined"
  | "member_left"
  | "member_role_changed"
  | "category_created"
  | "category_updated"
  | "settings_updated"
  | "palette_exported";

// ==================== Workspace Manager ====================

export class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();
  private activities: Map<string, WorkspaceActivity[]> = new Map();
  private onActivityCallback?: (activity: WorkspaceActivity) => void;

  // ==================== Workspace CRUD ====================

  createWorkspace(
    ownerId: string,
    ownerName: string,
    name: string,
    settings?: Partial<WorkspaceSettings>
  ): Workspace {
    const now = new Date().toISOString();
    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const workspace: Workspace = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      ownerId,
      ownerName,
      settings: {
        isPublic: false,
        allowInvites: true,
        allowExports: true,
        defaultRole: "designer",
        tags: [],
        ...settings,
      },
      members: [
        {
          userId: ownerId,
          userName: ownerName,
          email: "",
          role: "owner",
          joinedAt: now,
          lastActiveAt: now,
          status: "online",
        },
      ],
      palette: {
        id: `palette_${id}`,
        name: `${name} Palette`,
        sounds: [],
        categories: [
          { id: "uncategorized", name: "Uncategorized", color: "#6b7280", order: 0 },
        ],
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
      lastActivityAt: now,
      activityCount: 0,
    };

    this.workspaces.set(id, workspace);
    this.activities.set(id, []);

    return workspace;
  }

  getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  getUserWorkspaces(userId: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter((ws) =>
      ws.members.some((m) => m.userId === userId)
    );
  }

  updateWorkspace(id: string, updates: Partial<Omit<Workspace, "id" | "createdAt">>): Workspace | undefined {
    const workspace = this.workspaces.get(id);
    if (!workspace) return undefined;

    const updated: Workspace = {
      ...workspace,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.workspaces.set(id, updated);
    return updated;
  }

  deleteWorkspace(id: string): boolean {
    return this.workspaces.delete(id);
  }

  // ==================== Member Management ====================

  addMember(
    workspaceId: string,
    userId: string,
    userName: string,
    email: string,
    role?: WorkspaceRole
  ): WorkspaceMember | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    // Check if already a member
    if (workspace.members.some((m) => m.userId === userId)) {
      return undefined;
    }

    const now = new Date().toISOString();
    const member: WorkspaceMember = {
      userId,
      userName,
      email,
      role: role || workspace.settings.defaultRole,
      joinedAt: now,
      lastActiveAt: now,
      status: "offline",
    };

    workspace.members.push(member);
    workspace.updatedAt = now;

    this.logActivity(workspaceId, userId, userName, "member_joined", { role: member.role });

    return member;
  }

  removeMember(workspaceId: string, userId: string, removedBy: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // Can't remove owner
    if (workspace.ownerId === userId) return false;

    const memberIndex = workspace.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) return false;

    const member = workspace.members[memberIndex];
    workspace.members.splice(memberIndex, 1);
    workspace.updatedAt = new Date().toISOString();

    this.logActivity(workspaceId, removedBy, "", "member_left", { removedUser: member.userName });

    return true;
  }

  updateMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole,
    updatedBy: string
  ): WorkspaceMember | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    const member = workspace.members.find((m) => m.userId === userId);
    if (!member) return undefined;

    // Can't change owner role
    if (member.role === "owner") return undefined;

    const oldRole = member.role;
    member.role = newRole;
    workspace.updatedAt = new Date().toISOString();

    this.logActivity(workspaceId, updatedBy, "", "member_role_changed", {
      targetUser: member.userName,
      oldRole,
      newRole,
    });

    return member;
  }

  updateMemberStatus(workspaceId: string, userId: string, status: WorkspaceMember["status"]): void {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    const member = workspace.members.find((m) => m.userId === userId);
    if (member) {
      member.status = status;
      member.lastActiveAt = new Date().toISOString();
    }
  }

  // ==================== Sound Palette Management ====================

  addSoundToPalette(
    workspaceId: string,
    sound: SoundGeneration,
    addedBy: string,
    options: { categoryId?: string; notes?: string; tags?: string[] } = {}
  ): PaletteSound | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    // Check permissions
    const member = workspace.members.find((m) => m.userId === addedBy);
    if (!member || member.role === "viewer") return undefined;

    const now = new Date().toISOString();
    const paletteSound: PaletteSound = {
      id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      soundId: sound.id,
      sound,
      addedBy,
      addedAt: now,
      categoryId: options.categoryId || "uncategorized",
      notes: options.notes,
      tags: options.tags || [],
      status: member.role === "lead" || member.role === "owner" ? "approved" : "pending",
    };

    // Auto-approve for leads and owners
    if (paletteSound.status === "approved") {
      paletteSound.approvedBy = addedBy;
      paletteSound.approvedAt = now;
    }

    workspace.palette.sounds.push(paletteSound);
    workspace.palette.updatedAt = now;
    workspace.palette.version++;

    this.logActivity(workspaceId, addedBy, member.userName, "sound_added", {
      soundName: sound.name,
      status: paletteSound.status,
    });

    return paletteSound;
  }

  approveSoundInPalette(
    workspaceId: string,
    paletteSoundId: string,
    approvedBy: string
  ): PaletteSound | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    // Check permissions
    const member = workspace.members.find((m) => m.userId === approvedBy);
    if (!member || (member.role !== "lead" && member.role !== "owner")) {
      return undefined;
    }

    const sound = workspace.palette.sounds.find((s) => s.id === paletteSoundId);
    if (!sound) return undefined;

    sound.status = "approved";
    sound.approvedBy = approvedBy;
    sound.approvedAt = new Date().toISOString();
    workspace.palette.version++;

    this.logActivity(workspaceId, approvedBy, member.userName, "sound_approved", {
      soundId: paletteSoundId,
    });

    return sound;
  }

  rejectSoundInPalette(
    workspaceId: string,
    paletteSoundId: string,
    rejectedBy: string
  ): PaletteSound | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    // Check permissions
    const member = workspace.members.find((m) => m.userId === rejectedBy);
    if (!member || (member.role !== "lead" && member.role !== "owner")) {
      return undefined;
    }

    const sound = workspace.palette.sounds.find((s) => s.id === paletteSoundId);
    if (!sound) return undefined;

    sound.status = "rejected";
    workspace.palette.version++;

    this.logActivity(workspaceId, rejectedBy, member.userName, "sound_rejected", {
      soundId: paletteSoundId,
    });

    return sound;
  }

  removeSoundFromPalette(
    workspaceId: string,
    paletteSoundId: string,
    removedBy: string
  ): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // Check permissions
    const member = workspace.members.find((m) => m.userId === removedBy);
    if (!member || member.role === "viewer") return false;

    const soundIndex = workspace.palette.sounds.findIndex((s) => s.id === paletteSoundId);
    if (soundIndex === -1) return false;

    const sound = workspace.palette.sounds[soundIndex];

    // Designers can only remove their own pending sounds
    if (member.role === "designer" && (sound.addedBy !== removedBy || sound.status !== "pending")) {
      return false;
    }

    workspace.palette.sounds.splice(soundIndex, 1);
    workspace.palette.version++;

    this.logActivity(workspaceId, removedBy, member.userName, "sound_removed", {
      soundId: paletteSoundId,
    });

    return true;
  }

  // ==================== Category Management ====================

  addCategory(
    workspaceId: string,
    name: string,
    color: string,
    addedBy: string
  ): PaletteCategory | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    // Check permissions
    const member = workspace.members.find((m) => m.userId === addedBy);
    if (!member || member.role === "viewer") return undefined;

    const category: PaletteCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      color,
      order: workspace.palette.categories.length,
    };

    workspace.palette.categories.push(category);
    workspace.palette.version++;

    this.logActivity(workspaceId, addedBy, member.userName, "category_created", {
      categoryName: name,
    });

    return category;
  }

  updateCategory(
    workspaceId: string,
    categoryId: string,
    updates: Partial<Omit<PaletteCategory, "id">>,
    updatedBy: string
  ): PaletteCategory | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    const category = workspace.palette.categories.find((c) => c.id === categoryId);
    if (!category) return undefined;

    Object.assign(category, updates);
    workspace.palette.version++;

    const member = workspace.members.find((m) => m.userId === updatedBy);
    this.logActivity(workspaceId, updatedBy, member?.userName || "", "category_updated", {
      categoryId,
      updates,
    });

    return category;
  }

  // ==================== Activity Logging ====================

  private logActivity(
    workspaceId: string,
    userId: string,
    userName: string,
    type: ActivityType,
    data: Record<string, unknown>
  ): void {
    const activity: WorkspaceActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      userId,
      userName,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    const activities = this.activities.get(workspaceId) || [];
    activities.push(activity);
    this.activities.set(workspaceId, activities);

    // Update workspace activity count
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.lastActivityAt = activity.timestamp;
      workspace.activityCount++;
    }

    // Notify callback
    this.onActivityCallback?.(activity);
  }

  getActivities(workspaceId: string, limit: number = 50): WorkspaceActivity[] {
    const activities = this.activities.get(workspaceId) || [];
    return activities.slice(-limit).reverse();
  }

  onActivity(callback: (activity: WorkspaceActivity) => void): void {
    this.onActivityCallback = callback;
  }

  // ==================== Export ====================

  exportPalette(workspaceId: string, exportedBy: string): SoundGeneration[] {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return [];

    const member = workspace.members.find((m) => m.userId === exportedBy);
    if (!member || !workspace.settings.allowExports) return [];

    this.logActivity(workspaceId, exportedBy, member.userName, "palette_exported", {});

    return workspace.palette.sounds
      .filter((ps) => ps.status === "approved" && ps.sound)
      .map((ps) => ps.sound!);
  }
}

// Export singleton
export const workspaceManager = new WorkspaceManager();
