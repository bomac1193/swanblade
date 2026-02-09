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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Shader Background */}
      <ShaderBackground
        colors={shaderColors}
        className="absolute inset-0"
      />

      {/* Color Panel - Top Left */}
      <div className="absolute top-4 left-4 z-10">
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
