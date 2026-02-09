/**
 * Sound Lineage - Track ancestry and create variations of sounds
 *
 * Builds on Sound DNA to enable:
 * - Parameter shift variations (adjust intensity, texture, etc.)
 * - Style transfer between sounds
 * - Sound combination (blend two sounds)
 * - Evolution (iterative refinement)
 * - Mutation (random exploration)
 */

import type {
  SoundLineage,
  LineageNode,
  VariationType,
  ParameterShift,
  VariationRequest,
  SoundGeneration,
} from "@/types";

// ==================== Lineage Tree Operations ====================

/**
 * Create a new lineage tree from a root sound
 */
export function createLineage(rootSound: SoundGeneration): SoundLineage {
  const now = new Date().toISOString();
  return {
    id: `lineage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    rootSoundId: rootSound.id,
    name: `Lineage of "${rootSound.name}"`,
    createdAt: now,
    updatedAt: now,
    totalGenerations: 1,
    totalVariations: 1,
  };
}

/**
 * Create a lineage node for a sound
 */
export function createLineageNode(
  sound: SoundGeneration,
  lineageId: string,
  parentId: string | null,
  generation: number,
  variationType: VariationType,
  parameterShifts?: ParameterShift[]
): LineageNode {
  return {
    soundId: sound.id,
    parentId,
    lineageId,
    generation,
    variationType,
    parameterShifts,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Calculate parameter shifts between parent and child
 */
export function calculateParameterShifts(
  parent: SoundGeneration,
  child: SoundGeneration
): ParameterShift[] {
  const shifts: ParameterShift[] = [];
  const parameters: ParameterShift["parameter"][] = [
    "intensity",
    "texture",
    "brightness",
    "noisiness",
  ];

  for (const param of parameters) {
    const originalValue = parent[param] as number;
    const newValue = child[param] as number;
    const shiftAmount = newValue - originalValue;

    if (Math.abs(shiftAmount) > 0.01) {
      shifts.push({
        parameter: param,
        originalValue,
        newValue,
        shiftAmount,
      });
    }
  }

  // BPM shift
  if (parent.bpm && child.bpm && parent.bpm !== child.bpm) {
    shifts.push({
      parameter: "bpm",
      originalValue: parent.bpm,
      newValue: child.bpm,
      shiftAmount: child.bpm - parent.bpm,
    });
  }

  return shifts;
}

// ==================== Variation Generation ====================

/**
 * Generate variation parameters based on request type
 */
export function generateVariationParams(
  parentSound: SoundGeneration,
  request: VariationRequest,
  variationIndex: number
): Partial<SoundGeneration> {
  switch (request.variationType) {
    case "parameter_shift":
      return generateParameterShiftVariation(parentSound, request, variationIndex);
    case "evolve":
      return generateEvolveVariation(parentSound, request, variationIndex);
    case "mutate":
      return generateMutateVariation(parentSound, request, variationIndex);
    default:
      return {};
  }
}

/**
 * Generate parameter shift variation
 * Applies specified shifts to create variations
 */
function generateParameterShiftVariation(
  parent: SoundGeneration,
  request: VariationRequest,
  index: number
): Partial<SoundGeneration> {
  const shifts = request.parameterShifts || {};
  const spreadFactor = (index - Math.floor(request.count / 2)) / Math.max(request.count - 1, 1);

  return {
    intensity: clamp(parent.intensity + (shifts.intensity || 0) * spreadFactor, 0, 100),
    texture: clamp(parent.texture + (shifts.texture || 0) * spreadFactor, 0, 100),
    brightness: clamp(parent.brightness + (shifts.brightness || 0) * spreadFactor, 0, 100),
    noisiness: clamp(parent.noisiness + (shifts.noisiness || 0) * spreadFactor, 0, 100),
    bpm: parent.bpm ? Math.round(parent.bpm + (shifts.bpm || 0) * spreadFactor) : undefined,
  };
}

/**
 * Generate evolution variation
 * Makes small, incremental changes in a consistent direction
 */
function generateEvolveVariation(
  parent: SoundGeneration,
  request: VariationRequest,
  index: number
): Partial<SoundGeneration> {
  const strength = request.evolutionStrength ?? 0.2;
  const direction = index / Math.max(request.count - 1, 1); // 0 to 1

  // Determine evolution direction based on parent characteristics
  const intensityDirection = parent.intensity < 50 ? 1 : -1;
  const textureDirection = parent.texture < 50 ? 1 : -1;

  return {
    intensity: clamp(parent.intensity + intensityDirection * strength * direction * 30, 0, 100),
    texture: clamp(parent.texture + textureDirection * strength * direction * 20, 0, 100),
    brightness: clamp(parent.brightness + (Math.random() - 0.5) * strength * 20, 0, 100),
    noisiness: clamp(parent.noisiness + (Math.random() - 0.5) * strength * 15, 0, 100),
  };
}

/**
 * Generate mutation variation
 * Makes random changes for exploration
 */
function generateMutateVariation(
  parent: SoundGeneration,
  request: VariationRequest,
  _index: number
): Partial<SoundGeneration> {
  const rate = request.mutationRate ?? 0.3;
  const preserveCore = request.preserveCore ?? true;

  const mutate = (value: number, maxChange: number): number => {
    if (Math.random() > rate) return value;
    const change = (Math.random() - 0.5) * 2 * maxChange;
    return clamp(value + change, 0, 100);
  };

  return {
    intensity: preserveCore ? parent.intensity : mutate(parent.intensity, 40),
    texture: mutate(parent.texture, 30),
    brightness: mutate(parent.brightness, 35),
    noisiness: mutate(parent.noisiness, 25),
    bpm: parent.bpm && !preserveCore ? Math.round(parent.bpm + (Math.random() - 0.5) * 20) : parent.bpm,
  };
}

/**
 * Generate prompt for combined sound variation
 */
export function generateCombinePrompt(
  sound1: SoundGeneration,
  sound2: SoundGeneration,
  blendRatio: number = 0.5
): string {
  const mood1 = sound1.moodTags.slice(0, 2).join(", ");
  const mood2 = sound2.moodTags.slice(0, 2).join(", ");

  const primary = blendRatio >= 0.5 ? sound1 : sound2;
  const secondary = blendRatio >= 0.5 ? sound2 : sound1;

  return `Hybrid sound combining ${primary.type} (${mood1}) with elements of ${secondary.type} (${mood2}). ` +
    `Primary character from "${primary.prompt.slice(0, 50)}..." ` +
    `with ${secondary.type.toLowerCase()} influences. ` +
    `Blend ratio ${Math.round(blendRatio * 100)}% primary.`;
}

/**
 * Calculate blended parameters for combine variation
 */
export function blendParameters(
  sound1: SoundGeneration,
  sound2: SoundGeneration,
  ratio: number = 0.5
): Partial<SoundGeneration> {
  const blend = (a: number, b: number) => Math.round(a * ratio + b * (1 - ratio));

  return {
    intensity: blend(sound1.intensity, sound2.intensity),
    texture: blend(sound1.texture, sound2.texture),
    brightness: blend(sound1.brightness, sound2.brightness),
    noisiness: blend(sound1.noisiness, sound2.noisiness),
    bpm: sound1.bpm && sound2.bpm ? blend(sound1.bpm, sound2.bpm) : sound1.bpm || sound2.bpm,
    moodTags: [...new Set([...sound1.moodTags.slice(0, 2), ...sound2.moodTags.slice(0, 2)])],
  };
}

// ==================== Lineage Tree Traversal ====================

/**
 * Build a tree structure from flat lineage nodes
 */
export interface LineageTreeNode {
  node: LineageNode;
  sound: SoundGeneration;
  children: LineageTreeNode[];
}

export function buildLineageTree(
  nodes: LineageNode[],
  sounds: Map<string, SoundGeneration>
): LineageTreeNode | null {
  if (nodes.length === 0) return null;

  // Find root (no parent)
  const rootNode = nodes.find((n) => n.parentId === null);
  if (!rootNode) return null;

  const rootSound = sounds.get(rootNode.soundId);
  if (!rootSound) return null;

  const buildSubtree = (node: LineageNode): LineageTreeNode => {
    const sound = sounds.get(node.soundId)!;
    const children = nodes
      .filter((n) => n.parentId === node.soundId)
      .map((n) => buildSubtree(n));

    return { node, sound, children };
  };

  return buildSubtree(rootNode);
}

/**
 * Get all ancestors of a sound in the lineage
 */
export function getAncestors(
  soundId: string,
  nodes: LineageNode[]
): LineageNode[] {
  const ancestors: LineageNode[] = [];
  let current = nodes.find((n) => n.soundId === soundId);

  while (current && current.parentId) {
    const parent = nodes.find((n) => n.soundId === current!.parentId);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Get all descendants of a sound in the lineage
 */
export function getDescendants(
  soundId: string,
  nodes: LineageNode[]
): LineageNode[] {
  const descendants: LineageNode[] = [];
  const queue = nodes.filter((n) => n.parentId === soundId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.push(current);

    const children = nodes.filter((n) => n.parentId === current.soundId);
    queue.push(...children);
  }

  return descendants;
}

/**
 * Get the generation (depth) of a sound in its lineage
 */
export function getGeneration(soundId: string, nodes: LineageNode[]): number {
  const node = nodes.find((n) => n.soundId === soundId);
  return node?.generation ?? 0;
}

/**
 * Find siblings (same parent) of a sound
 */
export function getSiblings(
  soundId: string,
  nodes: LineageNode[]
): LineageNode[] {
  const node = nodes.find((n) => n.soundId === soundId);
  if (!node || !node.parentId) return [];

  return nodes.filter(
    (n) => n.parentId === node.parentId && n.soundId !== soundId
  );
}

// ==================== Lineage Statistics ====================

export interface LineageStats {
  totalSounds: number;
  maxDepth: number;
  avgBranchingFactor: number;
  variationTypeDistribution: Record<VariationType, number>;
  parameterDrift: {
    intensity: number;
    texture: number;
    brightness: number;
    noisiness: number;
  };
}

export function calculateLineageStats(
  nodes: LineageNode[],
  sounds: Map<string, SoundGeneration>
): LineageStats {
  const stats: LineageStats = {
    totalSounds: nodes.length,
    maxDepth: Math.max(...nodes.map((n) => n.generation), 0),
    avgBranchingFactor: 0,
    variationTypeDistribution: {
      root: 0,
      parameter_shift: 0,
      style_transfer: 0,
      combine: 0,
      evolve: 0,
      mutate: 0,
    },
    parameterDrift: {
      intensity: 0,
      texture: 0,
      brightness: 0,
      noisiness: 0,
    },
  };

  // Count variation types
  for (const node of nodes) {
    stats.variationTypeDistribution[node.variationType]++;
  }

  // Calculate branching factor
  const parentCounts = new Map<string, number>();
  for (const node of nodes) {
    if (node.parentId) {
      parentCounts.set(node.parentId, (parentCounts.get(node.parentId) || 0) + 1);
    }
  }
  if (parentCounts.size > 0) {
    stats.avgBranchingFactor =
      Array.from(parentCounts.values()).reduce((a, b) => a + b, 0) / parentCounts.size;
  }

  // Calculate parameter drift from root to leaves
  const rootNode = nodes.find((n) => n.parentId === null);
  if (rootNode) {
    const rootSound = sounds.get(rootNode.soundId);
    const leafNodes = nodes.filter(
      (n) => !nodes.some((other) => other.parentId === n.soundId)
    );

    if (rootSound && leafNodes.length > 0) {
      for (const leaf of leafNodes) {
        const leafSound = sounds.get(leaf.soundId);
        if (leafSound) {
          stats.parameterDrift.intensity += Math.abs(leafSound.intensity - rootSound.intensity);
          stats.parameterDrift.texture += Math.abs(leafSound.texture - rootSound.texture);
          stats.parameterDrift.brightness += Math.abs(leafSound.brightness - rootSound.brightness);
          stats.parameterDrift.noisiness += Math.abs(leafSound.noisiness - rootSound.noisiness);
        }
      }

      const leafCount = leafNodes.length;
      stats.parameterDrift.intensity /= leafCount;
      stats.parameterDrift.texture /= leafCount;
      stats.parameterDrift.brightness /= leafCount;
      stats.parameterDrift.noisiness /= leafCount;
    }
  }

  return stats;
}

// ==================== Browser Storage ====================

export class SoundLineageStore {
  private lineageKey = "swanblade_lineages";
  private nodesKey = "swanblade_lineage_nodes";

  // Lineage operations
  getAllLineages(): SoundLineage[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.lineageKey);
    return stored ? JSON.parse(stored) : [];
  }

  getLineage(id: string): SoundLineage | undefined {
    return this.getAllLineages().find((l) => l.id === id);
  }

  getLineageByRootSound(rootSoundId: string): SoundLineage | undefined {
    return this.getAllLineages().find((l) => l.rootSoundId === rootSoundId);
  }

  saveLineage(lineage: SoundLineage): void {
    const all = this.getAllLineages();
    const existing = all.findIndex((l) => l.id === lineage.id);
    if (existing >= 0) {
      all[existing] = lineage;
    } else {
      all.push(lineage);
    }
    localStorage.setItem(this.lineageKey, JSON.stringify(all));
  }

  deleteLineage(id: string): void {
    const lineages = this.getAllLineages().filter((l) => l.id !== id);
    localStorage.setItem(this.lineageKey, JSON.stringify(lineages));

    // Also delete associated nodes
    const nodes = this.getAllNodes().filter((n) => n.lineageId !== id);
    localStorage.setItem(this.nodesKey, JSON.stringify(nodes));
  }

  // Node operations
  getAllNodes(): LineageNode[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.nodesKey);
    return stored ? JSON.parse(stored) : [];
  }

  getNodesForLineage(lineageId: string): LineageNode[] {
    return this.getAllNodes().filter((n) => n.lineageId === lineageId);
  }

  getNodeForSound(soundId: string): LineageNode | undefined {
    return this.getAllNodes().find((n) => n.soundId === soundId);
  }

  saveNode(node: LineageNode): void {
    const all = this.getAllNodes();
    const existing = all.findIndex((n) => n.soundId === node.soundId);
    if (existing >= 0) {
      all[existing] = node;
    } else {
      all.push(node);
    }
    localStorage.setItem(this.nodesKey, JSON.stringify(all));

    // Update lineage counts
    const lineage = this.getLineage(node.lineageId);
    if (lineage) {
      const lineageNodes = this.getNodesForLineage(node.lineageId);
      lineage.totalVariations = lineageNodes.length;
      lineage.totalGenerations = Math.max(...lineageNodes.map((n) => n.generation), 0) + 1;
      lineage.updatedAt = new Date().toISOString();
      this.saveLineage(lineage);
    }
  }

  deleteNode(soundId: string): void {
    const nodes = this.getAllNodes().filter((n) => n.soundId !== soundId);
    localStorage.setItem(this.nodesKey, JSON.stringify(nodes));
  }
}

// ==================== Helpers ====================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
