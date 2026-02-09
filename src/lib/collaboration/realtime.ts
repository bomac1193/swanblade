/**
 * Real-time Collaboration
 *
 * WebSocket-based real-time sync for collaborative workspaces:
 * - Member presence (online/offline/away)
 * - Live cursor/selection sync
 * - Sound addition/approval notifications
 * - Chat/comments
 */

import type { WorkspaceActivity, PaletteSound, WorkspaceMember } from "./workspace";

// ==================== Types ====================

export interface RealtimeMessage {
  type: RealtimeMessageType;
  workspaceId: string;
  userId: string;
  userName: string;
  timestamp: string;
  payload: unknown;
}

export type RealtimeMessageType =
  | "presence_update"
  | "cursor_move"
  | "selection_change"
  | "sound_added"
  | "sound_updated"
  | "sound_removed"
  | "activity"
  | "chat"
  | "typing"
  | "sync_request"
  | "sync_response"
  | "error";

export interface PresenceUpdate {
  userId: string;
  userName: string;
  status: "online" | "offline" | "away";
  lastActiveAt: string;
  cursor?: { x: number; y: number };
  selection?: string[];
}

export interface CursorUpdate {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export interface SelectionUpdate {
  userId: string;
  userName: string;
  selectedIds: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  replyTo?: string;
}

export interface RealtimeConfig {
  url?: string;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

// ==================== Realtime Client ====================

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private config: RealtimeConfig;
  private workspaceId: string | null = null;
  private userId: string = "";
  private userName: string = "";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting: boolean = false;

  // Event handlers
  private handlers: Map<RealtimeMessageType, Set<(payload: unknown) => void>> = new Map();

  // State
  private presence: Map<string, PresenceUpdate> = new Map();
  private cursors: Map<string, CursorUpdate> = new Map();
  private selections: Map<string, SelectionUpdate> = new Map();
  private chatHistory: ChatMessage[] = [];

