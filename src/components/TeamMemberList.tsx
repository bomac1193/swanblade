"use client";

import React, { useState, useCallback } from "react";
import type { WorkspaceMember, WorkspaceRole } from "@/lib/collaboration/workspace";
import { PermissionChecker, usePermissions } from "@/lib/collaboration/permissions";
import { cn } from "@/lib/utils";

interface TeamMemberListProps {
  members: WorkspaceMember[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  workspaceId: string;
  onMemberUpdate?: () => void;
  onInvite?: () => void;
  className?: string;
}

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: "bg-yellow-500/20 text-yellow-600",
  lead: "bg-purple-500/20 text-purple-600",
  designer: "bg-blue-500/20 text-blue-600",
  viewer: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<WorkspaceMember["status"], string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-muted-foreground",
};

export function TeamMemberList({
  members,
  currentUserId,
  currentUserRole,
  workspaceId,
  onMemberUpdate,
  onInvite,
  className,
}: TeamMemberListProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("designer");
  const [isInviting, setIsInviting] = useState(false);

  const permissions = usePermissions(currentUserRole);

  // Sort members: online first, then by role hierarchy, then alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    // Online status
    if (a.status === "online" && b.status !== "online") return -1;
    if (b.status === "online" && a.status !== "online") return 1;

    // Role hierarchy
    const roleOrder: WorkspaceRole[] = ["owner", "lead", "designer", "viewer"];
    const aIndex = roleOrder.indexOf(a.role);
    const bIndex = roleOrder.indexOf(b.role);
    if (aIndex !== bIndex) return aIndex - bIndex;

    // Alphabetically
    return a.userName.localeCompare(b.userName);
  });

  // Change member role
  const handleChangeRole = useCallback(async (memberId: string, newRole: WorkspaceRole) => {
    setIsUpdating(memberId);
    try {
      const response = await fetch("/api/workspaces", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "x-user-name": members.find((m) => m.userId === currentUserId)?.userName || "",
        },
        body: JSON.stringify({
          workspaceId,
          action: "update_role",
          targetUserId: memberId,
          newRole,
        }),
      });

      if (response.ok) {
        onMemberUpdate?.();
      }
    } catch (err) {
      console.error("Failed to change role:", err);
    } finally {
      setIsUpdating(null);
      setExpandedMemberId(null);
    }
  }, [workspaceId, currentUserId, members, onMemberUpdate]);

  // Remove member
  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setIsUpdating(memberId);
    try {
      const response = await fetch(
        `/api/workspaces?workspaceId=${workspaceId}&action=member&userId=${memberId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": currentUserId,
            "x-user-name": members.find((m) => m.userId === currentUserId)?.userName || "",
          },
        }
      );

      if (response.ok) {
        onMemberUpdate?.();
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally {
      setIsUpdating(null);
    }
  }, [workspaceId, currentUserId, members, onMemberUpdate]);

  // Invite member
  const handleInvite = useCallback(async () => {
    if (!inviteEmail || !inviteName) return;

    setIsInviting(true);
    try {
      // Generate a fake ID for demo purposes
      const inviteId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "x-user-name": members.find((m) => m.userId === currentUserId)?.userName || "",
        },
        body: JSON.stringify({
          workspaceId,
          action: "invite",
          inviteId,
          inviteName,
          inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        setShowInviteForm(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("designer");
        onMemberUpdate?.();
        onInvite?.();
      }
    } catch (err) {
      console.error("Failed to invite member:", err);
    } finally {
      setIsInviting(false);
    }
  }, [workspaceId, currentUserId, members, inviteEmail, inviteName, inviteRole, onMemberUpdate, onInvite]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Team Members ({members.length})</h3>
        {permissions.canPerform("invite_member") && (
          <button
            className="px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground"
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            {showInviteForm ? "Cancel" : "+ Invite"}
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Member name"
                className="w-full mt-1 p-2 text-sm bg-background rounded-md border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@email.com"
                className="w-full mt-1 p-2 text-sm bg-background rounded-md border"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="w-full mt-1 p-2 text-sm bg-background rounded-md border"
              >
                {PermissionChecker.getAssignableRoles(currentUserRole).map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="px-4 py-2 mt-5 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              onClick={handleInvite}
              disabled={!inviteEmail || !inviteName || isInviting}
            >
              {isInviting ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      {/* Online Status Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {members.filter((m) => m.status === "online").length} online
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {members.filter((m) => m.status === "away").length} away
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          {members.filter((m) => m.status === "offline").length} offline
        </span>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {sortedMembers.map((member) => {
          const isCurrentUser = member.userId === currentUserId;
          const isExpanded = expandedMemberId === member.userId;
          const canChangeRole =
            !isCurrentUser &&
            member.role !== "owner" &&
            PermissionChecker.canChangeRole(currentUserRole, member.role, "designer");
          const canRemove =
            !isCurrentUser &&
            member.role !== "owner" &&
            permissions.canPerform("remove_member");

          return (
            <div
              key={member.userId}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                isExpanded && "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.userName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.userName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Status indicator */}
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                      STATUS_COLORS[member.status]
                    )}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.userName}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground ml-1">(you)</span>
                      )}
                    </span>
                    <span className={cn("px-1.5 py-0.5 text-xs rounded capitalize", ROLE_COLORS[member.role])}>
                      {member.role}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {member.email || "No email"}
                  </div>
                </div>

                {/* Actions */}
                {(canChangeRole || canRemove) && (
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedMemberId(isExpanded ? null : member.userId)}
                    disabled={isUpdating === member.userId}
                  >
                    <svg
                      className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-180")}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Expanded Actions */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  {canChangeRole && (
                    <div>
                      <label className="text-xs text-muted-foreground">Change Role</label>
                      <div className="flex gap-2 mt-1">
                        {PermissionChecker.getAssignableRoles(currentUserRole).map((role) => (
                          <button
                            key={role}
                            className={cn(
                              "px-3 py-1 text-xs rounded-md border transition-colors",
                              member.role === role
                                ? "bg-primary text-primary-foreground border-primary"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleChangeRole(member.userId, role)}
                            disabled={member.role === role || isUpdating === member.userId}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>Last active: {new Date(member.lastActiveAt).toLocaleString()}</span>
                  </div>

                  {canRemove && (
                    <button
                      className="px-3 py-1 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={isUpdating === member.userId}
                    >
                      {isUpdating === member.userId ? "Removing..." : "Remove from workspace"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Role Descriptions */}
      <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
        <p><strong>Owner:</strong> Full control</p>
        <p><strong>Lead:</strong> Approve sounds, manage members</p>
        <p><strong>Designer:</strong> Add sounds, create categories</p>
        <p><strong>Viewer:</strong> View only</p>
      </div>
    </div>
  );
}

export default TeamMemberList;
