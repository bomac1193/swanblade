"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import type {
  VideoAnalysisResult,
  SceneSegment,
  AudioSuggestion,
  EmotionalArcPoint,
} from "@/lib/sceneAnalysis/videoAnalyzer";
import { cn } from "@/lib/utils";

interface TimelineEditorProps {
  analysisResult: VideoAnalysisResult;
  onSuggestionSelect?: (suggestion: AudioSuggestion) => void;
  onTimeChange?: (time: number) => void;
  className?: string;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: "scene" | "music" | "ambience" | "sfx" | "emotion";
  items: TimelineItem[];
  color: string;
  height: number;
  collapsed: boolean;
}

interface TimelineItem {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  color?: string;
  data?: unknown;
}

const PIXELS_PER_SECOND = 50;
const TRACK_HEIGHT = 40;
const RULER_HEIGHT = 30;

export function TimelineEditor({
  analysisResult,
  onSuggestionSelect,
  onTimeChange,
  className,
}: TimelineEditorProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [scroll, setScroll] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TimelineTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<number | null>(null);

  // Build tracks from analysis result
  useEffect(() => {
    const newTracks: TimelineTrack[] = [];

    // Scenes track
    newTracks.push({
      id: "scenes",
      name: "Scenes",
      type: "scene",
      items: analysisResult.scenes.map((scene, i) => ({
        id: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        label: `Scene ${i + 1}`,
        color: getSceneColor(scene),
        data: scene,
      })),
      color: "#6366f1",
      height: TRACK_HEIGHT,
      collapsed: false,
    });

    // Emotion arc track
    newTracks.push({
      id: "emotion",
      name: "Emotion",
      type: "emotion",
      items: analysisResult.emotionalArc.map((point, i) => ({
        id: `emotion_${i}`,
        startTime: point.timestamp - 0.5,
        endTime: point.timestamp + 0.5,
        label: point.emotion,
        color: getEmotionColor(point.emotion),
        data: point,
      })),
      color: "#ec4899",
      height: TRACK_HEIGHT,
      collapsed: false,
    });

    // Music suggestions track
    const musicSuggestions = analysisResult.audioSuggestions.filter(
      (s) => s.suggestedType === "music"
    );
    newTracks.push({
      id: "music",
      name: "Music",
      type: "music",
      items: musicSuggestions.map((suggestion, i) => ({
        id: `music_${i}`,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        label: suggestion.moodTags.slice(0, 2).join(", "),
        color: "#8b5cf6",
        data: suggestion,
      })),
      color: "#8b5cf6",
      height: TRACK_HEIGHT,
      collapsed: false,
    });

    // Ambience suggestions track
    const ambienceSuggestions = analysisResult.audioSuggestions.filter(
      (s) => s.suggestedType === "ambience"
    );
    newTracks.push({
      id: "ambience",
      name: "Ambience",
      type: "ambience",
      items: ambienceSuggestions.map((suggestion, i) => ({
        id: `amb_${i}`,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        label: suggestion.moodTags.slice(0, 2).join(", "),
        color: "#3b82f6",
        data: suggestion,
      })),
      color: "#3b82f6",
      height: TRACK_HEIGHT,
      collapsed: false,
    });

    // SFX suggestions track
    const sfxSuggestions = analysisResult.audioSuggestions.filter(
      (s) => s.suggestedType === "sfx"
    );
    if (sfxSuggestions.length > 0) {
      newTracks.push({
        id: "sfx",
        name: "SFX",
        type: "sfx",
        items: sfxSuggestions.map((suggestion, i) => ({
          id: `sfx_${i}`,
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
          label: suggestion.moodTags.slice(0, 2).join(", "),
          color: "#f97316",
          data: suggestion,
        })),
        color: "#f97316",
        height: TRACK_HEIGHT,
        collapsed: false,
      });
    }

    setTracks(newTracks);
  }, [analysisResult]);

  // Playback
  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now();
      const startPlaybackTime = currentTime;

      const tick = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = startPlaybackTime + elapsed;

        if (newTime >= analysisResult.metadata.duration) {
          setCurrentTime(0);
          setIsPlaying(false);
          return;
        }

        setCurrentTime(newTime);
        onTimeChange?.(newTime);
        playbackRef.current = requestAnimationFrame(tick);
      };

      playbackRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
      }
    };
  }, [isPlaying, currentTime, analysisResult.metadata.duration, onTimeChange]);

  // Handle time scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scroll;
    const time = x / (PIXELS_PER_SECOND * zoom);

    setCurrentTime(Math.max(0, Math.min(time, analysisResult.metadata.duration)));
    onTimeChange?.(time);
  }, [scroll, zoom, analysisResult.metadata.duration, onTimeChange]);

  // Handle item click
  const handleItemClick = useCallback((item: TimelineItem, track: TimelineTrack) => {
    setSelectedItemId(item.id);

    if (track.type === "music" || track.type === "ambience" || track.type === "sfx") {
      const suggestion = item.data as AudioSuggestion;
      onSuggestionSelect?.(suggestion);
    }
  }, [onSuggestionSelect]);

  // Toggle track collapse
  const toggleTrack = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, collapsed: !t.collapsed } : t
      )
    );
  }, []);

  // Calculate timeline dimensions
  const duration = analysisResult.metadata.duration;
  const timelineWidth = duration * PIXELS_PER_SECOND * zoom;
  const totalHeight = RULER_HEIGHT + tracks.reduce((sum, t) => sum + (t.collapsed ? 24 : t.height), 0);

  // Generate ruler marks
  const rulerMarks = [];
  const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1;
  for (let t = 0; t <= duration; t += interval) {
    rulerMarks.push(t);
  }

  return (
    <div className={cn("flex flex-col bg-card rounded-lg border overflow-hidden", className)}>
      {/* Controls */}
      <div className="flex items-center gap-4 p-2 border-b bg-muted/50">
        <button
          className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        <button
          className="px-2 py-1 rounded-md border text-sm"
          onClick={() => setCurrentTime(0)}
        >
          ⏮
        </button>

        <div className="text-sm font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-12">{zoom.toFixed(2)}x</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex">
        {/* Track Labels */}
        <div className="w-32 flex-shrink-0 bg-muted/30 border-r">
          <div className="h-[30px] border-b" />
          {tracks.map((track) => (
            <div
              key={track.id}
              className={cn(
                "flex items-center gap-2 px-2 border-b cursor-pointer hover:bg-muted/50",
                track.collapsed ? "h-6" : "h-10"
              )}
              onClick={() => toggleTrack(track.id)}
            >
              <span className="text-xs">{track.collapsed ? "▶" : "▼"}</span>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <span className="text-xs truncate">{track.name}</span>
            </div>
          ))}
        </div>

        {/* Timeline Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto"
          onScroll={(e) => setScroll(e.currentTarget.scrollLeft)}
        >
          <div style={{ width: timelineWidth, minWidth: "100%" }}>
            {/* Ruler */}
            <div
              className="h-[30px] border-b bg-muted/20 relative cursor-pointer"
              onClick={handleTimelineClick}
            >
              {rulerMarks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: t * PIXELS_PER_SECOND * zoom }}
                >
                  <div className="h-2 w-px bg-foreground/30" />
                  <span className="text-[10px] text-muted-foreground">{formatTime(t)}</span>
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "border-b relative",
                  track.collapsed ? "h-6" : "h-10"
                )}
                style={{ backgroundColor: `${track.color}10` }}
              >
                {!track.collapsed &&
                  track.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "absolute top-1 bottom-1 rounded cursor-pointer",
                        "flex items-center px-1 overflow-hidden",
                        selectedItemId === item.id ? "ring-2 ring-white" : ""
                      )}
                      style={{
                        left: item.startTime * PIXELS_PER_SECOND * zoom,
                        width: Math.max(20, (item.endTime - item.startTime) * PIXELS_PER_SECOND * zoom),
                        backgroundColor: item.color || track.color,
                      }}
                      onClick={() => handleItemClick(item, track)}
                      title={item.label}
                    >
                      <span className="text-xs text-white truncate">
                        {item.label}
                      </span>
                    </div>
                  ))}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 w-px bg-red-500 pointer-events-none z-10"
              style={{
                left: 128 + currentTime * PIXELS_PER_SECOND * zoom,
                height: totalHeight,
              }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Item Details */}
      {selectedItemId && (
        <div className="p-3 border-t bg-muted/30">
          <SelectedItemDetails
            tracks={tracks}
            selectedItemId={selectedItemId}
            onGenerate={(suggestion) => onSuggestionSelect?.(suggestion)}
          />
        </div>
      )}
    </div>
  );
}

