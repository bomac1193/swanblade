"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn, secondsToTimecode } from "@/lib/utils";

interface AudioPlayerControlsProps {
  audioUrl: string | null;
  disabled?: boolean;
}

export function AudioPlayerControls({ audioUrl, disabled }: AudioPlayerControlsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loop, setLoop] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  return () => {
    audio.pause();
  };
}, []);

useEffect(() => {
  // Convert data URL to Blob URL for better browser support
  if (audioUrl && audioUrl.startsWith('data:')) {
    const [header, base64Data] = audioUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/wav';

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Failed to convert data URL to Blob:', error);
      setBlobUrl(null);
    }
  } else {
    setBlobUrl(audioUrl);
  }
}, [audioUrl]);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}, [blobUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !blobUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });
    }
  }, [isPlaying, blobUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      if (loop) {
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.error('Failed to loop audio:', error);
        });
      }
    };
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [loop]);

  const handleSeek = (value: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.min(Math.max(value, 0), duration || 0);
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/30 p-6", disabled && "opacity-60")}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioUrl || disabled}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 transition hover:border-emerald-400/60"
        >
          {isPlaying ? (
            <svg width="26" height="26" viewBox="0 0 24 24" className="fill-white">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" className="fill-white">
              <path d="M6 4l14 8-14 8z" />
            </svg>
          )}
        </button>
        <div className="flex-1 space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            disabled={!audioUrl || disabled}
            onChange={(event) => handleSeek(parseFloat(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-400"
          />
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{secondsToTimecode(currentTime)}</span>
            <span>{secondsToTimecode(duration)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLoop((prev) => !prev)}
          className={cn(
            "ml-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 transition",
            loop ? "border-emerald-400/60 bg-emerald-500/20" : "bg-transparent",
          )}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-current text-white" fill="none" strokeWidth={1.6}>
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11v-1a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v1a4 4 0 01-4 4H3" />
          </svg>
        </button>
      </div>

      <audio ref={audioRef} src={blobUrl ?? undefined} preload="metadata" loop={loop} hidden />
    </div>
  );
}
