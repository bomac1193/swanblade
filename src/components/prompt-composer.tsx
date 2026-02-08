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
    <div className="border border-brand-border bg-brand-surface p-6">
      <p className="text-label uppercase tracking-wider text-brand-secondary">Prompt Composer</p>
      <Textarea
        rows={3}
        value={value}
        placeholder="Describe the sound you want to create..."
        onChange={(event) => onChange(event.target.value)}
        className="mt-3"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onChange(suggestion)}
            className="border border-brand-border px-4 py-2 text-label uppercase tracking-wider text-brand-secondary transition hover:border-brand-text hover:text-brand-text"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onSubmit} loading={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Sound"}
        </Button>
      </div>
    </div>
  );
}
