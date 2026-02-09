/**
 * Vocal Synthesis - Voice + Sound Fusion
 *
 * Generate and process vocal elements for game audio:
 * - Creature vocalizations (monsters, animals, aliens)
 * - Alien language speech
 * - Effort sounds (combat, movement, death)
 * - Ambient vocal textures
 * - Choir and chant generation
 * - Voice + sound layering
 */

import type {
  VoiceFusionRequest,
  VoiceFusionResult,
  VoiceFusionType,
  SoundGeneration,
} from "@/types";
import {
  ChromoxClient,
  getChromoxClient,
  type CreatureVocalizationRequest,
  type AlienLanguageRequest,
  type EffortSoundRequest,
  type ProcessingEffect,
} from "./chromoxClient";
import { generateSound, type AudioProvider } from "./audioProvider";

// ==================== Creature Presets ====================

export interface CreaturePreset {
  id: string;
  name: string;
  description: string;
  category: "fantasy" | "sci-fi" | "horror" | "nature" | "abstract";
  baseParams: Partial<CreatureVocalizationRequest>;
  processingChain: ProcessingEffect[];
}

export const CREATURE_PRESETS: CreaturePreset[] = [
  {
    id: "dragon",
    name: "Dragon",
    description: "Deep, rumbling roars with fire-like overtones",
    category: "fantasy",
    baseParams: {
      creatureType: "dragon",
      pitchRange: [60, 200],
      layerCount: 4,
    },
    processingChain: [
      { type: "pitch_shift", parameters: { semitones: -5 } },
      { type: "distortion", parameters: { amount: 0.3 } },
      { type: "reverb", parameters: { size: 0.8, decay: 2.5 } },
    ],
  },
  {
    id: "goblin",
    name: "Goblin",
    description: "High-pitched, cackling, mischievous",
    category: "fantasy",
    baseParams: {
      creatureType: "goblin",
      pitchRange: [200, 600],
      layerCount: 2,
    },
    processingChain: [
      { type: "pitch_shift", parameters: { semitones: 7 } },
      { type: "formant_shift", parameters: { shift: 0.3 } },
    ],
  },
  {
    id: "demon",
    name: "Demon",
    description: "Layered, otherworldly, menacing voices",
    category: "horror",
    baseParams: {
      creatureType: "demon",
      pitchRange: [40, 300],
      layerCount: 5,
    },
    processingChain: [
      { type: "pitch_shift", parameters: { semitones: -12 } },
      { type: "chorus", parameters: { depth: 0.8, rate: 0.3 } },
      { type: "reverb", parameters: { size: 0.9, decay: 4.0 } },
      { type: "distortion", parameters: { amount: 0.4 } },
    ],
  },
  {
    id: "alien_insectoid",
    name: "Insectoid Alien",
    description: "Clicking, chittering, hive-mind communication",
    category: "sci-fi",
    baseParams: {
      creatureType: "insectoid",
      pitchRange: [100, 800],
      layerCount: 3,
    },
    processingChain: [
      { type: "granular", parameters: { grain_size: 20, density: 0.8 } },
      { type: "vocoder", parameters: { bands: 16 } },
    ],
  },
  {
    id: "ghost",
    name: "Ghost/Spirit",
    description: "Ethereal, whispered, echoing presence",
    category: "horror",
    baseParams: {
      creatureType: "spirit",
      pitchRange: [150, 400],
      layerCount: 3,
    },
    processingChain: [
      { type: "reverb", parameters: { size: 1.0, decay: 6.0 } },
      { type: "chorus", parameters: { depth: 0.6, rate: 0.1 } },
      { type: "formant_shift", parameters: { shift: 0.2 } },
    ],
  },
  {
    id: "beast",
    name: "Beast/Monster",
    description: "Primal, animalistic, powerful",
    category: "nature",
    baseParams: {
      creatureType: "beast",
      pitchRange: [50, 250],
      layerCount: 2,
    },
    processingChain: [
      { type: "pitch_shift", parameters: { semitones: -3 } },
      { type: "distortion", parameters: { amount: 0.2 } },
    ],
  },
  {
    id: "elemental",
    name: "Elemental",
    description: "Abstract, energy-based, otherworldly",
    category: "abstract",
    baseParams: {
      creatureType: "elemental",
      pitchRange: [80, 500],
      layerCount: 4,
    },
    processingChain: [
      { type: "granular", parameters: { grain_size: 50, density: 0.5 } },
      { type: "chorus", parameters: { depth: 1.0, rate: 0.2 } },
      { type: "reverb", parameters: { size: 0.7, decay: 3.0 } },
    ],
  },
];

