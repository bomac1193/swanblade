/**
 * Game State Engine
 *
 * Generate audio tailored to specific game contexts
 */

import type { SoundPalette } from "./soundPalette";

// ============================================================================
// TYPES
// ============================================================================

export type GameState =
  | "menu"
  | "exploration"
  | "combat"
  | "boss"
  | "victory"
  | "defeat"
  | "stealth"
  | "chase"
  | "ambient"
  | "tension"
  | "cutscene"
  | "credits";

export type StemType =
  | "drums"
  | "bass"
  | "melody"
  | "harmony"
  | "atmosphere"
  | "fx"
  | "vocals";

export interface GameStateConfig {
  state: GameState;
  displayName: string;
  description: string;

  // Parameter modifiers (relative to palette)
  modifiers: {
    energyOffset: number; // -50 to +50
    bpmOffset: number; // -30 to +30
    textureOffset: number; // -30 to +30
    brightnessOffset: number; // -30 to +30
  };

  // Stem volume defaults (0-1)
  stemDefaults: Record<StemType, number>;

  // Prompt additions
  promptKeywords: string[];
}

export interface StemBundle {
  gameState: GameState;
  stems: GeneratedStem[];
  mixPreset: Record<StemType, number>;
  provenanceCid?: string;
  createdAt: string;
}

export interface GeneratedStem {
  type: StemType;
  audioUrl: string;
  duration: number;
  provenanceCid?: string;
}

export interface GameAudioRequest {
  gameState: GameState;
  palette?: SoundPalette;
  stemTypes: StemType[];
  duration: number;
  baseBpm?: number;
  key?: string;
}

export interface GameAudioResult {
  bundle: StemBundle;
  totalDuration: number;
  provenanceCids: string[];
}

// ============================================================================
// GAME STATE CONFIGURATIONS
// ============================================================================

