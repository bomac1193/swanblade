/**
 * Permission System
 *
 * Role-based access control for collaborative workspaces:
 * - Owner: Full control
 * - Lead: Approve sounds, manage categories, invite members
 * - Designer: Add sounds, create categories
 * - Viewer: View only
 */

import type { WorkspaceRole } from "./workspace";

// ==================== Permission Types ====================

export type Permission =
  // Workspace permissions
  | "workspace.view"
  | "workspace.edit"
  | "workspace.delete"
  | "workspace.settings"
  | "workspace.invite"
  | "workspace.remove_member"
  | "workspace.change_roles"

  // Palette permissions
  | "palette.view"
  | "palette.add_sound"
  | "palette.approve_sound"
  | "palette.reject_sound"
  | "palette.remove_sound"
  | "palette.edit_sound"
  | "palette.export"

  // Category permissions
  | "category.view"
  | "category.create"
  | "category.edit"
  | "category.delete"

  // Chat permissions
  | "chat.view"
  | "chat.send"
  | "chat.delete_own"
  | "chat.delete_any";

// ==================== Role Permission Matrix ====================

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    // All permissions
    "workspace.view",
    "workspace.edit",
    "workspace.delete",
    "workspace.settings",
    "workspace.invite",
    "workspace.remove_member",
    "workspace.change_roles",
    "palette.view",
    "palette.add_sound",
    "palette.approve_sound",
    "palette.reject_sound",
    "palette.remove_sound",
    "palette.edit_sound",
    "palette.export",
    "category.view",
    "category.create",
    "category.edit",
    "category.delete",
    "chat.view",
    "chat.send",
    "chat.delete_own",
    "chat.delete_any",
  ],

  lead: [
    "workspace.view",
    "workspace.edit",
    "workspace.settings",
    "workspace.invite",
    "palette.view",
    "palette.add_sound",
    "palette.approve_sound",
    "palette.reject_sound",
    "palette.remove_sound",
    "palette.edit_sound",
    "palette.export",
    "category.view",
    "category.create",
    "category.edit",
    "category.delete",
    "chat.view",
    "chat.send",
    "chat.delete_own",
    "chat.delete_any",
  ],

  designer: [
    "workspace.view",
    "palette.view",
    "palette.add_sound",
    "palette.edit_sound", // Only own sounds
    "palette.export",
    "category.view",
    "category.create",
    "chat.view",
    "chat.send",
    "chat.delete_own",
  ],

  viewer: [
    "workspace.view",
    "palette.view",
    "category.view",
    "chat.view",
  ],
};

// ==================== Permission Checker ====================

