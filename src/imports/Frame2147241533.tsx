"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface Frame2147241533Props {
  className?: string;
  children?: ReactNode;
}

export function Frame2147241533({ className, children }: Frame2147241533Props) {
  return (
    <div
      className={`absolute inset-0 flex flex-col pointer-events-none ${className ?? ""}`}
    >
      {/* Top Navigation */}
      <header className="pointer-events-auto">
        <div className="flex items-center justify-between px-8 py-6">
          <span className="text-white text-lg font-display">
            Swanblade
          </span>
          <nav className="flex items-center gap-8">
            <Link
              href="/features"
              className="text-white/50 hover:text-white text-sm transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-white/50 hover:text-white text-sm transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-white/50 hover:text-white text-sm transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              About
            </Link>
            <Link
              href="/studio"
              className="bg-white text-black px-4 py-2 text-sm hover:bg-white/90 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Studio
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center max-w-2xl pointer-events-auto">
          <h1 className="text-6xl md:text-7xl text-white leading-tight mb-6 font-display">
            Burn The Square
          </h1>
          <p
            className="text-lg text-white/60 mb-10"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Sound design tools for games.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-3 bg-white text-black px-6 py-3 text-sm hover:bg-white/90 transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Open Studio
            <svg
              width="16"
              height="16"
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
        </div>
        {children}
      </main>

      {/* Empty footer for balance */}
      <footer className="h-16" />
    </div>
  );
}

export default Frame2147241533;
