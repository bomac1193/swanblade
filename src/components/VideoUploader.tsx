"use client";

import React, { useState, useCallback, useRef } from "react";
import { VideoAnalyzer, type VideoAnalysisResult, type VideoMetadata } from "@/lib/sceneAnalysis/videoAnalyzer";
import { cn } from "@/lib/utils";

interface VideoUploaderProps {
  onAnalysisComplete?: (result: VideoAnalysisResult) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface AnalysisProgress {
  stage: "idle" | "loading" | "extracting" | "detecting" | "analyzing" | "complete" | "error";
  progress: number;
  message: string;
}

export function VideoUploader({
  onAnalysisComplete,
  onError,
  className,
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: "idle",
    progress: 0,
    message: "Upload a video to begin",
  });
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [options, setOptions] = useState({
    frameInterval: 1,
    maxFrames: 50,
    sceneThreshold: 0.3,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const analyzerRef = useRef<VideoAnalyzer | null>(null);

  // Initialize analyzer
  if (!analyzerRef.current) {
    analyzerRef.current = new VideoAnalyzer();
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith("video/")) {
      onError?.(new Error("Please select a video file"));
      return;
    }

    setFile(selectedFile);
    setProgress({ stage: "loading", progress: 10, message: "Loading video metadata..." });

    try {
      const videoMetadata = await analyzerRef.current!.getVideoMetadata(selectedFile);
      setMetadata(videoMetadata);
      setProgress({ stage: "idle", progress: 0, message: "Ready to analyze" });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load video");
      setProgress({ stage: "error", progress: 0, message: error.message });
      onError?.(error);
    }
  }, [onError]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }, []);

  // Start analysis
  const handleAnalyze = useCallback(async () => {
    if (!file || !analyzerRef.current) return;

    setProgress({ stage: "extracting", progress: 20, message: "Extracting frames..." });

    try {
      // Extract frames
      const frames = await analyzerRef.current.extractFrames(file, {
        interval: options.frameInterval,
        maxFrames: options.maxFrames,
      });

      setProgress({ stage: "detecting", progress: 50, message: `Detecting scenes in ${frames.length} frames...` });

      // Detect scene changes
      const scenes = await analyzerRef.current.detectSceneChanges(frames, options.sceneThreshold);

      setProgress({ stage: "analyzing", progress: 70, message: `Analyzing ${scenes.length} scenes...` });

      // Analyze each scene
      for (let i = 0; i < scenes.length; i++) {
        scenes[i].analysis = await analyzerRef.current.analyzeScene(scenes[i]);
        setProgress({
          stage: "analyzing",
          progress: 70 + (30 * (i + 1) / scenes.length),
          message: `Analyzing scene ${i + 1} of ${scenes.length}...`,
        });
      }

      // Build emotional arc
      const emotionalArc = scenes
        .filter((s) => s.analysis)
        .map((scene) => {
          const midpoint = (scene.startTime + scene.endTime) / 2;
          const emotion = scene.analysis!.mood[0] || "neutral";
          const intensity = scene.analysis!.intensity;

          return {
            timestamp: midpoint,
            emotion,
            intensity,
            valence: emotion === "happy" ? 0.5 : emotion === "sad" ? -0.5 : 0,
            arousal: intensity,
          };
        });

      // Generate audio suggestions
      const audioSuggestions = scenes
        .filter((s) => s.analysis)
        .flatMap((scene) => [
          {
            sceneId: scene.id,
            startTime: scene.startTime,
            endTime: scene.endTime,
            suggestedType: "music" as const,
            description: `${scene.analysis!.mood.join(", ")} music`,
            moodTags: scene.analysis!.suggestedAudioMood,
            intensity: scene.analysis!.intensity,
            priority: 1,
          },
          {
            sceneId: scene.id,
            startTime: scene.startTime,
            endTime: scene.endTime,
            suggestedType: "ambience" as const,
            description: scene.analysis!.suggestedSoundTypes.join(", "),
            moodTags: scene.analysis!.suggestedSoundTypes,
            intensity: scene.analysis!.intensity * 0.7,
            priority: 2,
          },
        ]);

      const analysisResult: VideoAnalysisResult = {
        metadata: metadata!,
        scenes,
        emotionalArc,
        audioSuggestions,
      };

      setResult(analysisResult);
      setProgress({ stage: "complete", progress: 100, message: "Analysis complete!" });
      onAnalysisComplete?.(analysisResult);

      // Save to API
      await fetch("/api/scene-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_analysis",
          analysisId: `analysis_${Date.now()}`,
          result: analysisResult,
        }),
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Analysis failed");
      setProgress({ stage: "error", progress: 0, message: error.message });
      onError?.(error);
    }
  }, [file, metadata, options, onAnalysisComplete, onError]);

  // Reset
  const handleReset = useCallback(() => {
    setFile(null);
    setMetadata(null);
    setResult(null);
    setProgress({ stage: "idle", progress: 0, message: "Upload a video to begin" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Scene/Emotion Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            Upload a video to analyze for audio suggestions
          </p>
        </div>
        {result && (
          <button
            className="px-3 py-1 text-sm rounded-md border hover:bg-muted"
            onClick={handleReset}
          >
            New Analysis
          </button>
        )}
      </div>

      {/* Upload Area */}
      {!file && (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="text-4xl mb-2">🎬</div>
          <p className="text-sm text-muted-foreground">
            Drag and drop a video file, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports MP4, MOV, WebM, AVI
          </p>
        </div>
      )}

      {/* Video Preview & Metadata */}
      {file && metadata && !result && (
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoPreviewRef}
              src={URL.createObjectURL(file)}
              className="w-full h-full object-contain"
              controls
            />
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Duration</span>
              <div className="font-medium">{metadata.duration.toFixed(1)}s</div>
            </div>
            <div>
              <span className="text-muted-foreground">Resolution</span>
              <div className="font-medium">{metadata.width}x{metadata.height}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Frame Rate</span>
              <div className="font-medium">{metadata.frameRate} fps</div>
            </div>
            <div>
              <span className="text-muted-foreground">Est. Frames</span>
              <div className="font-medium">{metadata.totalFrames}</div>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Frame Interval (s)</label>
              <input
                type="number"
                value={options.frameInterval}
                onChange={(e) => setOptions((o) => ({ ...o, frameInterval: parseFloat(e.target.value) }))}
                min={0.5}
                max={5}
                step={0.5}
                className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max Frames</label>
              <input
                type="number"
                value={options.maxFrames}
                onChange={(e) => setOptions((o) => ({ ...o, maxFrames: parseInt(e.target.value) }))}
                min={10}
                max={200}
                className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scene Threshold</label>
              <input
                type="number"
                value={options.sceneThreshold}
                onChange={(e) => setOptions((o) => ({ ...o, sceneThreshold: parseFloat(e.target.value) }))}
                min={0.1}
                max={0.9}
                step={0.1}
                className="w-full mt-1 p-2 text-sm bg-muted/50 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress.stage !== "idle" && progress.stage !== "complete" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progress.message}</span>
            <span>{progress.progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                progress.stage === "error" ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results Summary */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <span>✓</span>
              <span>Analysis Complete</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Scenes Detected</span>
                <div className="font-medium">{result.scenes.length}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Audio Suggestions</span>
                <div className="font-medium">{result.audioSuggestions.length}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Emotional Cues</span>
                <div className="font-medium">{result.emotionalArc.length}</div>
              </div>
            </div>
          </div>

          {/* Scene List */}
          <div>
            <h4 className="text-sm font-medium mb-2">Detected Scenes</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.scenes.map((scene, i) => (
                <div key={scene.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Scene {i + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s
                    </span>
                  </div>
                  {scene.analysis && (
                    <div className="mt-1 text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {scene.analysis.mood.map((mood) => (
                          <span key={mood} className="px-1.5 py-0.5 bg-primary/20 text-xs rounded">
                            {mood}
                          </span>
                        ))}
                        <span className="px-1.5 py-0.5 bg-muted text-xs rounded">
                          {scene.analysis.pace}
                        </span>
                        <span className="px-1.5 py-0.5 bg-muted text-xs rounded">
                          {(scene.analysis.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audio Suggestions */}
          <div>
            <h4 className="text-sm font-medium mb-2">Audio Suggestions</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.audioSuggestions.slice(0, 10).map((suggestion, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-1.5 py-0.5 text-xs rounded",
                        suggestion.suggestedType === "music" ? "bg-purple-500/20 text-purple-600" :
                        suggestion.suggestedType === "ambience" ? "bg-blue-500/20 text-blue-600" :
                        "bg-orange-500/20 text-orange-600"
                      )}>
                        {suggestion.suggestedType}
                      </span>
                      <span className="text-sm">{suggestion.description}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {suggestion.startTime.toFixed(1)}s - {suggestion.endTime.toFixed(1)}s
                    </div>
                  </div>
                  <button
                    className="px-2 py-1 text-xs rounded-md border hover:bg-muted"
                    onClick={() => {
                      // Generate audio from suggestion
                      fetch("/api/scene-analysis", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "generate_from_suggestion",
                          suggestion,
                        }),
                      });
                    }}
                  >
                    Generate
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {file && !result && (
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
            onClick={handleReset}
          >
            Cancel
          </button>
          <button
            className={cn(
              "flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground",
              "hover:bg-primary/90 disabled:opacity-50"
            )}
            onClick={handleAnalyze}
            disabled={progress.stage !== "idle" && progress.stage !== "error"}
          >
            {progress.stage === "idle" || progress.stage === "error" ? "Analyze Video" : "Analyzing..."}
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoUploader;
