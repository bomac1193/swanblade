"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  suggestions: string[];
  isGenerating: boolean;
}

export function PromptComposer({ value, onChange, onSubmit, suggestions, isGenerating }: PromptComposerProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/50 p-6 backdrop-blur-3xl">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">Prompt Composer</p>
      <Textarea
        rows={3}
        value={value}
        placeholder="Describe the sound you want Audiogen to create…"
        onChange={(event) => onChange(event.target.value)}
        className="mt-3"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onChange(suggestion)}
            className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 transition hover:border-emerald-400/60 hover:text-white"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onSubmit} loading={isGenerating}>
          {isGenerating ? "Designing sound…" : "Generate Sound"}
        </Button>
      </div>
    </div>
  );
}
