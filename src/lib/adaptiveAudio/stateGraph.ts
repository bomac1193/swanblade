/**
 * Adaptive Audio State Graph
 *
 * State machine for managing audio states and transitions:
 * - States represent audio configurations (combat, exploration, stealth)
 * - Transitions define how to move between states
 * - Conditions determine when transitions occur
 */

// ==================== Types ====================

export interface AudioState {
  id: string;
  name: string;
  description?: string;

  // Audio configuration for this state
  audioConfig: StateAudioConfig;

  // Visual position in editor
  position?: { x: number; y: number };

  // Tags for organization
  tags: string[];

  // Is this the initial state?
  isInitial?: boolean;
}

export interface StateAudioConfig {
  // Which stems/layers are active
  activeLayers: string[];

  // Volume levels per layer
  layerVolumes: Record<string, number>;

  // Effects settings
  effects: StateEffects;

  // Music settings
  music?: {
    trackId?: string;
    intensity: number; // 0-1
    tempo?: number;
  };

  // Ambience settings
  ambience?: {
    presetId?: string;
    density: number; // 0-1
  };
}

export interface StateEffects {
  masterVolume: number;
  reverb?: { mix: number; size: number; decay: number };
  lowpass?: { frequency: number; resonance: number };
  highpass?: { frequency: number; resonance: number };
  compression?: { threshold: number; ratio: number; attack: number; release: number };
  distortion?: { amount: number; mix: number };
}

export interface StateTransition {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;

  // Transition behavior
  transitionType: TransitionType;
  duration: number; // ms

  // Conditions that trigger this transition
  conditions: TransitionCondition[];
  conditionLogic: "AND" | "OR";

  // Priority (higher = checked first)
  priority: number;

  // Cooldown before this transition can fire again
  cooldown?: number;

  // Callback event name
  onTransitionStart?: string;
  onTransitionComplete?: string;
}

export type TransitionType =
  | "instant" // Immediate switch
  | "crossfade" // Linear crossfade
  | "musical" // Wait for musical boundary
  | "stinger" // Play transition sound
  | "duck" // Duck current, bring in new
  | "layer_in" // Add layers gradually
  | "layer_out"; // Remove layers gradually

export interface TransitionCondition {
  id: string;
  type: ConditionType;
  parameter?: string;
  operator?: ComparisonOperator;
  value?: number | string | boolean;
  threshold?: number;
  hysteresis?: number;
  debounce?: number; // ms
}

export type ConditionType =
  | "parameter" // Check a game parameter
  | "event" // Listen for an event
  | "timer" // Time-based
  | "random" // Random chance
  | "state_duration"; // How long in current state

export type ComparisonOperator = "==" | "!=" | ">" | "<" | ">=" | "<=" | "in_range";

// ==================== State Graph ====================

export interface StateGraph {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  states: AudioState[];
  transitions: StateTransition[];

  // Global settings
  defaultTransitionDuration: number;
  defaultTransitionType: TransitionType;

  // Parameters this graph uses
  parameters: GraphParameter[];
}

export interface GraphParameter {
  name: string;
  type: "number" | "boolean" | "string";
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  description?: string;
}

// ==================== Runtime State Machine ====================

export class AudioStateMachine {
  private graph: StateGraph;
  private currentState: AudioState | null = null;
  private parameters: Map<string, number | boolean | string> = new Map();
  private transitionCooldowns: Map<string, number> = new Map();
  private stateEntryTime: number = 0;
  private isTransitioning: boolean = false;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(graph: StateGraph) {
    this.graph = graph;

    // Initialize parameters
    for (const param of graph.parameters) {
      this.parameters.set(param.name, param.defaultValue);
    }

    // Find and set initial state
    const initialState = graph.states.find((s) => s.isInitial) || graph.states[0];
    if (initialState) {
      this.enterState(initialState);
    }
  }

  // ==================== Parameter Management ====================

  setParameter(name: string, value: number | boolean | string): void {
    const param = this.graph.parameters.find((p) => p.name === name);
    if (!param) {
      console.warn(`Unknown parameter: ${name}`);
      return;
    }

    // Clamp numeric values
    if (param.type === "number" && typeof value === "number") {
      if (param.min !== undefined) value = Math.max(param.min, value);
      if (param.max !== undefined) value = Math.min(param.max, value);
    }

    this.parameters.set(name, value);
    this.emit("parameterChanged", { name, value });

    // Check for triggered transitions
    this.evaluateTransitions();
  }

