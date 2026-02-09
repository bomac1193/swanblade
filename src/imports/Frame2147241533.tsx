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
          <span className="text-white text-lg font-display tracking-wide">
            Swanblade
          </span>
          <nav className="flex items-center gap-10">
            <Link
              href="/features"
              className="text-white/40 hover:text-white text-xs uppercase tracking-widest transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-white/40 hover:text-white text-xs uppercase tracking-widest transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-white/40 hover:text-white text-xs uppercase tracking-widest transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              About
            </Link>
            <Link
              href="/studio"
              className="border border-white/30 text-white px-5 py-2 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Enter
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center max-w-2xl pointer-events-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-8"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            For Professional Sound Designers
          </p>
          <h1 className="text-5xl md:text-6xl text-white leading-tight mb-8 font-display">
            Burn The Square
          </h1>
          <p
            className="text-white/50 mb-12 max-w-md mx-auto"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            The instrument for those who refuse to compromise on audio.
          </p>
          <Link
            href="/studio"
            className="inline-block border border-white/30 text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Request Access
          </Link>
        </div>
        {children}
      </main>

      {/* Footer */}
      <footer className="pointer-events-auto px-8 py-6">
        <p
          className="text-center text-xs text-white/20 uppercase tracking-widest"
          style={{ fontFamily: "Sohne, sans-serif" }}
        >
          By invitation & application
        </p>
      </footer>
    </div>
  );
}

export default Frame2147241533;
