"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface Frame2147241533Props {
  className?: string;
  children?: ReactNode;
}

/**
 * Main UI Frame overlay - Landing page structure
 * Figma-style component name for design system compatibility
 */
export function Frame2147241533({ className, children }: Frame2147241533Props) {
  return (
    <div
      className={`absolute inset-0 flex flex-col pointer-events-none ${className ?? ""}`}
    >
      {/* Top Navigation Bar */}
      <header className="pointer-events-auto">
        <div className="flex items-center justify-between px-8 py-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              className="text-white text-lg font-semibold tracking-tight font-display"
            >
              Swanblade
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            <Link
              href="/features"
              className="text-white/70 hover:text-white text-sm font-medium transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-white/70 hover:text-white text-sm font-medium transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-white/70 hover:text-white text-sm font-medium transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              About
            </Link>
            <Link
              href="/studio"
              className="bg-white text-black px-5 py-2 text-sm font-medium hover:bg-white/90 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Open Studio
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center max-w-3xl pointer-events-auto">
          {/* Headline */}
          <h1
            className="text-6xl md:text-7xl font-bold text-white leading-tight mb-6 font-display"
          >
            Burn The Square
          </h1>

          {/* Subheadline */}
          <p
            className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Create game-ready audio with AI. Generate variations, transform
            sounds, and export directly to Unity, Unreal, Wwise, or FMOD.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/studio"
              className="group bg-white text-black px-8 py-4 text-lg font-semibold hover:bg-white/90 transition flex items-center gap-3"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Start Creating
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="group-hover:translate-x-1 transition-transform"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/features"
              className="border border-white/30 text-white px-8 py-4 text-lg font-semibold hover:bg-white/10 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Optional children */}
        {children}
      </main>

      {/* Bottom Feature Pills */}
      <footer className="pointer-events-auto px-8 pb-8">
        <div className="flex items-center justify-center gap-6">
          {[
            { icon: "waveform", label: "Sound DNA" },
            { icon: "layers", label: "Stem Export" },
            { icon: "game", label: "Game Engine Ready" },
            { icon: "collab", label: "Real-time Collab" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              {feature.icon === "waveform" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/60">
                  <path d="M2 12h2l2-8 3 16 3-8 2 4 2-4 3 8 3-16 2 8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {feature.icon === "layers" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/60">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {feature.icon === "game" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/60">
                  <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
              {feature.icon === "collab" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/60">
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="19" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M23 21v-1.5a2.5 2.5 0 00-2.5-2.5h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              <span className="text-white/70 text-sm font-medium">
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default Frame2147241533;
