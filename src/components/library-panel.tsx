"use client";

import { useCallback, useEffect, useRef, useState, useId, useMemo } from "react";
import { LibrarySound } from "@/lib/libraryStorage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, secondsToTimecode } from "@/lib/utils";

type SortBy = "date" | "name" | "liked" | "type" | "group";
type FilterBy = "all" | "liked" | "category" | "group";

// Waveform component that displays actual audio data
function AudioWaveform({
  progress,
  peaks,
  onSeek
}: {
  progress: number;
  peaks: number[];
  onSeek: (percent: number) => void;
}) {
  // Build SVG path from peaks
  const waveformPath = useMemo(() => {
    if (peaks.length === 0) return '';

    let path = '';
    // Top edge
    peaks.forEach((amp, i) => {
      const x = (i / (peaks.length - 1)) * 100;
      const y = 50 - amp * 45;
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    // Bottom edge (mirrored)
    for (let i = peaks.length - 1; i >= 0; i--) {
      const x = (i / (peaks.length - 1)) * 100;
      const y = 50 + peaks[i] * 45;
      path += ` L ${x} ${y}`;
    }
    path += ' Z';
    return path;
  }, [peaks]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percent)));
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Show loading state if no peaks yet
  if (peaks.length === 0) {
    return (
      <div className="h-12 w-full bg-brand-bg border border-brand-border flex items-center justify-center">
        <span className="text-body-sm text-brand-secondary">Loading waveform...</span>
      </div>
    );
  }

  return (
    <div
      className="h-12 w-full bg-brand-bg border border-brand-border cursor-pointer relative overflow-hidden"
      onClick={handleClick}
    >
      {/* Full waveform in gray */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path d={waveformPath} fill="rgba(10, 10, 10, 0.2)" />
      </svg>

      {/* Played portion overlay */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${clampedProgress}%` }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full"
          style={{ width: `${100 / (clampedProgress / 100 || 1)}%` }}
        >
          <path d={waveformPath} fill="#0A0A0A" />
        </svg>
      </div>

      {/* Playhead */}
      <div
        className="absolute top-1 bottom-1 w-0.5 bg-black"
        style={{ left: `${clampedProgress}%` }}
      />
    </div>
  );
}

// Extract waveform peaks from audio buffer
async function extractWaveformPeaks(audioUrl: string, numPeaks: number = 100): Promise<number[]> {
  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get the audio data from the first channel
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPeak = Math.floor(channelData.length / numPeaks);

    const peaks: number[] = [];
    for (let i = 0; i < numPeaks; i++) {
      const start = i * samplesPerPeak;
      const end = start + samplesPerPeak;

      // Find the max absolute value in this chunk
      let max = 0;
      for (let j = start; j < end && j < channelData.length; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    // Normalize peaks to 0-1 range
    const maxPeak = Math.max(...peaks, 0.01);
    return peaks.map(p => p / maxPeak);
  } catch (error) {
    console.error('Failed to extract waveform:', error);
    return [];
  }
}

export function LibraryPanel() {
  const [sounds, setSounds] = useState<LibrarySound[]>([]);
  const [filteredSounds, setFilteredSounds] = useState<LibrarySound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadLibrary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/library");
      const data = await response.json();
      setSounds(data.sounds || []);
    } catch (error) {
      console.error("Failed to load library:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    let filtered = [...sounds];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sound) =>
          sound.name.toLowerCase().includes(query) ||
          sound.prompt.toLowerCase().includes(query) ||
          sound.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (filterBy === "liked") {
      filtered = filtered.filter((sound) => sound.liked);
    } else if (filterBy === "group" && selectedGroup) {
      filtered = filtered.filter((sound) => sound.group === selectedGroup);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "liked":
          return (b.liked ? 1 : 0) - (a.liked ? 1 : 0);
        case "type":
          return a.type.localeCompare(b.type);
        case "group":
          return (a.group || "").localeCompare(b.group || "");
        default:
          return 0;
      }
    });

    setFilteredSounds(filtered);
  }, [sounds, searchQuery, sortBy, filterBy, selectedGroup]);

  const handleToggleLike = async (id: string, currentLiked: boolean) => {
    try {
      const response = await fetch(`/api/library?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !currentLiked }),
      });

      if (response.ok) {
        setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, liked: !currentLiked } : s)));
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const response = await fetch(`/api/library?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, name: editName.trim() } : s)));
        setEditingId(null);
        setEditName("");
      }
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sound from your library?")) return;

    try {
      const response = await fetch(`/api/library?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSounds((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/library/download?id=${id}`, "_blank");
  };

  const startEditing = (sound: LibrarySound) => {
    setEditingId(sound.id);
    setEditName(sound.name);
  };

  const handlePlayPause = useCallback(async (sound: LibrarySound) => {
    // If this sound is already playing, pause it
    if (playingId === sound.id && isPlaying) {
      audioRef.current?.pause();
      return;
    }

    // If this sound is paused, resume it
    if (playingId === sound.id && !isPlaying) {
      audioRef.current?.play().catch(console.error);
      return;
    }

    // Different sound - load and play
    setPlayingId(sound.id);
    setCurrentTime(0);
    setDuration(0);
    setWaveformPeaks([]); // Clear old waveform

    const audioUrl = `/api/library/audio?id=${sound.id}`;

    // Load waveform data
    extractWaveformPeaks(audioUrl, 80).then(peaks => {
      setWaveformPeaks(peaks);
    });

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.error);
    }
  }, [playingId, isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((percent: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = (percent / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const handleAudioTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleAudioLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleAudioPlay = useCallback(() => setIsPlaying(true), []);
  const handleAudioPause = useCallback(() => setIsPlaying(false), []);

  const groups = Array.from(new Set(sounds.map((s) => s.group).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-body text-brand-secondary">Loading library...</p>
      </div>
    );
  }

  if (sounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="text-body text-brand-secondary">Your library is empty</p>
        <p className="text-body-sm text-brand-secondary/60">Generate sounds and save them to build your collection</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <Input
          type="text"
          placeholder="Search sounds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="border border-brand-border bg-brand-bg px-3 py-1.5 text-body text-brand-text"
          >
            <option value="date">Newest First</option>
            <option value="name">Name A-Z</option>
            <option value="liked">Liked First</option>
            <option value="type">By Type</option>
            <option value="group">By Group</option>
          </select>

          <button
            onClick={() => setFilterBy("all")}
            className={`px-3 py-1.5 text-label uppercase tracking-wider border transition ${
              filterBy === "all" ? "border-brand-text bg-brand-text text-brand-bg" : "border-brand-border text-brand-secondary hover:border-brand-text hover:text-brand-text"
            }`}
          >
            All ({sounds.length})
          </button>

          <button
            onClick={() => setFilterBy("liked")}
            className={`px-3 py-1.5 text-label uppercase tracking-wider border transition ${
              filterBy === "liked" ? "border-brand-text bg-brand-text text-brand-bg" : "border-brand-border text-brand-secondary hover:border-brand-text hover:text-brand-text"
            }`}
          >
            Liked ({sounds.filter((s) => s.liked).length})
          </button>

          {groups.length > 0 && (
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setFilterBy("group");
              }}
              className="border border-brand-border bg-brand-bg px-3 py-1.5 text-body text-brand-text"
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        hidden
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Sound List - Compact Stacked */}
      <div className="flex flex-col gap-3 max-w-2xl">
        {filteredSounds.map((sound) => (
          <div
            key={sound.id}
            className={cn(
              "border border-brand-border bg-brand-surface transition",
              playingId === sound.id && "border-brand-text"
            )}
          >
            {/* Main row - always visible */}
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Play button - always shows play icon to start/select this sound */}
              <button
                onClick={() => handlePlayPause(sound)}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-brand-border bg-brand-bg hover:border-brand-text"
                title="Play"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" className="fill-brand-text">
                  <path d="M6 4l14 8-14 8z" />
                </svg>
              </button>

              {/* Name and prompt */}
              <div className="flex-1 min-w-0">
                {editingId === sound.id ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(sound.id)}
                      className="h-6 text-body-sm"
                      autoFocus
                    />
                    <button onClick={() => handleRename(sound.id)} className="text-label text-brand-text">✓</button>
                    <button onClick={() => setEditingId(null)} className="text-label text-brand-secondary">×</button>
                  </div>
                ) : (
                  <p
                    className="text-body-sm font-medium text-brand-text truncate cursor-pointer hover:text-brand-accent"
                    onClick={() => startEditing(sound)}
                    title={sound.name}
                  >
                    {sound.name}
                  </p>
                )}
              </div>

              {/* Type badge */}
              <Badge className="shrink-0 text-[10px] px-1.5 py-0.5">{sound.type}</Badge>

              {/* Like button */}
              <button
                onClick={() => handleToggleLike(sound.id, sound.liked)}
                className={cn(
                  "text-sm shrink-0",
                  sound.liked ? "text-brand-text" : "text-brand-secondary hover:text-brand-text"
                )}
              >
                {sound.liked ? "★" : "☆"}
              </button>

              {/* Download */}
              <button
                onClick={() => handleDownload(sound.id)}
                className="text-sm text-brand-secondary hover:text-brand-text"
              >
                ↓
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(sound.id)}
                className="text-sm text-brand-secondary hover:text-brand-text"
              >
                ×
              </button>
            </div>

            {/* Expanded player row - shows when this sound is selected */}
            {playingId === sound.id && (
              <div className="border-t border-brand-border px-3 py-2">
                <div className="flex items-center gap-2">
                  {/* Play/Pause button */}
                  <button
                    onClick={() => handlePlayPause(sound)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center border border-brand-border bg-brand-bg hover:border-brand-text"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" className="fill-brand-text">
                        <rect x="6" y="5" width="4" height="14" />
                        <rect x="14" y="5" width="4" height="14" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" className="fill-brand-text">
                        <path d="M6 4l14 8-14 8z" />
                      </svg>
                    )}
                  </button>

                  {/* Stop button */}
                  <button
                    onClick={handleStop}
                    className="flex h-7 w-7 shrink-0 items-center justify-center border border-brand-border bg-brand-bg hover:border-brand-text"
                    title="Stop"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" className="fill-brand-text">
                      <rect x="5" y="5" width="14" height="14" />
                    </svg>
                  </button>

                  <span className="text-body-sm text-brand-secondary w-10 text-right shrink-0">
                    {secondsToTimecode(currentTime)}
                  </span>

                  <div className="flex-1">
                    <AudioWaveform
                      progress={duration > 0 ? (currentTime / duration) * 100 : 0}
                      peaks={waveformPeaks}
                      onSeek={handleSeek}
                    />
                  </div>

                  <span className="text-body-sm text-brand-secondary w-8 shrink-0">
                    {secondsToTimecode(duration)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSounds.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <p className="text-body text-brand-secondary">No sounds match your filters</p>
        </div>
      )}
    </div>
  );
}