export const GAME_STATE_CONFIGS: Record<GameState, GameStateConfig> = {
  menu: {
    state: "menu",
    displayName: "Main Menu",
    description: "Relaxed, inviting music for game menus and title screens",
    modifiers: {
      energyOffset: -30,
      bpmOffset: -20,
      textureOffset: -10,
      brightnessOffset: 0,
    },
    stemDefaults: {
      drums: 0.3,
      bass: 0.5,
      melody: 0.8,
      harmony: 0.7,
      atmosphere: 0.9,
      fx: 0.2,
      vocals: 0.0,
    },
    promptKeywords: ["menu music", "inviting", "relaxed", "loop-friendly"],
  },

  exploration: {
    state: "exploration",
    displayName: "Exploration",
    description: "Curious, atmospheric music for wandering and discovery",
    modifiers: {
      energyOffset: -15,
      bpmOffset: -10,
      textureOffset: 0,
      brightnessOffset: 5,
    },
    stemDefaults: {
      drums: 0.4,
      bass: 0.5,
      melody: 0.7,
      harmony: 0.6,
      atmosphere: 1.0,
      fx: 0.4,
      vocals: 0.0,
    },
    promptKeywords: ["exploration", "curious", "atmospheric", "wandering"],
  },

  combat: {
    state: "combat",
    displayName: "Combat",
    description: "Intense, driving music for battles and action sequences",
    modifiers: {
      energyOffset: 30,
      bpmOffset: 20,
      textureOffset: 20,
      brightnessOffset: 10,
    },
    stemDefaults: {
      drums: 1.0,
      bass: 0.9,
      melody: 0.6,
      harmony: 0.4,
      atmosphere: 0.3,
      fx: 0.5,
      vocals: 0.0,
    },
    promptKeywords: ["combat", "battle", "intense", "driving", "action"],
  },

  boss: {
    state: "boss",
    displayName: "Boss Battle",
    description: "Epic, dramatic music for major confrontations",
    modifiers: {
      energyOffset: 40,
      bpmOffset: 25,
      textureOffset: 30,
      brightnessOffset: 5,
    },
    stemDefaults: {
      drums: 1.0,
      bass: 1.0,
      melody: 0.8,
      harmony: 0.7,
      atmosphere: 0.5,
      fx: 0.6,
      vocals: 0.3,
    },
    promptKeywords: ["boss battle", "epic", "dramatic", "powerful", "climactic"],
  },

  victory: {
    state: "victory",
    displayName: "Victory",
    description: "Triumphant, celebratory music for achievements",
    modifiers: {
      energyOffset: 20,
      bpmOffset: 10,
      textureOffset: 15,
      brightnessOffset: 25,
    },
    stemDefaults: {
      drums: 0.7,
      bass: 0.6,
      melody: 1.0,
      harmony: 0.9,
      atmosphere: 0.4,
      fx: 0.3,
      vocals: 0.2,
    },
    promptKeywords: ["victory", "triumphant", "celebratory", "uplifting"],
  },

  defeat: {
    state: "defeat",
    displayName: "Defeat",
    description: "Somber, reflective music for failure and game over",
    modifiers: {
      energyOffset: -35,
      bpmOffset: -25,
      textureOffset: -15,
      brightnessOffset: -20,
    },
    stemDefaults: {
      drums: 0.1,
      bass: 0.3,
      melody: 0.6,
      harmony: 0.7,
      atmosphere: 0.9,
      fx: 0.2,
      vocals: 0.0,
    },
    promptKeywords: ["defeat", "somber", "melancholy", "game over"],
  },

  stealth: {
    state: "stealth",
    displayName: "Stealth",
    description: "Tense, quiet music for sneaking and infiltration",
    modifiers: {
      energyOffset: -20,
      bpmOffset: -15,
      textureOffset: -20,
      brightnessOffset: -15,
    },
    stemDefaults: {
      drums: 0.2,
      bass: 0.4,
      melody: 0.3,
      harmony: 0.4,
      atmosphere: 0.8,
      fx: 0.6,
      vocals: 0.0,
    },
    promptKeywords: ["stealth", "tense", "quiet", "suspenseful", "sneaking"],
  },

  chase: {
    state: "chase",
    displayName: "Chase",
    description: "Urgent, fast-paced music for pursuit sequences",
    modifiers: {
      energyOffset: 35,
      bpmOffset: 30,
      textureOffset: 15,
      brightnessOffset: 15,
    },
    stemDefaults: {
      drums: 1.0,
      bass: 0.8,
      melody: 0.5,
      harmony: 0.3,
      atmosphere: 0.4,
      fx: 0.7,
      vocals: 0.0,
    },
    promptKeywords: ["chase", "urgent", "fast-paced", "pursuit", "running"],
  },

  ambient: {
    state: "ambient",
    displayName: "Ambient",
    description: "Minimal, atmospheric background for quiet moments",
    modifiers: {
      energyOffset: -40,
      bpmOffset: -30,
      textureOffset: -25,
      brightnessOffset: -10,
    },
    stemDefaults: {
      drums: 0.0,
      bass: 0.2,
      melody: 0.3,
      harmony: 0.5,
      atmosphere: 1.0,
      fx: 0.4,
      vocals: 0.0,
    },
    promptKeywords: ["ambient", "atmospheric", "minimal", "background", "subtle"],
  },

  tension: {
    state: "tension",
    displayName: "Tension",
    description: "Building suspense before action",
    modifiers: {
      energyOffset: 5,
      bpmOffset: 0,
      textureOffset: 10,
      brightnessOffset: -10,
    },
    stemDefaults: {
      drums: 0.4,
      bass: 0.6,
      melody: 0.4,
      harmony: 0.5,
      atmosphere: 0.8,
      fx: 0.6,
      vocals: 0.0,
    },
    promptKeywords: ["tension", "suspense", "building", "anticipation"],
  },

  cutscene: {
    state: "cutscene",
    displayName: "Cutscene",
    description: "Cinematic, emotional music for story moments",
    modifiers: {
      energyOffset: 0,
      bpmOffset: -5,
      textureOffset: 20,
      brightnessOffset: 0,
    },
    stemDefaults: {
      drums: 0.3,
      bass: 0.5,
      melody: 0.9,
      harmony: 0.8,
      atmosphere: 0.6,
      fx: 0.2,
      vocals: 0.4,
    },
    promptKeywords: ["cinematic", "emotional", "storytelling", "dramatic"],
  },

  credits: {
    state: "credits",
    displayName: "Credits",
    description: "Reflective, satisfying music for end credits",
    modifiers: {
      energyOffset: -10,
      bpmOffset: -5,
      textureOffset: 10,
      brightnessOffset: 10,
    },
    stemDefaults: {
      drums: 0.5,
      bass: 0.6,
      melody: 0.9,
      harmony: 0.8,
      atmosphere: 0.5,
      fx: 0.1,
      vocals: 0.3,
    },
    promptKeywords: ["credits", "reflective", "satisfying", "conclusion"],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply game state modifiers to base parameters
 */
export function applyGameStateModifiers(
  baseParams: {
    bpm: number;
    intensity: number;
    texture: number;
    brightness: number;
  },
  gameState: GameState
): typeof baseParams {
  const config = GAME_STATE_CONFIGS[gameState];
  if (!config) return baseParams;

  return {
    bpm: clamp(baseParams.bpm + config.modifiers.bpmOffset, 60, 200),
    intensity: clamp(baseParams.intensity + config.modifiers.energyOffset, 0, 100),
    texture: clamp(baseParams.texture + config.modifiers.textureOffset, 0, 100),
    brightness: clamp(baseParams.brightness + config.modifiers.brightnessOffset, 0, 100),
  };
}

/**
 * Get prompt keywords for a game state
 */
export function getGameStatePrompt(gameState: GameState, basePrompt?: string): string {
  const config = GAME_STATE_CONFIGS[gameState];
  if (!config) return basePrompt || "";

  const parts: string[] = [];

  if (basePrompt) {
    parts.push(basePrompt);
  }

  parts.push(...config.promptKeywords);

  return parts.join(", ");
}

/**
 * Get default stem mix for a game state
 */
export function getDefaultStemMix(gameState: GameState): Record<StemType, number> {
  const config = GAME_STATE_CONFIGS[gameState];
  return config ? { ...config.stemDefaults } : {
    drums: 0.7,
    bass: 0.7,
    melody: 0.7,
    harmony: 0.7,
    atmosphere: 0.7,
    fx: 0.5,
    vocals: 0.0,
  };
}

/**
 * Generate a complete stem bundle for a game state
 */
export function createStemBundleRequest(
  gameState: GameState,
  options: {
    palette?: SoundPalette;
    duration?: number;
    baseBpm?: number;
    key?: string;
    customPrompt?: string;
  } = {}
): {
  requests: Array<{
    stemType: StemType;
    prompt: string;
    bpm: number;
    intensity: number;
    texture: number;
    brightness: number;
    duration: number;
  }>;
  mixPreset: Record<StemType, number>;
} {
  const config = GAME_STATE_CONFIGS[gameState];
  const duration = options.duration || 30;
  const baseBpm = options.baseBpm || 120;

  // Apply modifiers
  const modifiedBpm = clamp(baseBpm + config.modifiers.bpmOffset, 60, 200);

  // Base parameters
  const baseParams = {
    intensity: 50 + config.modifiers.energyOffset,
    texture: 50 + config.modifiers.textureOffset,
    brightness: 50 + config.modifiers.brightnessOffset,
  };

  // Stem-specific prompts
  const stemPrompts: Record<StemType, string> = {
    drums: `${config.promptKeywords.join(", ")}, drum pattern, percussion`,
    bass: `${config.promptKeywords.join(", ")}, bass line, low end`,
    melody: `${config.promptKeywords.join(", ")}, lead melody, main theme`,
    harmony: `${config.promptKeywords.join(", ")}, chords, harmony, pads`,
    atmosphere: `${config.promptKeywords.join(", ")}, atmospheric, ambient texture`,
    fx: `${config.promptKeywords.join(", ")}, sound effects, transitions`,
    vocals: `${config.promptKeywords.join(", ")}, vocal, choir, voice`,
  };

  // Build requests for each stem type that has volume > 0
  const requests = Object.entries(config.stemDefaults)
    .filter(([_, volume]) => volume > 0.1)
    .map(([stemType, _]) => ({
      stemType: stemType as StemType,
      prompt: options.customPrompt
        ? `${options.customPrompt}, ${stemPrompts[stemType as StemType]}`
        : stemPrompts[stemType as StemType],
      bpm: modifiedBpm,
      intensity: clamp(baseParams.intensity, 0, 100),
      texture: clamp(baseParams.texture, 0, 100),
      brightness: clamp(baseParams.brightness, 0, 100),
      duration,
    }));

  return {
    requests,
    mixPreset: { ...config.stemDefaults },
  };
}

/**
 * Get all game states for UI display
 */
export function getAllGameStates(): Array<{
  state: GameState;
  displayName: string;
  description: string;
}> {
  return Object.values(GAME_STATE_CONFIGS).map((config) => ({
    state: config.state,
    displayName: config.displayName,
    description: config.description,
  }));
}

/**
 * Export stem bundle to various formats
 */
export interface ExportOptions {
  format: "unity" | "unreal" | "wwise" | "fmod" | "json";
  includeProvenance: boolean;
}

export function exportStemBundle(
  bundle: StemBundle,
  options: ExportOptions
): string {
  switch (options.format) {
    case "unity":
      return exportToUnity(bundle, options.includeProvenance);
    case "unreal":
      return exportToUnreal(bundle, options.includeProvenance);
    case "wwise":
      return exportToWwise(bundle, options.includeProvenance);
    case "fmod":
      return exportToFMOD(bundle, options.includeProvenance);
    case "json":
    default:
      return JSON.stringify(bundle, null, 2);
  }
}

function exportToUnity(bundle: StemBundle, includeProvenance: boolean): string {
  const stems = bundle.stems.map((s) => ({
    stemType: s.type,
    audioClip: `AudioClips/${bundle.gameState}_${s.type}`,
    defaultVolume: bundle.mixPreset[s.type],
    ...(includeProvenance && { provenanceCid: s.provenanceCid }),
  }));

  return `// Unity AudioMixer Configuration
// Generated by Swanblade for ${bundle.gameState}
// Provenance: ${bundle.provenanceCid || "Not stamped"}

using UnityEngine;

[CreateAssetMenu(fileName = "${bundle.gameState}StemBundle", menuName = "Audio/Stem Bundle")]
public class ${pascalCase(bundle.gameState)}StemBundle : ScriptableObject
{
    [System.Serializable]
    public class Stem
    {
        public string stemType;
        public AudioClip audioClip;
        public float defaultVolume;
${includeProvenance ? '        public string provenanceCid;' : ''}
    }

    public Stem[] stems = new Stem[]
    {
${stems.map((s) => `        new Stem { stemType = "${s.stemType}", defaultVolume = ${s.defaultVolume}f }`).join(",\n")}
    };

    public string gameState = "${bundle.gameState}";
${includeProvenance ? `    public string bundleProvenanceCid = "${bundle.provenanceCid}";` : ''}
}
`;
}

function exportToUnreal(bundle: StemBundle, includeProvenance: boolean): string {
  return `// Unreal Engine Audio Configuration
// Generated by Swanblade for ${bundle.gameState}
// Provenance: ${bundle.provenanceCid || "Not stamped"}

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "${pascalCase(bundle.gameState)}StemBundle.generated.h"

USTRUCT(BlueprintType)
struct FStemData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString StemType;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    USoundWave* AudioClip;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float DefaultVolume;
${includeProvenance ? `
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString ProvenanceCid;` : ''}
};

UCLASS(BlueprintType)
class U${pascalCase(bundle.gameState)}StemBundle : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FStemData> Stems;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString GameState = TEXT("${bundle.gameState}");
${includeProvenance ? `
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString BundleProvenanceCid = TEXT("${bundle.provenanceCid}");` : ''}
};
`;
}

function exportToWwise(bundle: StemBundle, includeProvenance: boolean): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Wwise Project Import - Generated by Swanblade -->
<!-- Game State: ${bundle.gameState} -->
<!-- Provenance: ${bundle.provenanceCid || "Not stamped"} -->
<WwiseDocument>
  <AudioObjects>
    <BlendContainer Name="${bundle.gameState}_blend" ID="{${generateUUID()}}">
      <PropertyList>
        <Property Name="GameState" Value="${bundle.gameState}"/>
${includeProvenance ? `        <Property Name="ProvenanceCid" Value="${bundle.provenanceCid}"/>` : ''}
      </PropertyList>
      <ChildrenList>
${bundle.stems.map((s) => `        <Sound Name="${bundle.gameState}_${s.type}" ID="{${generateUUID()}}">
          <PropertyList>
            <Property Name="Volume" Value="${Math.round((bundle.mixPreset[s.type] - 1) * 96)}"/>
            <Property Name="StemType" Value="${s.type}"/>
${includeProvenance ? `            <Property Name="ProvenanceCid" Value="${s.provenanceCid}"/>` : ''}
          </PropertyList>
        </Sound>`).join("\n")}
      </ChildrenList>
    </BlendContainer>
  </AudioObjects>
</WwiseDocument>
`;
}

function exportToFMOD(bundle: StemBundle, includeProvenance: boolean): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- FMOD Studio Event - Generated by Swanblade -->
<!-- Game State: ${bundle.gameState} -->
<!-- Provenance: ${bundle.provenanceCid || "Not stamped"} -->
<event name="${bundle.gameState}">
  <property name="gameState" value="${bundle.gameState}"/>
${includeProvenance ? `  <property name="provenanceCid" value="${bundle.provenanceCid}"/>` : ''}
  <tracks>
${bundle.stems.map((s) => `    <track name="${s.type}">
      <instrument type="singleSound">
        <audioFile path="Audio/${bundle.gameState}/${s.type}.wav"/>
        <volume value="${bundle.mixPreset[s.type]}"/>
${includeProvenance ? `        <metadata provenanceCid="${s.provenanceCid}"/>` : ''}
      </instrument>
    </track>`).join("\n")}
  </tracks>
</event>
`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pascalCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
