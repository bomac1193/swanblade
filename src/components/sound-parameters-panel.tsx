"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "@/components/ui/range-slider";
import { MoodTagPill } from "@/components/mood-tag-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SoundCategory } from "@/types";

export interface SoundParameterState {
  type: SoundCategory;
  intensity: number;
  texture: number;
  brightness: number;
  noisiness: number;
  moodTags: string[];
  lengthSeconds: number;
  bpm?: number;
  key?: string;
  seed?: number;
}

export const SOUND_TYPES: SoundCategory[] = ["FX", "Ambience", "UI", "Foley", "Melody", "Bass", "Percussion"];
export const LENGTH_OPTIONS = [3, 5, 10, 30, 60];
export const MOOD_TAGS = ["Dark", "Eerie", "Futuristic", "Organic", "Mechanical", "Uplifting", "Cinematic"];
export const KEY_OPTIONS = ["C", "D", "E", "F", "G", "A", "B"].flatMap((note) => [`${note} Minor`, `${note} Major`]);

interface SoundParametersPanelProps {
  value: SoundParameterState;
  onChange: <K extends keyof SoundParameterState>(key: K, value: SoundParameterState[K]) => void;
}

export function SoundParametersPanel({ value, onChange }: SoundParametersPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleMood = (tag: string) => {
    if (value.moodTags.includes(tag)) {
      onChange(
        "moodTags",
        value.moodTags.filter((item) => item !== tag),
      );
    } else {
      onChange("moodTags", [...value.moodTags, tag]);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-3xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Sound Parameters</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Designer Controls</h3>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Type</label>
        <select
          value={value.type}
          onChange={(event) => onChange("type", event.target.value as SoundCategory)}
          className="w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white"
        >
          {SOUND_TYPES.map((type) => (
            <option key={type} value={type} className="bg-black text-white">
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <RangeSlider
          label="Intensity"
          min={0}
          max={100}
          step={1}
          value={value.intensity}
          onChange={(event) => onChange("intensity", Number(event.target.value))}
        />
        <RangeSlider
          label="Texture"
          min={0}
          max={100}
          step={1}
          value={value.texture}
          onChange={(event) => onChange("texture", Number(event.target.value))}
        />
        <RangeSlider
          label="Bright ↔ Dark"
          min={-1}
          max={1}
          step={0.1}
          value={value.brightness}
          onChange={(event) => onChange("brightness", Number(event.target.value))}
        />
        <RangeSlider
          label="Clean ↔ Noisy"
          min={-1}
          max={1}
          step={0.1}
          value={value.noisiness}
          onChange={(event) => onChange("noisiness", Number(event.target.value))}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Mood Tags</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOOD_TAGS.map((tag) => (
            <MoodTagPill key={tag} active={value.moodTags.includes(tag)} onClick={() => toggleMood(tag)}>
              {tag}
            </MoodTagPill>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Length</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {LENGTH_OPTIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => onChange("lengthSeconds", seconds)}
              className={cn(
                "rounded-2xl border border-white/15 py-2 text-xs font-semibold text-white/70 transition",
                value.lengthSeconds === seconds && "border-emerald-400/70 bg-emerald-500/10 text-white",
              )}
            >
              {seconds}s
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/70"
        >
          Advanced Parameters
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">{advancedOpen ? "Hide" : "Show"}</span>
        </button>

        {advancedOpen && (
          <div className="space-y-3 rounded-2xl border border-white/10 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">BPM</p>
                <Input
                  type="number"
                  value={value.bpm ?? ""}
                  min={40}
                  max={220}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    onChange("bpm", Number.isNaN(parsed) ? undefined : parsed);
                  }}
                  placeholder="120"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Key</p>
                <select
                  value={value.key ?? ""}
                  onChange={(event) => onChange("key", event.target.value || undefined)}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white"
                >
                  <option value="">—</option>
                  {KEY_OPTIONS.map((key) => (
                    <option key={key} value={key} className="bg-black text-white">
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Seed</p>
              <Input
                type="number"
                value={value.seed ?? ""}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  onChange("seed", Number.isNaN(parsed) ? undefined : parsed);
                }}
                placeholder="Random"
              />
            </div>
            <Button type="button" variant="ghost" onClick={() => onChange("seed", Math.floor(Math.random() * 1000))}>
              Randomize Seed
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
