"use client";

import { useCallback, useEffect, useRef, useState, useId, useMemo } from "react";
import { LibrarySound } from "@/lib/libraryStorage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, secondsToTimecode } from "@/lib/utils";

type SortBy = "date" | "name" | "liked" | "type" | "group";
type FilterBy = "all" | "liked" | "category" | "group";

// Smooth waveform component with seek support
function SmoothWaveform({
  progress,
  onSeek
}: {
  progress: number;
  onSeek: (percent: number) => void;
}) {
  const waveformRef = useRef<SVGSVGElement>(null);

  // Generate smooth waveform points
  const waveformPoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const numPoints = 100;

    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * 100;
      const t = i / numPoints;
      // Combine multiple sine waves for organic look
      const wave1 = Math.sin(t * 15) * 0.3;
      const wave2 = Math.sin(t * 23 + 1.5) * 0.2;
      const wave3 = Math.sin(t * 7 + 0.8) * 0.25;
      const noise = Math.sin(t * 47) * 0.1;
      const envelope = Math.sin(t * Math.PI) * 0.15;
      const amplitude = 0.5 + wave1 + wave2 + wave3 + noise + envelope;
      points.push({ x, y: amplitude });
    }
    return points;
  }, []);

  // Create path for the waveform
  const createPath = (startX: number, endX: number) => {
    const relevantPoints = waveformPoints.filter(p => p.x >= startX && p.x <= endX);
    if (relevantPoints.length === 0) return '';

    // Top half
    const topPath = relevantPoints.map((p, i) => {
      const yPos = 50 - p.y * 35;
      return i === 0 ? `M ${p.x} ${yPos}` : `L ${p.x} ${yPos}`;
    }).join(' ');

    // Bottom half (mirrored)
    const bottomPath = [...relevantPoints].reverse().map((p) => {
      const yPos = 50 + p.y * 35;
      return `L ${p.x} ${yPos}`;
    }).join(' ');

    return `${topPath} ${bottomPath} Z`;
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percent)));
  };

  const playedPath = createPath(0, progress);
  const unplayedPath = createPath(progress, 100);

  return (
    <div className="h-12 w-full bg-brand-bg border border-brand-border cursor-pointer">
      <svg
        ref={waveformRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        onClick={handleClick}
      >
        {/* Played portion - solid black */}
        {playedPath && (
          <path d={playedPath} fill="#0A0A0A" />
        )}
        {/* Unplayed portion - light gray */}
        {unplayedPath && (
          <path d={unplayedPath} fill="rgba(10, 10, 10, 0.2)" />
        )}
        {/* Playhead line */}
        <line
          x1={progress}
          y1="10"
          x2={progress}
          y2="90"
          stroke="#0A0A0A"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
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

  const handlePlayPause = useCallback((sound: LibrarySound) => {
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

    const audioUrl = `/api/library/audio?id=${sound.id}`;

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

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
      <audio ref={audioRef} hidden />

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
                    <SmoothWaveform
                      progress={duration > 0 ? (currentTime / duration) * 100 : 0}
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
