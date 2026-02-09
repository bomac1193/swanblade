/**
 * Chromox Client - Voice Synthesis Integration
 *
 * Connect to Chromox/Voxa for:
 * - Voice cloning and synthesis
 * - Creature vocalizations
 * - Alien language generation
 * - Effort sounds (attacks, jumps, deaths)
 * - Processed vocal textures
 */

// ==================== Types ====================

export interface ChromoxConfig {
  apiUrl: string;
  timeout?: number;
}

export interface VoiceProfile {
  id: string;
  name: string;
  description?: string;
  type: "human" | "creature" | "synthetic" | "hybrid";
  characteristics: {
    pitch: number; // -1 to 1 (low to high)
    texture: number; // 0 to 1 (smooth to rough)
    breathiness: number; // 0 to 1
    resonance: number; // 0 to 1 (thin to full)
  };
}

export interface SynthesisRequest {
  text?: string;
  voiceProfileId?: string;
  duration: number;
  pitch?: number;
  speed?: number;
  emotion?: string;
  processingChain?: ProcessingEffect[];
}

export interface CreatureVocalizationRequest {
  creatureType: string;
  emotion: "neutral" | "aggressive" | "fearful" | "curious" | "happy" | "pain";
  intensity: number; // 0-1
  duration: number;
  layerCount?: number;
  pitchRange?: [number, number]; // Hz
  baseProfile?: string;
}

export interface AlienLanguageRequest {
  syllablePattern: string; // e.g., "CV-CVC-V" (Consonant-Vowel patterns)
  tonality: "tonal" | "atonal" | "whispered" | "guttural";
  duration: number;
  phraseCount?: number;
  emotion?: string;
  alienRace?: string; // Preset alien race style
}

export interface EffortSoundRequest {
  type: "attack" | "hit" | "jump" | "climb" | "death" | "exertion" | "pain" | "relief";
  intensity: number; // 0-1
  duration: number;
  gender?: "male" | "female" | "neutral";
  age?: "young" | "adult" | "old";
  voiceProfileId?: string;
}

export interface ProcessingEffect {
  type: "pitch_shift" | "formant_shift" | "reverb" | "distortion" | "chorus" | "vocoder" | "granular";
  parameters: Record<string, number | string>;
}

export interface VocalSynthesisResult {
  audioUrl: string;
  duration: number;
  metadata: {
    type: string;
    voiceProfile?: string;
    processing?: string[];
  };
}

// ==================== Chromox Client ====================

export class ChromoxClient {
  private config: ChromoxConfig;

  constructor(config: ChromoxConfig) {
    this.config = {
      timeout: 60000,
      ...config,
    };
  }

  /**
   * Check if Chromox is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available voice profiles
   */
  async getVoiceProfiles(): Promise<VoiceProfile[]> {
    const response = await this.fetch("/api/voice-clone/profiles");
    return response.profiles || [];
  }

  /**
   * Synthesize speech from text
   */
  async synthesizeSpeech(request: SynthesisRequest): Promise<VocalSynthesisResult> {
    const response = await this.fetch("/api/render", {
      method: "POST",
      body: JSON.stringify({
        text: request.text,
        voice_id: request.voiceProfileId,
        duration: request.duration,
        pitch: request.pitch,
        speed: request.speed,
        emotion: request.emotion,
        effects: request.processingChain?.map((e) => ({
          type: e.type,
          ...e.parameters,
        })),
      }),
    });

    return {
      audioUrl: response.audio_url || response.audioUrl,
      duration: response.duration,
      metadata: {
        type: "speech",
        voiceProfile: request.voiceProfileId,
        processing: request.processingChain?.map((e) => e.type),
      },
    };
  }

  /**
   * Generate creature vocalization
   */
  async generateCreatureVocalization(
    request: CreatureVocalizationRequest
  ): Promise<VocalSynthesisResult> {
    // Build creature-specific prompt for LLM-guided generation
    const creaturePrompt = buildCreaturePrompt(request);

    const response = await this.fetch("/api/render", {
      method: "POST",
      body: JSON.stringify({
        prompt: creaturePrompt,
        duration: request.duration,
        mode: "creature",
        creature_type: request.creatureType,
        emotion: request.emotion,
        intensity: request.intensity,
        layer_count: request.layerCount || 3,
        pitch_range: request.pitchRange || [80, 400],
        base_profile: request.baseProfile,
      }),
    });

    return {
      audioUrl: response.audio_url || response.audioUrl,
      duration: response.duration,
      metadata: {
        type: "creature",
        voiceProfile: request.baseProfile,
        processing: ["creature_synthesis", "layering"],
      },
    };
  }

  /**
   * Generate alien language
   */
  async generateAlienLanguage(
    request: AlienLanguageRequest
  ): Promise<VocalSynthesisResult> {
    const alienPrompt = buildAlienLanguagePrompt(request);

    const response = await this.fetch("/api/render", {
      method: "POST",
      body: JSON.stringify({
        prompt: alienPrompt,
        duration: request.duration,
        mode: "alien_language",
        syllable_pattern: request.syllablePattern,
        tonality: request.tonality,
        phrase_count: request.phraseCount || 3,
        emotion: request.emotion,
        alien_race: request.alienRace,
      }),
    });

    return {
      audioUrl: response.audio_url || response.audioUrl,
      duration: response.duration,
      metadata: {
        type: "alien_language",
        processing: ["alien_synthesis", request.tonality],
      },
    };
  }