// ==================== Alien Language Presets ====================

export interface AlienLanguagePreset {
  id: string;
  name: string;
  description: string;
  syllablePattern: string;
  tonality: "tonal" | "atonal" | "whispered" | "guttural";
  processing: ProcessingEffect[];
}

export const ALIEN_LANGUAGE_PRESETS: AlienLanguagePreset[] = [
  {
    id: "melodic",
    name: "Melodic Elven",
    description: "Flowing, musical language with clear vowels",
    syllablePattern: "CV-CV-V-CVC",
    tonality: "tonal",
    processing: [
      { type: "reverb", parameters: { size: 0.4, decay: 1.5 } },
    ],
  },
  {
    id: "clicking",
    name: "Clicking Insectoid",
    description: "Consonant-heavy with percussive clicks",
    syllablePattern: "C-CC-C-CVC",
    tonality: "atonal",
    processing: [
      { type: "granular", parameters: { grain_size: 10, density: 0.9 } },
    ],
  },
  {
    id: "deep_space",
    name: "Deep Space Entity",
    description: "Slow, resonant, incomprehensible",
    syllablePattern: "VV-CV-VV-C",
    tonality: "guttural",
    processing: [
      { type: "pitch_shift", parameters: { semitones: -8 } },
      { type: "reverb", parameters: { size: 1.0, decay: 5.0 } },
    ],
  },
  {
    id: "whisper_ancient",
    name: "Ancient Whispers",
    description: "Breathy, secretive, mystical",
    syllablePattern: "SV-VS-SVC",
    tonality: "whispered",
    processing: [
      { type: "reverb", parameters: { size: 0.6, decay: 2.0 } },
      { type: "chorus", parameters: { depth: 0.3, rate: 0.05 } },
    ],
  },
];

// ==================== Effort Sound Presets ====================

export interface EffortPreset {
  id: string;
  name: string;
  types: EffortSoundRequest["type"][];
  defaultIntensity: number;
  processing: ProcessingEffect[];
}

export const EFFORT_PRESETS: EffortPreset[] = [
  {
    id: "warrior",
    name: "Warrior",
    types: ["attack", "hit", "death", "exertion"],
    defaultIntensity: 0.7,
    processing: [
      { type: "reverb", parameters: { size: 0.3, decay: 0.5 } },
    ],
  },
  {
    id: "nimble",
    name: "Nimble Rogue",
    types: ["jump", "climb", "attack", "pain"],
    defaultIntensity: 0.5,
    processing: [],
  },
  {
    id: "monstrous",
    name: "Monstrous",
    types: ["attack", "hit", "death", "pain"],
    defaultIntensity: 0.9,
    processing: [
      { type: "pitch_shift", parameters: { semitones: -6 } },
      { type: "distortion", parameters: { amount: 0.2 } },
    ],
  },
];

// ==================== Voice Fusion Service ====================

export class VocalSynthesisService {
  private chromox: ChromoxClient;
  private fallbackProvider: AudioProvider;

  constructor(chromoxClient?: ChromoxClient, fallbackProvider: AudioProvider = "elevenlabs") {
    this.chromox = chromoxClient || getChromoxClient();
    this.fallbackProvider = fallbackProvider;
  }

  /**
   * Generate voice fusion based on request type
   */
  async generate(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    // Check if Chromox is available
    const chromoxAvailable = await this.chromox.isAvailable();

    if (chromoxAvailable) {
      return this.generateWithChromox(request);
    } else {
      return this.generateWithFallback(request);
    }
  }

