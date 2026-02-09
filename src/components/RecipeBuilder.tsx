"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ProceduralRecipe,
  RecipeCategory,
  RecipeLayer,
  AudioSource,
  VariationRule,
  SelectionRule,
  SequencingConfig,
  OutputConfig,
  RECIPE_PRESETS,
  createEmptyRecipe,
  createRecipeFromPreset,
  addLayer,
  addSource,
  addVariationRule,
  validateRecipe,
} from "@/lib/proceduralRecipe";
import { CompilerTarget } from "@/lib/recipeCompiler";
import { cn } from "@/lib/utils";

interface RecipeBuilderProps {
  initialRecipe?: ProceduralRecipe;
  onSave?: (recipe: ProceduralRecipe) => void;
  onCompile?: (recipe: ProceduralRecipe, target: CompilerTarget) => void;
  className?: string;
}

const CATEGORIES: { id: RecipeCategory; name: string; icon: string }[] = [
  { id: "footsteps", name: "Footsteps", icon: "👣" },
  { id: "ambience", name: "Ambience", icon: "🌲" },
  { id: "ui", name: "UI", icon: "🖱️" },
  { id: "weapon", name: "Weapon", icon: "⚔️" },
  { id: "impact", name: "Impact", icon: "💥" },
  { id: "voice", name: "Voice", icon: "🗣️" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "custom", name: "Custom", icon: "🔧" },
];

const SELECTION_MODES: { id: SelectionRule["type"]; name: string; description: string }[] = [
  { id: "random", name: "Random", description: "Pick randomly each time" },
  { id: "round_robin", name: "Round Robin", description: "Cycle through in order" },
  { id: "sequential", name: "Sequential", description: "Play in order, then stop" },
  { id: "shuffle", name: "Shuffle", description: "Random order, no repeats" },
  { id: "weighted", name: "Weighted", description: "Weighted random selection" },
];

const VARIATION_TYPES = [
  { id: "pitch_humanize", name: "Pitch Humanize", description: "Random pitch variation" },
  { id: "timing_humanize", name: "Timing Humanize", description: "Random timing offsets" },
  { id: "volume_humanize", name: "Volume Humanize", description: "Random volume variation" },
  { id: "parameter_drift", name: "Parameter Drift", description: "Slow parameter changes" },
  { id: "random_swap", name: "Random Swap", description: "Randomly swap sources" },
  { id: "crossfade_variation", name: "Crossfade", description: "Blend between sources" },
  { id: "granular_scatter", name: "Granular", description: "Granular synthesis scatter" },
];

const COMPILE_TARGETS: { id: CompilerTarget; name: string; description: string }[] = [
  { id: "wwise", name: "Wwise", description: "Audiokinetic Wwise project" },
  { id: "fmod", name: "FMOD", description: "FMOD Studio project" },
  { id: "unity", name: "Unity", description: "Unity ScriptableObject + Player" },
  { id: "unreal", name: "Unreal", description: "Unreal MetaSound + DataAsset" },
  { id: "pure_data", name: "Pure Data", description: "Pd patches" },
  { id: "web_audio", name: "Web Audio", description: "AudioWorklet + Player" },
];