  getParameter(name: string): number | boolean | string | undefined {
    return this.parameters.get(name);
  }

  getAllParameters(): Record<string, number | boolean | string> {
    const result: Record<string, number | boolean | string> = {};
    for (const [key, value] of this.parameters) {
      result[key] = value;
    }
    return result;
  }

  // ==================== State Management ====================

  getCurrentState(): AudioState | null {
    return this.currentState;
  }

  getStateDuration(): number {
    return Date.now() - this.stateEntryTime;
  }

  forceState(stateId: string): boolean {
    const state = this.graph.states.find((s) => s.id === stateId);
    if (!state) return false;

    this.enterState(state);
    return true;
  }

  private enterState(state: AudioState): void {
    const previousState = this.currentState;
    this.currentState = state;
    this.stateEntryTime = Date.now();

    this.emit("stateEntered", {
      state,
      previousState,
      audioConfig: state.audioConfig,
    });
  }

  // ==================== Transition Evaluation ====================

  update(deltaTime: number): void {
    // Update cooldowns
    for (const [transitionId, remaining] of this.transitionCooldowns) {
      const newRemaining = remaining - deltaTime;
      if (newRemaining <= 0) {
        this.transitionCooldowns.delete(transitionId);
      } else {
        this.transitionCooldowns.set(transitionId, newRemaining);
      }
    }

    // Evaluate transitions
    this.evaluateTransitions();
  }

  private evaluateTransitions(): void {
    if (!this.currentState || this.isTransitioning) return;

    // Get all transitions from current state, sorted by priority
    const possibleTransitions = this.graph.transitions
      .filter((t) => t.fromStateId === this.currentState!.id)
      .filter((t) => !this.transitionCooldowns.has(t.id))
      .sort((a, b) => b.priority - a.priority);

    for (const transition of possibleTransitions) {
      if (this.evaluateConditions(transition)) {
        this.executeTransition(transition);
        break;
      }
    }
  }

