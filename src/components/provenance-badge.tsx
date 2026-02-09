"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { O8Provenance, O8ProvenanceResult } from "@/lib/o8/types";

interface ProvenanceBadgeProps {
  provenance?: O8Provenance | null;
  provenanceResult?: O8ProvenanceResult | null;
  className?: string;
}

export function ProvenanceBadge({ provenance, provenanceResult, className }: ProvenanceBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!provenance && !provenanceResult) {
    return (
      <div className={cn("flex items-center gap-2 text-brand-secondary", className)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        </svg>
        <span className="text-body-sm">No provenance</span>
      </div>
    );
  }

  return (
    <div className={cn("border border-brand-border/30 bg-brand-surface", className)}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-brand-bg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" className="text-[#66023C]">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-body-sm text-brand-text">∞8 Verified</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={cn("text-brand-secondary transition-transform ml-auto", expanded && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-brand-border/30 px-3 py-2 space-y-2">
          {provenance && (
            <>
              <div className="flex justify-between text-body-sm">
                <span className="text-brand-secondary">Identity</span>
                <span className="text-brand-text font-mono text-[11px]">
                  {provenance.identity_id.slice(0, 12)}...
                </span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-brand-secondary">Fingerprint</span>
                <span className="text-brand-text font-mono text-[11px]">
                  {provenance.fingerprint.slice(0, 16)}...
                </span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-brand-secondary">Timestamp</span>
                <span className="text-brand-text">
                  {new Date(provenance.timestamp).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {provenanceResult && (
            <>
              <div className="flex justify-between text-body-sm">
                <span className="text-brand-secondary">IPFS CID</span>
                <a
                  href={provenanceResult.gateway_urls.declaration}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#66023C] hover:underline font-mono text-[11px]"
                >
                  {provenanceResult.declaration_cid.slice(0, 12)}...
                </a>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-brand-secondary">C2PA Manifest</span>
                <a
                  href={provenanceResult.gateway_urls.manifest}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#66023C] hover:underline font-mono text-[11px]"
                >
                  View
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ProvenanceStampProps {
  identityId: string;
  prompt: string;
  audioFingerprint: string;
  parameters: Record<string, unknown>;
  provider: string;
  onStamped?: (result: O8ProvenanceResult) => void;
}

export function ProvenanceStampButton({
  identityId,
  prompt,
  audioFingerprint,
  parameters,
  provider,
  onStamped,
}: ProvenanceStampProps) {
  const [stamping, setStamping] = useState(false);
  const [stamped, setStamped] = useState(false);

  const handleStamp = async () => {
    setStamping(true);
    try {
      const { getO8Client } = await import("@/lib/o8/client");
      const client = getO8Client();
      const result = await client.stampAudio(identityId, {
        prompt,
        audioFingerprint,
        parameters,
        provider,
      });

      if (result) {
        setStamped(true);
        onStamped?.(result);
      }
    } catch (error) {
      console.error("Failed to stamp:", error);
    } finally {
      setStamping(false);
    }
  };

  if (stamped) {
    return (
      <div className="flex items-center gap-2 text-[#66023C]">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-body-sm">Stamped</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleStamp}
      disabled={stamping}
      className="flex items-center gap-2 px-3 py-1.5 border border-brand-border/30 hover:border-[#66023C] text-brand-secondary hover:text-[#66023C] transition-colors disabled:opacity-50"
    >
      {stamping ? (
        <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="40 20" fill="none" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
      <span className="text-body-sm">Stamp with ∞8</span>
    </button>
  );
}
