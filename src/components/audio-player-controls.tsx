"use client";
/* eslint-disable react-hooks/set-state-in-effect */

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
  const [playableUrl, setPlayableUrl] = useState<string | null>(audioUrl ?? null);

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
        for (let i = 0; i < binaryString.length; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(objectUrl);
        setPlayableUrl(objectUrl);
      } catch (error) {
        console.error("Failed to convert data URL to Blob:", error);
        setPlayableUrl(null);
      }
    } else {
      setPlayableUrl(audioUrl);
    }

    return () => {
      revoke?.();
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    return () => {
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, [playableUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !playableUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Failed to play audio:", error);
      });
    }
  }, [isPlaying, playableUrl]);

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
          console.error("Failed to loop audio:", error);
        });
      }
    };
    const handleError = (e: Event) => {
      console.error("Audio error:", e);
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
    <div className={cn("border border-brand-border/30 bg-brand-bg p-6", disabled && "opacity-40")}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioUrl || disabled}
          className="flex h-14 w-14 items-center justify-center border border-brand-border/30 bg-brand-surface transition hover:border-brand-text"
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" className="fill-brand-text">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" className="fill-brand-text">
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
            className="h-1 w-full cursor-pointer appearance-none bg-brand-border accent-brand-text [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-brand-text [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand-text"
          />
          <div className="flex items-center justify-between text-body-sm text-brand-secondary">
            <span>{secondsToTimecode(currentTime)}</span>
            <span>{secondsToTimecode(duration)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLoop((prev) => !prev)}
          className={cn(
            "ml-4 flex h-10 w-10 items-center justify-center border border-brand-border/30 transition",
            loop ? "bg-brand-text" : "bg-transparent",
          )}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className={cn("stroke-current", loop ? "text-brand-bg" : "text-brand-text")} fill="none" strokeWidth={1.6}>
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11v-1a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v1a4 4 0 01-4 4H3" />
          </svg>
        </button>
      </div>

      <audio ref={audioRef} src={playableUrl ?? undefined} preload="metadata" loop={loop} hidden />
    </div>
  );
}
