"use client";

import { type GameState, GAME_STATE_CONFIGS } from "@/lib/gameStateEngine";

interface GameStateSelectorProps {
  value: GameState | null;
  onChange: (state: GameState | null) => void;
  showDetails?: boolean;
}

const GAME_STATE_CATEGORIES = {
  Core: ["menu", "exploration", "ambient"] as GameState[],
  Action: ["combat", "boss", "chase", "stealth"] as GameState[],
  Narrative: ["cutscene", "victory", "defeat", "credits"] as GameState[],
  Special: ["tension"] as GameState[],
};

export function GameStateSelector({
  value,
  onChange,
  showDetails = true,
}: GameStateSelectorProps) {
  const selectedConfig = value ? GAME_STATE_CONFIGS[value] : null;

  return (
    <div className="border border-brand-border bg-brand-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-label uppercase tracking-wider text-brand-secondary">Game State</p>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="text-label uppercase tracking-wider text-brand-secondary hover:text-brand-text"
          >
            Clear
          </button>
        )}
      </div>

      {/* State Grid by Category */}
      <div className="mt-3 space-y-3">
        {Object.entries(GAME_STATE_CATEGORIES).map(([category, states]) => (
          <div key={category}>
            <p className="text-label uppercase tracking-wider text-brand-secondary/60">{category}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => onChange(value === state ? null : state)}
                  className={`px-3 py-1.5 text-label uppercase tracking-wider transition ${
                    value === state
                      ? "bg-brand-text text-brand-bg"
                      : "border border-brand-border text-brand-secondary hover:border-brand-text hover:text-brand-text"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected State Details */}
      {showDetails && selectedConfig && value && (
        <div className="mt-4 border border-brand-border bg-brand-bg p-3">
          <div>
            <p className="text-body-lg font-medium capitalize text-brand-text">{value}</p>
            <p className="text-body-sm text-brand-secondary">{selectedConfig.description}</p>
          </div>

          {/* Modifiers */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-body-sm">
            <ModifierBadge
              label="Energy"
              value={selectedConfig.modifiers.energyOffset}
              suffix="%"
            />
            <ModifierBadge
              label="Texture"
              value={selectedConfig.modifiers.textureOffset}
              suffix="%"
            />
            <ModifierBadge
              label="BPM"
              value={selectedConfig.modifiers.bpmOffset}
              suffix=""
            />
            <ModifierBadge
              label="Brightness"
              value={selectedConfig.modifiers.brightnessOffset}
              suffix="%"
            />
          </div>

          {/* Keywords */}
          <div className="mt-3 flex flex-wrap gap-1">
            {selectedConfig.promptKeywords.map((keyword) => (
              <span
                key={keyword}
                className="bg-brand-border px-2 py-0.5 text-label text-brand-text"
              >
                {keyword}
              </span>
            ))}
          </div>

          {/* Default Stems */}
          <div className="mt-3">
            <p className="text-label uppercase tracking-wider text-brand-secondary">
              Default Stems
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(selectedConfig.stemDefaults)
                .filter(([_, volume]) => volume > 0.1)
                .map(([stem, volume]) => (
                  <span
                    key={stem}
                    className="bg-brand-text px-2 py-0.5 text-label text-brand-bg"
                  >
                    {stem} ({Math.round(volume * 100)}%)
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModifierBadgeProps {
  label: string;
  value: number;
  suffix: string;
}

function ModifierBadge({ label, value, suffix }: ModifierBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex items-center justify-between bg-brand-surface px-2 py-1 border border-brand-border">
      <span className="text-brand-secondary">{label}</span>
      <span
        className={
          isPositive
            ? "text-brand-text font-medium"
            : isNegative
            ? "text-status-error"
            : "text-brand-secondary"
        }
      >
        {isPositive ? "+" : ""}
        {value}
        {suffix}
      </span>
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function GameStateBadge({
  state,
  onClick,
}: {
  state: GameState;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-brand-text px-2 py-0.5 text-label uppercase tracking-wider text-brand-bg hover:bg-brand-accent"
    >
      {state}
    </button>
  );
}
