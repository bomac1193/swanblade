"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { O8Identity, SonicPalette } from "@/lib/o8/types";
import { getO8Client, identityToPromptModifier } from "@/lib/o8/client";

interface O8IdentityPanelProps {
  onIdentityChange?: (identity: O8Identity | null, promptModifier: string) => void;
  className?: string;
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
    <div className="flex items-end gap-1 h-16">
      {bands.map((band) => (
        <div key={band.key} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full bg-brand-border relative" style={{ height: '48px' }}>
            <div
              className="absolute bottom-0 w-full bg-[#66023C] transition-all"
              style={{ height: `${band.value * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-brand-secondary uppercase">{band.label}</span>
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

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

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
    <div className={cn("border border-brand-border bg-brand-surface", className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-brand-bg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-brand-border bg-brand-bg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#66023C]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="text-label uppercase tracking-wider text-brand-secondary">∞8 Identity</p>
            {selectedIdentity ? (
              <p className="text-body-sm font-medium text-brand-text">
                {selectedIdentity.creator.name}
              </p>
            ) : (
              <p className="text-body-sm text-brand-secondary">No identity connected</p>
            )}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={cn("text-brand-secondary transition-transform", expanded && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-brand-border">
          {loading ? (
            <div className="p-4 text-center">
              <p className="text-body-sm text-brand-secondary">Connecting to Starforge...</p>
            </div>
          ) : error ? (
            <div className="p-4">
              <p className="text-body-sm text-status-error">{error}</p>
              <Button variant="secondary" size="sm" onClick={loadIdentities} className="mt-2">
                Retry
              </Button>
            </div>
          ) : identities.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-body-sm text-brand-secondary">No identities found</p>
              <p className="text-body-sm text-brand-secondary/60 mt-1">
                Create an identity in Starforge first
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {identities.map((identity) => (
                <div
                  key={identity.identity_id}
                  onClick={() => handleSelect(identity)}
                  className={cn(
                    "px-4 py-3 cursor-pointer border-b border-brand-border last:border-b-0 transition-colors",
                    selectedIdentity?.identity_id === identity.identity_id
                      ? "bg-[#66023C]/10"
                      : "hover:bg-brand-bg"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body-sm font-medium text-brand-text">
                        {identity.creator.name}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {identity.dna?.audio && (
                          <Badge className="text-[9px]">Audio DNA</Badge>
                        )}
                        {identity.genome && (
                          <Badge className="text-[9px]">Genome</Badge>
                        )}
                        <Badge className="text-[9px]">
                          {identity.creator.verification_level}
                        </Badge>
                      </div>
                    </div>
                    {selectedIdentity?.identity_id === identity.identity_id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" className="text-[#66023C]">
                        <path
                          d="M5 12l5 5L20 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
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
        <div className="border-t border-brand-border px-4 py-3">
          <p className="text-label uppercase tracking-wider text-brand-secondary mb-2">
            Sonic Palette
          </p>
          <SonicPaletteViz palette={selectedIdentity.dna.audio.sonic_palette} />

          {selectedIdentity.dna.audio.influence_genealogy && (
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge>{selectedIdentity.dna.audio.influence_genealogy.primary_genre}</Badge>
              {selectedIdentity.dna.audio.influence_genealogy.secondary_genres.slice(0, 2).map((g) => (
                <Badge key={g} className="bg-brand-bg">{g}</Badge>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear} className="flex-1">
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