function SelectedItemDetails({
  tracks,
  selectedItemId,
  onGenerate,
}: {
  tracks: TimelineTrack[];
  selectedItemId: string;
  onGenerate: (suggestion: AudioSuggestion) => void;
}) {
  for (const track of tracks) {
    const item = track.items.find((i) => i.id === selectedItemId);
    if (item) {
      if (track.type === "scene") {
        const scene = item.data as SceneSegment;
        return (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="font-medium">{item.label}</h4>
              <p className="text-sm text-muted-foreground">
                {scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s
                ({scene.duration.toFixed(1)}s)
              </p>
              {scene.analysis && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {scene.analysis.mood.map((mood) => (
                    <span key={mood} className="px-1.5 py-0.5 bg-primary/20 text-xs rounded">
                      {mood}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (track.type === "music" || track.type === "ambience" || track.type === "sfx") {
        const suggestion = item.data as AudioSuggestion;
        return (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="font-medium capitalize">{suggestion.suggestedType}</h4>
              <p className="text-sm">{suggestion.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {suggestion.startTime.toFixed(1)}s - {suggestion.endTime.toFixed(1)}s
              </p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {suggestion.moodTags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-muted text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md"
              onClick={() => onGenerate(suggestion)}
            >
              Generate
            </button>
          </div>
        );
      }

      if (track.type === "emotion") {
        const point = item.data as EmotionalArcPoint;
        return (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="font-medium capitalize">{point.emotion}</h4>
              <p className="text-sm text-muted-foreground">
                Intensity: {(point.intensity * 100).toFixed(0)}% |
                Valence: {point.valence.toFixed(2)} |
                Arousal: {point.arousal.toFixed(2)}
              </p>
            </div>
          </div>
        );
      }
    }
  }

  return null;
}

// ==================== Helpers ====================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

function getSceneColor(scene: SceneSegment): string {
  if (!scene.analysis) return "#6366f1";

  const mood = scene.analysis.mood[0];
  const colors: Record<string, string> = {
    happy: "#22c55e",
    sad: "#3b82f6",
    tense: "#f59e0b",
    scary: "#ef4444",
    calm: "#06b6d4",
    exciting: "#f97316",
    mysterious: "#8b5cf6",
    romantic: "#ec4899",
    dramatic: "#dc2626",
  };

  return colors[mood] || "#6366f1";
}

function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    happy: "#22c55e",
    sad: "#3b82f6",
    tense: "#f59e0b",
    scary: "#ef4444",
    calm: "#06b6d4",
    exciting: "#f97316",
    mysterious: "#8b5cf6",
    romantic: "#ec4899",
    dramatic: "#dc2626",
    neutral: "#6b7280",
  };

  return colors[emotion] || "#6b7280";
}

export default TimelineEditor;
