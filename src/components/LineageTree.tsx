"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { SoundLineage, LineageNode, SoundGeneration } from "@/types";
import { cn } from "@/lib/utils";

interface TreeNode {
  node: LineageNode;
  sound: SoundGeneration;
  children: TreeNode[];
  expanded: boolean;
}

interface LineageTreeProps {
  lineageId: string;
  sounds: Map<string, SoundGeneration>;
  selectedSoundId?: string;
  onSelectSound?: (soundId: string) => void;
  onCreateVariation?: (soundId: string) => void;
  className?: string;
}

export function LineageTree({
  lineageId,
  sounds,
  selectedSoundId,
  onSelectSound,
  onCreateVariation,
  className,
}: LineageTreeProps) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [lineage, setLineage] = useState<SoundLineage | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch lineage data
  useEffect(() => {
    async function fetchLineage() {
      try {
        const response = await fetch(`/api/variations?lineageId=${lineageId}`);
        if (!response.ok) throw new Error("Failed to fetch lineage");

        const data = await response.json();
        setLineage(data.lineage);

        // Build tree from nodes
        const nodes: LineageNode[] = data.nodes;
        const builtTree = buildTree(nodes, sounds);
        setTree(builtTree);

        // Expand all nodes by default
        const allIds = new Set(nodes.map((n: LineageNode) => n.soundId));
        setExpandedNodes(allIds);
      } catch (error) {
        console.error("Failed to load lineage:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLineage();
  }, [lineageId, sounds]);

  const toggleExpand = useCallback((soundId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(soundId)) {
        next.delete(soundId);
      } else {
        next.add(soundId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (soundId: string) => {
      onSelectSound?.(soundId);
    },
    [onSelectSound]
  );

  const handleCreateVariation = useCallback(
    (soundId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onCreateVariation?.(soundId);
    },
    [onCreateVariation]
  );

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="ml-2 text-sm text-muted-foreground">Loading lineage...</span>
      </div>
    );
  }

  if (!tree || !lineage) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        No lineage data available
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Lineage Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
        <div>
          <h3 className="font-medium text-sm">{lineage.name}</h3>
          <p className="text-xs text-muted-foreground">
            {lineage.totalVariations} sounds · {lineage.totalGenerations} generations
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Updated {new Date(lineage.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Tree View */}
      <div className="overflow-auto max-h-[500px]">
        <TreeNodeComponent
          treeNode={tree}
          depth={0}
          expandedNodes={expandedNodes}
          selectedSoundId={selectedSoundId}
          onToggleExpand={toggleExpand}
          onSelect={handleSelect}
          onCreateVariation={handleCreateVariation}
        />
      </div>
    </div>
  );
}

// ==================== Tree Node Component ====================

interface TreeNodeComponentProps {
  treeNode: TreeNode;
  depth: number;
  expandedNodes: Set<string>;
  selectedSoundId?: string;
  onToggleExpand: (soundId: string) => void;
  onSelect: (soundId: string) => void;
  onCreateVariation: (soundId: string, e: React.MouseEvent) => void;
}

function TreeNodeComponent({
  treeNode,
  depth,
  expandedNodes,
  selectedSoundId,
  onToggleExpand,
  onSelect,
  onCreateVariation,
}: TreeNodeComponentProps) {
  const { node, sound, children } = treeNode;
  const isExpanded = expandedNodes.has(node.soundId);
  const isSelected = selectedSoundId === node.soundId;
  const hasChildren = children.length > 0;

  const variationTypeColors: Record<string, string> = {
    root: "bg-blue-500",
    parameter_shift: "bg-green-500",
    style_transfer: "bg-purple-500",
    combine: "bg-orange-500",
    evolve: "bg-teal-500",
    mutate: "bg-pink-500",
  };

  const variationTypeLabels: Record<string, string> = {
    root: "Root",
    parameter_shift: "Shift",
    style_transfer: "Style",
    combine: "Combine",
    evolve: "Evolve",
    mutate: "Mutate",
  };

  return (
    <div className="relative">
      {/* Connection lines */}
      {depth > 0 && (
        <div
          className="absolute left-3 -top-3 w-px h-3 bg-border"
          style={{ marginLeft: (depth - 1) * 24 + 12 }}
        />
      )}

      {/* Node */}
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-accent"
        )}
        style={{ marginLeft: depth * 24 }}
        onClick={() => onSelect(node.soundId)}
      >
        {/* Expand/collapse toggle */}
        <button
          className={cn(
            "w-4 h-4 flex items-center justify-center text-muted-foreground",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.soundId);
          }}
        >
          <svg
            className={cn(
              "w-3 h-3 transition-transform",
              isExpanded && "rotate-90"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Variation type indicator */}
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            variationTypeColors[node.variationType] || "bg-gray-500"
          )}
          title={variationTypeLabels[node.variationType]}
        />

        {/* Sound info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{sound.name}</span>
            <span className="text-xs text-muted-foreground">
              Gen {node.generation}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{sound.type}</span>
            <span>·</span>
            <span>{sound.lengthSeconds}s</span>
            {sound.bpm && (
              <>
                <span>·</span>
                <span>{sound.bpm} BPM</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          onClick={(e) => onCreateVariation(node.soundId, e)}
          title="Create variation"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-3 top-0 w-px bg-border"
            style={{
              marginLeft: depth * 24 + 12,
              height: "calc(100% - 12px)",
            }}
          />

          {children.map((child, index) => (
            <div key={child.node.soundId} className="relative">
              {/* Horizontal connector line */}
              <div
                className="absolute w-3 h-px bg-border"
                style={{
                  left: depth * 24 + 16,
                  top: 16,
                }}
              />
              <TreeNodeComponent
                treeNode={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                selectedSoundId={selectedSoundId}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onCreateVariation={onCreateVariation}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Legend Component ====================

export function LineageTreeLegend() {
  const items = [
    { type: "root", label: "Root Sound", color: "bg-blue-500" },
    { type: "parameter_shift", label: "Parameter Shift", color: "bg-green-500" },
    { type: "evolve", label: "Evolution", color: "bg-teal-500" },
    { type: "mutate", label: "Mutation", color: "bg-pink-500" },
    { type: "combine", label: "Combined", color: "bg-orange-500" },
    { type: "style_transfer", label: "Style Transfer", color: "bg-purple-500" },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full", item.color)} />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ==================== Helpers ====================

function buildTree(
  nodes: LineageNode[],
  sounds: Map<string, SoundGeneration>
): TreeNode | null {
  if (nodes.length === 0) return null;

  const rootNode = nodes.find((n) => n.parentId === null);
  if (!rootNode) return null;

  const rootSound = sounds.get(rootNode.soundId);
  if (!rootSound) return null;

  const buildSubtree = (node: LineageNode): TreeNode => {
    const sound = sounds.get(node.soundId)!;
    const childNodes = nodes.filter((n) => n.parentId === node.soundId);
    const children = childNodes.map((n) => buildSubtree(n));

    return {
      node,
      sound,
      children,
      expanded: true,
    };
  };

  return buildSubtree(rootNode);
}

export default LineageTree;
