/**
 * Adaptive Audio Engine
 *
 * Real-time adaptive audio system for games:
 * - State machine for audio states (combat, exploration, stealth)
 * - Parameter mapping from game values to audio parameters
 * - Web Audio preview and playback
 * - Export to game engine formats
 */

import { AudioStateMachine, StateGraph, AudioState, createEmptyGraph, PRESET_GRAPHS } from "./stateGraph";
import { ParameterMapper, ParameterMapping, PRESET_MAPPINGS, createMappingFromPreset } from "./parameterMapper";

// Re-export types
export * from "./stateGraph";
export * from "./parameterMapper";

// ==================== Main Engine ====================

export interface AdaptiveAudioConfig {
  graph?: StateGraph;
  mappings?: ParameterMapping[];
  updateRate?: number; // ms between updates
  audioContext?: AudioContext;
}

export interface AudioLayer {
  id: string;
  name: string;
  audioBuffer?: AudioBuffer;
  audioUrl?: string;
  sourceNode?: AudioBufferSourceNode;
  gainNode?: GainNode;
  panNode?: StereoPannerNode;
  isPlaying: boolean;
  loop: boolean;
}

export class AdaptiveAudioEngine {
  private stateMachine: AudioStateMachine | null = null;
  private parameterMapper: ParameterMapper;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: Map<string, AudioLayer> = new Map();
  private effectNodes: Map<string, AudioNode> = new Map();
  private updateInterval: number | null = null;
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config: AdaptiveAudioConfig = {}) {
    // Initialize state machine
    if (config.graph) {
      this.stateMachine = new AudioStateMachine(config.graph);
      this.setupStateMachineListeners();
    }

    // Initialize parameter mapper
    this.parameterMapper = new ParameterMapper(config.mappings || []);
    this.setupMapperListeners();

    // Initialize audio context
    if (config.audioContext) {
      this.audioContext = config.audioContext;
      this.setupAudioGraph();
    }

    // Start update loop
    if (config.updateRate) {
      this.startUpdateLoop(config.updateRate);
    }
  }

  // ==================== Initialization ====================

  async initAudio(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext({ sampleRate: 48000 });
    this.setupAudioGraph();

    // Resume if suspended
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  private setupAudioGraph(): void {
    if (!this.audioContext) return;

    // Create master gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
  }

  private setupStateMachineListeners(): void {
    if (!this.stateMachine) return;

    this.stateMachine.on("stateEntered", (data) => {
      const { state, audioConfig } = data as { state: AudioState; audioConfig: unknown };
      this.applyAudioConfig(state.audioConfig);
      this.emit("stateChanged", { state });
    });

    this.stateMachine.on("transitionStarted", (data) => {
      this.emit("transitionStarted", data);
    });

    this.stateMachine.on("transitionCompleted", (data) => {
      this.emit("transitionCompleted", data);
    });
  }

  private setupMapperListeners(): void {
    this.parameterMapper.onValueChange("*", (value, mapping) => {
      this.applyMappedValue(value, mapping);
      this.emit("parameterMapped", { value, mapping });
    });
  }

  // ==================== State Machine ====================

  loadGraph(graph: StateGraph): void {
    this.stateMachine = new AudioStateMachine(graph);
    this.setupStateMachineListeners();
    this.emit("graphLoaded", { graph });
  }

  getCurrentState(): AudioState | null {
    return this.stateMachine?.getCurrentState() || null;
  }

  forceState(stateId: string): boolean {
    return this.stateMachine?.forceState(stateId) || false;
  }

  triggerEvent(eventName: string): boolean {
    return this.stateMachine?.triggerEvent(eventName) || false;
  }

  // ==================== Parameter Mapping ====================

  setParameter(name: string, value: number | boolean | string): void {
    // Update state machine
    this.stateMachine?.setParameter(name, value);

    // Update parameter mapper
    this.parameterMapper.setGameParameter(name, value);

    this.emit("parameterSet", { name, value });
  }

  getParameter(name: string): number | boolean | string | undefined {
    return this.stateMachine?.getParameter(name) ||
      this.parameterMapper.getGameParameter(name);
  }

  addMapping(mapping: ParameterMapping): void {
    this.parameterMapper.addMapping(mapping);
  }

  removeMapping(id: string): void {
    this.parameterMapper.removeMapping(id);
  }

  // ==================== Audio Layer Management ====================

  async loadLayer(id: string, url: string, options: { loop?: boolean; autoPlay?: boolean } = {}): Promise<void> {
    if (!this.audioContext) await this.initAudio();

    // Fetch and decode audio
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

    // Create nodes
    const gainNode = this.audioContext!.createGain();
    const panNode = this.audioContext!.createStereoPanner();

    // Connect: source -> gain -> pan -> master
    gainNode.connect(panNode);
    panNode.connect(this.masterGain!);

    // Store layer
    this.layers.set(id, {
      id,
      name: id,
      audioBuffer,
      audioUrl: url,
      gainNode,
      panNode,
      isPlaying: false,
      loop: options.loop ?? true,
    });

    if (options.autoPlay) {
      this.playLayer(id);
    }
  }

  playLayer(id: string): void {
    const layer = this.layers.get(id);
    if (!layer || !layer.audioBuffer || !this.audioContext) return;

    // Stop existing source
    if (layer.sourceNode) {
      layer.sourceNode.stop();
      layer.sourceNode.disconnect();
    }

    // Create new source
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = layer.audioBuffer;
    sourceNode.loop = layer.loop;
    sourceNode.connect(layer.gainNode!);
    sourceNode.start();

    layer.sourceNode = sourceNode;
    layer.isPlaying = true;

    // Handle end
    sourceNode.onended = () => {
      if (!layer.loop) {
        layer.isPlaying = false;
        this.emit("layerEnded", { id });
      }
    };

    this.emit("layerStarted", { id });
  }

  stopLayer(id: string, fadeTime: number = 0): void {
    const layer = this.layers.get(id);
    if (!layer || !layer.sourceNode) return;

    if (fadeTime > 0 && layer.gainNode) {
      // Fade out
      const now = this.audioContext!.currentTime;
      layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
      layer.gainNode.gain.linearRampToValueAtTime(0, now + fadeTime / 1000);

      setTimeout(() => {
        layer.sourceNode?.stop();
        layer.sourceNode?.disconnect();
        layer.sourceNode = undefined;
        layer.isPlaying = false;
      }, fadeTime);
    } else {
      layer.sourceNode.stop();
      layer.sourceNode.disconnect();
      layer.sourceNode = undefined;
      layer.isPlaying = false;
    }

    this.emit("layerStopped", { id });
  }

  setLayerVolume(id: string, volume: number, fadeTime: number = 0): void {
    const layer = this.layers.get(id);
    if (!layer?.gainNode || !this.audioContext) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (fadeTime > 0) {
      const now = this.audioContext.currentTime;
      layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
      layer.gainNode.gain.linearRampToValueAtTime(clampedVolume, now + fadeTime / 1000);
    } else {
      layer.gainNode.gain.value = clampedVolume;
    }
  }

  setLayerPan(id: string, pan: number): void {
    const layer = this.layers.get(id);
    if (!layer?.panNode) return;

    layer.panNode.pan.value = Math.max(-1, Math.min(1, pan));
  }

  setMasterVolume(volume: number): void {
    if (!this.masterGain) return;
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  // ==================== Audio Config Application ====================

  private applyAudioConfig(config: AudioState["audioConfig"]): void {
    // Set active layers
    for (const [id, layer] of this.layers) {
      if (config.activeLayers.includes(id)) {
        if (!layer.isPlaying) {
          this.playLayer(id);
        }
        // Set volume
        const volume = config.layerVolumes[id] ?? 1;
        this.setLayerVolume(id, volume, 500); // 500ms fade
      } else {
        if (layer.isPlaying) {
          this.stopLayer(id, 500);
        }
      }
    }

    // Apply effects
    if (config.effects) {
      this.applyEffects(config.effects);
    }
  }

  private applyMappedValue(value: number, mapping: ParameterMapping): void {
    switch (mapping.target.type) {
      case "layer_volume":
        if (mapping.target.layerId) {
          this.setLayerVolume(mapping.target.layerId, value);
        }
        break;

      case "layer_pan":
        if (mapping.target.layerId) {
          this.setLayerPan(mapping.target.layerId, value * 2 - 1); // 0-1 to -1-1
        }
        break;

      case "master_volume":
        this.setMasterVolume(value);
        break;

      case "effect_param":
        this.setEffectParam(
          mapping.target.effectType!,
          mapping.target.effectParam!,
          value
        );
        break;

      // Other target types would be handled by game engine integration
    }
  }

  private applyEffects(effects: AudioState["audioConfig"]["effects"]): void {
    if (effects.masterVolume !== undefined) {
      this.setMasterVolume(effects.masterVolume);
    }

    // Reverb, filters, etc. would be applied here
    // For Web Audio preview, we'd create/update effect nodes
  }

  private setEffectParam(effectType: string, param: string, value: number): void {
    // Effect parameter application would go here
    // This would update Web Audio nodes in a real implementation
    this.emit("effectParamChanged", { effectType, param, value });
  }

  // ==================== Update Loop ====================

  private startUpdateLoop(intervalMs: number): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.lastUpdateTime = Date.now();
    this.isRunning = true;

    this.updateInterval = window.setInterval(() => {
      const now = Date.now();
      const deltaTime = now - this.lastUpdateTime;
      this.lastUpdateTime = now;

      this.update(deltaTime);
    }, intervalMs);
  }

  private update(deltaTime: number): void {
    // Update state machine
    this.stateMachine?.update(deltaTime);

    // Update parameter mapper (handles smoothing)
    const changes = this.parameterMapper.update(deltaTime);

    if (changes.size > 0) {
      this.emit("parametersUpdated", { changes: Object.fromEntries(changes) });
    }
  }

  start(): void {
    if (!this.isRunning) {
      this.startUpdateLoop(16); // ~60fps
    }
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
  }

  // ==================== Event Emitter ====================

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
    this.listeners.get("*")?.forEach((callback) => callback({ event, data }));
  }

  // ==================== Cleanup ====================

  dispose(): void {
    this.stop();

    // Stop all layers
    for (const id of this.layers.keys()) {
      this.stopLayer(id);
    }
    this.layers.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.listeners.clear();
  }

  // ==================== Serialization ====================

  getSnapshot(): AdaptiveEngineSnapshot {
    return {
      stateMachine: this.stateMachine?.getSnapshot() || null,
      parameters: this.parameterMapper.getAllCurrentValues(),
      layers: Array.from(this.layers.entries()).map(([id, layer]) => ({
        id,
        isPlaying: layer.isPlaying,
        volume: layer.gainNode?.gain.value || 0,
        pan: layer.panNode?.pan.value || 0,
      })),
      masterVolume: this.masterGain?.gain.value || 1,
    };
  }

  loadSnapshot(snapshot: AdaptiveEngineSnapshot): void {
    // Restore state machine
    if (snapshot.stateMachine && this.stateMachine) {
      this.stateMachine.loadSnapshot(snapshot.stateMachine);
    }

    // Restore layers
    for (const layerState of snapshot.layers) {
      if (layerState.isPlaying) {
        this.playLayer(layerState.id);
      }
      this.setLayerVolume(layerState.id, layerState.volume);
      this.setLayerPan(layerState.id, layerState.pan);
    }

    // Restore master
    if (snapshot.masterVolume !== undefined) {
      this.setMasterVolume(snapshot.masterVolume);
    }
  }
}

