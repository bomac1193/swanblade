/**
 * Adaptive Audio Parameter Mapper
 *
 * Maps game parameters to audio parameters with curves, scaling, and smoothing:
 * - Health -> Music Intensity
 * - Speed -> Wind Volume
 * - Time of Day -> Ambience Mix
 */

// ==================== Types ====================

export interface ParameterMapping {
  id: string;
  name: string;
  description?: string;

  // Source (game side)
  source: ParameterSource;

  // Target (audio side)
  target: ParameterTarget;

  // Mapping curve
  curve: MappingCurve;

  // Value transformation
  transform: ValueTransform;

  // Smoothing
  smoothing: SmoothingConfig;

  // Conditional activation
  conditions?: MappingCondition[];

  // Is this mapping active?
  enabled: boolean;
}

export interface ParameterSource {
  name: string;
  type: "number" | "boolean" | "string" | "vector3";
  expectedRange: [number, number]; // For normalization
  description?: string;
}

export interface ParameterTarget {
  type: ParameterTargetType;
  layerId?: string;
  effectType?: string;
  effectParam?: string;
  rtpcName?: string;
}

export type ParameterTargetType =
  | "layer_volume"
  | "layer_pan"
  | "layer_pitch"
  | "master_volume"
  | "effect_param"
  | "music_intensity"
  | "rtpc"
  | "state_blend"
  | "custom";

export type MappingCurve =
  | { type: "linear" }
  | { type: "exponential"; exponent: number }
  | { type: "logarithmic"; base: number }
  | { type: "s_curve"; steepness: number }
  | { type: "step"; steps: number[] }
  | { type: "custom"; points: CurvePoint[] };

export interface CurvePoint {
  x: number; // Input (0-1)
  y: number; // Output (0-1)
  curve?: "linear" | "smooth"; // Interpolation to next point
}

export interface ValueTransform {
  inputRange: [number, number];
  outputRange: [number, number];
  clamp: boolean;
  invert: boolean;
  deadzone?: [number, number]; // No change in this range
  scale?: number;
  offset?: number;
}

export interface SmoothingConfig {
  enabled: boolean;
  type: "linear" | "exponential" | "spring";
  riseTime: number; // ms to go from 0 to 1
  fallTime: number; // ms to go from 1 to 0
  springTension?: number;
  springDamping?: number;
}

export interface MappingCondition {
  parameter: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
  value: number | boolean | string;
}

// ==================== Parameter Mapper Class ====================

export class ParameterMapper {
  private mappings: Map<string, ParameterMapping> = new Map();
  private currentValues: Map<string, number> = new Map();
  private targetValues: Map<string, number> = new Map();
  private velocities: Map<string, number> = new Map(); // For spring smoothing
  private gameParameters: Map<string, number | boolean | string> = new Map();
  private listeners: Map<string, Set<(value: number, mapping: ParameterMapping) => void>> = new Map();

  constructor(mappings: ParameterMapping[] = []) {
    for (const mapping of mappings) {
      this.addMapping(mapping);
    }
  }

  // ==================== Mapping Management ====================

  addMapping(mapping: ParameterMapping): void {
    this.mappings.set(mapping.id, mapping);
    this.currentValues.set(mapping.id, 0);
    this.targetValues.set(mapping.id, 0);
    this.velocities.set(mapping.id, 0);
  }

  removeMapping(id: string): void {
    this.mappings.delete(id);
    this.currentValues.delete(id);
    this.targetValues.delete(id);
    this.velocities.delete(id);
  }

  getMapping(id: string): ParameterMapping | undefined {
    return this.mappings.get(id);
  }

  getAllMappings(): ParameterMapping[] {
    return Array.from(this.mappings.values());
  }

  setMappingEnabled(id: string, enabled: boolean): void {
    const mapping = this.mappings.get(id);
    if (mapping) {
      mapping.enabled = enabled;
    }
  }

  // ==================== Parameter Input ====================

  setGameParameter(name: string, value: number | boolean | string): void {
    this.gameParameters.set(name, value);

    // Update all mappings that use this parameter
    for (const mapping of this.mappings.values()) {
      if (mapping.source.name === name && mapping.enabled) {
        if (this.checkConditions(mapping)) {
          const mappedValue = this.mapValue(value, mapping);
          this.targetValues.set(mapping.id, mappedValue);
        }
      }
    }
  }

