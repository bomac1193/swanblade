/**
 * Voice Fusion API
 *
 * Generate vocal elements for game audio:
 * - Creature vocalizations
 * - Alien language speech
 * - Effort sounds
 * - Ambient vocals
 * - Choir generation
 */

import { NextRequest, NextResponse } from "next/server";
import { getVocalSynthesisService, CREATURE_PRESETS, ALIEN_LANGUAGE_PRESETS, EFFORT_PRESETS } from "@/lib/vocalSynthesis";
import { saveToLibrary } from "@/lib/libraryStorage";
import type { VoiceFusionRequest, VoiceFusionResult, SoundGeneration } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      prompt,
      baseVoiceId,
      creatureType,
      emotionalIntensity,
      alienLanguageParams,
      effortType,
      layerWithSound,
      duration,
      saveToLib = true,
    } = body as VoiceFusionRequest & { saveToLib?: boolean };

    // Validate request
    if (!type) {
      return NextResponse.json(
        { error: "type is required (creature, alien_language, effort, ambient_vocal, choir, processed)" },
        { status: 400 }
      );
    }

    // Build request
    const fusionRequest: VoiceFusionRequest = {
      type,
      prompt: prompt || "",
      baseVoiceId,
      creatureType,
      emotionalIntensity,
      alienLanguageParams,
      effortType,
      layerWithSound,
      duration,
    };

    // Generate
    const service = getVocalSynthesisService();
    const result = await service.generate(fusionRequest);

    // Create sound generation object
    const soundGeneration: SoundGeneration = {
      id: `vocal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: buildVocalName(fusionRequest),
      prompt: prompt || buildDefaultPrompt(fusionRequest),
      createdAt: new Date().toISOString(),
      type: "FX",
      moodTags: buildMoodTags(fusionRequest),
      lengthSeconds: result.voiceMetadata.duration,
      intensity: Math.round((emotionalIntensity || 0.5) * 100),
      texture: 60,
      brightness: 50,
      noisiness: 30,
      audioUrl: result.audioUrl,
      status: "ready",
      provenanceCid: result.provenanceCid,
    };

    // Save to library if requested
    if (saveToLib) {
      await saveToLibrary(soundGeneration);
    }

    return NextResponse.json({
      sound: soundGeneration,
      voiceMetadata: result.voiceMetadata,
    });
  } catch (error) {
    console.error("Voice fusion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint for presets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const presetType = searchParams.get("type");

  if (presetType === "creature") {
    return NextResponse.json({ presets: CREATURE_PRESETS });
  }

  if (presetType === "alien") {
    return NextResponse.json({ presets: ALIEN_LANGUAGE_PRESETS });
  }

  if (presetType === "effort") {
    return NextResponse.json({ presets: EFFORT_PRESETS });
  }

  // Return all presets
  return NextResponse.json({
    creature: CREATURE_PRESETS,
    alien: ALIEN_LANGUAGE_PRESETS,
    effort: EFFORT_PRESETS,
  });
}

// ==================== Helpers ====================

function buildVocalName(request: VoiceFusionRequest): string {
  switch (request.type) {
    case "creature":
      return `${request.creatureType || "Creature"} Vocalization`;
    case "alien_language":
      return `Alien Speech (${request.alienLanguageParams?.tonality || "Unknown"})`;
    case "effort":
      return `Effort - ${request.effortType || "Exertion"}`;
    case "ambient_vocal":
      return "Ambient Vocal Texture";
    case "choir":
      return "Choir";
    case "processed":
      return "Processed Vocal";
    default:
      return "Voice Fusion";
  }
}

function buildDefaultPrompt(request: VoiceFusionRequest): string {
  switch (request.type) {
    case "creature":
      return `${request.creatureType || "creature"} vocalization, intensity ${Math.round((request.emotionalIntensity || 0.5) * 100)}%`;
    case "alien_language":
      return `alien language speech, ${request.alienLanguageParams?.tonality || "atonal"}`;
    case "effort":
      return `${request.effortType || "exertion"} effort sound`;
    case "ambient_vocal":
      return "ethereal ambient vocal texture";
    case "choir":
      return "angelic choir harmonies";
    case "processed":
      return "processed vocal element";
    default:
      return "voice fusion element";
  }
}

function buildMoodTags(request: VoiceFusionRequest): string[] {
  const tags: string[] = [request.type];

  switch (request.type) {
    case "creature":
      tags.push(request.creatureType || "creature");
      if (request.emotionalIntensity && request.emotionalIntensity > 0.7) {
        tags.push("aggressive");
      }
      break;
    case "alien_language":
      tags.push("alien", "speech");
      if (request.alienLanguageParams?.tonality) {
        tags.push(request.alienLanguageParams.tonality);
      }
      break;
    case "effort":
      tags.push(request.effortType || "exertion");
      tags.push("vocal");
      break;
    case "ambient_vocal":
      tags.push("ambient", "ethereal", "texture");
      break;
    case "choir":
      tags.push("choir", "harmonic", "angelic");
      break;
    case "processed":
      tags.push("processed", "abstract", "texture");
      break;
  }

  return tags;
}
