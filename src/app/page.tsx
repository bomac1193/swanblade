"use client";

import { useState, useCallback } from "react";
import ShaderBackground from "@/components/ShaderBackground";
import ColorPanel from "@/components/ColorPanel";
import Frame2147241533 from "@/imports/Frame2147241533";

const COLOR_PRESETS: [string, string, string] = ["#0000ff", "#ff00ff", "#ffffff"];
const BW_COLORS: [string, string, string] = ["#000000", "#333333", "#ffffff"];

export default function Home() {
  const [shaderColors, setShaderColors] = useState<[string, string, string]>(COLOR_PRESETS);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState(false);

  const toggleMonochrome = useCallback(() => {
    setIsMonochrome((prev) => {
      const newValue = !prev;
      setShaderColors(newValue ? BW_COLORS : COLOR_PRESETS);
      return newValue;
    });
  }, []);

  const handleColorChange = useCallback((colors: [string, string, string]) => {
    setShaderColors(colors);
    setIsMonochrome(false);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Shader Background - Interactive */}
      <ShaderBackground
        colors={shaderColors}
        className="absolute inset-0"
        interactive={true}
      />

      {/* Control Buttons - Top Left */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Color Panel Toggle */}
        <button
          onClick={() => setShowColorPanel(!showColorPanel)}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all group"
          title="Color Settings"
        >
          <div className="flex gap-0.5">
            {shaderColors.map((color, i) => (
              <div
                key={i}
                className="w-2 h-5"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </button>

        {/* B&W Toggle */}
        <button
          onClick={toggleMonochrome}
          className={`w-10 h-10 backdrop-blur-sm border flex items-center justify-center transition-all ${
            isMonochrome
              ? "bg-white/20 border-white/40"
              : "bg-black/50 border-white/20 hover:bg-black/70"
          }`}
          title={isMonochrome ? "Switch to Color" : "Switch to Black & White"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            {isMonochrome ? (
              // Color icon
              <>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2a10 10 0 000 20" fill="currentColor" fillOpacity="0.3" />
              </>
            ) : (
              // B&W icon
              <>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2v20" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2a10 10 0 000 20" fill="currentColor" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Color Panel - Slides in */}
      <div
        className={`absolute top-16 left-4 z-10 transition-all duration-300 ease-out ${
          showColorPanel
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <ColorPanel
          colors={shaderColors}
          onChange={handleColorChange}
        />
      </div>

      {/* Main UI Frame */}
      <Frame2147241533 />
    </div>
  );
}