  getGameParameter(name: string): number | boolean | string | undefined {
    return this.gameParameters.get(name);
  }

  // ==================== Value Mapping ====================

  private mapValue(input: number | boolean | string, mapping: ParameterMapping): number {
    // Convert to number
    let value: number;
    if (typeof input === "boolean") {
      value = input ? 1 : 0;
    } else if (typeof input === "string") {
      value = parseFloat(input) || 0;
    } else {
      value = input;
    }

    const { transform, curve } = mapping;

    // Normalize to 0-1 based on input range
    let normalized = (value - transform.inputRange[0]) /
      (transform.inputRange[1] - transform.inputRange[0]);

    // Apply deadzone
    if (transform.deadzone) {
      const [low, high] = transform.deadzone;
      if (normalized >= low && normalized <= high) {
        // Map deadzone to center of output
        return (transform.outputRange[0] + transform.outputRange[1]) / 2;
      }
    }

    // Clamp if needed
    if (transform.clamp) {
      normalized = Math.max(0, Math.min(1, normalized));
    }

    // Invert if needed
    if (transform.invert) {
      normalized = 1 - normalized;
    }

    // Apply curve
    let curved = this.applyCurve(normalized, curve);

    // Map to output range
    let output = transform.outputRange[0] +
      curved * (transform.outputRange[1] - transform.outputRange[0]);

    // Apply scale and offset
    if (transform.scale !== undefined) {
      output *= transform.scale;
    }
    if (transform.offset !== undefined) {
      output += transform.offset;
    }

    return output;
  }

  private applyCurve(x: number, curve: MappingCurve): number {
    switch (curve.type) {
      case "linear":
        return x;

      case "exponential":
        return Math.pow(x, curve.exponent);

      case "logarithmic":
        return Math.log(1 + x * (curve.base - 1)) / Math.log(curve.base);

      case "s_curve":
        // Sigmoid function
        const steepness = curve.steepness;
        return 1 / (1 + Math.exp(-steepness * (x - 0.5)));

      case "step":
        // Quantize to steps
        const steps = curve.steps;
        const stepIndex = Math.floor(x * steps.length);
        return steps[Math.min(stepIndex, steps.length - 1)] || x;

      case "custom":
        return this.interpolateCustomCurve(x, curve.points);

      default:
        return x;
    }
  }

