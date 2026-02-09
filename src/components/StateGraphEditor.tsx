"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StateGraph,
  AudioState,
  StateTransition,
  TransitionCondition,
  createEmptyGraph,
  addState,
  addTransition,
} from "@/lib/adaptiveAudio";
import { cn } from "@/lib/utils";

interface StateGraphEditorProps {
  graph: StateGraph;
  onGraphChange: (graph: StateGraph) => void;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
}

interface ConnectionState {
  isConnecting: boolean;
  fromStateId: string | null;
  mouseX: number;
  mouseY: number;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

export function StateGraphEditor({
  graph,
  onGraphChange,
  className,
}: StateGraphEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    fromStateId: null,
    mouseX: 0,
    mouseY: 0,
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Update graph helper
  const updateGraph = useCallback(
    (updates: Partial<StateGraph>) => {
      onGraphChange({
        ...graph,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    },
    [graph, onGraphChange]
  );

  // Add state at position
  const handleAddState = useCallback(
    (x: number, y: number) => {
      const newState: Omit<AudioState, "id"> = {
        name: `State ${graph.states.length + 1}`,
        audioConfig: {
          activeLayers: [],
          layerVolumes: {},
          effects: { masterVolume: 1.0 },
        },
        tags: [],
        isInitial: graph.states.length === 0,
        position: { x, y },
      };

      onGraphChange(addState(graph, newState));
    },
    [graph, onGraphChange]
  );

  // Update state position
  const updateStatePosition = useCallback(
    (stateId: string, x: number, y: number) => {
      updateGraph({
        states: graph.states.map((s) =>
          s.id === stateId ? { ...s, position: { x, y } } : s
        ),
      });
    },
    [graph.states, updateGraph]
  );

  // Create transition between states
  const createTransition = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;

      // Check if transition already exists
      const exists = graph.transitions.some(
        (t) => t.fromStateId === fromId && t.toStateId === toId
      );
      if (exists) return;

      const newTransition: Omit<StateTransition, "id"> = {
        name: `Transition ${graph.transitions.length + 1}`,
        fromStateId: fromId,
        toStateId: toId,
        transitionType: graph.defaultTransitionType,
        duration: graph.defaultTransitionDuration,
        conditions: [],
        conditionLogic: "AND",
        priority: 5,
      };

      onGraphChange(addTransition(graph, newTransition));
    },
    [graph, onGraphChange]
  );

  // Delete state
  const deleteState = useCallback(
    (stateId: string) => {
      updateGraph({
        states: graph.states.filter((s) => s.id !== stateId),
        transitions: graph.transitions.filter(
          (t) => t.fromStateId !== stateId && t.toStateId !== stateId
        ),
      });
      setSelectedNodeId(null);
    },
    [graph.states, graph.transitions, updateGraph]
  );

  // Delete transition
  const deleteTransition = useCallback(
    (transitionId: string) => {
      updateGraph({
        transitions: graph.transitions.filter((t) => t.id !== transitionId),
      });
      setSelectedTransitionId(null);
    },
    [graph.transitions, updateGraph]
  );

  // Update transition
  const updateTransition = useCallback(
    (transitionId: string, updates: Partial<StateTransition>) => {
      updateGraph({
        transitions: graph.transitions.map((t) =>
          t.id === transitionId ? { ...t, ...updates } : t
        ),
      });
    },
    [graph.transitions, updateGraph]
  );

  // Mouse handlers for dragging nodes
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      e.stopPropagation();
      setSelectedNodeId(stateId);
      setSelectedTransitionId(null);

      if (e.shiftKey) {
        // Start connection mode
        setConnectionState({
          isConnecting: true,
          fromStateId: stateId,
          mouseX: e.clientX,
          mouseY: e.clientY,
        });
      } else {
        // Start drag mode
        setDragState({
          isDragging: true,
          nodeId: stateId,
          startX: e.clientX,
          startY: e.clientY,
        });
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.isDragging && dragState.nodeId) {
        const state = graph.states.find((s) => s.id === dragState.nodeId);
        if (!state) return;

        const dx = (e.clientX - dragState.startX) / zoom;
        const dy = (e.clientY - dragState.startY) / zoom;

        updateStatePosition(
          dragState.nodeId,
          (state.position?.x || 0) + dx,
          (state.position?.y || 0) + dy
        );

        setDragState((prev) => ({
          ...prev,
          startX: e.clientX,
          startY: e.clientY,
        }));
      }

      if (connectionState.isConnecting) {
        setConnectionState((prev) => ({
          ...prev,
          mouseX: e.clientX,
          mouseY: e.clientY,
        }));
      }
    },
    [dragState, connectionState.isConnecting, graph.states, zoom, updateStatePosition]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent, targetStateId?: string) => {
      if (connectionState.isConnecting && connectionState.fromStateId) {
        if (targetStateId && targetStateId !== connectionState.fromStateId) {
          createTransition(connectionState.fromStateId, targetStateId);
        }
      }

      setDragState({
        isDragging: false,
        nodeId: null,
        startX: 0,
        startY: 0,
      });

      setConnectionState({
        isConnecting: false,
        fromStateId: null,
        mouseX: 0,
        mouseY: 0,
      });
    },
    [connectionState, createTransition]
  );

  // Double-click to add state
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== canvasRef.current) return;

      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      handleAddState(x, y);
    },
    [handleAddState, pan, zoom]
  );

  // Calculate transition path
  const getTransitionPath = (transition: StateTransition): string => {
    const fromState = graph.states.find((s) => s.id === transition.fromStateId);
    const toState = graph.states.find((s) => s.id === transition.toStateId);
    if (!fromState || !toState) return "";

    const fromX = (fromState.position?.x || 0) + NODE_WIDTH / 2;
    const fromY = (fromState.position?.y || 0) + NODE_HEIGHT / 2;
    const toX = (toState.position?.x || 0) + NODE_WIDTH / 2;
    const toY = (toState.position?.y || 0) + NODE_HEIGHT / 2;

    // Calculate control points for curved arrow
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(50, distance / 4);

    // Perpendicular offset for curve
    const perpX = -dy / distance * offset;
    const perpY = dx / distance * offset;

    const midX = (fromX + toX) / 2 + perpX;
    const midY = (fromY + toY) / 2 + perpY;

    return `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          deleteState(selectedNodeId);
        } else if (selectedTransitionId) {
          deleteTransition(selectedTransitionId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectedTransitionId, deleteState, deleteTransition]);

  const selectedState = selectedNodeId
    ? graph.states.find((s) => s.id === selectedNodeId)
    : null;
  const selectedTransition = selectedTransitionId
    ? graph.transitions.find((t) => t.id === selectedTransitionId)
    : null;

  return (
    <div className={cn("flex gap-4", className)}>
      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          <button
            className="px-2 py-1 text-sm bg-muted rounded hover:bg-muted/80"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          >
            +
          </button>
          <span className="px-2 py-1 text-sm bg-muted rounded">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="px-2 py-1 text-sm bg-muted rounded hover:bg-muted/80"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          >
            -
          </button>
        </div>

        <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground">
          Double-click to add state · Shift+drag to connect
        </div>

        <div
          ref={canvasRef}
          className="w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={(e) => handleMouseUp(e)}
          onMouseLeave={(e) => handleMouseUp(e)}
          onDoubleClick={handleCanvasDoubleClick}
        >
          <svg
            className="w-full h-full"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: "top left",
            }}
          >
            {/* Grid */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.1"
                />
              </pattern>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                  opacity="0.6"
                />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Transitions */}
            {graph.transitions.map((transition) => (
              <g key={transition.id}>
                <path
                  d={getTransitionPath(transition)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={selectedTransitionId === transition.id ? 3 : 2}
                  opacity={selectedTransitionId === transition.id ? 1 : 0.6}
                  markerEnd="url(#arrowhead)"
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedTransitionId(transition.id);
                    setSelectedNodeId(null);
                  }}
                />
              </g>
            ))}

            {/* Connection preview */}
            {connectionState.isConnecting && connectionState.fromStateId && (
              <line
                x1={
                  (graph.states.find((s) => s.id === connectionState.fromStateId)
                    ?.position?.x || 0) +
                  NODE_WIDTH / 2
                }
                y1={
                  (graph.states.find((s) => s.id === connectionState.fromStateId)
                    ?.position?.y || 0) +
                  NODE_HEIGHT / 2
                }
                x2={(connectionState.mouseX - (canvasRef.current?.getBoundingClientRect().left || 0) - pan.x) / zoom}
                y2={(connectionState.mouseY - (canvasRef.current?.getBoundingClientRect().top || 0) - pan.y) / zoom}
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />
            )}

            {/* States */}
            {graph.states.map((state) => (
              <g
                key={state.id}
                transform={`translate(${state.position?.x || 0}, ${state.position?.y || 0})`}
                className="cursor-move"
                onMouseDown={(e) => handleNodeMouseDown(e, state.id)}
                onMouseUp={(e) => handleMouseUp(e, state.id)}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx="8"
                  fill="var(--card)"
                  stroke={
                    selectedNodeId === state.id
                      ? "var(--primary)"
                      : state.isInitial
                      ? "green"
                      : "var(--border)"
                  }
                  strokeWidth={selectedNodeId === state.id ? 2 : 1}
                />
                <text
                  x={NODE_WIDTH / 2}
                  y={NODE_HEIGHT / 2 - 8}
                  textAnchor="middle"
                  className="text-sm font-medium fill-foreground pointer-events-none"
                >
                  {state.name}
                </text>
                <text
                  x={NODE_WIDTH / 2}
                  y={NODE_HEIGHT / 2 + 12}
                  textAnchor="middle"
                  className="text-xs fill-muted-foreground pointer-events-none"
                >
                  {state.audioConfig.activeLayers.length} layers
                </text>
                {state.isInitial && (
                  <circle
                    cx={10}
                    cy={10}
                    r="6"
                    fill="green"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-72 flex-shrink-0">
        {selectedState && (
          <StatePropertiesPanel
            state={selectedState}
            onUpdate={(updates) => {
              updateGraph({
                states: graph.states.map((s) =>
                  s.id === selectedState.id ? { ...s, ...updates } : s
                ),
              });
            }}
            onDelete={() => deleteState(selectedState.id)}
          />
        )}

        {selectedTransition && (
          <TransitionPropertiesPanel
            transition={selectedTransition}
            graph={graph}
            onUpdate={(updates) => updateTransition(selectedTransition.id, updates)}
            onDelete={() => deleteTransition(selectedTransition.id)}
          />
        )}

        {!selectedState && !selectedTransition && (
          <div className="p-4 bg-card rounded-lg border">
            <h3 className="font-semibold mb-2">Graph Properties</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Default Transition Duration (ms)</label>
                <input
                  type="number"
                  value={graph.defaultTransitionDuration}
                  onChange={(e) =>
                    updateGraph({ defaultTransitionDuration: parseInt(e.target.value) })
                  }
                  className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Default Transition Type</label>
                <select
                  value={graph.defaultTransitionType}
                  onChange={(e) =>
                    updateGraph({ defaultTransitionType: e.target.value as StateGraph["defaultTransitionType"] })
                  }
                  className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
                >
                  <option value="instant">Instant</option>
                  <option value="crossfade">Crossfade</option>
                  <option value="musical">Musical</option>
                  <option value="stinger">Stinger</option>
                  <option value="duck">Duck</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Properties Panels ====================

function StatePropertiesPanel({
  state,
  onUpdate,
  onDelete,
}: {
  state: AudioState;
  onUpdate: (updates: Partial<AudioState>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">State Properties</h3>
        <button
          className="text-sm text-destructive hover:underline"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Name</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.isInitial || false}
            onChange={(e) => onUpdate({ isInitial: e.target.checked })}
          />
          Initial State
        </label>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Active Layers</label>
        <input
          type="text"
          value={state.audioConfig.activeLayers.join(", ")}
          onChange={(e) =>
            onUpdate({
              audioConfig: {
                ...state.audioConfig,
                activeLayers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              },
            })
          }
          placeholder="layer1, layer2"
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Master Volume</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={state.audioConfig.effects.masterVolume}
          onChange={(e) =>
            onUpdate({
              audioConfig: {
                ...state.audioConfig,
                effects: {
                  ...state.audioConfig.effects,
                  masterVolume: parseFloat(e.target.value),
                },
              },
            })
          }
          className="w-full"
        />
        <div className="text-xs text-muted-foreground text-right">
          {Math.round(state.audioConfig.effects.masterVolume * 100)}%
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Tags</label>
        <input
          type="text"
          value={state.tags.join(", ")}
          onChange={(e) =>
            onUpdate({
              tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="combat, intense"
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
        />
      </div>
    </div>
  );
}

function TransitionPropertiesPanel({
  transition,
  graph,
  onUpdate,
  onDelete,
}: {
  transition: StateTransition;
  graph: StateGraph;
  onUpdate: (updates: Partial<StateTransition>) => void;
  onDelete: () => void;
}) {
  const fromState = graph.states.find((s) => s.id === transition.fromStateId);
  const toState = graph.states.find((s) => s.id === transition.toStateId);

  // Add condition
  const addCondition = () => {
    const newCondition: TransitionCondition = {
      id: `cond_${Date.now()}`,
      type: "parameter",
      parameter: graph.parameters[0]?.name || "",
      operator: ">",
      value: 50,
    };
    onUpdate({
      conditions: [...transition.conditions, newCondition],
    });
  };

  // Update condition
  const updateCondition = (condId: string, updates: Partial<TransitionCondition>) => {
    onUpdate({
      conditions: transition.conditions.map((c) =>
        c.id === condId ? { ...c, ...updates } : c
      ),
    });
  };

  // Delete condition
  const deleteCondition = (condId: string) => {
    onUpdate({
      conditions: transition.conditions.filter((c) => c.id !== condId),
    });
  };

  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Transition Properties</h3>
        <button
          className="text-sm text-destructive hover:underline"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>

      <div className="text-sm text-muted-foreground">
        {fromState?.name || "?"} → {toState?.name || "?"}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Name</label>
        <input
          type="text"
          value={transition.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Type</label>
        <select
          value={transition.transitionType}
          onChange={(e) =>
            onUpdate({ transitionType: e.target.value as StateTransition["transitionType"] })
          }
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
        >
          <option value="instant">Instant</option>
          <option value="crossfade">Crossfade</option>
          <option value="musical">Musical</option>
          <option value="stinger">Stinger</option>
          <option value="duck">Duck</option>
          <option value="layer_in">Layer In</option>
          <option value="layer_out">Layer Out</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Duration (ms)</label>
        <input
          type="number"
          value={transition.duration}
          onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Priority</label>
        <input
          type="number"
          value={transition.priority}
          onChange={(e) => onUpdate({ priority: parseInt(e.target.value) })}
          className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
          min={1}
          max={100}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Conditions</label>
          <select
            value={transition.conditionLogic}
            onChange={(e) =>
              onUpdate({ conditionLogic: e.target.value as "AND" | "OR" })
            }
            className="text-xs bg-muted px-2 py-1 rounded"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>

        <div className="mt-2 space-y-2">
          {transition.conditions.map((condition) => (
            <div key={condition.id} className="flex items-center gap-1 text-xs">
              <select
                value={condition.parameter || ""}
                onChange={(e) =>
                  updateCondition(condition.id, { parameter: e.target.value })
                }
                className="flex-1 p-1 bg-muted/50 rounded"
              >
                <option value="">Select param</option>
                {graph.parameters.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={condition.operator || ">"}
                onChange={(e) =>
                  updateCondition(condition.id, {
                    operator: e.target.value as TransitionCondition["operator"],
                  })
                }
                className="w-12 p-1 bg-muted/50 rounded"
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="==">==</option>
              </select>
              <input
                type="number"
                value={(condition.value as number) || 0}
                onChange={(e) =>
                  updateCondition(condition.id, { value: parseFloat(e.target.value) })
                }
                className="w-16 p-1 bg-muted/50 rounded"
              />
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => deleteCondition(condition.id)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="w-full p-1 text-xs border border-dashed rounded hover:border-primary/50"
            onClick={addCondition}
          >
            + Add Condition
          </button>
        </div>
      </div>
    </div>
  );
}

export default StateGraphEditor;
