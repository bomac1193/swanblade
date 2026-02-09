/**
 * Scene Analysis API
 *
 * Analyze video content for audio suggestions:
 * - POST: Upload video for analysis
 * - GET: Get analysis results
 */

import { NextRequest, NextResponse } from "next/server";
import { emotionMapper } from "@/lib/sceneAnalysis/emotionMapper";
import type {
  VideoMetadata,
  SceneSegment,
  SceneAnalysis,
  EmotionalArcPoint,
  AudioSuggestion,
  VideoAnalysisResult,
} from "@/lib/sceneAnalysis/videoAnalyzer";

// In-memory storage for analysis results
const analysisStore = new Map<string, VideoAnalysisResult>();

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle multipart form data (video upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video") as File | null;
      const options = formData.get("options") as string | null;

      if (!videoFile) {
        return NextResponse.json(
          { error: "No video file provided" },
          { status: 400 }
        );
      }

      const parsedOptions = options ? JSON.parse(options) : {};

      // Generate analysis ID
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // For server-side, we can't use browser APIs for video processing
      // This would typically use ffmpeg or a video processing service
      // For now, return a placeholder that can be processed client-side
      return NextResponse.json({
        analysisId,
        status: "pending",
        message: "Video analysis requires client-side processing. Use the VideoUploader component.",
        videoName: videoFile.name,
        videoSize: videoFile.size,
      });
    }

    // Handle JSON body (process pre-extracted frames or manual scene data)
    const body = await request.json();
    const { action } = body;

    // Process pre-extracted scenes
    if (action === "process_scenes") {
      const { scenes, metadata } = body as {
        scenes: SceneSegment[];
        metadata: VideoMetadata;
      };

      if (!scenes || !metadata) {
        return NextResponse.json(
          { error: "scenes and metadata are required" },
          { status: 400 }
        );
      }

      // Analyze scenes and generate suggestions
      const emotionalArc = buildEmotionalArc(scenes);
      const audioSuggestions = emotionMapper.generateDetailedSuggestions(scenes);
      const timedEvents = emotionMapper.generateTimelineFromArc(emotionalArc, scenes);

      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const result: VideoAnalysisResult = {
        metadata,
        scenes,
        emotionalArc,
        audioSuggestions,
      };

      analysisStore.set(analysisId, result);

      return NextResponse.json({
        analysisId,
        result,
        timedEvents,
      });
    }

    // Analyze single scene
    if (action === "analyze_scene") {
      const { sceneAnalysis } = body as { sceneAnalysis: SceneAnalysis };

      if (!sceneAnalysis) {
        return NextResponse.json(
          { error: "sceneAnalysis is required" },
          { status: 400 }
        );
      }

      const audioParams = emotionMapper.mapSceneToAudio(sceneAnalysis);

      return NextResponse.json({
        audioParams,
        musicPrompt: generateMusicPrompt(audioParams.music),
        ambiencePrompt: generateAmbiencePrompt(audioParams.ambience),
      });
    }

    // Generate audio from suggestion
    if (action === "generate_from_suggestion") {
      const { suggestion } = body as { suggestion: AudioSuggestion };

      if (!suggestion) {
        return NextResponse.json(
          { error: "suggestion is required" },
          { status: 400 }
        );
      }

      // Build generation parameters based on suggestion type
      const generationParams = buildGenerationParams(suggestion);

      return NextResponse.json({
        generationParams,
        ready: true,
      });
    }

    // Save/update analysis result
    if (action === "save_analysis") {
      const { analysisId, result } = body as {
        analysisId: string;
        result: VideoAnalysisResult;
      };

      analysisStore.set(analysisId, result);

      return NextResponse.json({
        saved: true,
        analysisId,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Scene analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== GET ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("id");

  if (analysisId) {
    const result = analysisStore.get(analysisId);
    if (!result) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ result });
  }

  // List all analyses
  const analyses = Array.from(analysisStore.entries()).map(([id, result]) => ({
    id,
    videoName: result.metadata.filename,
    duration: result.metadata.duration,
    sceneCount: result.scenes.length,
    suggestionCount: result.audioSuggestions.length,
  }));

  return NextResponse.json({ analyses });
}

// ==================== DELETE ====================

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("id");

  if (!analysisId) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const existed = analysisStore.has(analysisId);
  analysisStore.delete(analysisId);

  return NextResponse.json({
    deleted: existed,
    analysisId,
  });
}

// ==================== Helpers ====================

function buildEmotionalArc(scenes: SceneSegment[]): EmotionalArcPoint[] {
  const arc: EmotionalArcPoint[] = [];

  for (const scene of scenes) {
    if (!scene.analysis) continue;

    const midpoint = (scene.startTime + scene.endTime) / 2;
    const emotion = scene.analysis.mood[0] || "neutral";
    const intensity = scene.analysis.intensity;

    // Map mood to valence/arousal
    const { valence, arousal } = moodToValenceArousal(emotion, intensity);

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

function moodToValenceArousal(mood: string, intensity: number): { valence: number; arousal: number } {
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

function generateMusicPrompt(music: {
  mood: string[];
  tempo: number;
  intensity: number;
  instrumentation: string[];
  style: string;
}): string {
  return [
    music.style,
    music.mood.slice(0, 2).join(" and "),
    `${music.tempo.toFixed(0)} BPM`,
    `with ${music.instrumentation.slice(0, 3).join(", ")}`,
    music.intensity > 0.7 ? "intense and powerful" : music.intensity < 0.3 ? "subtle and ambient" : "",
  ].filter(Boolean).join(", ");
}

function generateAmbiencePrompt(ambience: {
  type: string;
  density: number;
  elements: string[];
}): string {
  return [
    ambience.type,
    ambience.elements.slice(0, 3).join(", "),
    `${(ambience.density * 100).toFixed(0)}% density`,
  ].join(", ");
}

function buildGenerationParams(suggestion: AudioSuggestion): object {
  switch (suggestion.suggestedType) {
    case "music":
      return {
        type: "music",
        prompt: suggestion.description,
        duration: suggestion.endTime - suggestion.startTime,
        moodTags: suggestion.moodTags,
        intensity: Math.round(suggestion.intensity * 100),
      };

    case "ambience":
      return {
        type: "ambience",
        prompt: suggestion.description,
        duration: suggestion.endTime - suggestion.startTime,
        moodTags: suggestion.moodTags,
        looping: true,
      };

    case "sfx":
      return {
        type: "FX",
        prompt: suggestion.description,
        duration: Math.min(5, suggestion.endTime - suggestion.startTime),
        moodTags: suggestion.moodTags,
        intensity: Math.round(suggestion.intensity * 100),
      };

    case "foley":
      return {
        type: "foley",
        prompt: suggestion.description,
        duration: 2,
        moodTags: suggestion.moodTags,
      };

    default:
      return {
        type: "FX",
        prompt: suggestion.description,
        duration: 3,
        moodTags: suggestion.moodTags,
      };
  }
}
