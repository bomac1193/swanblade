/**
 * Adaptive Audio API
 *
 * Manage adaptive audio state graphs and parameter mappings:
 * - GET: List graphs/mappings or get specific ones
 * - POST: Create graphs/mappings, compile to engine formats
 * - PUT: Update graphs/mappings
 * - DELETE: Delete graphs/mappings
 */

import { NextRequest, NextResponse } from "next/server";
import {
  StateGraph,
  ParameterMapping,
  createEmptyGraph,
  addState,
  addTransition,
  addParameter,
  PRESET_GRAPHS,
} from "@/lib/adaptiveAudio";
import { compileRecipe, CompilerTarget } from "@/lib/recipeCompiler";

// In-memory storage (in production, use a database)
const graphStore = new Map<string, StateGraph>();
const mappingStore = new Map<string, ParameterMapping>();

// Initialize with presets
PRESET_GRAPHS.forEach((preset, index) => {
  const now = new Date().toISOString();
  const graph: StateGraph = {
    id: `preset_graph_${index}`,
    name: preset.name || `Preset ${index}`,
    description: preset.description,
    createdAt: now,
    updatedAt: now,
    states: preset.states || [],
    transitions: preset.transitions || [],
    defaultTransitionDuration: 500,
    defaultTransitionType: "crossfade",
    parameters: preset.parameters || [],
  };
  graphStore.set(graph.id, graph);
});

