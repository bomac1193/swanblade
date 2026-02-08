"use client";

import { useState, useMemo } from "react";
import {
  type SoundPalette,
  PALETTE_PRESETS,
  createPaletteFromPreset,
  SoundPaletteStore,
} from "@/lib/soundPalette";

interface PaletteEditorProps {
  value: SoundPalette | null;
  onChange: (palette: SoundPalette | null) => void;
  onCreateFromDNA?: () => void;
}

const paletteStore = new SoundPaletteStore();

export function PaletteEditor({ value, onChange, onCreateFromDNA }: PaletteEditorProps) {
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customName, setCustomName] = useState("");

  const savedPalettes = useMemo(() => paletteStore.getAll(), []);

  const handlePresetSelect = (presetId: string) => {
    if (presetId === "none") {
      onChange(null);
      return;
    }

    const palette = createPaletteFromPreset(presetId as keyof typeof PALETTE_PRESETS);
    onChange(palette);
  };

  const handleSavedSelect = (id: string) => {
    const palette = savedPalettes.find((p) => p.id === id);
    if (palette) {
      onChange(palette);
    }
  };

  const savePalette = () => {
    if (!value || !customName.trim()) return;

    const paletteToSave: SoundPalette = {
      ...value,
      name: customName.trim(),
    };

    paletteStore.save(paletteToSave);
    setShowCustomEditor(false);
    setCustomName("");
  };

  const updateConstraint = (
    field: keyof SoundPalette["constraints"],
    index: 0 | 1,
    newValue: number
  ) => {
    if (!value) return;

    const constraints = { ...value.constraints };
    const current = constraints[field];

    if (current) {
      const newRange: [number, number] = [...current] as [number, number];
      newRange[index] = newValue;
      constraints[field] = newRange;
    } else {
      constraints[field] = index === 0 ? [newValue, 100] : [0, newValue];
    }

    onChange({ ...value, constraints });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Sound Palette</p>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        )}
      </div>

      {/* Preset Selection */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => handlePresetSelect("none")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !value
              ? "bg-emerald-500/80 text-white"
              : "border border-white/15 text-white/60 hover:text-white"
          }`}
        >
          No Palette
        </button>

        {Object.entries(PALETTE_PRESETS).map(([id, preset]) => (
          <button
            key={id}
            onClick={() => handlePresetSelect(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              value?.name === preset.name
                ? "bg-emerald-500/80 text-white"
                : "border border-white/15 text-white/60 hover:text-white"
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Saved Palettes */}
      {savedPalettes.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Saved Palettes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {savedPalettes.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSavedSelect(p.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  value?.id === p.id
                    ? "bg-purple-500/80 text-white"
                    : "border border-purple-400/30 text-purple-300/70 hover:text-purple-200"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Palette Details */}
      {value && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-sm font-medium text-white">{value.name}</p>
            <p className="mt-1 text-xs text-white/50">{value.description}</p>

            {/* Genres & Moods */}
            <div className="mt-2 flex flex-wrap gap-1">
              {value.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300"
                >
                  {g}
                </span>
              ))}
              {value.moods.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Constraint Sliders */}
          <button
            onClick={() => setShowCustomEditor(!showCustomEditor)}
            className="text-xs text-white/50 hover:text-white/70"
          >
            {showCustomEditor ? "Hide" : "Edit"} Constraints
          </button>

          {showCustomEditor && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
              {/* BPM Range */}
              {value.constraints.bpmRange && (
                <ConstraintSlider
                  label="BPM"
                  min={60}
                  max={200}
                  value={value.constraints.bpmRange}
                  onChange={(range) => {
                    onChange({
                      ...value,
                      constraints: { ...value.constraints, bpmRange: range },
                    });
                  }}
                />
              )}

              {/* Energy Range */}
              {value.constraints.energyRange && (
                <ConstraintSlider
                  label="Energy"
                  min={0}
                  max={100}
                  value={value.constraints.energyRange}
                  onChange={(range) => {
                    onChange({
                      ...value,
                      constraints: { ...value.constraints, energyRange: range },
                    });
                  }}
                />
              )}

              {/* Brightness Range */}
              {value.constraints.brightnessRange && (
                <ConstraintSlider
                  label="Brightness"
                  min={0}
                  max={100}
                  value={value.constraints.brightnessRange}
                  onChange={(range) => {
                    onChange({
                      ...value,
                      constraints: { ...value.constraints, brightnessRange: range },
                    });
                  }}
                />
              )}

              {/* Save Custom */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Palette name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30"
                />
                <button
                  onClick={savePalette}
                  disabled={!customName.trim()}
                  className="rounded-lg bg-emerald-500/80 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create from DNA */}
      {onCreateFromDNA && (
        <button
          onClick={onCreateFromDNA}
          className="mt-3 w-full rounded-xl border border-dashed border-white/20 py-2 text-xs text-white/50 hover:border-white/40 hover:text-white/70"
        >
          + Create from Sound DNA
        </button>
      )}
    </div>
  );
}

interface ConstraintSliderProps {
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

function ConstraintSlider({ label, min, max, value, onChange }: ConstraintSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">{label}</span>
        <span className="text-xs text-white/40">
          {value[0]} - {value[1]}
        </span>
      </div>
      <div className="mt-1 flex gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => onChange([parseInt(e.target.value), value[1]])}
          className="flex-1 accent-emerald-400"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => onChange([value[0], parseInt(e.target.value)])}
          className="flex-1 accent-emerald-400"
        />
      </div>
    </div>
  );
}
