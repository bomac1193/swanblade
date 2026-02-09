"use client";

import { useState } from "react";
import ShaderBackground from "@/components/ShaderBackground";
import ColorPanel from "@/components/ColorPanel";
import Frame2147241533 from "@/imports/Frame2147241533";

export default function Home() {
  const [shaderColors, setShaderColors] = useState<[string, string, string]>([
    "#0000ff",
    "#ff00ff",
    "#ffffff",
  ]);
  const [showColorPanel, setShowColorPanel] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Shader Background - Interactive */}
      <ShaderBackground
        colors={shaderColors}
        className="absolute inset-0"
        interactive={true}
      />

      {/* Color Panel Toggle Button */}
      <button
        onClick={() => setShowColorPanel(!showColorPanel)}
        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all group"
        title="Color Settings"
      >
        <div className="flex gap-0.5">
          {shaderColors.map((color, i) => (
            <div
              key={i}
              className="w-2 h-5 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </button>

      {/* Color Panel - Slides in */}
      <div
        className={`absolute top-4 left-4 z-10 transition-all duration-300 ease-out ${
          showColorPanel
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-4 pointer-events-none"
        }`}
      >
        <ColorPanel
          colors={shaderColors}
          onChange={setShaderColors}
        />
      </div>

      {/* Main UI Frame */}
      <Frame2147241533 />
    </div>
  );
}