  constructor(config: RealtimeConfig = {}) {
    this.config = {
      url: config.url || "ws://localhost:3000/api/realtime",
      reconnectDelay: config.reconnectDelay || 3000,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  // ==================== Connection ====================

  connect(workspaceId: string, userId: string, userName: string): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.userName = userName;

    try {
      // In a real implementation, this would connect to a WebSocket server
      // For now, we'll simulate the connection
      console.log(`[Realtime] Connecting to workspace ${workspaceId}...`);

      // Simulate successful connection
      setTimeout(() => {
        this.isConnecting = false;
        this.onConnect();
      }, 100);
    } catch (error) {
      this.isConnecting = false;
      this.handleError(error);
    }
  }

  disconnect(): void {
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Broadcast offline status before disconnecting
    this.broadcastPresence("offline");

    this.presence.clear();
    this.cursors.clear();
    this.selections.clear();
    this.workspaceId = null;

    console.log("[Realtime] Disconnected");
  }

  private onConnect(): void {
    console.log(`[Realtime] Connected to workspace ${this.workspaceId}`);

    // Start heartbeat
    this.startHeartbeat();

    // Broadcast online presence
    this.broadcastPresence("online");

    // Request initial sync
    this.requestSync();

    // Notify handlers
    this.emit("presence_update", {
      userId: this.userId,
      userName: this.userName,
      status: "online",
      lastActiveAt: new Date().toISOString(),
    });
  }

  private handleError(error: unknown): void {
    console.error("[Realtime] Error:", error);
    this.emit("error", { error });
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.workspaceId) {
        this.connect(this.workspaceId, this.userId, this.userName);
      }
    }, this.config.reconnectDelay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcastPresence("online");
    }, this.config.heartbeatInterval);
  }

  // ==================== Message Handling ====================

  private send(message: Omit<RealtimeMessage, "timestamp">): void {
    const fullMessage: RealtimeMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    // In a real implementation, this would send via WebSocket
    // For now, we'll simulate by directly calling handleMessage
    this.handleMessage(fullMessage);
  }

  private handleMessage(message: RealtimeMessage): void {
    switch (message.type) {
      case "presence_update":
        this.handlePresenceUpdate(message.payload as PresenceUpdate);
        break;

      case "cursor_move":
        this.handleCursorUpdate(message.payload as CursorUpdate);
        break;

      case "selection_change":
        this.handleSelectionUpdate(message.payload as SelectionUpdate);
        break;

      case "chat":
        this.handleChatMessage(message.payload as ChatMessage);
        break;

      case "sync_response":
        this.handleSyncResponse(message.payload as SyncResponse);
        break;

      default:
        // Forward to handlers
        this.emit(message.type, message.payload);
    }
  }

  private handlePresenceUpdate(update: PresenceUpdate): void {
    this.presence.set(update.userId, update);
    this.emit("presence_update", update);
  }

  private handleCursorUpdate(update: CursorUpdate): void {
    this.cursors.set(update.userId, update);
    this.emit("cursor_move", update);
  }

  private handleSelectionUpdate(update: SelectionUpdate): void {
    this.selections.set(update.userId, update);
    this.emit("selection_change", update);
  }

  private handleChatMessage(message: ChatMessage): void {
    this.chatHistory.push(message);
    // Keep only last 100 messages
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }
    this.emit("chat", message);
  }

  private handleSyncResponse(response: SyncResponse): void {
    // Update local state with server state
    for (const member of response.members) {
      this.presence.set(member.userId, {
        userId: member.userId,
        userName: member.userName,
        status: member.status,
        lastActiveAt: member.lastActiveAt,
      });
    }

    this.chatHistory = response.recentChat || [];
    this.emit("sync_response", response);
  }

  // ==================== Public Methods ====================

  broadcastPresence(status: PresenceUpdate["status"]): void {
    if (!this.workspaceId) return;

    this.send({
      type: "presence_update",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: {
        userId: this.userId,
        userName: this.userName,
        status,
        lastActiveAt: new Date().toISOString(),
      },
    });
  }

  updateCursor(x: number, y: number, color: string = "#6366f1"): void {
    if (!this.workspaceId) return;

    this.send({
      type: "cursor_move",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: {
        userId: this.userId,
        userName: this.userName,
        x,
        y,
        color,
      },
    });
  }

  updateSelection(selectedIds: string[]): void {
    if (!this.workspaceId) return;

    this.send({
      type: "selection_change",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: {
        userId: this.userId,
        userName: this.userName,
        selectedIds,
      },
    });
  }

  sendChat(message: string, replyTo?: string): void {
    if (!this.workspaceId) return;

    const chatMessage: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: this.userId,
      userName: this.userName,
      message,
      timestamp: new Date().toISOString(),
      replyTo,
    };

    this.send({
      type: "chat",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: chatMessage,
    });
  }

  sendTyping(): void {
    if (!this.workspaceId) return;

    this.send({
      type: "typing",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: { userId: this.userId, userName: this.userName },
    });
  }

  notifySoundAdded(sound: PaletteSound): void {
    if (!this.workspaceId) return;

    this.send({
      type: "sound_added",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: sound,
    });
  }

  notifySoundUpdated(sound: PaletteSound): void {
    if (!this.workspaceId) return;

    this.send({
      type: "sound_updated",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: sound,
    });
  }

  notifySoundRemoved(soundId: string): void {
    if (!this.workspaceId) return;

    this.send({
      type: "sound_removed",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: { soundId },
    });
  }

  broadcastActivity(activity: WorkspaceActivity): void {
    if (!this.workspaceId) return;

    this.send({
      type: "activity",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: activity,
    });
  }

  requestSync(): void {
    if (!this.workspaceId) return;

    this.send({
      type: "sync_request",
      workspaceId: this.workspaceId,
      userId: this.userId,
      userName: this.userName,
      payload: {},
    });
  }

  // ==================== State Getters ====================

  getPresence(): Map<string, PresenceUpdate> {
    return new Map(this.presence);
  }

  getOnlineMembers(): PresenceUpdate[] {
    return Array.from(this.presence.values()).filter(
      (p) => p.status === "online" && p.userId !== this.userId
    );
  }

  getCursors(): Map<string, CursorUpdate> {
    return new Map(this.cursors);
  }

  getSelections(): Map<string, SelectionUpdate> {
    return new Map(this.selections);
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ==================== Event Handling ====================

  on(type: RealtimeMessageType, handler: (payload: unknown) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  private emit(type: RealtimeMessageType, payload: unknown): void {
    this.handlers.get(type)?.forEach((handler) => handler(payload));
  }
}

interface SyncResponse {
  members: WorkspaceMember[];
  recentChat?: ChatMessage[];
  paletteVersion?: number;
}

// Export singleton
export const realtimeClient = new RealtimeClient();

// ==================== React Hook ====================

import { useState, useEffect, useCallback } from "react";

export function useRealtime(workspaceId: string | null, userId: string, userName: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<PresenceUpdate[]>([]);
  const [cursors, setCursors] = useState<CursorUpdate[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!workspaceId || !userId) return;

    realtimeClient.connect(workspaceId, userId, userName);
    setIsConnected(true);

    const unsubPresence = realtimeClient.on("presence_update", () => {
      setOnlineMembers(realtimeClient.getOnlineMembers());
    });

    const unsubCursor = realtimeClient.on("cursor_move", () => {
      setCursors(Array.from(realtimeClient.getCursors().values()));
    });

    const unsubChat = realtimeClient.on("chat", () => {
      setChatMessages(realtimeClient.getChatHistory());
    });

    return () => {
      unsubPresence();
      unsubCursor();
      unsubChat();
      realtimeClient.disconnect();
      setIsConnected(false);
    };
  }, [workspaceId, userId, userName]);

  const sendMessage = useCallback((message: string) => {
    realtimeClient.sendChat(message);
  }, []);

  const updateCursor = useCallback((x: number, y: number) => {
    realtimeClient.updateCursor(x, y);
  }, []);

  const updateSelection = useCallback((ids: string[]) => {
    realtimeClient.updateSelection(ids);
  }, []);

  return {
    isConnected,
    onlineMembers,
    cursors,
    chatMessages,
    sendMessage,
    updateCursor,
    updateSelection,
  };
}
