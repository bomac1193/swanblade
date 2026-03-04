"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioPlayerControlsProps {
  audioUrl: string | null;
  disabled?: boolean;
}

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function extractPeaks(buffer: AudioBuffer, count: number): number[] {
  const raw = buffer.getChannelData(0);
  const block = Math.floor(raw.length / count);
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    let sum = 0;
    const start = i * block;
    for (let j = 0; j < block; j++) {
      sum += raw[start + j] ** 2;
    }
    peaks.push(Math.sqrt(sum / block));
  }
  const max = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / max);
}

function renderWaveform(
  canvas: HTMLCanvasElement,
  peaks: number[],
  progress: number,
) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx || peaks.length === 0) return;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const centerY = h / 2;
  const maxAmp = h * 0.40;
  const step = w / peaks.length;

  const buildPath = () => {
    ctx.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const x = i * step;
      const y = centerY - peaks[i] * maxAmp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(w, centerY);
    for (let i = peaks.length - 1; i >= 0; i--) {
      const x = i * step;
      const y = centerY + peaks[i] * maxAmp;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // Unplayed fill
  buildPath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fill();

  // Played fill
  if (progress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w * progress, h);
    ctx.clip();
    buildPath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fill();
    ctx.restore();
  }

  // Playhead
  if (progress > 0 && progress < 1) {
    const px = w * progress;
    ctx.beginPath();
    ctx.moveTo(px, 4);
    ctx.lineTo(px, h - 4);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function AudioPlayerControls({ audioUrl, disabled }: AudioPlayerControlsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loop, setLoop] = useState(false);
  const [decoded, setDecoded] = useState(false);
  const [playableUrl, setPlayableUrl] = useState<string | null>(audioUrl ?? null);

  // Convert data URLs to blob URLs for playback
  useEffect(() => {
    let revoke: (() => void) | null = null;
    if (!audioUrl) {
      setPlayableUrl(null);
    } else if (audioUrl.startsWith("data:")) {
      try {
        const [header, base64Data] = audioUrl.split(",");
        const mimeType = header.match(/:(.*?);/)?.[1] ?? "audio/wav";
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(objectUrl);
        setPlayableUrl(objectUrl);
      } catch {
        setPlayableUrl(null);
      }
    } else {
      setPlayableUrl(audioUrl);
    }
    return () => { revoke?.(); };
  }, [audioUrl]);

  // Decode audio and extract waveform peaks
  useEffect(() => {
    if (!playableUrl) {
      peaksRef.current = [];
      setDecoded(false);
      return;
    }

    let cancelled = false;
    const actx = new AudioContext();

    fetch(playableUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => actx.decodeAudioData(buf))
      .then((buffer) => {
        if (cancelled) return;
        peaksRef.current = extractPeaks(buffer, 300);
        setDecoded(true);
        if (canvasRef.current) {
          renderWaveform(canvasRef.current, peaksRef.current, 0);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      actx.close();
    };
  }, [playableUrl]);

  // Smooth playhead animation
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      const canvas = canvasRef.current;
      if (audio && canvas && peaksRef.current.length > 0) {
        const t = audio.currentTime;
        const d = audio.duration || 0;
        setCurrentTime(t);
        renderWaveform(canvas, peaksRef.current, d > 0 ? t / d : 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // Static redraw when paused
  useEffect(() => {
    if (!isPlaying && decoded && canvasRef.current) {
      const d = duration || 1;
      renderWaveform(canvasRef.current, peaksRef.current, currentTime / d);
    }
  }, [isPlaying, decoded, currentTime, duration]);

  // Cleanup audio on unmount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    return () => { audio.pause(); };
  }, []);

  // Reset on URL change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, [playableUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !playableUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [isPlaying, playableUrl]);

  const seek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div className={cn("border border-white/[0.06] bg-black/50 p-4", disabled && "opacity-40 pointer-events-none")}>
      {/* Waveform */}
      <canvas
        ref={canvasRef}
        onClick={seek}
        className={cn(
          "w-full h-20 cursor-pointer",
          !decoded && !disabled && "animate-pulse",
        )}
      />

      {/* Controls */}
      <div className="flex items-center gap-3 mt-3">
        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioUrl || disabled}
          className="shrink-0 w-8 h-8 flex items-center justify-center border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="1" width="3" height="10" rx="0.5" />
              <rect x="7" y="1" width="3" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 1l8 5-8 5V1z" />
            </svg>
          )}
        </button>

        {/* Time */}
        <span className="text-[11px] text-gray-500 tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-[11px] text-gray-600">/</span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {formatTime(duration)}
        </span>

        <div className="flex-1" />

        {/* Loop */}
        <button
          type="button"
          onClick={() => setLoop((prev) => !prev)}
          className={cn(
            "shrink-0 w-8 h-8 flex items-center justify-center border transition-colors",
            loop
              ? "border-white/20 bg-white/[0.06] text-white"
              : "border-white/[0.04] text-gray-600 hover:text-gray-400"
          )}
          aria-label={loop ? "Disable loop" : "Enable loop"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11v-1a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v1a4 4 0 01-4 4H3" />
          </svg>
        </button>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={playableUrl ?? undefined}
        preload="metadata"
        loop={loop}
        hidden
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (loop && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            setCurrentTime(0);
            if (canvasRef.current && peaksRef.current.length > 0) {
              renderWaveform(canvasRef.current, peaksRef.current, 0);
            }
          }
        }}
      />
    </div>
  );
}
