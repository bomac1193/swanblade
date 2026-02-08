"use client";

import { type GameState, GAME_STATE_CONFIGS } from "@/lib/gameStateEngine";

interface GameStateSelectorProps {
  value: GameState | null;
  onChange: (state: GameState | null) => void;
  showDetails?: boolean;
}

const GAME_STATE_ICONS: Record<GameState, string> = {
  menu: "🎮",
  exploration: "🗺️",
  combat: "⚔️",
  boss: "👹",
  victory: "🏆",
  defeat: "💀",
  stealth: "🥷",
  ambient: "🌙",
  tension: "😰",
  chase: "🏃",
  cutscene: "🎬",
  credits: "📜",
};

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
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Game State</p>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        )}
      </div>

      {/* State Grid by Category */}
      <div className="mt-3 space-y-3">
        {Object.entries(GAME_STATE_CATEGORIES).map(([category, states]) => (
          <div key={category}>
            <p className="text-[10px] uppercase tracking-wider text-white/30">{category}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => onChange(value === state ? null : state)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    value === state
                      ? "bg-emerald-500/80 text-white"
                      : "border border-white/15 text-white/60 hover:border-emerald-400/40 hover:text-white"
                  }`}
                >
                  <span>{GAME_STATE_ICONS[state]}</span>
                  <span className="capitalize">{state}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected State Details */}
      {showDetails && selectedConfig && value && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{GAME_STATE_ICONS[value]}</span>
            <div>
              <p className="text-sm font-medium capitalize text-white">{value}</p>
              <p className="text-xs text-white/50">{selectedConfig.description}</p>
            </div>
          </div>

          {/* Modifiers */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
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
                className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70"
              >
                {keyword}
              </span>
            ))}
          </div>

          {/* Default Stems */}
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Default Stems
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(selectedConfig.stemDefaults)
                .filter(([_, volume]) => volume > 0.1)
                .map(([stem, volume]) => (
                  <span
                    key={stem}
                    className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300"
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
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1">
      <span className="text-white/50">{label}</span>
      <span
        className={
          isPositive
            ? "text-emerald-400"
            : isNegative
            ? "text-red-400"
            : "text-white/50"
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
      className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300 hover:bg-emerald-500/30"
    >
      <span>{GAME_STATE_ICONS[state]}</span>
      <span className="capitalize">{state}</span>
    </button>
  );
}
