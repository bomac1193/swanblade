/**
 * Emotion to Audio Mapper
 *
 * Maps detected emotions and scene characteristics to audio parameters:
 * - Emotion -> Music mood, intensity, instrumentation
 * - Visual pace -> Tempo, rhythm
 * - Scene type -> Ambience, sound effects
 */

import type {
  SceneAnalysis,
  EmotionalArcPoint,
  AudioSuggestion,
} from "./videoAnalyzer";

// ==================== Types ====================

export interface AudioGenerationParams {
  // Music parameters
  music: {
    mood: string[];
    tempo: number; // BPM
    intensity: number; // 0-1
    key?: string;
    instrumentation: string[];
    style: string;
  };

  // Ambience parameters
  ambience: {
    type: string;
    density: number; // 0-1
    layerCount: number;
    elements: string[];
  };

  // Sound effects
  sfx: {
    types: string[];
    frequency: "rare" | "occasional" | "frequent";
    intensity: number;
  };

  // Overall
  mixBalance: {
    musicLevel: number;
    ambienceLevel: number;
    sfxLevel: number;
  };
}

export interface EmotionAudioMapping {
  emotion: string;
  music: {
    moods: string[];
    tempoRange: [number, number];
    instrumentation: string[];
    style: string;
  };
  ambience: {
    density: number;
    suggested: string[];
  };
  sfx: {
    frequency: "rare" | "occasional" | "frequent";
    types: string[];
  };
}

export interface TimedAudioEvent {
  id: string;
  startTime: number;
  endTime: number;
  type: "music" | "ambience" | "sfx" | "transition";
  params: Partial<AudioGenerationParams>;
  priority: number;
  description: string;
}

// ==================== Emotion Mappings ====================

export const EMOTION_AUDIO_MAPPINGS: EmotionAudioMapping[] = [
  {
    emotion: "happy",
    music: {
      moods: ["uplifting", "bright", "cheerful", "playful"],
      tempoRange: [110, 140],
      instrumentation: ["acoustic guitar", "piano", "strings", "light percussion"],
      style: "upbeat",
    },
    ambience: {
      density: 0.3,
      suggested: ["birds", "light wind", "distant activity"],
    },
    sfx: {
      frequency: "occasional",
      types: ["light impacts", "whooshes", "chimes"],
    },
  },
  {
    emotion: "sad",
    music: {
      moods: ["melancholic", "emotional", "somber", "reflective"],
      tempoRange: [60, 80],
      instrumentation: ["piano", "strings", "solo cello", "ambient pads"],
      style: "slow ballad",
    },
    ambience: {
      density: 0.2,
      suggested: ["rain", "wind", "distant thunder", "empty room"],
    },
    sfx: {
      frequency: "rare",
      types: ["footsteps", "doors", "sighs"],
    },
  },
  {
    emotion: "tense",
    music: {
      moods: ["suspenseful", "dark", "ominous", "anxious"],
      tempoRange: [90, 120],
      instrumentation: ["low strings", "brass stabs", "synth drones", "percussion"],
      style: "thriller",
    },
    ambience: {
      density: 0.5,
      suggested: ["wind", "creaking", "distant sounds", "heartbeat"],
    },
    sfx: {
      frequency: "frequent",
      types: ["impacts", "risers", "stingers", "breaths"],
    },
  },
  {
    emotion: "exciting",
    music: {
      moods: ["energetic", "driving", "powerful", "triumphant"],
      tempoRange: [130, 160],
      instrumentation: ["full orchestra", "electric guitar", "drums", "synths"],
      style: "action",
    },
    ambience: {
      density: 0.4,
      suggested: ["wind rush", "crowd", "explosions distance"],
    },
    sfx: {
      frequency: "frequent",
      types: ["impacts", "whooshes", "explosions", "crashes"],
    },
  },
  {
    emotion: "calm",
    music: {
      moods: ["peaceful", "ambient", "soft", "meditative"],
      tempoRange: [60, 90],
      instrumentation: ["ambient pads", "piano", "acoustic guitar", "nature sounds"],
      style: "ambient",
    },
    ambience: {
      density: 0.6,
      suggested: ["nature", "water", "birds", "wind"],
    },
    sfx: {
      frequency: "rare",
      types: ["gentle impacts", "chimes", "water drops"],
    },
  },
  {
    emotion: "mysterious",
    music: {
      moods: ["ethereal", "haunting", "atmospheric", "enigmatic"],
      tempoRange: [70, 100],
      instrumentation: ["ambient synths", "processed piano", "ethereal vocals", "drones"],
      style: "atmospheric",
    },
    ambience: {
      density: 0.5,
      suggested: ["cave reverb", "wind", "distant echoes", "subtle textures"],
    },
    sfx: {
      frequency: "occasional",
      types: ["whispers", "strange sounds", "echoes", "scrapes"],
    },
  },
  {
    emotion: "scary",
    music: {
      moods: ["horror", "dark", "dissonant", "terrifying"],
      tempoRange: [40, 80],
      instrumentation: ["dissonant strings", "low brass", "prepared piano", "noise"],
      style: "horror",
    },
    ambience: {
      density: 0.7,
      suggested: ["creaking", "breathing", "wind", "distant screams"],
    },
    sfx: {
      frequency: "frequent",
      types: ["stingers", "screeches", "impacts", "creature sounds"],
    },
  },
  {
    emotion: "romantic",
    music: {
      moods: ["emotional", "warm", "tender", "passionate"],
      tempoRange: [70, 100],
      instrumentation: ["strings", "piano", "acoustic guitar", "soft vocals"],
      style: "romantic",
    },
    ambience: {
      density: 0.2,
      suggested: ["soft wind", "distant music", "gentle nature"],
    },
    sfx: {
      frequency: "rare",
      types: ["heartbeat", "breaths", "fabric"],
    },
  },
  {
    emotion: "dramatic",
    music: {
      moods: ["epic", "orchestral", "intense", "emotional"],
      tempoRange: [100, 140],
      instrumentation: ["full orchestra", "choir", "percussion", "brass"],
      style: "cinematic",
    },
    ambience: {
      density: 0.3,
      suggested: ["wind", "crowd", "environmental"],
    },
    sfx: {
      frequency: "occasional",
      types: ["impacts", "swells", "cymbal crashes"],
    },
  },
];

