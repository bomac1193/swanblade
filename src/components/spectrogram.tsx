"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpectrogramProps {
  audioUrl: string | null;
  isPlaying: boolean;
  className?: string;
}

export function Spectrogram({ audioUrl, isPlaying, className }: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;

    // Create analyser
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Draw function
    const draw = () => {
      if (!ctx || !analyser) return;

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = "rgba(10, 10, 10, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars
      const barWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient from purple to white based on intensity
        const intensity = dataArray[i] / 255;
        const r = Math.floor(102 + (255 - 102) * intensity);
        const g = Math.floor(2 + (255 - 2) * intensity);
        const b = Math.floor(60 + (255 - 60) * intensity);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      draw();
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [audioUrl, isPlaying]);

  // Connect audio source when playing
  useEffect(() => {
    if (!audioUrl || !isPlaying) return;

    const initAudio = async () => {
      if (!audioContextRef.current || !analyserRef.current) return;

      const audioContext = audioContextRef.current;
      const analyser = analyserRef.current;

      // Resume context if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Find the audio element on the page
      const audioElements = document.querySelectorAll("audio");
      const matchingAudio = Array.from(audioElements).find(
        (el) => el.src === audioUrl || el.currentSrc === audioUrl
      );

      if (matchingAudio && !sourceRef.current) {
        try {
          sourceRef.current = audioContext.createMediaElementSource(matchingAudio);
          sourceRef.current.connect(analyser);
          analyser.connect(audioContext.destination);
          setInitialized(true);
        } catch (e) {
          // Source already connected
          setInitialized(true);
        }
      }
    };

    initAudio();
  }, [audioUrl, isPlaying]);

  if (!audioUrl) {
    return (
      <div className={cn("bg-brand-bg border border-brand-border", className)}>
        <div className="h-24 flex items-center justify-center">
          <p className="text-body-sm text-brand-secondary">No audio loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-[#0A0A0A] border border-brand-border overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        width={400}
        height={96}
        className="w-full h-24"
      />
      {!initialized && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-body-sm text-white">Initializing...</p>
        </div>
      )}
    </div>
  );
}

// Simplified static spectrogram for non-playing audio
export function StaticSpectrogram({
  peaks,
  className,
}: {
  peaks: number[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw peaks as bars
    const barWidth = canvas.width / peaks.length;
    peaks.forEach((peak, i) => {
      const barHeight = peak * canvas.height;
      const intensity = peak;
      const r = Math.floor(102 + (200 - 102) * intensity);
      const g = Math.floor(2 + (100 - 2) * intensity);
      const b = Math.floor(60 + (120 - 60) * intensity);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(
        i * barWidth,
        (canvas.height - barHeight) / 2,
        barWidth - 1,
        barHeight
      );
    });
  }, [peaks]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={48}
      className={cn("w-full h-12 bg-[#0A0A0A] border border-brand-border", className)}
    />
  );
}
