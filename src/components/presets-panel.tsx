"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GenerationPreset } from "@/hooks/usePresets";

interface PresetsPanelProps {
  presets: GenerationPreset[];
  onSelect: (preset: GenerationPreset) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function PresetsPanel({
  presets,
  onSelect,
  onSave,
  onDelete,
  className,
}: PresetsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const handleSave = () => {
    if (!newPresetName.trim()) return;
    onSave(newPresetName.trim());
    setNewPresetName("");
    setShowSaveDialog(false);
  };

  return (
    <div className={cn("border border-brand-border/30/30", className)}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-brand-bg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#66023C]">
            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div>
            <p className="text-body-sm text-brand-secondary">Presets</p>
            <p className="text-body-sm text-brand-text">{presets.length} saved</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSaveDialog(true);
              setExpanded(true);
            }}
            className="px-2 py-1 text-body-sm border border-brand-border/30 hover:border-[#66023C] hover:text-[#66023C] transition-colors"
          >
            + Save
          </button>
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
      </div>

      {expanded && (
        <div className="border-t border-brand-border/30">
          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="p-4 bg-brand-bg border-b border-brand-border/30">
              <p className="text-body-sm text-brand-secondary mb-2">
                Save Current Settings
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Preset name..."
                  className="flex-1 px-3 py-2 border border-brand-border/30 bg-brand-surface text-body text-brand-text placeholder:text-brand-secondary focus:outline-none focus:border-brand-text"
                  autoFocus
                />
                <Button
                  onClick={handleSave}
                  disabled={!newPresetName.trim()}
                  className="bg-[#66023C] hover:bg-[#520230] text-white border-0"
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewPresetName("");
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Presets List */}
          {presets.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-body-sm text-brand-secondary">No presets saved yet</p>
              <p className="text-body-sm text-brand-secondary/60 mt-1">
                Configure your settings and save them as a preset
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="px-4 py-3 border-b border-brand-border/30 last:border-b-0 hover:bg-brand-bg transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onSelect(preset)}
                      className="flex-1 text-left"
                    >
                      <p className="text-body-sm font-medium text-brand-text">
                        {preset.name}
                      </p>
                      <p className="text-body-sm text-brand-secondary truncate">
                        {preset.prompt.slice(0, 40)}...
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-bg border border-brand-border/30 text-brand-secondary">
                          {preset.lengthSeconds}s
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-bg border border-brand-border/30 text-brand-secondary">
                          {preset.provider}
                        </span>
                        {preset.gameState && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#66023C]/10 border border-[#66023C]/20 text-[#66023C]">
                            {preset.gameState}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => onDelete(preset.id)}
                      className="p-1.5 text-brand-secondary hover:text-status-error opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete preset"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