// ==================== Emotion Mapper Class ====================

export class EmotionMapper {
  private mappings: Map<string, EmotionAudioMapping>;

  constructor() {
    this.mappings = new Map();
    for (const mapping of EMOTION_AUDIO_MAPPINGS) {
      this.mappings.set(mapping.emotion, mapping);
    }
  }

  // ==================== Single Scene Mapping ====================

  /**
   * Map a single scene analysis to audio generation parameters
   */
  mapSceneToAudio(analysis: SceneAnalysis): AudioGenerationParams {
    const primaryEmotion = analysis.mood[0] || "neutral";
    const mapping = this.mappings.get(primaryEmotion) || this.getDefaultMapping();

    // Calculate tempo based on pace
    const tempo = this.calculateTempo(analysis.pace, mapping.music.tempoRange);

    // Adjust based on intensity
    const adjustedMoods = this.adjustMoodsForIntensity(mapping.music.moods, analysis.intensity);

    return {
      music: {
        mood: adjustedMoods,
        tempo,
        intensity: analysis.intensity,
        instrumentation: mapping.music.instrumentation,
        style: mapping.music.style,
      },
      ambience: {
        type: analysis.suggestedSoundTypes[0] || mapping.ambience.suggested[0],
        density: mapping.ambience.density * analysis.intensity,
        layerCount: Math.ceil(mapping.ambience.suggested.length * analysis.intensity),
        elements: [...mapping.ambience.suggested, ...analysis.suggestedSoundTypes],
      },
      sfx: {
        types: mapping.sfx.types,
        frequency: mapping.sfx.frequency,
        intensity: analysis.intensity,
      },
      mixBalance: this.calculateMixBalance(analysis),
    };
  }

  /**
   * Calculate tempo based on pace
   */
  private calculateTempo(pace: string, range: [number, number]): number {
    const [min, max] = range;
    switch (pace) {
      case "slow":
        return min + (max - min) * 0.2;
      case "fast":
        return min + (max - min) * 0.8;
      default:
        return min + (max - min) * 0.5;
    }
  }

  /**
   * Adjust mood tags based on intensity
   */
  private adjustMoodsForIntensity(moods: string[], intensity: number): string[] {
    if (intensity > 0.7) {
      return moods.map((m) => `intense ${m}`);
    } else if (intensity < 0.3) {
      return moods.map((m) => `subtle ${m}`);
    }
    return moods;
  }

  /**
   * Calculate mix balance based on scene
   */
  private calculateMixBalance(analysis: SceneAnalysis): AudioGenerationParams["mixBalance"] {
    // Higher intensity = more music and sfx
    // Lower intensity = more ambience
    const intensity = analysis.intensity;

    return {
      musicLevel: 0.5 + intensity * 0.3,
      ambienceLevel: 0.6 - intensity * 0.2,
      sfxLevel: 0.3 + intensity * 0.4,
    };
  }

  /**
   * Get default mapping for unknown emotions
   */
  private getDefaultMapping(): EmotionAudioMapping {
    return {
      emotion: "neutral",
      music: {
        moods: ["atmospheric", "ambient"],
        tempoRange: [80, 110],
        instrumentation: ["ambient pads", "light percussion"],
        style: "underscore",
      },
      ambience: {
        density: 0.4,
        suggested: ["room tone", "light activity"],
      },
      sfx: {
        frequency: "occasional",
        types: ["generic"],
      },
    };
  }

  // ==================== Emotional Arc Processing ====================