  /**
   * Generate using Chromox
   */
  private async generateWithChromox(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    switch (request.type) {
      case "creature":
        return this.generateCreature(request);
      case "alien_language":
        return this.generateAlienLanguage(request);
      case "effort":
        return this.generateEffort(request);
      case "ambient_vocal":
        return this.generateAmbientVocal(request);
      case "choir":
        return this.generateChoir(request);
      case "processed":
        return this.generateProcessedVocal(request);
      default:
        throw new Error(`Unknown voice fusion type: ${request.type}`);
    }
  }

  /**
   * Generate creature vocalization
   */
  private async generateCreature(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    // Find preset if creature type matches
    const preset = CREATURE_PRESETS.find((p) => p.id === request.creatureType);

    const creatureRequest: CreatureVocalizationRequest = {
      creatureType: request.creatureType || "beast",
      emotion: mapEmotionIntensity(request.emotionalIntensity || 0.5),
      intensity: request.emotionalIntensity || 0.5,
      duration: request.duration || 3,
      ...(preset?.baseParams || {}),
    };

    const result = await this.chromox.generateCreatureVocalization(creatureRequest);

    // Apply preset processing if available
    if (preset && preset.processingChain.length > 0) {
      const audioBase64 = await this.urlToBase64(result.audioUrl);
      const processed = await this.chromox.processVocal(audioBase64, preset.processingChain);
      return {
        audioUrl: processed.audioUrl,
        voiceMetadata: {
          type: "creature",
          duration: processed.duration,
          layers: [request.creatureType || "creature", ...preset.processingChain.map((p) => p.type)],
        },
      };
    }

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: "creature",
        duration: result.duration,
        layers: [request.creatureType || "creature"],
      },
    };
  }

  /**
   * Generate alien language
   */
  private async generateAlienLanguage(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    const params = request.alienLanguageParams;
    const preset = ALIEN_LANGUAGE_PRESETS.find((p) => p.id === params?.tonality);

    const alienRequest: AlienLanguageRequest = {
      syllablePattern: params?.syllablePattern || "CV-CVC-V",
      tonality: params?.tonality || "atonal",
      duration: request.duration || 5,
      emotion: request.prompt,
    };

    const result = await this.chromox.generateAlienLanguage(alienRequest);

    // Apply preset processing
    if (preset && preset.processing.length > 0) {
      const audioBase64 = await this.urlToBase64(result.audioUrl);
      const processed = await this.chromox.processVocal(audioBase64, preset.processing);
      return {
        audioUrl: processed.audioUrl,
        voiceMetadata: {
          type: "alien_language",
          duration: processed.duration,
          layers: ["alien_speech", params?.tonality || "atonal"],
        },
      };
    }

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: "alien_language",
        duration: result.duration,
      },
    };
  }

  /**
   * Generate effort sound
   */
  private async generateEffort(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    const effortRequest: EffortSoundRequest = {
      type: request.effortType || "attack",
      intensity: request.emotionalIntensity || 0.7,
      duration: request.duration || 1,
      voiceProfileId: request.baseVoiceId,
    };

    const result = await this.chromox.generateEffortSound(effortRequest);

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: "effort",
        duration: result.duration,
        layers: [request.effortType || "effort"],
      },
    };
  }

  /**
   * Generate ambient vocal texture
   */
  private async generateAmbientVocal(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    // Use choir-like generation with heavy processing
    const result = await this.chromox.synthesizeSpeech({
      text: request.prompt || "ahhhh",
      duration: request.duration || 10,
      voiceProfileId: request.baseVoiceId,
      processingChain: [
        { type: "reverb", parameters: { size: 1.0, decay: 8.0 } },
        { type: "granular", parameters: { grain_size: 100, density: 0.3 } },
        { type: "chorus", parameters: { depth: 1.0, rate: 0.02 } },
      ],
    });

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: "ambient_vocal",
        duration: result.duration,
        layers: ["ambient", "granular", "reverb"],
      },
    };
  }

  /**
   * Generate choir
   */
  private async generateChoir(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    const result = await this.chromox.synthesizeSpeech({
      text: request.prompt || "ahhh",
      duration: request.duration || 10,
      voiceProfileId: request.baseVoiceId,
      emotion: "reverent",
      processingChain: [
        { type: "chorus", parameters: { depth: 0.8, rate: 0.1, voices: 8 } },
        { type: "reverb", parameters: { size: 0.9, decay: 4.0 } },
      ],
    });

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: "choir",
        duration: result.duration,
        layers: ["choir", "reverb"],
      },
    };
  }

  /**
   * Generate processed vocal from existing audio
   */
  private async generateProcessedVocal(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    if (!request.layerWithSound) {
      throw new Error("layerWithSound is required for processed vocal");
    }

    // Default processing chain
    const processing: ProcessingEffect[] = [
      { type: "vocoder", parameters: { bands: 16 } },
      { type: "reverb", parameters: { size: 0.5, decay: 2.0 } },
    ];

    const result = await this.chromox.processVocal(request.layerWithSound, processing);

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: "processed",
        duration: result.duration,
        layers: processing.map((p) => p.type),
      },
    };
  }

  /**
   * Fallback generation using ElevenLabs or other providers
   */
  private async generateWithFallback(request: VoiceFusionRequest): Promise<VoiceFusionResult> {
    // Build a descriptive prompt for text-to-audio generation
    const prompt = buildFallbackPrompt(request);

    const result = await generateSound(this.fallbackProvider, {
      prompt,
      parameters: {
        type: "FX",
        moodTags: [request.type, request.prompt || "vocal"],
        lengthSeconds: request.duration || 5,
        intensity: (request.emotionalIntensity || 0.5) * 100,
        texture: 60,
        brightness: 50,
        noisiness: 30,
      },
    });

    return {
      audioUrl: result.audioUrl,
      voiceMetadata: {
        type: request.type,
        duration: request.duration || 5,
        layers: ["fallback_generation"],
      },
    };
  }

  /**
   * Layer vocal with sound effect
   */
  async layerVocalWithSound(
    vocalResult: VoiceFusionResult,
    soundGeneration: SoundGeneration,
    vocalVolume: number = 0.7,
    soundVolume: number = 1.0
  ): Promise<VoiceFusionResult> {
    // This would require audio mixing capabilities
    // For now, return the vocal with metadata about the intended layering
    return {
      ...vocalResult,
      voiceMetadata: {
        ...vocalResult.voiceMetadata,
        layers: [
          ...(vocalResult.voiceMetadata.layers || []),
          `layered_with:${soundGeneration.name}`,
        ],
      },
    };
  }

  // ==================== Helpers ====================

  private async urlToBase64(url: string): Promise<string> {
    if (url.startsWith("data:")) {
      return url.split(",")[1];
    }
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  }
}