export interface AdaptiveEngineSnapshot {
  stateMachine: import("./stateGraph").StateMachineSnapshot | null;
  parameters: Record<string, number>;
  layers: Array<{
    id: string;
    isPlaying: boolean;
    volume: number;
    pan: number;
  }>;
  masterVolume: number;
}

// ==================== Factory Functions ====================

export function createAdaptiveEngine(
  presetGraphIndex?: number,
  presetMappingIndices?: number[]
): AdaptiveAudioEngine {
  // Load graph preset
  let graph: StateGraph | undefined;
  if (presetGraphIndex !== undefined && PRESET_GRAPHS[presetGraphIndex]) {
    const preset = PRESET_GRAPHS[presetGraphIndex];
    graph = {
      ...createEmptyGraph(preset.name || "Preset Graph"),
      ...preset,
    } as StateGraph;
  }

  // Load mapping presets
  const mappings: ParameterMapping[] = [];
  if (presetMappingIndices) {
    for (const index of presetMappingIndices) {
      try {
        mappings.push(createMappingFromPreset(index));
      } catch (e) {
        console.warn(`Failed to load mapping preset ${index}`);
      }
    }
  }

  return new AdaptiveAudioEngine({
    graph,
    mappings,
    updateRate: 16,
  });
}

// ==================== Browser Storage ====================