  private interpolateCustomCurve(x: number, points: CurvePoint[]): number {
    if (points.length === 0) return x;
    if (points.length === 1) return points[0].y;

    // Find surrounding points
    let p1 = points[0];
    let p2 = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        p1 = points[i];
        p2 = points[i + 1];
        break;
      }
    }

    // Interpolate
    const t = (x - p1.x) / (p2.x - p1.x);

    if (p1.curve === "smooth") {
      // Smoothstep interpolation
      const smoothT = t * t * (3 - 2 * t);
      return p1.y + (p2.y - p1.y) * smoothT;
    } else {
      // Linear interpolation
      return p1.y + (p2.y - p1.y) * t;
    }
  }

  // ==================== Smoothing ====================

  update(deltaTime: number): Map<string, number> {
    const changes = new Map<string, number>();

    for (const mapping of this.mappings.values()) {
      if (!mapping.enabled) continue;

      const current = this.currentValues.get(mapping.id) || 0;
      const target = this.targetValues.get(mapping.id) || 0;

      if (Math.abs(current - target) < 0.0001) continue;

      let newValue: number;

      if (!mapping.smoothing.enabled) {
        newValue = target;
      } else {
        switch (mapping.smoothing.type) {
          case "linear":
            newValue = this.linearSmooth(current, target, deltaTime, mapping.smoothing);
            break;

          case "exponential":
            newValue = this.exponentialSmooth(current, target, deltaTime, mapping.smoothing);
            break;

          case "spring":
            newValue = this.springSmooth(mapping.id, current, target, deltaTime, mapping.smoothing);
            break;

          default:
            newValue = target;
        }
      }

      if (newValue !== current) {
        this.currentValues.set(mapping.id, newValue);
        changes.set(mapping.id, newValue);

        // Notify listeners
        this.listeners.get(mapping.id)?.forEach((cb) => cb(newValue, mapping));
        this.listeners.get("*")?.forEach((cb) => cb(newValue, mapping));
      }
    }

    return changes;
  }

  private linearSmooth(
    current: number,
    target: number,
    deltaTime: number,
    config: SmoothingConfig
  ): number {
    const direction = target > current ? 1 : -1;
    const time = direction > 0 ? config.riseTime : config.fallTime;
    const speed = 1 / time;
    const maxDelta = speed * deltaTime;
    const delta = Math.min(Math.abs(target - current), maxDelta);
    return current + direction * delta;
  }

  private exponentialSmooth(
    current: number,
    target: number,
    deltaTime: number,
    config: SmoothingConfig
  ): number {
    const time = target > current ? config.riseTime : config.fallTime;
    const factor = 1 - Math.exp(-deltaTime / (time * 0.3));
    return current + (target - current) * factor;
  }

  private springSmooth(
    mappingId: string,
    current: number,
    target: number,
    deltaTime: number,
    config: SmoothingConfig
  ): number {
    const tension = config.springTension || 100;
    const damping = config.springDamping || 10;

    let velocity = this.velocities.get(mappingId) || 0;

    // Spring physics
    const displacement = target - current;
    const springForce = displacement * tension;
    const dampingForce = velocity * damping;
    const acceleration = springForce - dampingForce;

    velocity += acceleration * (deltaTime / 1000);
    const newValue = current + velocity * (deltaTime / 1000);

    this.velocities.set(mappingId, velocity);
    return newValue;
  }

  // ==================== Conditions ====================

  private checkConditions(mapping: ParameterMapping): boolean {
    if (!mapping.conditions || mapping.conditions.length === 0) return true;

    for (const condition of mapping.conditions) {
      const value = this.gameParameters.get(condition.parameter);
      if (value === undefined) continue;

      switch (condition.operator) {
        case "==":
          if (value !== condition.value) return false;
          break;
        case "!=":
          if (value === condition.value) return false;
          break;
        case ">":
          if (typeof value !== "number" || value <= (condition.value as number)) return false;
          break;
        case "<":
          if (typeof value !== "number" || value >= (condition.value as number)) return false;
          break;
        case ">=":
          if (typeof value !== "number" || value < (condition.value as number)) return false;
          break;
        case "<=":
          if (typeof value !== "number" || value > (condition.value as number)) return false;
          break;
      }
    }

    return true;
  }

  // ==================== Event Listeners ====================

  onValueChange(
    mappingId: string | "*",
    callback: (value: number, mapping: ParameterMapping) => void
  ): () => void {
    if (!this.listeners.has(mappingId)) {
      this.listeners.set(mappingId, new Set());
    }
    this.listeners.get(mappingId)!.add(callback);

    return () => {
      this.listeners.get(mappingId)?.delete(callback);
    };
  }

  // ==================== Utilities ====================

  getCurrentValue(mappingId: string): number {
    return this.currentValues.get(mappingId) || 0;
  }

  getTargetValue(mappingId: string): number {
    return this.targetValues.get(mappingId) || 0;
  }

  getAllCurrentValues(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [id, value] of this.currentValues) {
      result[id] = value;
    }
    return result;
  }

  reset(): void {
    for (const id of this.mappings.keys()) {
      this.currentValues.set(id, 0);
      this.targetValues.set(id, 0);
      this.velocities.set(id, 0);
    }
    this.gameParameters.clear();
  }
}

// ==================== Preset Mappings ====================

