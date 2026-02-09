/**
 * Video Analyzer
 *
 * Extract frames and analyze video content for audio suggestions:
 * - Frame extraction at key intervals
 * - Scene change detection
 * - Visual feature extraction
 * - Integration with vision models for scene understanding
 */

// ==================== Types ====================

export interface VideoMetadata {
  filename: string;
  duration: number; // seconds
  frameRate: number;
  width: number;
  height: number;
  totalFrames: number;
}

export interface ExtractedFrame {
  timestamp: number; // seconds
  frameNumber: number;
  imageData: string; // base64
  width: number;
  height: number;
}

export interface SceneSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  frames: ExtractedFrame[];
  analysis?: SceneAnalysis;
}

export interface SceneAnalysis {
  description: string;
  mood: string[];
  intensity: number; // 0-1
  pace: "slow" | "medium" | "fast";
  visualElements: string[];
  dominantColors: string[];
  suggestedAudioMood: string[];
  suggestedSoundTypes: string[];
  confidence: number;
}

export interface VideoAnalysisResult {
  metadata: VideoMetadata;
  scenes: SceneSegment[];
  emotionalArc: EmotionalArcPoint[];
  audioSuggestions: AudioSuggestion[];
}

export interface EmotionalArcPoint {
  timestamp: number;
  emotion: string;
  intensity: number;
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
}

export interface AudioSuggestion {
  sceneId: string;
  startTime: number;
  endTime: number;
  suggestedType: "music" | "ambience" | "sfx" | "foley";
  description: string;
  moodTags: string[];
  intensity: number;
  priority: number;
}

// ==================== Video Analyzer Class ====================

export class VideoAnalyzer {
  private apiEndpoint: string;
  private visionModelEndpoint?: string;

  constructor(config: { apiEndpoint?: string; visionModelEndpoint?: string } = {}) {
    this.apiEndpoint = config.apiEndpoint || "/api/scene-analysis";
    this.visionModelEndpoint = config.visionModelEndpoint;
  }

  // ==================== Frame Extraction ====================

  /**
   * Extract frames from video at specified intervals
   */
  async extractFrames(
    videoFile: File | Blob,
    options: {
      interval?: number; // seconds between frames
      maxFrames?: number;
      startTime?: number;
      endTime?: number;
    } = {}
  ): Promise<ExtractedFrame[]> {
    const { interval = 1, maxFrames = 100, startTime = 0, endTime } = options;

    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to create canvas context"));
        return;
      }

      const frames: ExtractedFrame[] = [];
      let currentTime = startTime;

      video.src = URL.createObjectURL(videoFile);
      video.muted = true;

      video.onloadedmetadata = () => {
        const finalEndTime = endTime ?? video.duration;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const extractFrame = () => {
          if (currentTime >= finalEndTime || frames.length >= maxFrames) {
            URL.revokeObjectURL(video.src);
            resolve(frames);
            return;
          }

          video.currentTime = currentTime;
        };

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL("image/jpeg", 0.8);

          frames.push({
            timestamp: currentTime,
            frameNumber: frames.length,
            imageData,
            width: canvas.width,
            height: canvas.height,
          });

          currentTime += interval;
          extractFrame();
        };