export class AdaptiveAudioStore {
  private graphsKey = "swanblade_adaptive_graphs";
  private mappingsKey = "swanblade_adaptive_mappings";

  // Graphs
  getAllGraphs(): StateGraph[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.graphsKey);
    return stored ? JSON.parse(stored) : [];
  }

  saveGraph(graph: StateGraph): void {
    const all = this.getAllGraphs();
    const existing = all.findIndex((g) => g.id === graph.id);
    if (existing >= 0) {
      all[existing] = graph;
    } else {
      all.push(graph);
    }
    localStorage.setItem(this.graphsKey, JSON.stringify(all));
  }

  deleteGraph(id: string): void {
    const all = this.getAllGraphs().filter((g) => g.id !== id);
    localStorage.setItem(this.graphsKey, JSON.stringify(all));
  }

  // Mappings
  getAllMappings(): ParameterMapping[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.mappingsKey);
    return stored ? JSON.parse(stored) : [];
  }

  saveMapping(mapping: ParameterMapping): void {
    const all = this.getAllMappings();
    const existing = all.findIndex((m) => m.id === mapping.id);
    if (existing >= 0) {
      all[existing] = mapping;
    } else {
      all.push(mapping);
    }
    localStorage.setItem(this.mappingsKey, JSON.stringify(all));
  }

  deleteMapping(id: string): void {
    const all = this.getAllMappings().filter((m) => m.id !== id);
    localStorage.setItem(this.mappingsKey, JSON.stringify(all));
  }
}
