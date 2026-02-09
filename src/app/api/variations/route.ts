/**
 * Sound Variations API
 *
 * Generate variations of existing sounds using different strategies:
 * - Parameter shifts (adjust intensity, texture, etc.)
 * - Evolution (gradual refinement)
 * - Mutation (random exploration)
 * - Combine (blend two sounds)
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSound, type AudioProvider } from "@/lib/audioProvider";
import {
  createLineage,
  createLineageNode,
  generateVariationParams,
  generateCombinePrompt,
  blendParameters,
  SoundLineageStore,
} from "@/lib/soundLineage";
import { getLibrarySound, saveToLibrary } from "@/lib/libraryStorage";
import type {
  VariationRequest,
  VariationResult,
  SoundGeneration,
  VariationType,
} from "@/types";

const lineageStore = new SoundLineageStore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parentSoundId,
      variationType,
      count = 3,
      parameterShifts,
      combineWithSoundId,
      evolutionStrength = 0.2,
      mutationRate = 0.3,
      preserveCore = true,
      provider = "elevenlabs",
    } = body as VariationRequest & { provider?: AudioProvider };

    // Validate request
    if (!parentSoundId) {
      return NextResponse.json(
        { error: "parentSoundId is required" },
        { status: 400 }
      );
    }

    if (!isValidVariationType(variationType)) {
      return NextResponse.json(
        { error: `Invalid variationType: ${variationType}` },
        { status: 400 }
      );
    }

    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: "count must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Get parent sound
    const parentSound = await getLibrarySound(parentSoundId);
    if (!parentSound) {
      return NextResponse.json(
        { error: "Parent sound not found in library" },
        { status: 404 }
      );
    }

    // Get or create lineage
    let lineage = lineageStore.getLineageByRootSound(parentSoundId);
    let parentNode = lineageStore.getNodeForSound(parentSoundId);

    if (!lineage) {
      // Create new lineage with this sound as root
      lineage = createLineage(parentSound);
      lineageStore.saveLineage(lineage);

      // Create root node
      parentNode = createLineageNode(
        parentSound,
        lineage.id,
        null,
        0,
        "root"
      );
      lineageStore.saveNode(parentNode);
    }

    const parentGeneration = parentNode?.generation ?? 0;
    const newGeneration = parentGeneration + 1;

    // Handle combine variation
    let combineSound: SoundGeneration | null = null;
    if (variationType === "combine" && combineWithSoundId) {
      combineSound = await getLibrarySound(combineWithSoundId);
      if (!combineSound) {
        return NextResponse.json(
          { error: "Combine sound not found in library" },
          { status: 404 }
        );
      }
    }

    // Generate variations
    const variations: SoundGeneration[] = [];
    const variationRequest: VariationRequest = {
      parentSoundId,
      variationType,
      count,
      parameterShifts,
      evolutionStrength,
      mutationRate,
      preserveCore,
    };

    for (let i = 0; i < count; i++) {
      try {
        let variationParams: Partial<SoundGeneration>;
        let prompt: string;

        if (variationType === "combine" && combineSound) {
          // Blend ratio varies across variations
          const blendRatio = count > 1 ? i / (count - 1) : 0.5;
          variationParams = blendParameters(parentSound, combineSound, blendRatio);
          prompt = generateCombinePrompt(parentSound, combineSound, blendRatio);
        } else {
          variationParams = generateVariationParams(
            parentSound,
            variationRequest,
            i
          );
          prompt = buildVariationPrompt(parentSound, variationType, i, count);
        }

        // Generate the variation
        const result = await generateSound(provider, {
          prompt,
          parameters: {
            type: parentSound.type,
            moodTags: variationParams.moodTags ?? parentSound.moodTags,
            lengthSeconds: parentSound.lengthSeconds,
            bpm: variationParams.bpm ?? parentSound.bpm,
            key: parentSound.key,
            intensity: variationParams.intensity ?? parentSound.intensity,
            texture: variationParams.texture ?? parentSound.texture,
            brightness: variationParams.brightness ?? parentSound.brightness,
            noisiness: variationParams.noisiness ?? parentSound.noisiness,
            seed: parentSound.seed ? parentSound.seed + i + 1 : undefined,
          },
        });

        // Create sound object
        const variationSound: SoundGeneration = {
          id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: `${parentSound.name} - Variation ${i + 1}`,
          prompt,
          createdAt: new Date().toISOString(),
          type: parentSound.type,
          moodTags: variationParams.moodTags ?? parentSound.moodTags,
          lengthSeconds: parentSound.lengthSeconds,
          bpm: variationParams.bpm ?? parentSound.bpm,
          key: parentSound.key,
          intensity: variationParams.intensity ?? parentSound.intensity,
          texture: variationParams.texture ?? parentSound.texture,
          brightness: variationParams.brightness ?? parentSound.brightness,
          noisiness: variationParams.noisiness ?? parentSound.noisiness,
          audioUrl: result.audioUrl,
          status: "ready",
          provenanceCid: result.provenanceCid,
          variantOfId: parentSoundId,
        };

        // Save to library with lineage info
        const librarySound = await saveToLibrary(variationSound);

        // Update library sound with lineage info (manual update since saveToLibrary doesn't handle it)
        const { updateLibrarySound } = await import("@/lib/libraryStorage");
        await updateLibrarySound(variationSound.id, {
          parentId: parentSoundId,
          lineageId: lineage.id,
          generation: newGeneration,
        });

        // Create lineage node
        const node = createLineageNode(
          variationSound,
          lineage.id,
          parentSoundId,
          newGeneration,
          variationType
        );
        lineageStore.saveNode(node);

        variations.push(variationSound);
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error);
        // Continue with other variations
      }
    }

    if (variations.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any variations" },
        { status: 500 }
      );
    }

    const result: VariationResult = {
      sounds: variations,
      lineageId: lineage.id,
      generation: newGeneration,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Variation generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve lineage information
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soundId = searchParams.get("soundId");
  const lineageId = searchParams.get("lineageId");

  if (soundId) {
    // Get lineage info for a specific sound
    const node = lineageStore.getNodeForSound(soundId);
    if (!node) {
      return NextResponse.json(
        { error: "Sound not found in any lineage" },
        { status: 404 }
      );
    }

    const lineage = lineageStore.getLineage(node.lineageId);
    const nodes = lineageStore.getNodesForLineage(node.lineageId);

    return NextResponse.json({
      lineage,
      node,
      totalNodes: nodes.length,
      ancestors: getAncestorIds(soundId, nodes),
      descendants: getDescendantIds(soundId, nodes),
    });
  }

  if (lineageId) {
    // Get full lineage tree
    const lineage = lineageStore.getLineage(lineageId);
    if (!lineage) {
      return NextResponse.json(
        { error: "Lineage not found" },
        { status: 404 }
      );
    }

    const nodes = lineageStore.getNodesForLineage(lineageId);

    return NextResponse.json({
      lineage,
      nodes,
    });
  }

  // Return all lineages
  const lineages = lineageStore.getAllLineages();
  return NextResponse.json({ lineages });
}

// ==================== Helpers ====================

function isValidVariationType(type: string): type is VariationType {
  return [
    "root",
    "parameter_shift",
    "style_transfer",
    "combine",
    "evolve",
    "mutate",
  ].includes(type);
}

function buildVariationPrompt(
  parent: SoundGeneration,
  variationType: VariationType,
  index: number,
  total: number
): string {
  const position = total > 1 ? ` (variation ${index + 1} of ${total})` : "";
  const basePrompt = parent.prompt;

  switch (variationType) {
    case "parameter_shift":
      return `${basePrompt}${position} - with adjusted parameters`;

    case "evolve":
      const evolutionPhase = index / Math.max(total - 1, 1);
      if (evolutionPhase < 0.3) {
        return `${basePrompt}${position} - subtle evolution, early stage`;
      } else if (evolutionPhase < 0.7) {
        return `${basePrompt}${position} - mid evolution, developing`;
      } else {
        return `${basePrompt}${position} - evolved form, refined`;
      }

    case "mutate":
      return `${basePrompt}${position} - experimental mutation, unexpected elements`;

    case "style_transfer":
      return `${basePrompt}${position} - style variation`;

    default:
      return `${basePrompt}${position}`;
  }
}

function getAncestorIds(soundId: string, nodes: { soundId: string; parentId: string | null }[]): string[] {
  const ancestors: string[] = [];
  let current = nodes.find((n) => n.soundId === soundId);

  while (current && current.parentId) {
    ancestors.push(current.parentId);
    current = nodes.find((n) => n.soundId === current!.parentId);
  }

  return ancestors;
}

function getDescendantIds(soundId: string, nodes: { soundId: string; parentId: string | null }[]): string[] {
  const descendants: string[] = [];
  const queue = nodes.filter((n) => n.parentId === soundId).map((n) => n.soundId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.push(current);

    const children = nodes.filter((n) => n.parentId === current).map((n) => n.soundId);
    queue.push(...children);
  }

  return descendants;
}
