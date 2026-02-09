"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Workspace } from "@/lib/collaboration/workspace";
import { cn } from "@/lib/utils";

interface WorkspaceSelectorProps {
  currentWorkspaceId?: string;
  onWorkspaceSelect: (workspace: Workspace) => void;
  onCreateWorkspace?: () => void;
  className?: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  soundCount: number;
  pendingCount: number;
  lastActivityAt: string;
  userRole: string;
}

export function WorkspaceSelector({
  currentWorkspaceId,
  onWorkspaceSelect,
  onCreateWorkspace,
  className,
}: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch workspaces
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/workspaces", {
        headers: {
          "x-user-id": localStorage.getItem("userId") || "",
          "x-user-name": localStorage.getItem("userName") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current workspace
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  // Create new workspace
  const handleCreateWorkspace = useCallback(async () => {
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId") || "",
          "x-user-name": localStorage.getItem("userName") || "",
        },
        body: JSON.stringify({
          action: "create",
          name: newWorkspaceName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaces((prev) => [
          {
            id: data.workspace.id,
            name: data.workspace.name,
            memberCount: 1,
            soundCount: 0,
            pendingCount: 0,
            lastActivityAt: data.workspace.createdAt,
            userRole: "owner",
          },
          ...prev,
        ]);
        onWorkspaceSelect(data.workspace);
        setShowCreateForm(false);
        setNewWorkspaceName("");
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Failed to create workspace:", err);
    } finally {
      setIsCreating(false);
    }
  }, [newWorkspaceName, onWorkspaceSelect]);

  // Select workspace
  const handleSelectWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces?id=${workspaceId}`, {
        headers: {
          "x-user-id": localStorage.getItem("userId") || "",
          "x-user-name": localStorage.getItem("userName") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        onWorkspaceSelect(data.workspace);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Failed to select workspace:", err);
    }
  }, [onWorkspaceSelect]);

  return (
    <div className={cn("relative", className)}>
      {/* Selector Button */}
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
          <span className="text-sm">
            {currentWorkspace?.name?.[0]?.toUpperCase() || "W"}
          </span>
        </div>
        <div className="text-left">
          <div className="text-sm font-medium">
            {currentWorkspace?.name || "Select Workspace"}
          </div>
          {currentWorkspace && (
            <div className="text-xs text-muted-foreground">
              {currentWorkspace.memberCount} members · {currentWorkspace.soundCount} sounds
            </div>
          )}
        </div>
        <svg
          className={cn(
            "w-4 h-4 ml-2 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setShowCreateForm(false);
            }}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-card rounded-lg border shadow-lg z-20">
            {/* Header */}
            <div className="p-3 border-b">
              <h3 className="font-medium">Workspaces</h3>
              <p className="text-xs text-muted-foreground">
                Collaborate with your team on sound palettes
              </p>
            </div>

            {/* Workspace List */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : workspaces.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No workspaces yet
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    className={cn(
                      "w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors",
                      workspace.id === currentWorkspaceId && "bg-muted"
                    )}
                    onClick={() => handleSelectWorkspace(workspace.id)}
                  >
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">
                        {workspace.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{workspace.name}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs rounded capitalize",
                          workspace.userRole === "owner" ? "bg-yellow-500/20 text-yellow-600" :
                          workspace.userRole === "lead" ? "bg-purple-500/20 text-purple-600" :
                          workspace.userRole === "designer" ? "bg-blue-500/20 text-blue-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {workspace.userRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{workspace.memberCount} members</span>
                        <span>{workspace.soundCount} sounds</span>
                        {workspace.pendingCount > 0 && (
                          <span className="text-yellow-600">
                            {workspace.pendingCount} pending
                          </span>
                        )}
                      </div>
                    </div>
                    {workspace.id === currentWorkspaceId && (
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Create New */}
            <div className="p-3 border-t">
              {showCreateForm ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Workspace name"
                    className="w-full p-2 text-sm bg-muted/50 rounded-md"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateWorkspace();
                      if (e.key === "Escape") setShowCreateForm(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      onClick={handleCreateWorkspace}
                      disabled={!newWorkspaceName.trim() || isCreating}
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full p-2 text-sm text-center rounded-md border-2 border-dashed hover:border-primary/50 hover:text-primary transition-colors"
                  onClick={() => setShowCreateForm(true)}
                >
                  + Create New Workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WorkspaceSelector;