// ==================== GET ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "graph" or "mapping"
  const id = searchParams.get("id");

  // Get specific graph
  if (type === "graph" && id) {
    const graph = graphStore.get(id);
    if (!graph) {
      return NextResponse.json({ error: "Graph not found" }, { status: 404 });
    }
    return NextResponse.json({ graph });
  }

  // Get specific mapping
  if (type === "mapping" && id) {
    const mapping = mappingStore.get(id);
    if (!mapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }
    return NextResponse.json({ mapping });
  }

  // List all graphs
  if (type === "graph") {
    const graphs = Array.from(graphStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return NextResponse.json({
      graphs,
      total: graphs.length,
      presets: PRESET_GRAPHS.map((p, i) => ({
        index: i,
        name: p.name,
        description: p.description,
        stateCount: p.states?.length || 0,
      })),
    });
  }

  // List all mappings
  if (type === "mapping") {
    const mappings = Array.from(mappingStore.values());
    return NextResponse.json({
      mappings,
      total: mappings.length,
    });
  }

  // Return both
  return NextResponse.json({
    graphs: Array.from(graphStore.values()),
    mappings: Array.from(mappingStore.values()),
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, type } = body;

    // ========== Graph Actions ==========

    if (type === "graph") {
      // Create empty graph
      if (action === "create") {
        const { name, description } = body;
        if (!name) {
          return NextResponse.json({ error: "name is required" }, { status: 400 });
        }

        const graph = createEmptyGraph(name);
        if (description) graph.description = description;
        graphStore.set(graph.id, graph);

        return NextResponse.json({ graph, created: true });
      }

      // Create from preset
      if (action === "from_preset") {
        const { presetIndex, name } = body;
        if (presetIndex === undefined || !PRESET_GRAPHS[presetIndex]) {
          return NextResponse.json({ error: "Invalid preset index" }, { status: 400 });
        }

        const preset = PRESET_GRAPHS[presetIndex];
        const now = new Date().toISOString();
        const graph: StateGraph = {
          id: `graph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: name || preset.name || "New Graph",
          description: preset.description,
          createdAt: now,
          updatedAt: now,
          states: preset.states || [],
          transitions: preset.transitions || [],
          defaultTransitionDuration: 500,
          defaultTransitionType: "crossfade",
          parameters: preset.parameters || [],
        };

        graphStore.set(graph.id, graph);
        return NextResponse.json({ graph, created: true });
      }

      // Add state to graph
      if (action === "add_state") {
        const { graphId, state } = body;
        const graph = graphStore.get(graphId);
        if (!graph) {
          return NextResponse.json({ error: "Graph not found" }, { status: 404 });
        }

        const updated = addState(graph, state);
        graphStore.set(graphId, updated);
        return NextResponse.json({ graph: updated, stateAdded: true });
      }

      // Add transition to graph
      if (action === "add_transition") {
        const { graphId, transition } = body;
        const graph = graphStore.get(graphId);
        if (!graph) {
          return NextResponse.json({ error: "Graph not found" }, { status: 404 });
        }

        const updated = addTransition(graph, transition);
        graphStore.set(graphId, updated);
        return NextResponse.json({ graph: updated, transitionAdded: true });
      }

      // Add parameter to graph
      if (action === "add_parameter") {
        const { graphId, parameter } = body;
        const graph = graphStore.get(graphId);
        if (!graph) {
          return NextResponse.json({ error: "Graph not found" }, { status: 404 });
        }

        const updated = addParameter(graph, parameter);
        graphStore.set(graphId, updated);
        return NextResponse.json({ graph: updated, parameterAdded: true });
      }

      // Duplicate graph
      if (action === "duplicate") {
        const { graphId, newName } = body;
        const original = graphStore.get(graphId);
        if (!original) {
          return NextResponse.json({ error: "Graph not found" }, { status: 404 });
        }

        const now = new Date().toISOString();
        const duplicate: StateGraph = {
          ...original,
          id: `graph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: newName || `${original.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
        };

        graphStore.set(duplicate.id, duplicate);
        return NextResponse.json({ graph: duplicate, duplicated: true });
      }

      // Compile graph to engine format
      if (action === "compile") {
        const { graphId, target } = body as { graphId: string; target: CompilerTarget };
        const graph = graphStore.get(graphId);
        if (!graph) {
          return NextResponse.json({ error: "Graph not found" }, { status: 404 });
        }

        const compiled = compileGraphToEngine(graph, target);
        return NextResponse.json({ compiled });
      }
    }

    // ========== Mapping Actions ==========

    if (type === "mapping") {
      // Create mapping
      if (action === "create") {
        const { mapping } = body;
        if (!mapping || !mapping.name) {
          return NextResponse.json({ error: "mapping with name is required" }, { status: 400 });
        }

        const newMapping: ParameterMapping = {
          ...mapping,
          id: `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };

        mappingStore.set(newMapping.id, newMapping);
        return NextResponse.json({ mapping: newMapping, created: true });
      }

      // Duplicate mapping
      if (action === "duplicate") {
        const { mappingId, newName } = body;
        const original = mappingStore.get(mappingId);
        if (!original) {
          return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
        }

        const duplicate: ParameterMapping = {
          ...original,
          id: `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: newName || `${original.name} (Copy)`,
        };

        mappingStore.set(duplicate.id, duplicate);
        return NextResponse.json({ mapping: duplicate, duplicated: true });
      }
    }

    // ========== Simulate Actions ==========

    if (action === "simulate") {
      const { graphId, parameters, duration } = body;
      const graph = graphStore.get(graphId);
      if (!graph) {
        return NextResponse.json({ error: "Graph not found" }, { status: 404 });
      }

      const simulation = simulateGraph(graph, parameters, duration);
      return NextResponse.json({ simulation });
    }

    return NextResponse.json(
      { error: "Invalid action or type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Adaptive audio API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== PUT ====================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, updates } = body;

    if (type === "graph") {
      const existing = graphStore.get(id);
      if (!existing) {
        return NextResponse.json({ error: "Graph not found" }, { status: 404 });
      }

      const updated: StateGraph = {
        ...existing,
        ...updates,
        id, // Preserve ID
        createdAt: existing.createdAt, // Preserve creation date
        updatedAt: new Date().toISOString(),
      };

      graphStore.set(id, updated);
      return NextResponse.json({ graph: updated, updated: true });
    }

    if (type === "mapping") {
      const existing = mappingStore.get(id);
      if (!existing) {
        return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
      }

      const updated: ParameterMapping = {
        ...existing,
        ...updates,
        id, // Preserve ID
      };

      mappingStore.set(id, updated);
      return NextResponse.json({ mapping: updated, updated: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Adaptive audio update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  if (type === "graph") {
    const existing = graphStore.get(id);
    if (!existing) {
      return NextResponse.json({ error: "Graph not found" }, { status: 404 });
    }

    graphStore.delete(id);
    return NextResponse.json({ deleted: true, id, name: existing.name });
  }

  if (type === "mapping") {
    const existing = mappingStore.get(id);
    if (!existing) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    mappingStore.delete(id);
    return NextResponse.json({ deleted: true, id, name: existing.name });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// ==================== Helpers ====================

function compileGraphToEngine(graph: StateGraph, target: CompilerTarget): object {
  // Generate engine-specific format
  switch (target) {
    case "wwise":
      return compileToWwiseStateMachine(graph);
    case "fmod":
      return compileToFMODStateMachine(graph);
    case "unity":
      return compileToUnityStateMachine(graph);
    case "unreal":
      return compileToUnrealStateMachine(graph);
    default:
      return { graph, target };
  }
}

function compileToWwiseStateMachine(graph: StateGraph) {
  return {
    type: "wwise_state_group",
    name: graph.name,
    states: graph.states.map((s) => ({
      name: s.name,
      id: s.id,
      defaultTransition: graph.defaultTransitionDuration,
    })),
    transitions: graph.transitions.map((t) => ({
      from: graph.states.find((s) => s.id === t.fromStateId)?.name,
      to: graph.states.find((s) => s.id === t.toStateId)?.name,
      duration: t.duration,
      curve: t.transitionType === "crossfade" ? "SCurve" : "Linear",
    })),
    rtpcs: graph.parameters.filter((p) => p.type === "number").map((p) => ({
      name: p.name,
      min: p.min || 0,
      max: p.max || 100,
      default: p.defaultValue,
    })),
  };
}

function compileToFMODStateMachine(graph: StateGraph) {
  return {
    type: "fmod_event",
    name: graph.name,
    parameters: graph.parameters.map((p) => ({
      name: p.name,
      type: p.type === "number" ? "continuous" : "discrete",
      min: p.min || 0,
      max: p.max || 1,
      default: p.defaultValue,
    })),
    instruments: graph.states.map((s) => ({
      name: s.name,
      triggers: graph.transitions
        .filter((t) => t.toStateId === s.id)
        .map((t) => ({
          condition: t.conditions.map((c) => ({
            parameter: c.parameter,
            operator: c.operator,
            value: c.value,
          })),
        })),
    })),
  };
}

function compileToUnityStateMachine(graph: StateGraph) {
  const className = graph.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return {
    type: "unity_scriptable_object",
    className: `AdaptiveAudio${className}`,
    code: generateUnityStateMachineCode(graph),
    metadata: {
      stateCount: graph.states.length,
      transitionCount: graph.transitions.length,
      parameterCount: graph.parameters.length,
    },
  };
}

function compileToUnrealStateMachine(graph: StateGraph) {
  const className = graph.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return {
    type: "unreal_data_asset",
    className: `UDA_AdaptiveAudio${className}`,
    header: generateUnrealHeaderCode(graph),
    metadata: {
      stateCount: graph.states.length,
      transitionCount: graph.transitions.length,
      parameterCount: graph.parameters.length,
    },
  };
}

function generateUnityStateMachineCode(graph: StateGraph): string {
  const className = graph.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// Generated by Swanblade Adaptive Audio
using UnityEngine;
using System.Collections.Generic;

public enum ${className}State { ${graph.states.map((s) => s.name.replace(/\s+/g, "_")).join(", ")} }

[CreateAssetMenu(fileName = "${className}AdaptiveAudio", menuName = "Swanblade/Adaptive/${className}")]
public class AdaptiveAudio${className} : ScriptableObject
{
    public ${className}State currentState = ${className}State.${graph.states[0]?.name.replace(/\s+/g, "_") || "None"};

    ${graph.parameters.map((p) => `
    [Range(${p.min || 0}f, ${p.max || 100}f)]
    public float ${p.name.replace(/\s+/g, "_")} = ${p.defaultValue}f;`).join("")}

    public void Update()
    {
        // Check transitions
        ${graph.transitions.map((t) => {
          const fromState = graph.states.find((s) => s.id === t.fromStateId);
          const toState = graph.states.find((s) => s.id === t.toStateId);
          const conditions = t.conditions.map((c) =>
            `${c.parameter?.replace(/\s+/g, "_")} ${c.operator} ${c.value}`
          ).join(" && ");
          return `
        if (currentState == ${className}State.${fromState?.name.replace(/\s+/g, "_")} && ${conditions || "true"})
        {
            TransitionTo(${className}State.${toState?.name.replace(/\s+/g, "_")}, ${t.duration}f);
        }`;
        }).join("")}
    }

    private void TransitionTo(${className}State newState, float duration)
    {
        // Implement crossfade/transition logic
        currentState = newState;
    }
}`;
}

function generateUnrealHeaderCode(graph: StateGraph): string {
  const className = graph.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// Generated by Swanblade Adaptive Audio
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DA_AdaptiveAudio${className}.generated.h"

UENUM(BlueprintType)
enum class E${className}State : uint8
{
    ${graph.states.map((s) => s.name.replace(/\s+/g, "_")).join(",\n    ")}
};

UCLASS(BlueprintType)
class UDA_AdaptiveAudio${className} : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    E${className}State CurrentState;

    ${graph.parameters.map((p) => `
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "${p.min || 0}", ClampMax = "${p.max || 100}"))
    float ${p.name.replace(/\s+/g, "_")} = ${p.defaultValue}f;`).join("")}

    UFUNCTION(BlueprintCallable)
    void UpdateState();
};`;
}

function simulateGraph(
  graph: StateGraph,
  parameters: Record<string, number>,
  duration: number
): object {
  const timeline: Array<{ time: number; state: string; parameters: Record<string, number> }> = [];
  let currentStateId = graph.states.find((s) => s.isInitial)?.id || graph.states[0]?.id;
  let stateEntryTime = 0;

  // Simple simulation stepping through time
  const step = 100; // 100ms steps
  for (let time = 0; time <= duration; time += step) {
    // Check transitions
    for (const transition of graph.transitions) {
      if (transition.fromStateId !== currentStateId) continue;

      const conditionsMet = transition.conditions.every((c) => {
        if (c.type === "parameter" && c.parameter && c.operator) {
          const value = parameters[c.parameter] ?? 0;
          switch (c.operator) {
            case ">": return value > (c.value as number);
            case "<": return value < (c.value as number);
            case ">=": return value >= (c.value as number);
            case "<=": return value <= (c.value as number);
            case "==": return value === c.value;
            default: return false;
          }
        }
        if (c.type === "state_duration") {
          return (time - stateEntryTime) >= (c.value as number);
        }
        return false;
      });

      if (conditionsMet) {
        currentStateId = transition.toStateId;
        stateEntryTime = time;
        break;
      }
    }

    const currentState = graph.states.find((s) => s.id === currentStateId);
    timeline.push({
      time,
      state: currentState?.name || "Unknown",
      parameters: { ...parameters },
    });
  }

  return {
    graphId: graph.id,
    graphName: graph.name,
    duration,
    timeline,
    statesVisited: [...new Set(timeline.map((t) => t.state))],
  };
}
