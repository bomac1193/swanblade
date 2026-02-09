/**
 * Game Engine Exports - One-Click Integration
 *
 * Generate complete, ready-to-use packages for:
 * - Unity (C# AudioManager, ScriptableObjects, Events)
 * - Unreal Engine (C++ Actor, DataAssets, Blueprints)
 * - Wwise (Work Units, Events, States, RTPCs)
 * - FMOD Studio (Events, Parameters, Snapshots, Banks)
 */

export * from "./unity";
export * from "./unreal";
export * from "./wwise";
export * from "./fmod";

import type { StemBundle } from "../stemGenerator";
import { generateUnityPackage, type UnityPackage } from "./unity";
import { generateUnrealPackage, type UnrealPackage } from "./unreal";
import { generateWwisePackage, type WwisePackage } from "./wwise";
import { generateFMODPackage, type FMODPackage } from "./fmod";

export type ExportTarget = "unity" | "unreal" | "wwise" | "fmod";

export interface AllExportsPackage {
  unity: UnityPackage;
  unreal: UnrealPackage;
  wwise: WwisePackage;
  fmod: FMODPackage;
  generatedAt: string;
}

/**
 * Generate all export packages at once
 */
export function generateAllExports(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): AllExportsPackage {
  return {
    unity: generateUnityPackage(bundles, projectName),
    unreal: generateUnrealPackage(bundles, projectName),
    wwise: generateWwisePackage(bundles, projectName),
    fmod: generateFMODPackage(bundles, projectName),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get recommended export target based on project context
 */
export function getRecommendedExport(
  hasUnityProject: boolean,
  hasUnrealProject: boolean,
  usesWwise: boolean,
  usesFmod: boolean
): ExportTarget {
  if (usesWwise) return "wwise";
  if (usesFmod) return "fmod";
  if (hasUnrealProject) return "unreal";
  return "unity";
}

/**
 * Estimate export file count for a target
 */
export function estimateExportFileCount(
  target: ExportTarget,
  bundleCount: number
): number {
  const baseCounts: Record<ExportTarget, number> = {
    unity: 5, // Manager, events, editor + 2 per bundle
    unreal: 6, // Manager (h+cpp), blueprint lib, gameplay tags + 1 per bundle
    wwise: 7, // Work unit, events, states, rtpcs, music, soundbank, readme
    fmod: 8, // Project, events, params, snapshots, banks, guide, readme + 1
  };

  const perBundleCounts: Record<ExportTarget, number> = {
    unity: 1, // ScriptableObject per bundle
    unreal: 1, // DataAsset per bundle
    wwise: 0, // All in work units
    fmod: 0, // All in event definitions
  };

  return baseCounts[target] + perBundleCounts[target] * bundleCount;
}
