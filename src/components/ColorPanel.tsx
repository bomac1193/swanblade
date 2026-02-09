"use client";

import { useState, useCallback, useEffect } from "react";

interface ColorPanelProps {
  colors: [string, string, string];
  onChange: (colors: [string, string, string]) => void;
  className?: string;
}

interface HSB {
  h: number; // 0-360
  s: number; // 0-100
  b: number; // 0-100
}

function hexToHsb(hex: string): HSB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, b: 0 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const brightness = max * 100;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return { h: Math.round(h), s: Math.round(s), b: Math.round(brightness) };
}

function hsbToHex(hsb: HSB): string {
  const h = hsb.h / 360;
  const s = hsb.s / 100;
  const v = hsb.b / 100;

  let r = 0, g = 0, b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const COLOR_LABELS = ["Primary", "Secondary", "Accent"];

export function ColorPanel({ colors, onChange, className }: ColorPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hsbValues, setHsbValues] = useState<HSB[]>(() =>
    colors.map((c) => hexToHsb(c))
  );
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setHsbValues(colors.map((c) => hexToHsb(c)));
  }, [colors]);

  const updateColor = useCallback(
    (index: number, hsb: HSB) => {
      const newHsbValues = [...hsbValues];
      newHsbValues[index] = hsb;
      setHsbValues(newHsbValues);

      const newColors = newHsbValues.map((h) => hsbToHex(h)) as [string, string, string];
      onChange(newColors);
    },
    [hsbValues, onChange]
  );

  const handleSliderChange = (
    index: number,
    property: keyof HSB,
    value: number
  ) => {
    const newHsb = { ...hsbValues[index], [property]: value };
    updateColor(index, newHsb);
  };

  return (
    <div
      className={`bg-black/80 backdrop-blur-md rounded-lg border border-white/10 ${className ?? ""}`}
      style={{ width: 280 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-white/90 hover:text-white"
      >
        <span className="text-sm font-medium tracking-wide">Colors</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Color Swatches */}
          <div className="flex gap-2 mb-4">
            {colors.map((color, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative flex-1 h-12 rounded transition-all ${
                  activeIndex === i
                    ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                    : "hover:ring-1 hover:ring-white/50"
                }`}
                style={{ backgroundColor: color }}
                title={COLOR_LABELS[i]}
              >
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/70 font-medium uppercase tracking-wider drop-shadow-lg">
                  {COLOR_LABELS[i][0]}
                </span>
              </button>
            ))}
          </div>

          {/* Active Color Controls */}
          <div className="space-y-3">
            <p className="text-xs text-white/50 uppercase tracking-wider">
              {COLOR_LABELS[activeIndex]}
            </p>

            {/* Hue */}
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Hue</span>
                <span>{hsbValues[activeIndex].h}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={hsbValues[activeIndex].h}
                onChange={(e) =>
                  handleSliderChange(activeIndex, "h", Number(e.target.value))
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,
                    hsl(0, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(360, 100%, 50%))`,
                }}
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Saturation</span>
                <span>{hsbValues[activeIndex].s}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={hsbValues[activeIndex].s}
                onChange={(e) =>
                  handleSliderChange(activeIndex, "s", Number(e.target.value))
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,
                    hsl(${hsbValues[activeIndex].h}, 0%, ${hsbValues[activeIndex].b / 2}%),
                    hsl(${hsbValues[activeIndex].h}, 100%, 50%))`,
                }}
              />
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Brightness</span>
                <span>{hsbValues[activeIndex].b}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={hsbValues[activeIndex].b}
                onChange={(e) =>
                  handleSliderChange(activeIndex, "b", Number(e.target.value))
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-black to-white"
              />
            </div>

            {/* Hex Input */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border border-white/20"
                  style={{ backgroundColor: colors[activeIndex] }}
                />
                <input
                  type="text"
                  value={colors[activeIndex].toUpperCase()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      const newColors = [...colors] as [string, string, string];
                      newColors[activeIndex] = val;
                      onChange(newColors);
                    }
                  }}
                  className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2">
              Presets
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                ["#0000ff", "#ff00ff", "#ffffff"],
                ["#ff6b6b", "#ffd93d", "#6bcb77"],
                ["#1a1a2e", "#16213e", "#0f3460"],
                ["#00d2d3", "#ff9f43", "#ee5253"],
              ].map((preset, i) => (
                <button
                  key={i}
                  onClick={() =>
                    onChange(preset as [string, string, string])
                  }
                  className="h-8 rounded border border-white/20 overflow-hidden hover:border-white/50 transition"
                >
                  <div className="flex h-full">
                    {preset.map((c, j) => (
                      <div
                        key={j}
                        className="flex-1"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPanel;