        extractFrame();
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video"));
      };
    });
  }

  /**
   * Get video metadata without full extraction
   */
  async getVideoMetadata(videoFile: File | Blob): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(videoFile);

      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          filename: videoFile instanceof File ? videoFile.name : "video",
          duration: video.duration,
          frameRate: 30, // Estimated, actual detection requires more analysis
          width: video.videoWidth,
          height: video.videoHeight,
          totalFrames: Math.floor(video.duration * 30),
        };

        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video metadata"));
      };
    });
  }

  // ==================== Scene Detection ====================

  /**
   * Detect scene changes based on visual differences
   */
  async detectSceneChanges(
    frames: ExtractedFrame[],
    threshold: number = 0.3
  ): Promise<SceneSegment[]> {
    if (frames.length === 0) return [];

    const scenes: SceneSegment[] = [];
    let currentScene: SceneSegment = {
      id: `scene_0`,
      startTime: frames[0].timestamp,
      endTime: frames[0].timestamp,
      duration: 0,
      frames: [frames[0]],
    };

    for (let i = 1; i < frames.length; i++) {
      const difference = await this.calculateFrameDifference(
        frames[i - 1],
        frames[i]
      );

      if (difference > threshold) {
        // Scene change detected
        currentScene.endTime = frames[i - 1].timestamp;
        currentScene.duration = currentScene.endTime - currentScene.startTime;
        scenes.push(currentScene);

        currentScene = {
          id: `scene_${scenes.length}`,
          startTime: frames[i].timestamp,
          endTime: frames[i].timestamp,
          duration: 0,
          frames: [frames[i]],
        };
      } else {
        currentScene.frames.push(frames[i]);
      }
    }

    // Add final scene
    currentScene.endTime = frames[frames.length - 1].timestamp;
    currentScene.duration = currentScene.endTime - currentScene.startTime;
    scenes.push(currentScene);

    return scenes;
  }

  /**
   * Calculate visual difference between two frames
   */
  private async calculateFrameDifference(
    frame1: ExtractedFrame,
    frame2: ExtractedFrame
  ): Promise<number> {
    // Simple histogram-based difference
    const hist1 = await this.calculateHistogram(frame1.imageData);
    const hist2 = await this.calculateHistogram(frame2.imageData);

    let difference = 0;
    for (let i = 0; i < hist1.length; i++) {
      difference += Math.abs(hist1[i] - hist2[i]);
    }

    return difference / hist1.length;
  }

  /**
   * Calculate color histogram for an image
   */
  private calculateHistogram(imageData: string): Promise<number[]> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = 64; // Downsample for speed
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const data = ctx.getImageData(0, 0, 64, 64).data;
        const histogram = new Array(256).fill(0);

        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          histogram[gray]++;
        }

        // Normalize
        const total = 64 * 64;
        const normalized = histogram.map((v) => v / total);
        resolve(normalized);
      };
      img.src = imageData;
    });
  }

  // ==================== Scene Analysis ====================

  /**
   * Analyze a scene using vision model
   */
  async analyzeScene(scene: SceneSegment): Promise<SceneAnalysis> {
    // Select representative frame (middle of scene)
    const representativeFrame =
      scene.frames[Math.floor(scene.frames.length / 2)] || scene.frames[0];

    if (!this.visionModelEndpoint) {
      // Return mock analysis if no vision model configured
      return this.generateMockAnalysis(scene);
    }

    try {
      const response = await fetch(this.visionModelEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: representativeFrame.imageData,
          prompt: `Analyze this video frame for audio/sound design purposes. Describe:
1. The scene setting and mood
2. Any visible action or movement
3. Environmental elements that would have sounds
4. The overall emotional tone
5. Suggested audio elements (music mood, ambient sounds, sound effects)`,
        }),
      });

      if (!response.ok) {
        throw new Error("Vision model request failed");
      }

      const data = await response.json();
      return this.parseVisionResponse(data);
    } catch (error) {
      console.warn("Vision analysis failed, using fallback:", error);
      return this.generateMockAnalysis(scene);
    }
  }

  /**
   * Parse vision model response into SceneAnalysis
   */
  private parseVisionResponse(response: { description?: string; [key: string]: unknown }): SceneAnalysis {
    // Parse model output - this would be customized based on the actual model
    const description = response.description || "Unknown scene";

    // Extract mood keywords
    const moodKeywords = [
      "tense", "calm", "exciting", "sad", "happy", "mysterious",
      "dramatic", "peaceful", "intense", "romantic", "scary",
    ];
    const detectedMoods = moodKeywords.filter((mood) =>
      description.toLowerCase().includes(mood)
    );

    return {
      description,
      mood: detectedMoods.length > 0 ? detectedMoods : ["neutral"],
      intensity: this.estimateIntensity(description),
      pace: this.estimatePace(description),
      visualElements: this.extractVisualElements(description),
      dominantColors: [],
      suggestedAudioMood: this.suggestAudioMood(detectedMoods),
      suggestedSoundTypes: this.suggestSoundTypes(description),
      confidence: 0.7,
    };
  }

  /**
   * Generate mock analysis for testing
   */
  private generateMockAnalysis(scene: SceneSegment): SceneAnalysis {
    const moods = ["calm", "tense", "exciting", "mysterious", "dramatic"];
    const paces: ("slow" | "medium" | "fast")[] = ["slow", "medium", "fast"];

    return {
      description: `Scene from ${scene.startTime.toFixed(1)}s to ${scene.endTime.toFixed(1)}s`,
      mood: [moods[Math.floor(Math.random() * moods.length)]],
      intensity: Math.random() * 0.5 + 0.25,
      pace: paces[Math.floor(Math.random() * paces.length)],
      visualElements: ["unknown"],
      dominantColors: [],
      suggestedAudioMood: ["atmospheric"],
      suggestedSoundTypes: ["ambience"],
      confidence: 0.3,
    };
  }

  private estimateIntensity(description: string): number {
    const highIntensityWords = ["intense", "dramatic", "action", "explosion", "chase", "fight"];
    const lowIntensityWords = ["calm", "peaceful", "quiet", "still", "serene"];

    let intensity = 0.5;

    for (const word of highIntensityWords) {
      if (description.toLowerCase().includes(word)) intensity += 0.1;
    }
    for (const word of lowIntensityWords) {
      if (description.toLowerCase().includes(word)) intensity -= 0.1;
    }

    return Math.max(0, Math.min(1, intensity));
  }

  private estimatePace(description: string): "slow" | "medium" | "fast" {
    const fastWords = ["fast", "quick", "rapid", "chase", "run", "action"];
    const slowWords = ["slow", "calm", "peaceful", "still"];

    for (const word of fastWords) {
      if (description.toLowerCase().includes(word)) return "fast";
    }
    for (const word of slowWords) {
      if (description.toLowerCase().includes(word)) return "slow";
    }

    return "medium";
  }

  private extractVisualElements(description: string): string[] {
    const elements = [
      "forest", "city", "interior", "exterior", "water", "sky",
      "people", "vehicle", "nature", "building", "night", "day",
    ];

    return elements.filter((el) => description.toLowerCase().includes(el));
  }

  private suggestAudioMood(moods: string[]): string[] {
    const moodToAudio: Record<string, string[]> = {
      tense: ["suspenseful", "dark", "ominous"],
      calm: ["peaceful", "ambient", "soft"],
      exciting: ["energetic", "driving", "powerful"],
      sad: ["melancholic", "emotional", "somber"],
      happy: ["uplifting", "bright", "cheerful"],
      mysterious: ["ethereal", "haunting", "atmospheric"],
      dramatic: ["epic", "orchestral", "intense"],
      peaceful: ["gentle", "serene", "minimal"],
      intense: ["aggressive", "powerful", "driving"],
      romantic: ["emotional", "warm", "tender"],
      scary: ["horror", "dark", "dissonant"],
    };

    const suggestions: string[] = [];
    for (const mood of moods) {
      const audioMoods = moodToAudio[mood];
      if (audioMoods) {
        suggestions.push(...audioMoods);
      }
    }

    return [...new Set(suggestions)];
  }

  private suggestSoundTypes(description: string): string[] {
    const suggestions: string[] = [];

    // Location-based
    if (description.toLowerCase().includes("forest")) {
      suggestions.push("nature ambience", "birds", "wind", "foliage");
    }
    if (description.toLowerCase().includes("city")) {
      suggestions.push("urban ambience", "traffic", "crowd");
    }
    if (description.toLowerCase().includes("interior")) {
      suggestions.push("room tone", "hvac", "footsteps");
    }
    if (description.toLowerCase().includes("water")) {
      suggestions.push("water ambience", "waves", "underwater");
    }

    // Action-based
    if (description.toLowerCase().includes("fight")) {
      suggestions.push("combat sfx", "impacts", "whooshes");
    }
    if (description.toLowerCase().includes("vehicle")) {
      suggestions.push("vehicle engine", "mechanical");
    }

    return suggestions.length > 0 ? suggestions : ["general ambience"];
  }

  // ==================== Full Analysis ====================

  /**
   * Perform full video analysis
   */
  async analyzeVideo(
    videoFile: File | Blob,
    options: {
      frameInterval?: number;
      maxFrames?: number;
      sceneThreshold?: number;
    } = {}
  ): Promise<VideoAnalysisResult> {
    const { frameInterval = 1, maxFrames = 100, sceneThreshold = 0.3 } = options;

    // Get metadata
    const metadata = await this.getVideoMetadata(videoFile);

    // Extract frames
    const frames = await this.extractFrames(videoFile, {
      interval: frameInterval,
      maxFrames,
    });

    // Detect scenes
    const scenes = await this.detectSceneChanges(frames, sceneThreshold);

    // Analyze each scene
    for (const scene of scenes) {
      scene.analysis = await this.analyzeScene(scene);
    }

    // Build emotional arc
    const emotionalArc = this.buildEmotionalArc(scenes);

    // Generate audio suggestions
    const audioSuggestions = this.generateAudioSuggestions(scenes);

    return {
      metadata,
      scenes,
      emotionalArc,
      audioSuggestions,
    };
  }

  /**
   * Build emotional arc from scene analyses
   */
  private buildEmotionalArc(scenes: SceneSegment[]): EmotionalArcPoint[] {
    const arc: EmotionalArcPoint[] = [];

    for (const scene of scenes) {
      if (!scene.analysis) continue;

      const midpoint = (scene.startTime + scene.endTime) / 2;
      const emotion = scene.analysis.mood[0] || "neutral";
      const intensity = scene.analysis.intensity;

      // Map mood to valence/arousal
      const { valence, arousal } = this.moodToValenceArousal(emotion, intensity);

      arc.push({
        timestamp: midpoint,
        emotion,
        intensity,
        valence,
        arousal,
      });
    }

    return arc;
  }

  /**
   * Map mood to valence-arousal space
   */
  private moodToValenceArousal(mood: string, intensity: number): { valence: number; arousal: number } {
    const moodMap: Record<string, { valence: number; arousal: number }> = {
      happy: { valence: 0.8, arousal: 0.6 },
      exciting: { valence: 0.6, arousal: 0.9 },
      calm: { valence: 0.5, arousal: 0.2 },
      sad: { valence: -0.6, arousal: 0.3 },
      tense: { valence: -0.3, arousal: 0.7 },
      scary: { valence: -0.7, arousal: 0.8 },
      mysterious: { valence: 0, arousal: 0.5 },
      dramatic: { valence: 0.2, arousal: 0.8 },
      peaceful: { valence: 0.6, arousal: 0.1 },
      romantic: { valence: 0.7, arousal: 0.4 },
      neutral: { valence: 0, arousal: 0.5 },
    };

    const base = moodMap[mood] || moodMap.neutral;
    return {
      valence: base.valence * intensity,
      arousal: base.arousal * intensity,
    };
  }

  /**
   * Generate audio suggestions for scenes
   */
  private generateAudioSuggestions(scenes: SceneSegment[]): AudioSuggestion[] {
    const suggestions: AudioSuggestion[] = [];

    for (const scene of scenes) {
      if (!scene.analysis) continue;

      // Music suggestion
      suggestions.push({
        sceneId: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        suggestedType: "music",
        description: `${scene.analysis.mood.join(", ")} music, ${scene.analysis.pace} tempo`,
        moodTags: scene.analysis.suggestedAudioMood,
        intensity: scene.analysis.intensity,
        priority: 1,
      });

      // Ambience suggestion
      if (scene.analysis.suggestedSoundTypes.length > 0) {
        suggestions.push({
          sceneId: scene.id,
          startTime: scene.startTime,
          endTime: scene.endTime,
          suggestedType: "ambience",
          description: scene.analysis.suggestedSoundTypes.slice(0, 3).join(", "),
          moodTags: scene.analysis.suggestedSoundTypes,
          intensity: scene.analysis.intensity * 0.7,
          priority: 2,
        });
      }
    }

    return suggestions;
  }
}

// Export singleton
export const videoAnalyzer = new VideoAnalyzer();