export class PermissionChecker {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: WorkspaceRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  }

  /**
   * Check if a role has all specified permissions
   */
  static hasAllPermissions(role: WorkspaceRole, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(role, p));
  }

  /**
   * Check if a role has any of the specified permissions
   */
  static hasAnyPermission(role: WorkspaceRole, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(role, p));
  }

  /**
   * Get all permissions for a role
   */
  static getPermissions(role: WorkspaceRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if a role can perform a specific action
   */
  static canPerform(
    role: WorkspaceRole,
    action: string,
    context?: { ownerId?: string; userId?: string }
  ): boolean {
    switch (action) {
      case "view_workspace":
        return this.hasPermission(role, "workspace.view");

      case "edit_workspace":
        return this.hasPermission(role, "workspace.edit");

      case "delete_workspace":
        return this.hasPermission(role, "workspace.delete");

      case "change_settings":
        return this.hasPermission(role, "workspace.settings");

      case "invite_member":
        return this.hasPermission(role, "workspace.invite");

      case "remove_member":
        return this.hasPermission(role, "workspace.remove_member");

      case "change_role":
        return this.hasPermission(role, "workspace.change_roles");

      case "add_sound":
        return this.hasPermission(role, "palette.add_sound");

      case "approve_sound":
        return this.hasPermission(role, "palette.approve_sound");

      case "reject_sound":
        return this.hasPermission(role, "palette.reject_sound");

      case "remove_sound":
        // Designers can only remove their own pending sounds
        if (role === "designer" && context?.ownerId !== context?.userId) {
          return false;
        }
        return this.hasPermission(role, "palette.remove_sound") ||
          (role === "designer" && context?.ownerId === context?.userId);

      case "edit_sound":
        // Designers can only edit their own sounds
        if (role === "designer" && context?.ownerId !== context?.userId) {
          return false;
        }
        return this.hasPermission(role, "palette.edit_sound");

      case "export_palette":
        return this.hasPermission(role, "palette.export");

      case "create_category":
        return this.hasPermission(role, "category.create");

      case "edit_category":
        return this.hasPermission(role, "category.edit");

      case "delete_category":
        return this.hasPermission(role, "category.delete");

      case "send_chat":
        return this.hasPermission(role, "chat.send");

      case "delete_chat":
        // Check if deleting own or any message
        if (context?.ownerId === context?.userId) {
          return this.hasPermission(role, "chat.delete_own");
        }
        return this.hasPermission(role, "chat.delete_any");

      default:
        return false;
    }
  }

  /**
   * Get a human-readable description of a role
   */
  static getRoleDescription(role: WorkspaceRole): string {
    switch (role) {
      case "owner":
        return "Full control over workspace, members, and settings";
      case "lead":
        return "Can approve sounds, manage categories, and invite members";
      case "designer":
        return "Can add sounds and create categories";
      case "viewer":
        return "Can view sounds and categories only";
      default:
        return "Unknown role";
    }
  }

  /**
   * Get roles that can be assigned by a given role
   */
  static getAssignableRoles(role: WorkspaceRole): WorkspaceRole[] {
    switch (role) {
      case "owner":
        return ["lead", "designer", "viewer"];
      case "lead":
        return ["designer", "viewer"];
      default:
        return [];
    }
  }

  /**
   * Check if a role can change another role to a target role
   */
  static canChangeRole(
    changerRole: WorkspaceRole,
    currentRole: WorkspaceRole,
    targetRole: WorkspaceRole
  ): boolean {
    // Can't change owner role
    if (currentRole === "owner") return false;

    // Must have change_roles permission
    if (!this.hasPermission(changerRole, "workspace.change_roles")) return false;

    // Can only assign roles that are assignable
    const assignable = this.getAssignableRoles(changerRole);
    return assignable.includes(targetRole);
  }
}

// ==================== Permission Guard HOC ====================

import { ReactNode } from "react";

interface PermissionGuardProps {
  role: WorkspaceRole;
  permission: Permission | Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  role,
  permission,
  requireAll = true,
  fallback = null,
  children,
}: PermissionGuardProps): ReactNode {
  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = requireAll
    ? PermissionChecker.hasAllPermissions(role, permissions)
    : PermissionChecker.hasAnyPermission(role, permissions);

  return hasAccess ? children : fallback;
}

// ==================== Permission Hook ====================

import { useMemo, useCallback } from "react";

export function usePermissions(role: WorkspaceRole) {
  const permissions = useMemo(() => PermissionChecker.getPermissions(role), [role]);

  const can = useCallback(
    (permission: Permission) => PermissionChecker.hasPermission(role, permission),
    [role]
  );

  const canPerform = useCallback(
    (action: string, context?: { ownerId?: string; userId?: string }) =>
      PermissionChecker.canPerform(role, action, context),
    [role]
  );

  const canAssignRole = useCallback(
    (targetRole: WorkspaceRole) =>
      PermissionChecker.getAssignableRoles(role).includes(targetRole),
    [role]
  );

  return {
    role,
    permissions,
    can,
    canPerform,
    canAssignRole,
    isOwner: role === "owner",
    isLead: role === "lead" || role === "owner",
    isDesigner: role === "designer" || role === "lead" || role === "owner",
    isViewer: role === "viewer",
  };
}
