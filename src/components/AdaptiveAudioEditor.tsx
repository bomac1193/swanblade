"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  AdaptiveAudioEngine,
  StateGraph,
  AudioState,
  ParameterMapping,
  createEmptyGraph,
  addState,
  addParameter,
  PRESET_GRAPHS,
  PRESET_MAPPINGS,
  createMappingFromPreset,
} from "@/lib/adaptiveAudio";
import { cn } from "@/lib/utils";

interface AdaptiveAudioEditorProps {
  initialGraph?: StateGraph;
  initialMappings?: ParameterMapping[];
  onSave?: (graph: StateGraph, mappings: ParameterMapping[]) => void;
  className?: string;
}

export function AdaptiveAudioEditor({
  initialGraph,
  initialMappings,
  onSave,
  className,
}: AdaptiveAudioEditorProps) {
  const [graph, setGraph] = useState<StateGraph>(
    initialGraph || createEmptyGraph("New Adaptive Audio")
  );
  const [mappings, setMappings] = useState<ParameterMapping[]>(initialMappings || []);
  const [activeTab, setActiveTab] = useState<"states" | "parameters" | "mappings" | "preview">("states");
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(!initialGraph);
  const [isSaving, setIsSaving] = useState(false);

  // Engine for preview
  const engineRef = useRef<AdaptiveAudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewParams, setPreviewParams] = useState<Record<string, number>>({});

  // Initialize preview parameters from graph
  useEffect(() => {
    const params: Record<string, number> = {};
    for (const param of graph.parameters) {
      if (param.type === "number") {
        params[param.name] = param.defaultValue as number;
      }
    }
    setPreviewParams(params);
  }, [graph.parameters]);

  // Update graph
  const updateGraph = useCallback((updates: Partial<StateGraph>) => {
    setGraph((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Load preset
  const loadPreset = useCallback((index: number) => {
    const preset = PRESET_GRAPHS[index];
    if (!preset) return;

    const now = new Date().toISOString();
    const newGraph: StateGraph = {
      id: `graph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: preset.name || "New Graph",
      description: preset.description,
      createdAt: now,
      updatedAt: now,
      states: preset.states || [],
      transitions: preset.transitions || [],
      defaultTransitionDuration: 500,
      defaultTransitionType: "crossfade",
      parameters: preset.parameters || [],
    };

    setGraph(newGraph);
    setShowPresets(false);
  }, []);

  // Add state
  const handleAddState = useCallback(() => {
    const newState: Omit<AudioState, "id"> = {
      name: `State ${graph.states.length + 1}`,
      audioConfig: {
        activeLayers: [],
        layerVolumes: {},
        effects: { masterVolume: 1.0 },
      },
      tags: [],
      isInitial: graph.states.length === 0,
      position: { x: 100 + graph.states.length * 150, y: 200 },
    };

    setGraph(addState(graph, newState));
  }, [graph]);

  // Update state
  const updateState = useCallback((stateId: string, updates: Partial<AudioState>) => {
    setGraph((prev) => ({
      ...prev,
      states: prev.states.map((s) =>
        s.id === stateId ? { ...s, ...updates } : s
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Delete state
  const deleteState = useCallback((stateId: string) => {
    setGraph((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s.id !== stateId),
      transitions: prev.transitions.filter(
        (t) => t.fromStateId !== stateId && t.toStateId !== stateId
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Add parameter
  const handleAddParameter = useCallback(() => {
    setGraph(
      addParameter(graph, {
        name: `param_${graph.parameters.length + 1}`,
        type: "number",
        defaultValue: 50,
        min: 0,
        max: 100,
      })
    );
  }, [graph]);

  // Update parameter
  const updateParameter = useCallback((index: number, updates: Partial<typeof graph.parameters[0]>) => {
    setGraph((prev) => ({
      ...prev,
      parameters: prev.parameters.map((p, i) =>
        i === index ? { ...p, ...updates } : p
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Delete parameter
  const deleteParameter = useCallback((index: number) => {
    setGraph((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Add mapping from preset
  const handleAddMappingPreset = useCallback((presetIndex: number) => {
    const mapping = createMappingFromPreset(presetIndex);
    setMappings((prev) => [...prev, mapping]);
  }, []);

  // Update mapping
  const updateMapping = useCallback((mappingId: string, updates: Partial<ParameterMapping>) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === mappingId ? { ...m, ...updates } : m))
    );
  }, []);

  // Delete mapping
  const deleteMapping = useCallback((mappingId: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== mappingId));
  }, []);

  // Preview controls
  const startPreview = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = new AdaptiveAudioEngine({
        graph,
        mappings,
        updateRate: 16,
      });
      await engineRef.current.initAudio();
    }

    engineRef.current.start();
    setIsPlaying(true);
  }, [graph, mappings]);

  const stopPreview = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPlaying(false);
  }, []);

  const updatePreviewParam = useCallback((name: string, value: number) => {
    setPreviewParams((prev) => ({ ...prev, [name]: value }));
    if (engineRef.current) {
      engineRef.current.setParameter(name, value);
    }
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save graph
      await fetch("/api/adaptive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "graph",
          action: "create",
          name: graph.name,
          description: graph.description,
        }),
      });

      onSave?.(graph, mappings);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  }, [graph, mappings, onSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // Preset selection
  if (showPresets) {
    return (
      <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
        <div>
          <h3 className="font-semibold">Create Adaptive Audio System</h3>
          <p className="text-sm text-muted-foreground">
            Start from a preset or create a blank system
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PRESET_GRAPHS.map((preset, index) => (
            <button
              key={index}
              className="p-3 rounded-lg border text-left hover:border-primary/50 transition-colors"
              onClick={() => loadPreset(index)}
            >
              <div className="font-medium">{preset.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {preset.description}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {preset.states?.length || 0} states · {preset.parameters?.length || 0} params
              </div>
            </button>
          ))}
        </div>

        <div className="border-t pt-4">
          <button
            className="w-full p-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            onClick={() => setShowPresets(false)}
          >
            + Create Empty System
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={graph.name}
            onChange={(e) => updateGraph({ name: e.target.value })}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 -ml-1"
          />
          <div className="text-xs text-muted-foreground mt-1">
            {graph.states.length} states · {graph.transitions.length} transitions · {graph.parameters.length} params
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              isPlaying
                ? "bg-destructive text-destructive-foreground"
                : "bg-green-600 text-white"
            )}
            onClick={isPlaying ? stopPreview : startPreview}
          >
            {isPlaying ? "Stop" : "Preview"}
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
            onClick={() => setShowPresets(true)}
          >
            Presets
          </button>
        </div>
      </div>

      {/* Description */}
      <textarea
        value={graph.description || ""}
        onChange={(e) => updateGraph({ description: e.target.value })}
        placeholder="System description..."
        className="w-full h-12 p-2 text-sm bg-muted/50 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["states", "parameters", "mappings", "preview"] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-3 py-2 text-sm capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* States Tab */}
        {activeTab === "states" && (
          <div className="space-y-3">
            {graph.states.map((state) => (
              <StateEditor
                key={state.id}
                state={state}
                isSelected={selectedStateId === state.id}
                onSelect={() => setSelectedStateId(state.id)}
                onUpdate={(updates) => updateState(state.id, updates)}
                onDelete={() => deleteState(state.id)}
              />
            ))}
            <button
              className="w-full p-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              onClick={handleAddState}
            >
              + Add State
            </button>
          </div>
        )}

        {/* Parameters Tab */}
        {activeTab === "parameters" && (
          <div className="space-y-3">
            {graph.parameters.map((param, index) => (
              <ParameterEditor
                key={index}
                parameter={param}
                onUpdate={(updates) => updateParameter(index, updates)}
                onDelete={() => deleteParameter(index)}
              />
            ))}
            <button
              className="w-full p-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              onClick={handleAddParameter}
            >
              + Add Parameter
            </button>
          </div>
        )}

        {/* Mappings Tab */}
        {activeTab === "mappings" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Active Mappings</h4>
              <div className="space-y-2">
                {mappings.map((mapping) => (
                  <MappingEditor
                    key={mapping.id}
                    mapping={mapping}
                    onUpdate={(updates) => updateMapping(mapping.id, updates)}
                    onDelete={() => deleteMapping(mapping.id)}
                  />
                ))}
                {mappings.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                    No mappings configured. Add from presets below.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Add from Preset</h4>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_MAPPINGS.map((preset, index) => (
                  <button
                    key={index}
                    className="p-2 rounded-lg border text-left text-sm hover:border-primary/50 transition-colors"
                    onClick={() => handleAddMappingPreset(index)}
                  >
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Current State</h4>
                <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm">
                  {engineRef.current?.getCurrentState()?.name || graph.states[0]?.name || "None"}
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Parameters</h4>
                {graph.parameters
                  .filter((p) => p.type === "number")
                  .map((param) => (
                    <div key={param.name}>
                      <div className="flex justify-between text-sm">
                        <span>{param.name}</span>
                        <span className="text-muted-foreground">
                          {previewParams[param.name]?.toFixed(1) || param.defaultValue}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={param.min || 0}
                        max={param.max || 100}
                        step={1}
                        value={previewParams[param.name] ?? param.defaultValue}
                        onChange={(e) =>
                          updatePreviewParam(param.name, parseFloat(e.target.value))
                        }
                        className="w-full"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Trigger Events</h4>
              <div className="flex flex-wrap gap-2">
                {["player_hit", "enemy_spotted", "combat_start", "combat_end"].map(
                  (event) => (
                    <button
                      key={event}
                      className="px-3 py-1 text-sm rounded-md border hover:bg-muted transition-colors"
                      onClick={() => engineRef.current?.triggerEvent(event)}
                    >
                      {event}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t pt-4">
        <button
          className={cn(
            "px-4 py-2 rounded-md bg-primary text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50"
          )}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save System"}
        </button>
      </div>
    </div>
  );
}

// ==================== Sub-components ====================

function StateEditor({
  state,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: {
  state: AudioState;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<AudioState>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "▼" : "▶"}
        </button>

        <input
          type="text"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />

        {state.isInitial && (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-600 text-xs rounded">
            Initial
          </span>
        )}

        <button
          className={cn(
            "px-2 py-0.5 text-xs rounded transition-colors",
            state.isInitial ? "bg-muted" : "hover:bg-muted"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ isInitial: !state.isInitial });
          }}
        >
          Set Initial
        </button>

        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
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
              placeholder="layer1, layer2, layer3"
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
      )}
    </div>
  );
}

function ParameterEditor({
  parameter,
  onUpdate,
  onDelete,
}: {
  parameter: { name: string; type: string; defaultValue: number | boolean | string; min?: number; max?: number; description?: string };
  onUpdate: (updates: Partial<typeof parameter>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={parameter.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
        />

        <select
          value={parameter.type}
          onChange={(e) => onUpdate({ type: e.target.value as "number" | "boolean" | "string" })}
          className="text-xs bg-muted px-2 py-1 rounded"
        >
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="string">String</option>
        </select>

        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          ×
        </button>
      </div>

      {parameter.type === "number" && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Min</label>
            <input
              type="number"
              value={parameter.min || 0}
              onChange={(e) => onUpdate({ min: parseFloat(e.target.value) })}
              className="w-full mt-1 p-1 text-sm bg-muted/50 rounded"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max</label>
            <input
              type="number"
              value={parameter.max || 100}
              onChange={(e) => onUpdate({ max: parseFloat(e.target.value) })}
              className="w-full mt-1 p-1 text-sm bg-muted/50 rounded"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Default</label>
            <input
              type="number"
              value={parameter.defaultValue as number}
              onChange={(e) => onUpdate({ defaultValue: parseFloat(e.target.value) })}
              className="w-full mt-1 p-1 text-sm bg-muted/50 rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MappingEditor({
  mapping,
  onUpdate,
  onDelete,
}: {
  mapping: ParameterMapping;
  onUpdate: (updates: Partial<ParameterMapping>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={mapping.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
        />

        <div className="flex-1">
          <div className="text-sm font-medium">{mapping.name}</div>
          <div className="text-xs text-muted-foreground">
            {mapping.source.name} → {mapping.target.type}
            {mapping.target.layerId && ` (${mapping.target.layerId})`}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {mapping.curve.type}
        </div>

        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default AdaptiveAudioEditor;