export const PRESET_MAPPINGS: Partial<ParameterMapping>[] = [
  {
    name: "Health to Music Intensity",
    description: "Lower health = more intense music",
    source: {
      name: "health",
      type: "number",
      expectedRange: [0, 100],
      description: "Player health percentage",
    },
    target: {
      type: "music_intensity",
    },
    curve: { type: "exponential", exponent: 2 },
    transform: {
      inputRange: [0, 100],
      outputRange: [1, 0], // Inverted: low health = high intensity
      clamp: true,
      invert: false,
    },
    smoothing: {
      enabled: true,
      type: "exponential",
      riseTime: 2000,
      fallTime: 5000,
    },
    enabled: true,
  },
  {
    name: "Speed to Wind Volume",
    description: "Player speed affects wind whoosh volume",
    source: {
      name: "player_speed",
      type: "number",
      expectedRange: [0, 100],
      description: "Player movement speed",
    },
    target: {
      type: "layer_volume",
      layerId: "wind",
    },
    curve: { type: "s_curve", steepness: 6 },
    transform: {
      inputRange: [0, 100],
      outputRange: [0, 1],
      clamp: true,
      invert: false,
      deadzone: [0, 0.1], // No wind at very low speeds
    },
    smoothing: {
      enabled: true,
      type: "spring",
      riseTime: 500,
      fallTime: 1000,
      springTension: 150,
      springDamping: 15,
    },
    enabled: true,
  },
  {
    name: "Time of Day to Ambience",
    description: "Day/night affects ambient mix",
    source: {
      name: "time_of_day",
      type: "number",
      expectedRange: [0, 24],
      description: "Hour of the day (0-24)",
    },
    target: {
      type: "state_blend",
    },
    curve: {
      type: "custom",
      points: [
        { x: 0, y: 1, curve: "smooth" }, // Night
        { x: 0.25, y: 0.5, curve: "smooth" }, // Dawn
        { x: 0.33, y: 0, curve: "smooth" }, // Morning
        { x: 0.5, y: 0, curve: "smooth" }, // Noon
        { x: 0.67, y: 0, curve: "smooth" }, // Afternoon
        { x: 0.75, y: 0.5, curve: "smooth" }, // Dusk
        { x: 1, y: 1, curve: "smooth" }, // Night
      ],
    },
    transform: {
      inputRange: [0, 24],
      outputRange: [0, 1],
      clamp: true,
      invert: false,
    },
    smoothing: {
      enabled: true,
      type: "linear",
      riseTime: 30000, // 30 second transitions
      fallTime: 30000,
    },
    enabled: true,
  },
  {
    name: "Distance to Enemy - Tension",
    description: "Closer enemies = more tension",
    source: {
      name: "nearest_enemy_distance",
      type: "number",
      expectedRange: [0, 100],
      description: "Distance to nearest enemy in meters",
    },
    target: {
      type: "effect_param",
      effectType: "lowpass",
      effectParam: "frequency",
    },
    curve: { type: "logarithmic", base: 10 },
    transform: {
      inputRange: [0, 100],
      outputRange: [2000, 20000], // Close = muffled
      clamp: true,
      invert: false,
    },
    smoothing: {
      enabled: true,
      type: "exponential",
      riseTime: 1000,
      fallTime: 3000,
    },
    enabled: true,
  },
  {
    name: "Danger Level to Reverb",
    description: "Higher danger = more reverb for tension",
    source: {
      name: "danger_level",
      type: "number",
      expectedRange: [0, 100],
      description: "Aggregate danger level",
    },
    target: {
      type: "effect_param",
      effectType: "reverb",
      effectParam: "mix",
    },
    curve: { type: "exponential", exponent: 1.5 },
    transform: {
      inputRange: [0, 100],
      outputRange: [0.1, 0.5],
      clamp: true,
      invert: false,
    },
    smoothing: {
      enabled: true,
      type: "exponential",
      riseTime: 2000,
      fallTime: 4000,
    },
    enabled: true,
  },
];

// ==================== Builder Helpers ====================

export function createMapping(
  name: string,
  source: ParameterSource,
  target: ParameterTarget
): ParameterMapping {
  return {
    id: `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    source,
    target,
    curve: { type: "linear" },
    transform: {
      inputRange: source.expectedRange,
      outputRange: [0, 1],
      clamp: true,
      invert: false,
    },
    smoothing: {
      enabled: true,
      type: "exponential",
      riseTime: 500,
      fallTime: 500,
    },
    enabled: true,
  };
}

export function createMappingFromPreset(
  presetIndex: number,
  customName?: string
): ParameterMapping {
  const preset = PRESET_MAPPINGS[presetIndex];
  if (!preset) {
    throw new Error(`Preset ${presetIndex} not found`);
  }

  return {
    id: `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: customName || preset.name || "New Mapping",
    description: preset.description,
    source: preset.source!,
    target: preset.target!,
    curve: preset.curve || { type: "linear" },
    transform: preset.transform!,
    smoothing: preset.smoothing!,
    enabled: preset.enabled !== false,
  };
}