// ==================== Helper Functions ====================

function mapEmotionIntensity(
  intensity: number
): "neutral" | "aggressive" | "fearful" | "curious" | "happy" | "pain" {
  if (intensity < 0.2) return "neutral";
  if (intensity < 0.4) return "curious";
  if (intensity < 0.6) return "happy";
  if (intensity < 0.8) return "aggressive";
  return "pain";
}

function buildFallbackPrompt(request: VoiceFusionRequest): string {
  const parts: string[] = [];

  switch (request.type) {
    case "creature":
      parts.push(`${request.creatureType || "monster"} vocalization`);
      parts.push("creature sound effect");
      break;
    case "alien_language":
      parts.push("alien speech");
      parts.push(request.alienLanguageParams?.tonality || "strange language");
      break;
    case "effort":
      parts.push(`human ${request.effortType || "exertion"} sound`);
      parts.push("effort vocalization");
      break;
    case "ambient_vocal":
      parts.push("ethereal ambient vocals");
      parts.push("atmospheric voice texture");
      break;
    case "choir":
      parts.push("angelic choir");
      parts.push("harmonic voices");
      break;
    case "processed":
      parts.push("processed vocal texture");
      parts.push("abstract voice");
      break;
  }

  if (request.prompt) {
    parts.push(request.prompt);
  }

  parts.push(`${request.duration || 5} seconds`);

  return parts.join(", ");
}

// ==================== Default Service Factory ====================

let defaultService: VocalSynthesisService | null = null;

export function getVocalSynthesisService(): VocalSynthesisService {
  if (!defaultService) {
    defaultService = new VocalSynthesisService();
  }
  return defaultService;
}
