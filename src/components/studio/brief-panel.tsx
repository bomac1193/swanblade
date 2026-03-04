"use client";

type BriefMode = "sound" | "song" | "stem" | "catalog" | "album";

const BRIEF_MODES: { id: BriefMode; label: string; description: string }[] = [
  { id: "sound", label: "Sound", description: "Single sound effect, texture, or loop" },
  { id: "song", label: "Song", description: "Full composition with structure" },
  { id: "stem", label: "Stem", description: "Individual layer — drums, bass, vocals, etc." },
  { id: "catalog", label: "Catalog", description: "Batch of related sounds with shared DNA" },
  { id: "album", label: "Album", description: "Cohesive multi-track collection" },
];

const BRIEF_PLACEHOLDERS: Record<BriefMode, string> = {
  sound: "Describe the sound you need...",
  song: "Describe the mood, genre, and energy of the track...",
  stem: "Describe the layer — instrument, feel, role in the mix...",
  catalog: "Describe the family of sounds — shared texture, purpose, aesthetic...",
  album: "Describe the world — narrative arc, sonic palette, track flow...",
};

const BRIEF_SUGGESTIONS: Record<BriefMode, string[]> = {
  sound: [
    "Glitchy UI clicks in a neon-lit cybercafe",
    "Afrobeats percussion with metallic hits",
    "Deep dubstep bass stab with reverb tail",
    "Ambient rain with distant traffic",
  ],
  song: [
    "Afrobeats x UK garage crossover, 128 BPM, euphoric",
    "Lo-fi jazz ballad with tape hiss and soft Rhodes",
    "Dark minimal techno, hypnotic, 4 AM warehouse",
    "Neo-soul with live drums and warm synth pads",
  ],
  stem: [
    "808 sub bass pattern, trap feel, D minor",
    "Chopped vocal chops, pitched and glitchy",
    "Acoustic guitar loop, fingerpicked, melancholic",
    "Hi-hat pattern, bouncy triplets, crisp",
  ],
  catalog: [
    "10 cinematic risers for sci-fi trailers",
    "UI sound kit — clicks, hovers, confirms, errors",
    "Organic foley textures from a Lagos market",
    "Modular synth stabs, all in the same harmonic family",
  ],
  album: [
    "6-track ambient EP inspired by West African coastline",
    "Electronic producer album — each track a different city",
    "Instrumental beats tape, dusty samples, warm",
    "Soundtrack for a film set in near-future Nairobi",
  ],
};

export type { BriefMode };

export function BriefPanel({
  briefMode,
  onBriefModeChange,
  prompt,
  onPromptChange,
  disabled,
}: {
  briefMode: BriefMode;
  onBriefModeChange: (mode: BriefMode) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.06] p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400">Brief</p>
        <p className="text-body-sm font-light text-gray-600">
          {BRIEF_MODES.find((m) => m.id === briefMode)?.description}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {BRIEF_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onBriefModeChange(m.id)}
            className={`px-3 py-1.5 text-body-sm font-light border transition-all duration-200 ${
              briefMode === m.id
                ? "border-white text-white"
                : "border-white/[0.06] text-gray-500 hover:text-white hover:border-white/[0.12]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <textarea
        className="w-full bg-black border-0 border-b border-white/[0.06] px-3 py-3 text-white font-light placeholder:text-gray-600 focus:outline-none focus:border-white/[0.12] transition-colors mt-3 resize-none"
        rows={3}
        placeholder={BRIEF_PLACEHOLDERS[briefMode]}
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        disabled={disabled}
      />

      {/* Suggestions */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {BRIEF_SUGGESTIONS[briefMode].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPromptChange(suggestion)}
            className="px-2.5 py-1 text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