export function RecipeBuilder({
  initialRecipe,
  onSave,
  onCompile,
  className,
}: RecipeBuilderProps) {
  const [recipe, setRecipe] = useState<ProceduralRecipe>(
    initialRecipe || createEmptyRecipe("New Recipe", "custom")
  );
  const [activeTab, setActiveTab] = useState<"layers" | "sources" | "variation" | "sequencing" | "output">("layers");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] }>({
    valid: true,
    errors: [],
    warnings: [],
  });
  const [showPresets, setShowPresets] = useState(!initialRecipe);
  const [compileTarget, setCompileTarget] = useState<CompilerTarget>("unity");
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // Validate on recipe change
  useEffect(() => {
    const result = validateRecipe(recipe);
    setValidation(result);
  }, [recipe]);

  // Update recipe field
  const updateRecipe = useCallback((updates: Partial<ProceduralRecipe>) => {
    setRecipe((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Load from preset
  const loadPreset = useCallback((index: number) => {
    const newRecipe = createRecipeFromPreset(index);
    setRecipe(newRecipe);
    setShowPresets(false);
  }, []);

  // Add new layer
  const handleAddLayer = useCallback(() => {
    const newLayer: Omit<RecipeLayer, "id"> = {
      name: `Layer ${recipe.layers.length + 1}`,
      sourceIds: [],
      role: "primary",
      selection: { type: "random" },
      processing: {},
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      conditions: [],
    };
    setRecipe(addLayer(recipe, newLayer));
  }, [recipe]);

  // Add new source
  const handleAddSource = useCallback(() => {
    const newSource: Omit<AudioSource, "id"> = {
      name: `Source ${recipe.sources.length + 1}`,
      type: "generated",
      generationPrompt: "",
      duration: 1.0,
      variationRange: {
        pitch: [-2, 2],
        speed: [0.9, 1.1],
        volume: [0.8, 1.0],
        filter: [200, 20000],
      },
    };
    setRecipe(addSource(recipe, newSource));
  }, [recipe]);

  // Add variation rule
  const handleAddVariationRule = useCallback(() => {
    const newRule: Omit<VariationRule, "id"> = {
      name: `Rule ${recipe.variationRules.length + 1}`,
      target: { scope: "global" },
      type: "pitch_humanize",
      config: { amount: 0.5, pitchRange: 50 },
      weight: 1.0,
    };
    setRecipe(addVariationRule(recipe, newRule));
  }, [recipe]);

  // Update layer
  const updateLayer = useCallback((layerId: string, updates: Partial<RecipeLayer>) => {
    setRecipe((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Delete layer
  const deleteLayer = useCallback((layerId: string) => {
    setRecipe((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update source
  const updateSource = useCallback((sourceId: string, updates: Partial<AudioSource>) => {
    setRecipe((prev) => ({
      ...prev,
      sources: prev.sources.map((s) =>
        s.id === sourceId ? { ...s, ...updates } : s
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Delete source
  const deleteSource = useCallback((sourceId: string) => {
    setRecipe((prev) => ({
      ...prev,
      sources: prev.sources.filter((s) => s.id !== sourceId),
      layers: prev.layers.map((l) => ({
        ...l,
        sourceIds: l.sourceIds.filter((id) => id !== sourceId),
      })),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Update variation rule
  const updateVariationRule = useCallback((ruleId: string, updates: Partial<VariationRule>) => {
    setRecipe((prev) => ({
      ...prev,
      variationRules: prev.variationRules.map((r) =>
        r.id === ruleId ? { ...r, ...updates } : r
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Delete variation rule
  const deleteVariationRule = useCallback((ruleId: string) => {
    setRecipe((prev) => ({
      ...prev,
      variationRules: prev.variationRules.filter((r) => r.id !== ruleId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Save recipe
  const handleSave = useCallback(async () => {
    if (!validation.valid) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", recipe }),
      });

      if (response.ok) {
        const data = await response.json();
        onSave?.(data.recipe);
      }
    } catch (err) {
      console.error("Failed to save recipe:", err);
    } finally {
      setIsSaving(false);
    }
  }, [recipe, validation.valid, onSave]);

  // Compile recipe
  const handleCompile = useCallback(async () => {
    if (!validation.valid) return;

    setIsCompiling(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compile", recipeId: recipe.id, target: compileTarget }),
      });

      if (response.ok) {
        const data = await response.json();
        onCompile?.(recipe, compileTarget);

        // Download compiled files
        const blob = new Blob([JSON.stringify(data.compiled, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${recipe.name.replace(/\s+/g, "_")}_${compileTarget}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to compile recipe:", err);
    } finally {
      setIsCompiling(false);
    }
  }, [recipe, validation.valid, compileTarget, onCompile]);

  // Preset selection screen
  if (showPresets) {
    return (
      <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Create Procedural Recipe</h3>
            <p className="text-sm text-muted-foreground">
              Start from a preset or create a blank recipe
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {RECIPE_PRESETS.map((preset, index) => (
            <button
              key={index}
              className="p-3 rounded-lg border text-left hover:border-primary/50 transition-colors"
              onClick={() => loadPreset(index)}
            >
              <div className="font-medium">{preset.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {preset.description}
              </div>
              <div className="flex gap-1 mt-2">
                {preset.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-muted text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-3">Or create a new recipe:</p>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className="p-2 rounded-lg border text-center hover:border-primary/50 transition-colors"
                onClick={() => {
                  setRecipe(createEmptyRecipe(`New ${cat.name}`, cat.id));
                  setShowPresets(false);
                }}
              >
                <div className="text-2xl">{cat.icon}</div>
                <div className="text-xs mt-1">{cat.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={recipe.name}
            onChange={(e) => updateRecipe({ name: e.target.value })}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 -ml-1"
          />
          <div className="flex items-center gap-2 mt-1">
            <select
              value={recipe.category}
              onChange={(e) => updateRecipe({ category: e.target.value as RecipeCategory })}
              className="text-xs bg-muted px-2 py-0.5 rounded border-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {recipe.layers.length} layers · {recipe.sources.length} sources
            </span>
          </div>
        </div>

        <button
          className="px-3 py-1 text-sm rounded-md border hover:bg-muted"
          onClick={() => setShowPresets(true)}
        >
          Presets
        </button>
      </div>

      {/* Description */}
      <textarea
        value={recipe.description}
        onChange={(e) => updateRecipe({ description: e.target.value })}
        placeholder="Recipe description..."
        className="w-full h-16 p-2 text-sm bg-muted/50 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["layers", "sources", "variation", "sequencing", "output"] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-3 py-2 text-sm capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Layers Tab */}
        {activeTab === "layers" && (
          <div className="space-y-3">
            {recipe.layers.map((layer) => (
              <LayerEditor
                key={layer.id}
                layer={layer}
                sources={recipe.sources}
                onUpdate={(updates) => updateLayer(layer.id, updates)}
                onDelete={() => deleteLayer(layer.id)}
              />
            ))}
            <button
              className="w-full p-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              onClick={handleAddLayer}
            >
              + Add Layer
            </button>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div className="space-y-3">
            {recipe.sources.map((source) => (
              <SourceEditor
                key={source.id}
                source={source}
                onUpdate={(updates) => updateSource(source.id, updates)}
                onDelete={() => deleteSource(source.id)}
              />
            ))}
            <button
              className="w-full p-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              onClick={handleAddSource}
            >
              + Add Source
            </button>
          </div>
        )}

        {/* Variation Tab */}
        {activeTab === "variation" && (
          <div className="space-y-3">
            {recipe.variationRules.map((rule) => (
              <VariationEditor
                key={rule.id}
                rule={rule}
                layers={recipe.layers}
                sources={recipe.sources}
                onUpdate={(updates) => updateVariationRule(rule.id, updates)}
                onDelete={() => deleteVariationRule(rule.id)}
              />
            ))}
            <button
              className="w-full p-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              onClick={handleAddVariationRule}
            >
              + Add Variation Rule
            </button>
          </div>
        )}

        {/* Sequencing Tab */}
        {activeTab === "sequencing" && (
          <SequencingEditor
            config={recipe.sequencing}
            onUpdate={(updates) => updateRecipe({ sequencing: { ...recipe.sequencing, ...updates } })}
          />
        )}

        {/* Output Tab */}
        {activeTab === "output" && (
          <OutputEditor
            config={recipe.output}
            onUpdate={(updates) => updateRecipe({ output: { ...recipe.output, ...updates } })}
          />
        )}
      </div>

      {/* Validation */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, i) => (
            <div key={i} className="p-2 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          ))}
          {validation.warnings.map((warning, i) => (
            <div key={i} className="p-2 bg-yellow-500/10 text-yellow-600 text-sm rounded-md">
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {recipe.tags.map((tag, i) => (
          <span
            key={i}
            className="px-2 py-1 bg-muted text-sm rounded-md flex items-center gap-1"
          >
            {tag}
            <button
              className="ml-1 text-muted-foreground hover:text-foreground"
              onClick={() =>
                updateRecipe({ tags: recipe.tags.filter((_, j) => j !== i) })
              }
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder="Add tag..."
          className="px-2 py-1 bg-transparent text-sm border rounded-md w-24"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value) {
              updateRecipe({ tags: [...recipe.tags, e.currentTarget.value] });
              e.currentTarget.value = "";
            }
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t pt-4">
        <button
          className={cn(
            "px-4 py-2 rounded-md bg-primary text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50"
          )}
          onClick={handleSave}
          disabled={!validation.valid || isSaving}
        >
          {isSaving ? "Saving..." : "Save Recipe"}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <select
            value={compileTarget}
            onChange={(e) => setCompileTarget(e.target.value as CompilerTarget)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
          >
            {COMPILE_TARGETS.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
          <button
            className={cn(
              "px-4 py-2 rounded-md border",
              "hover:bg-muted disabled:opacity-50"
            )}
            onClick={handleCompile}
            disabled={!validation.valid || isCompiling}
          >
            {isCompiling ? "Compiling..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Sub-components ====================

function LayerEditor({
  layer,
  sources,
  onUpdate,
  onDelete,
}: {
  layer: RecipeLayer;
  sources: AudioSource[];
  onUpdate: (updates: Partial<RecipeLayer>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "▼" : "▶"}
        </button>

        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
        />

        <select
          value={layer.role}
          onChange={(e) => onUpdate({ role: e.target.value as RecipeLayer["role"] })}
          className="text-xs bg-muted px-2 py-1 rounded"
        >
          <option value="primary">Primary</option>
          <option value="accent">Accent</option>
          <option value="texture">Texture</option>
          <option value="transition">Transition</option>
        </select>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layer.volume}
          onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
          className="w-20"
          title={`Volume: ${Math.round(layer.volume * 100)}%`}
        />

        <button
          className={cn(
            "px-2 py-1 text-xs rounded",
            layer.mute ? "bg-destructive text-destructive-foreground" : "bg-muted"
          )}
          onClick={() => onUpdate({ mute: !layer.mute })}
        >
          M
        </button>

        <button
          className={cn(
            "px-2 py-1 text-xs rounded",
            layer.solo ? "bg-yellow-500 text-black" : "bg-muted"
          )}
          onClick={() => onUpdate({ solo: !layer.solo })}
        >
          S
        </button>

        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Selection mode */}
          <div>
            <label className="text-xs text-muted-foreground">Selection Mode</label>
            <div className="grid grid-cols-5 gap-1 mt-1">
              {SELECTION_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={cn(
                    "p-1.5 text-xs rounded transition-colors",
                    layer.selection.type === mode.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => onUpdate({ selection: { type: mode.id } as SelectionRule })}
                  title={mode.description}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned sources */}
          <div>
            <label className="text-xs text-muted-foreground">Assigned Sources</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {sources.map((source) => (
                <button
                  key={source.id}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors",
                    layer.sourceIds.includes(source.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => {
                    const newIds = layer.sourceIds.includes(source.id)
                      ? layer.sourceIds.filter((id) => id !== source.id)
                      : [...layer.sourceIds, source.id];
                    onUpdate({ sourceIds: newIds });
                  }}
                >
                  {source.name}
                </button>
              ))}
              {sources.length === 0 && (
                <span className="text-xs text-muted-foreground">No sources available</span>
              )}
            </div>
          </div>

          {/* Processing */}
          <div>
            <label className="text-xs text-muted-foreground">Processing</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-xs">Pitch Shift</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={layer.processing.pitchShift?.min || 0}
                    onChange={(e) =>
                      onUpdate({
                        processing: {
                          ...layer.processing,
                          pitchShift: {
                            min: parseFloat(e.target.value),
                            max: layer.processing.pitchShift?.max || 0,
                            curve: "linear",
                          },
                        },
                      })
                    }
                    className="w-16 px-1 text-xs bg-muted rounded"
                    placeholder="min"
                  />
                  <input
                    type="number"
                    value={layer.processing.pitchShift?.max || 0}
                    onChange={(e) =>
                      onUpdate({
                        processing: {
                          ...layer.processing,
                          pitchShift: {
                            min: layer.processing.pitchShift?.min || 0,
                            max: parseFloat(e.target.value),
                            curve: "linear",
                          },
                        },
                      })
                    }
                    className="w-16 px-1 text-xs bg-muted rounded"
                    placeholder="max"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceEditor({
  source,
  onUpdate,
  onDelete,
}: {
  source: AudioSource;
  onUpdate: (updates: Partial<AudioSource>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={source.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
        />

        <select
          value={source.type}
          onChange={(e) => onUpdate({ type: e.target.value as AudioSource["type"] })}
          className="text-xs bg-muted px-2 py-1 rounded"
        >
          <option value="generated">Generated</option>
          <option value="sample">Sample</option>
          <option value="reference">Reference</option>
        </select>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{source.duration}s</span>
        </div>

        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          ×
        </button>
      </div>

      {source.type === "generated" && (
        <textarea
          value={source.generationPrompt || ""}
          onChange={(e) => onUpdate({ generationPrompt: e.target.value })}
          placeholder="Generation prompt..."
          className="w-full mt-2 p-2 text-xs bg-muted/50 rounded-md resize-none h-16"
        />
      )}

      {source.type === "sample" && (
        <input
          type="text"
          value={source.sampleUrl || ""}
          onChange={(e) => onUpdate({ sampleUrl: e.target.value })}
          placeholder="Sample URL or library ID..."
          className="w-full mt-2 p-2 text-xs bg-muted/50 rounded-md"
        />
      )}

      <div className="mt-2 flex gap-2">
        <input
          type="number"
          value={source.duration}
          onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) })}
          className="w-20 px-2 py-1 text-xs bg-muted rounded"
          step={0.1}
          min={0.1}
        />
        <span className="text-xs text-muted-foreground self-center">duration (s)</span>
      </div>
    </div>
  );
}

function VariationEditor({
  rule,
  layers,
  sources,
  onUpdate,
  onDelete,
}: {
  rule: VariationRule;
  layers: RecipeLayer[];
  sources: AudioSource[];
  onUpdate: (updates: Partial<VariationRule>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={rule.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
        />

        <select
          value={rule.type}
          onChange={(e) => onUpdate({ type: e.target.value as VariationRule["type"] })}
          className="text-xs bg-muted px-2 py-1 rounded"
        >
          {VARIATION_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          ×
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Target</label>
          <select
            value={rule.target.scope}
            onChange={(e) => {
              const scope = e.target.value as "global" | "layer" | "source";
              if (scope === "global") {
                onUpdate({ target: { scope } });
              } else if (scope === "layer" && layers[0]) {
                onUpdate({ target: { scope, layerId: layers[0].id } });
              } else if (scope === "source" && sources[0]) {
                onUpdate({ target: { scope, sourceId: sources[0].id } });
              }
            }}
            className="w-full mt-1 px-2 py-1 text-xs bg-muted rounded"
          >
            <option value="global">Global</option>
            <option value="layer">Layer</option>
            <option value="source">Source</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Amount</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={rule.config.amount}
            onChange={(e) =>
              onUpdate({ config: { ...rule.config, amount: parseFloat(e.target.value) } })
            }
            className="w-full mt-1"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Weight</label>
          <input
            type="number"
            value={rule.weight}
            onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) })}
            className="w-full mt-1 px-2 py-1 text-xs bg-muted rounded"
            min={0}
            max={2}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
}

function SequencingEditor({
  config,
  onUpdate,
}: {
  config: SequencingConfig;
  onUpdate: (updates: Partial<SequencingConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Sequencing Mode</label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {(["one_shot", "loop", "random_interval", "triggered", "continuous"] as const).map((mode) => (
            <button
              key={mode}
              className={cn(
                "p-2 rounded-md text-sm transition-colors capitalize",
                config.mode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
              onClick={() => onUpdate({ mode })}
            >
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.loopEnabled}
              onChange={(e) => onUpdate({ loopEnabled: e.target.checked })}
            />
            Loop Enabled
          </label>
        </div>

        <div>
          <label className="text-sm font-medium">Transition Type</label>
          <select
            value={config.transitionType}
            onChange={(e) => onUpdate({ transitionType: e.target.value as SequencingConfig["transitionType"] })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
          >
            <option value="cut">Cut</option>
            <option value="crossfade">Crossfade</option>
            <option value="beat_sync">Beat Sync</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Transition Duration (ms)</label>
          <input
            type="number"
            value={config.transitionDuration}
            onChange={(e) => onUpdate({ transitionDuration: parseInt(e.target.value) })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
            min={0}
            max={5000}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Quantize</label>
          <select
            value={config.quantize || "none"}
            onChange={(e) => onUpdate({ quantize: e.target.value as SequencingConfig["quantize"] })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
          >
            <option value="none">None</option>
            <option value="beat">Beat</option>
            <option value="bar">Bar</option>
            <option value="phrase">Phrase</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function OutputEditor({
  config,
  onUpdate,
}: {
  config: OutputConfig;
  onUpdate: (updates: Partial<OutputConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Format</label>
          <select
            value={config.format}
            onChange={(e) => onUpdate({ format: e.target.value as OutputConfig["format"] })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
          >
            <option value="wav">WAV</option>
            <option value="ogg">OGG</option>
            <option value="mp3">MP3</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Sample Rate</label>
          <select
            value={config.sampleRate}
            onChange={(e) => onUpdate({ sampleRate: parseInt(e.target.value) as OutputConfig["sampleRate"] })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
          >
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
            <option value={96000}>96 kHz</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Bit Depth</label>
          <select
            value={config.bitDepth}
            onChange={(e) => onUpdate({ bitDepth: parseInt(e.target.value) as OutputConfig["bitDepth"] })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
          >
            <option value={16}>16-bit</option>
            <option value={24}>24-bit</option>
            <option value={32}>32-bit float</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Channels</label>
          <select
            value={config.channels}
            onChange={(e) => onUpdate({ channels: parseInt(e.target.value) as OutputConfig["channels"] })}
            className="w-full mt-1 p-2 rounded-md border bg-background"
          >
            <option value={1}>Mono</option>
            <option value={2}>Stereo</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.normalize}
              onChange={(e) => onUpdate({ normalize: e.target.checked })}
            />
            Normalize
          </label>
          {config.normalize && (
            <div className="mt-2">
              <label className="text-xs text-muted-foreground">Target Loudness (LUFS)</label>
              <input
                type="number"
                value={config.targetLoudness || -18}
                onChange={(e) => onUpdate({ targetLoudness: parseFloat(e.target.value) })}
                className="w-full mt-1 p-2 rounded-md border bg-background"
                min={-30}
                max={0}
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.limiter}
              onChange={(e) => onUpdate({ limiter: e.target.checked })}
            />
            Limiter
          </label>
          {config.limiter && (
            <div className="mt-2">
              <label className="text-xs text-muted-foreground">Threshold (dB)</label>
              <input
                type="number"
                value={config.limiterThreshold || -1}
                onChange={(e) => onUpdate({ limiterThreshold: parseFloat(e.target.value) })}
                className="w-full mt-1 p-2 rounded-md border bg-background"
                min={-12}
                max={0}
                step={0.1}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Export Variation Count</label>
        <p className="text-xs text-muted-foreground">Generate multiple variations on export</p>
        <input
          type="number"
          value={config.exportVariationCount || 1}
          onChange={(e) => onUpdate({ exportVariationCount: parseInt(e.target.value) })}
          className="w-24 mt-1 p-2 rounded-md border bg-background"
          min={1}
          max={50}
        />
      </div>
    </div>
  );
}

export default RecipeBuilder;