  /**
   * Generate effort/exertion sound
   */
  async generateEffortSound(
    request: EffortSoundRequest
  ): Promise<VocalSynthesisResult> {
    const effortPrompt = buildEffortPrompt(request);

    const response = await this.fetch("/api/render", {
      method: "POST",
      body: JSON.stringify({
        prompt: effortPrompt,
        duration: request.duration,
        mode: "effort",
        effort_type: request.type,
        intensity: request.intensity,
        gender: request.gender || "neutral",
        age: request.age || "adult",
        voice_id: request.voiceProfileId,
      }),
    });

    return {
      audioUrl: response.audio_url || response.audioUrl,
      duration: response.duration,
      metadata: {
        type: `effort_${request.type}`,
        voiceProfile: request.voiceProfileId,
        processing: ["effort_synthesis"],
      },
    };
  }

  /**
   * Apply vocal processing to existing audio
   */
  async processVocal(
    audioBase64: string,
    effects: ProcessingEffect[]
  ): Promise<VocalSynthesisResult> {
    const response = await this.fetch("/api/voice-clone/process", {
      method: "POST",
      body: JSON.stringify({
        audio: audioBase64,
        effects: effects.map((e) => ({
          type: e.type,
          ...e.parameters,
        })),
      }),
    });

    return {
      audioUrl: response.audio_url || response.audioUrl,
      duration: response.duration,
      metadata: {
        type: "processed",
        processing: effects.map((e) => e.type),
      },
    };
  }

  /**
   * Clone a voice from sample audio
   */
  async cloneVoice(
    sampleAudioBase64: string,
    name: string,
    description?: string
  ): Promise<VoiceProfile> {
    const response = await this.fetch("/api/voice-clone/clone", {
      method: "POST",
      body: JSON.stringify({
        audio: sampleAudioBase64,
        name,
        description,
      }),
    });

    return {
      id: response.profile_id || response.id,
      name: response.name || name,
      description: response.description || description,
      type: "human",
      characteristics: response.characteristics || {
        pitch: 0,
        texture: 0.5,
        breathiness: 0.3,
        resonance: 0.5,
      },
    };
  }

  // ==================== Private Helpers ====================

  private async fetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Record<string, unknown>> {
    const url = `${this.config.apiUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chromox API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
}

// ==================== Prompt Builders ====================

function buildCreaturePrompt(request: CreatureVocalizationRequest): string {
  const emotionDescriptors: Record<string, string> = {
    neutral: "calm, observational",
    aggressive: "threatening, dominant, warning",
    fearful: "panicked, distressed, retreating",
    curious: "inquisitive, playful, exploring",
    happy: "content, satisfied, joyful",
    pain: "hurt, suffering, wounded",
  };

  const parts = [
    `${request.creatureType} vocalization`,
    emotionDescriptors[request.emotion],
    `intensity ${Math.round(request.intensity * 100)}%`,
    `${request.duration} seconds`,
  ];

  if (request.layerCount && request.layerCount > 1) {
    parts.push(`${request.layerCount} layered voices`);
  }

  return parts.join(", ");
}

function buildAlienLanguagePrompt(request: AlienLanguageRequest): string {
  const tonalityDescriptors: Record<string, string> = {
    tonal: "melodic, pitch-based meaning",
    atonal: "rhythmic, percussive syllables",
    whispered: "breathy, sibilant, secretive",
    guttural: "deep, growling, primal",
  };

  const parts = [
    "alien language speech",
    request.alienRace ? `${request.alienRace} species` : "unknown species",
    tonalityDescriptors[request.tonality],
    `syllable pattern: ${request.syllablePattern}`,
    `${request.phraseCount || 3} phrases`,
    `${request.duration} seconds`,
  ];

  if (request.emotion) {
    parts.push(`expressing ${request.emotion}`);
  }

  return parts.join(", ");
}

function buildEffortPrompt(request: EffortSoundRequest): string {
  const effortDescriptors: Record<string, string> = {
    attack: "combat strike, aggressive exertion",
    hit: "receiving impact, getting struck",
    jump: "leaping, launching upward",
    climb: "pulling up, physical strain",
    death: "final breath, fading life",
    exertion: "physical effort, pushing limits",
    pain: "hurt, suffering, injury",
    relief: "catching breath, relaxing",
  };

  const intensityWords = ["subtle", "light", "moderate", "strong", "extreme"];
  const intensityIdx = Math.min(
    Math.floor(request.intensity * 5),
    intensityWords.length - 1
  );

  const parts = [
    `${request.gender || "neutral"} ${request.age || "adult"} voice`,
    effortDescriptors[request.type],
    intensityWords[intensityIdx] + " intensity",
    `${request.duration} seconds`,
  ];

  return parts.join(", ");
}

// ==================== Default Client Factory ====================

let defaultClient: ChromoxClient | null = null;

export function getChromoxClient(): ChromoxClient {
  if (!defaultClient) {
    const apiUrl = process.env.CHROMOX_API_URL || "http://localhost:3333";
    defaultClient = new ChromoxClient({ apiUrl });
  }
  return defaultClient;
}

export function createChromoxClient(config: ChromoxConfig): ChromoxClient {
  return new ChromoxClient(config);
}
