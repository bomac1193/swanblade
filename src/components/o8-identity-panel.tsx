"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { O8Identity, SonicPalette } from "@/lib/o8/types";
import { getO8Client, identityToPromptModifier } from "@/lib/o8/client";

interface O8IdentityPanelProps {
  onIdentityChange?: (identity: O8Identity | null, promptModifier: string) => void;
  className?: string;
}

// Skeleton loader component
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/[0.04]",
        className
      )}
    />
  );
}

// Identity skeleton for loading state
function IdentitySkeleton() {
  return (
    <div className="px-6 py-3.5 border-b border-white/[0.04] last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sonic palette visualizer
function SonicPaletteViz({ palette }: { palette: SonicPalette }) {
  const bands = [
    { key: 'sub_bass', label: 'Sub', value: palette.sub_bass },
    { key: 'bass', label: 'Bass', value: palette.bass },
    { key: 'low_mid', label: 'Low', value: palette.low_mid },
    { key: 'mid', label: 'Mid', value: palette.mid },
    { key: 'high_mid', label: 'High', value: palette.high_mid },
    { key: 'presence', label: 'Pres', value: palette.presence },
    { key: 'brilliance', label: 'Air', value: palette.brilliance },
  ];

  return (
    <div className="flex items-end gap-1.5 h-16">
      {bands.map((band) => (
        <div key={band.key} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full bg-white/[0.04] relative" style={{ height: '48px' }}>
            <div
              className="absolute bottom-0 w-full transition-all"
              style={{
                height: `${band.value * 100}%`,
                background: `linear-gradient(to top, #66023C, #66023C99)`,
              }}
            />
          </div>
          <span className="text-[9px] font-light text-gray-600 tracking-wider">{band.label}</span>
        </div>
      ))}
    </div>
  );
}

export function O8IdentityPanel({ onIdentityChange, className }: O8IdentityPanelProps) {
  const [identities, setIdentities] = useState<O8Identity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<O8Identity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load identities from Starforge
  const loadIdentities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getO8Client();
      const list = await client.listIdentities();
      setIdentities(list);
    } catch (err) {
      setError("Failed to connect to Starforge");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch when user expands the panel
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (expanded && !hasLoaded) {
      setHasLoaded(true);
      loadIdentities();
    }
  }, [expanded, hasLoaded, loadIdentities]);

  // Handle identity selection
  const handleSelect = (identity: O8Identity) => {
    setSelectedIdentity(identity);
    const modifier = identityToPromptModifier(identity);
    onIdentityChange?.(identity, modifier);
    setExpanded(false);
  };

  const handleClear = () => {
    setSelectedIdentity(null);
    onIdentityChange?.(null, "");
  };

  return (
    <div className={cn("group/panel", className)}>
      {/* Header */}
      <div
        className="relative flex items-center justify-between px-6 py-4 cursor-pointer transition-colors duration-300"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`absolute top-0 left-0 right-0 h-px transition-opacity duration-300 opacity-0 group-hover/panel:opacity-100`} style={{ background: "linear-gradient(90deg, transparent, rgba(102,2,60,0.3), transparent)" }} />
        <div className="flex items-center gap-4">
          <div className="relative w-9 h-9 border border-white/[0.06] bg-black flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#66023C" strokeWidth="1" opacity="0.4" />
              <circle cx="12" cy="12" r="5" stroke="#66023C" strokeWidth="1" />
              <circle cx="12" cy="12" r="2" fill="#66023C" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-light text-white tracking-wide" style={{ fontFamily: "var(--font-canela), Georgia, serif" }}>
              ∞8 Identity
            </p>
            {selectedIdentity ? (
              <p className="text-body-sm font-light text-[#66023C] mt-0.5">
                {selectedIdentity.creator.name}
              </p>
            ) : (
              <p className="text-body-sm font-light text-gray-600 mt-0.5">Not connected</p>
            )}
          </div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={cn("text-gray-600 transition-transform duration-300", expanded && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-white/[0.06]">
          {loading ? (
            <div className="max-h-64 overflow-y-auto">
              <IdentitySkeleton />
              <IdentitySkeleton />
              <IdentitySkeleton />
            </div>
          ) : error ? (
            <div className="px-6 py-5">
              <p className="text-body-sm font-light text-red-400/80">Connection Failed</p>
              <p className="text-body-sm font-light text-gray-600 mt-1">
                {error === "Failed to connect to Starforge"
                  ? "Starforge is not responding."
                  : error}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={loadIdentities}
                  className="text-body-sm font-light text-white hover:text-gray-300 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-body-sm font-light text-gray-600 hover:text-white transition-colors"
                >
                  Work Offline
                </button>
              </div>
            </div>
          ) : identities.length === 0 ? (
            <div className="px-6 py-5">
              <p className="text-body-sm font-light text-gray-500">
                Create a Sonic Identity in Starforge to personalize generation.
              </p>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-body-sm font-light text-[#66023C] hover:text-[#8a0350] transition-colors"
              >
                Open Starforge
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {identities.map((identity) => (
                <div
                  key={identity.identity_id}
                  onClick={() => handleSelect(identity)}
                  className={cn(
                    "px-6 py-3.5 cursor-pointer border-b border-white/[0.04] last:border-b-0 transition-colors duration-200",
                    selectedIdentity?.identity_id === identity.identity_id
                      ? "bg-[#66023C]/8"
                      : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-light text-white">
                        {identity.creator.name}
                      </p>
                      <div className="flex gap-2 mt-1.5">
                        {identity.dna?.audio && (
                          <span className="text-[9px] font-light text-gray-600 tracking-wider uppercase">Audio DNA</span>
                        )}
                        {identity.genome && (
                          <span className="text-[9px] font-light text-gray-600 tracking-wider uppercase">Genome</span>
                        )}
                        <span className="text-[9px] font-light text-gray-600 tracking-wider uppercase">
                          {identity.creator.verification_level}
                        </span>
                      </div>
                    </div>
                    {selectedIdentity?.identity_id === identity.identity_id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#66023C]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Identity Details */}
      {selectedIdentity && !expanded && selectedIdentity.dna?.audio && (
        <div className="border-t border-white/[0.06] px-6 py-4">
          <p className="text-[10px] font-light text-gray-600 tracking-widest uppercase mb-3">
            Sonic Palette
          </p>
          <SonicPaletteViz palette={selectedIdentity.dna.audio.sonic_palette} />

          {selectedIdentity.dna.audio.influence_genealogy && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-body-sm font-light text-[#66023C]">
                {selectedIdentity.dna.audio.influence_genealogy.primary_genre}
              </span>
              {selectedIdentity.dna.audio.influence_genealogy.secondary_genres.slice(0, 2).map((g) => (
                <span key={g} className="text-body-sm font-light text-gray-600">
                  {g}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleClear}
            className="mt-4 text-body-sm font-light text-gray-600 hover:text-white transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