  /**
   * Generate timed audio events from emotional arc
   */
  generateTimelineFromArc(
    emotionalArc: EmotionalArcPoint[],
    scenes: { id: string; startTime: number; endTime: number; analysis?: SceneAnalysis }[]
  ): TimedAudioEvent[] {
    const events: TimedAudioEvent[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.analysis) continue;

      const audioParams = this.mapSceneToAudio(scene.analysis);

      // Music event for scene
      events.push({
        id: `music_${scene.id}`,
        startTime: scene.startTime,
        endTime: scene.endTime,
        type: "music",
        params: { music: audioParams.music, mixBalance: audioParams.mixBalance },
        priority: 1,
        description: `${audioParams.music.style} music, ${audioParams.music.tempo.toFixed(0)} BPM`,
      });

      // Ambience event
      events.push({
        id: `amb_${scene.id}`,
        startTime: scene.startTime,
        endTime: scene.endTime,
        type: "ambience",
        params: { ambience: audioParams.ambience },
        priority: 2,
        description: `${audioParams.ambience.type} ambience`,
      });

      // Add transitions between scenes
      if (i < scenes.length - 1) {
        const nextScene = scenes[i + 1];
        const transitionTime = scene.endTime;
        const transitionDuration = Math.min(2, nextScene.startTime - scene.endTime + 0.5);

        events.push({
          id: `trans_${scene.id}`,
          startTime: transitionTime - 0.5,
          endTime: transitionTime + transitionDuration,
          type: "transition",
          params: {},
          priority: 3,
          description: "Crossfade transition",
        });
      }
    }

    return events.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Detect significant emotional changes for music cues
   */
  detectEmotionalCues(
    emotionalArc: EmotionalArcPoint[],
    threshold: number = 0.3
  ): { timestamp: number; fromEmotion: string; toEmotion: string; intensity: number }[] {
    const cues: { timestamp: number; fromEmotion: string; toEmotion: string; intensity: number }[] = [];

    for (let i = 1; i < emotionalArc.length; i++) {
      const prev = emotionalArc[i - 1];
      const curr = emotionalArc[i];

      // Detect significant changes in valence or arousal
      const valenceChange = Math.abs(curr.valence - prev.valence);
      const arousalChange = Math.abs(curr.arousal - prev.arousal);

      if (valenceChange > threshold || arousalChange > threshold) {
        cues.push({
          timestamp: curr.timestamp,
          fromEmotion: prev.emotion,
          toEmotion: curr.emotion,
          intensity: Math.max(valenceChange, arousalChange),
        });
      }
    }

    return cues;
  }

  // ==================== Audio Suggestion Generation ====================

  /**
   * Generate detailed audio suggestions from scenes
   */
  generateDetailedSuggestions(
    scenes: { id: string; startTime: number; endTime: number; analysis?: SceneAnalysis }[]
  ): AudioSuggestion[] {
    const suggestions: AudioSuggestion[] = [];

    for (const scene of scenes) {
      if (!scene.analysis) continue;

      const audioParams = this.mapSceneToAudio(scene.analysis);

      // Music suggestion with full prompt
      suggestions.push({
        sceneId: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        suggestedType: "music",
        description: this.generateMusicPrompt(audioParams.music),
        moodTags: audioParams.music.mood,
        intensity: audioParams.music.intensity,
        priority: 1,
      });

      // Ambience suggestion
      suggestions.push({
        sceneId: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        suggestedType: "ambience",
        description: this.generateAmbiencePrompt(audioParams.ambience),
        moodTags: audioParams.ambience.elements.slice(0, 5),
        intensity: audioParams.ambience.density,
        priority: 2,
      });

      // SFX suggestions
      if (audioParams.sfx.frequency !== "rare") {
        suggestions.push({
          sceneId: scene.id,
          startTime: scene.startTime,
          endTime: scene.endTime,
          suggestedType: "sfx",
          description: this.generateSFXPrompt(audioParams.sfx),
          moodTags: audioParams.sfx.types,
          intensity: audioParams.sfx.intensity,
          priority: 3,
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate a music generation prompt
   */
  private generateMusicPrompt(params: AudioGenerationParams["music"]): string {
    const parts = [
      params.style,
      params.mood.slice(0, 2).join(" and "),
      `around ${params.tempo.toFixed(0)} BPM`,
      `with ${params.instrumentation.slice(0, 3).join(", ")}`,
    ];

    if (params.intensity > 0.7) {
      parts.push("building to an intense climax");
    } else if (params.intensity < 0.3) {
      parts.push("subtle and understated");
    }

    return parts.join(", ");
  }

  /**
   * Generate an ambience generation prompt
   */
  private generateAmbiencePrompt(params: AudioGenerationParams["ambience"]): string {
    const parts = [
      params.type,
      `with ${params.elements.slice(0, 3).join(", ")}`,
      `density ${(params.density * 100).toFixed(0)}%`,
    ];

    return parts.join(", ");
  }

  /**
   * Generate an SFX description
   */
  private generateSFXPrompt(params: AudioGenerationParams["sfx"]): string {
    return `${params.frequency} ${params.types.slice(0, 3).join(", ")} at ${(params.intensity * 100).toFixed(0)}% intensity`;
  }
}

// Export singleton
export const emotionMapper = new EmotionMapper();