  private evaluateConditions(transition: StateTransition): boolean {
    if (transition.conditions.length === 0) return false;

    const results = transition.conditions.map((c) => this.evaluateCondition(c));

    if (transition.conditionLogic === "AND") {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  private evaluateCondition(condition: TransitionCondition): boolean {
    switch (condition.type) {
      case "parameter":
        return this.evaluateParameterCondition(condition);

      case "event":
        // Events are handled separately via triggerEvent()
        return false;

      case "timer":
        return this.getStateDuration() >= (condition.value as number);

      case "random":
        return Math.random() < (condition.threshold || 0.5);

      case "state_duration":
        return this.getStateDuration() >= (condition.value as number);

      default:
        return false;
    }
  }

  private evaluateParameterCondition(condition: TransitionCondition): boolean {
    if (!condition.parameter || !condition.operator) return false;

    const value = this.parameters.get(condition.parameter);
    if (value === undefined) return false;

    const target = condition.value;
    const hysteresis = condition.hysteresis || 0;

    switch (condition.operator) {
      case "==":
        return value === target;
      case "!=":
        return value !== target;
      case ">":
        return typeof value === "number" && value > (target as number) - hysteresis;
      case "<":
        return typeof value === "number" && value < (target as number) + hysteresis;
      case ">=":
        return typeof value === "number" && value >= (target as number) - hysteresis;
      case "<=":
        return typeof value === "number" && value <= (target as number) + hysteresis;
      case "in_range":
        if (typeof value !== "number" || !condition.threshold) return false;
        const center = target as number;
        return Math.abs(value - center) <= condition.threshold;
      default:
        return false;
    }
  }

  // ==================== Transition Execution ====================

  private async executeTransition(transition: StateTransition): Promise<void> {
    const toState = this.graph.states.find((s) => s.id === transition.toStateId);
    if (!toState) return;

    this.isTransitioning = true;

    // Emit start event
    if (transition.onTransitionStart) {
      this.emit(transition.onTransitionStart, { transition, toState });
    }
    this.emit("transitionStarted", { transition, toState });

    // Execute transition (in real implementation, this would handle audio crossfades etc)
    await this.performTransition(transition, toState);

    // Set cooldown
    if (transition.cooldown) {
      this.transitionCooldowns.set(transition.id, transition.cooldown);
    }

    // Enter new state
    this.enterState(toState);

    // Emit complete event
    if (transition.onTransitionComplete) {
      this.emit(transition.onTransitionComplete, { transition, toState });
    }
    this.emit("transitionCompleted", { transition, toState });

    this.isTransitioning = false;
  }

  private async performTransition(transition: StateTransition, toState: AudioState): Promise<void> {
    // Simulate transition duration
    return new Promise((resolve) => {
      setTimeout(resolve, transition.duration);
    });
  }

  // Trigger an event-based transition
  triggerEvent(eventName: string): boolean {
    if (!this.currentState || this.isTransitioning) return false;

    const eventTransitions = this.graph.transitions
      .filter((t) => t.fromStateId === this.currentState!.id)
      .filter((t) => !this.transitionCooldowns.has(t.id))
      .filter((t) =>
        t.conditions.some((c) => c.type === "event" && c.value === eventName)
      )
      .sort((a, b) => b.priority - a.priority);

    if (eventTransitions.length > 0) {
      this.executeTransition(eventTransitions[0]);
      return true;
    }

    return false;
  }

  // ==================== Event Emitter ====================

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  // ==================== Serialization ====================

  getSnapshot(): StateMachineSnapshot {
    return {
      currentStateId: this.currentState?.id || null,
      parameters: this.getAllParameters(),
      stateEntryTime: this.stateEntryTime,
      cooldowns: Object.fromEntries(this.transitionCooldowns),
    };
  }

  loadSnapshot(snapshot: StateMachineSnapshot): void {
    // Restore parameters
    for (const [key, value] of Object.entries(snapshot.parameters)) {
      this.parameters.set(key, value);
    }

    // Restore state
    if (snapshot.currentStateId) {
      const state = this.graph.states.find((s) => s.id === snapshot.currentStateId);
      if (state) {
        this.currentState = state;
        this.stateEntryTime = snapshot.stateEntryTime;
      }
    }

    // Restore cooldowns
    for (const [id, remaining] of Object.entries(snapshot.cooldowns)) {
      this.transitionCooldowns.set(id, remaining);
    }
  }
}

export interface StateMachineSnapshot {
  currentStateId: string | null;
  parameters: Record<string, number | boolean | string>;
  stateEntryTime: number;
  cooldowns: Record<string, number>;
}

// ==================== Graph Builder Helpers ====================

export function createEmptyGraph(name: string): StateGraph {
  const now = new Date().toISOString();
  return {
    id: `graph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    states: [],
    transitions: [],
    defaultTransitionDuration: 500,
    defaultTransitionType: "crossfade",
    parameters: [],
  };
}

export function addState(
  graph: StateGraph,
  state: Omit<AudioState, "id">
): StateGraph {
  const newState: AudioState = {
    ...state,
    id: `state_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  return {
    ...graph,
    states: [...graph.states, newState],
    updatedAt: new Date().toISOString(),
  };
}

export function addTransition(
  graph: StateGraph,
  transition: Omit<StateTransition, "id">
): StateGraph {
  const newTransition: StateTransition = {
    ...transition,
    id: `trans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  return {
    ...graph,
    transitions: [...graph.transitions, newTransition],
    updatedAt: new Date().toISOString(),
  };
}

export function addParameter(
  graph: StateGraph,
  parameter: GraphParameter
): StateGraph {
  return {
    ...graph,
    parameters: [...graph.parameters, parameter],
    updatedAt: new Date().toISOString(),
  };
}

// ==================== Preset Graphs ====================

export const PRESET_GRAPHS: Partial<StateGraph>[] = [
  {
    name: "Combat Intensity",
    description: "3-level combat intensity system",
    states: [
      {
        id: "exploration",
        name: "Exploration",
        isInitial: true,
        audioConfig: {
          activeLayers: ["ambience", "music_calm"],
          layerVolumes: { ambience: 0.8, music_calm: 0.6 },
          effects: { masterVolume: 0.8 },
          music: { intensity: 0.2 },
        },
        tags: ["calm"],
        position: { x: 100, y: 200 },
      },
      {
        id: "combat_low",
        name: "Combat - Low",
        audioConfig: {
          activeLayers: ["ambience", "music_tension", "combat_layer"],
          layerVolumes: { ambience: 0.4, music_tension: 0.7, combat_layer: 0.3 },
          effects: { masterVolume: 0.9 },
          music: { intensity: 0.5 },
        },
        tags: ["combat"],
        position: { x: 300, y: 100 },
      },
      {
        id: "combat_high",
        name: "Combat - High",
        audioConfig: {
          activeLayers: ["music_intense", "combat_layer", "percussion"],
          layerVolumes: { music_intense: 0.9, combat_layer: 0.7, percussion: 0.6 },
          effects: {
            masterVolume: 1.0,
            compression: { threshold: -10, ratio: 4, attack: 5, release: 100 },
          },
          music: { intensity: 1.0 },
        },
        tags: ["combat", "intense"],
        position: { x: 500, y: 200 },
      },
    ],
    transitions: [
      {
        id: "enter_combat",
        name: "Enter Combat",
        fromStateId: "exploration",
        toStateId: "combat_low",
        transitionType: "crossfade",
        duration: 2000,
        conditions: [
          { id: "c1", type: "parameter", parameter: "enemies_nearby", operator: ">", value: 0 },
        ],
        conditionLogic: "AND",
        priority: 10,
      },
      {
        id: "intensify_combat",
        name: "Intensify Combat",
        fromStateId: "combat_low",
        toStateId: "combat_high",
        transitionType: "layer_in",
        duration: 1500,
        conditions: [
          { id: "c2", type: "parameter", parameter: "health", operator: "<", value: 50 },
        ],
        conditionLogic: "OR",
        priority: 5,
      },
      {
        id: "exit_combat",
        name: "Exit Combat",
        fromStateId: "combat_low",
        toStateId: "exploration",
        transitionType: "crossfade",
        duration: 5000,
        conditions: [
          { id: "c3", type: "parameter", parameter: "enemies_nearby", operator: "==", value: 0 },
          { id: "c4", type: "state_duration", value: 3000 },
        ],
        conditionLogic: "AND",
        priority: 5,
        cooldown: 10000,
      },
    ],
    parameters: [
      { name: "health", type: "number", defaultValue: 100, min: 0, max: 100 },
      { name: "enemies_nearby", type: "number", defaultValue: 0, min: 0, max: 10 },
      { name: "is_detected", type: "boolean", defaultValue: false },
    ],
  },
  {
    name: "Day/Night Cycle",
    description: "Time-of-day ambient audio system",
    states: [
      {
        id: "day",
        name: "Day",
        isInitial: true,
        audioConfig: {
          activeLayers: ["birds", "wind_light", "insects_day"],
          layerVolumes: { birds: 0.7, wind_light: 0.4, insects_day: 0.5 },
          effects: { masterVolume: 0.8 },
        },
        tags: ["day", "outdoor"],
        position: { x: 150, y: 100 },
      },
      {
        id: "sunset",
        name: "Sunset",
        audioConfig: {
          activeLayers: ["birds_evening", "wind_calm", "crickets"],
          layerVolumes: { birds_evening: 0.5, wind_calm: 0.3, crickets: 0.6 },
          effects: { masterVolume: 0.75, lowpass: { frequency: 8000, resonance: 0 } },
        },
        tags: ["transition", "outdoor"],
        position: { x: 350, y: 100 },
      },
      {
        id: "night",
        name: "Night",
        audioConfig: {
          activeLayers: ["owls", "wind_night", "crickets_loud"],
          layerVolumes: { owls: 0.4, wind_night: 0.5, crickets_loud: 0.7 },
          effects: { masterVolume: 0.7, reverb: { mix: 0.2, size: 0.6, decay: 2.0 } },
        },
        tags: ["night", "outdoor"],
        position: { x: 550, y: 100 },
      },
    ],
    transitions: [
      {
        id: "day_to_sunset",
        name: "Day to Sunset",
        fromStateId: "day",
        toStateId: "sunset",
        transitionType: "crossfade",
        duration: 10000,
        conditions: [
          { id: "c1", type: "parameter", parameter: "time_of_day", operator: ">=", value: 17 },
        ],
        conditionLogic: "AND",
        priority: 5,
      },
      {
        id: "sunset_to_night",
        name: "Sunset to Night",
        fromStateId: "sunset",
        toStateId: "night",
        transitionType: "crossfade",
        duration: 10000,
        conditions: [
          { id: "c2", type: "parameter", parameter: "time_of_day", operator: ">=", value: 20 },
        ],
        conditionLogic: "AND",
        priority: 5,
      },
      {
        id: "night_to_day",
        name: "Night to Day",
        fromStateId: "night",
        toStateId: "day",
        transitionType: "crossfade",
        duration: 15000,
        conditions: [
          { id: "c3", type: "parameter", parameter: "time_of_day", operator: "<", value: 6 },
        ],
        conditionLogic: "AND",
        priority: 5,
      },
    ],
    parameters: [
      { name: "time_of_day", type: "number", defaultValue: 12, min: 0, max: 24, description: "Hour of day (0-24)" },
      { name: "weather", type: "string", defaultValue: "clear", description: "Current weather" },
    ],
  },
];
