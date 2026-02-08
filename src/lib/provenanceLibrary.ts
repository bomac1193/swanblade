/**
 * Provenance Library - Sound Library with Full Attribution
 *
 * Tracks all generated sounds with their provenance metadata
 */

import type { SoundDNA } from "./soundDna";
import type { SoundPalette } from "./soundPalette";
import type { GameState } from "./gameStateEngine";

export interface ProvenanceRecord {
  declarationCid: string;
  identityId: string;
  timestamp: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface LibrarySoundWithProvenance {
  id: string;
  name: string;
  createdAt: string;

  // Audio
  audioUrl: string;
  format: "wav" | "mp3" | "ogg";
  duration: number;
  sampleRate?: number;

  // Generation context
  prompt: string;
  provider: string;
  parameters: {
    bpm?: number;
    key?: string;
    intensity?: number;
    texture?: number;
    brightness?: number;
    noisiness?: number;
  };

  // Blue Ocean features
  dnaId?: string;
  paletteId?: string;
  gameState?: GameState;
  stemType?: string;
  bundleId?: string;

  // LoRA context
  loraId?: string;
  loraStrength?: number;

  // Provenance
  provenance?: ProvenanceRecord;

  // Organizational
  tags: string[];
  favorite: boolean;
  archived: boolean;
}

export interface LibraryFilter {
  search?: string;
  tags?: string[];
  gameStates?: GameState[];
  paletteIds?: string[];
  hasProvenance?: boolean;
  favorite?: boolean;
  archived?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface LibraryStats {
  totalSounds: number;
  totalDuration: number;
  withProvenance: number;
  byGameState: Record<GameState, number>;
  byPalette: Record<string, number>;
  byProvider: Record<string, number>;
}

/**
 * Provenance Library Manager
 */
export class ProvenanceLibrary {
  private storageKey = "swanblade_provenance_library";

  // ==================== Core CRUD ====================

  getAll(): LibrarySoundWithProvenance[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  get(id: string): LibrarySoundWithProvenance | undefined {
    return this.getAll().find((s) => s.id === id);
  }

  save(sound: LibrarySoundWithProvenance): void {
    const all = this.getAll();
    const existing = all.findIndex((s) => s.id === sound.id);
    if (existing >= 0) {
      all[existing] = sound;
    } else {
      all.push(sound);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  delete(id: string): void {
    const all = this.getAll().filter((s) => s.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  // ==================== Filtering ====================

  filter(filters: LibraryFilter): LibrarySoundWithProvenance[] {
    let results = this.getAll();

    // Text search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.prompt.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Tags
    if (filters.tags?.length) {
      results = results.filter((s) =>
        filters.tags!.some((tag) => s.tags.includes(tag))
      );
    }

    // Game states
    if (filters.gameStates?.length) {
      results = results.filter(
        (s) => s.gameState && filters.gameStates!.includes(s.gameState)
      );
    }

    // Palettes
    if (filters.paletteIds?.length) {
      results = results.filter(
        (s) => s.paletteId && filters.paletteIds!.includes(s.paletteId)
      );
    }

    // Provenance
    if (filters.hasProvenance !== undefined) {
      if (filters.hasProvenance) {
        results = results.filter((s) => s.provenance?.declarationCid);
      } else {
        results = results.filter((s) => !s.provenance?.declarationCid);
      }
    }

    // Favorites
    if (filters.favorite !== undefined) {
      results = results.filter((s) => s.favorite === filters.favorite);
    }

    // Archived
    if (filters.archived !== undefined) {
      results = results.filter((s) => s.archived === filters.archived);
    }

    // Date range
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start).getTime();
      const end = new Date(filters.dateRange.end).getTime();
      results = results.filter((s) => {
        const created = new Date(s.createdAt).getTime();
        return created >= start && created <= end;
      });
    }

    return results;
  }

  // ==================== Organization ====================

  addTag(id: string, tag: string): void {
    const sound = this.get(id);
    if (sound && !sound.tags.includes(tag)) {
      sound.tags.push(tag);
      this.save(sound);
    }
  }

  removeTag(id: string, tag: string): void {
    const sound = this.get(id);
    if (sound) {
      sound.tags = sound.tags.filter((t) => t !== tag);
      this.save(sound);
    }
  }

  setFavorite(id: string, favorite: boolean): void {
    const sound = this.get(id);
    if (sound) {
      sound.favorite = favorite;
      this.save(sound);
    }
  }

  setArchived(id: string, archived: boolean): void {
    const sound = this.get(id);
    if (sound) {
      sound.archived = archived;
      this.save(sound);
    }
  }

  // ==================== Provenance ====================

  updateProvenance(id: string, provenance: ProvenanceRecord): void {
    const sound = this.get(id);
    if (sound) {
      sound.provenance = provenance;
      this.save(sound);
    }
  }

  getSoundsWithProvenance(): LibrarySoundWithProvenance[] {
    return this.getAll().filter((s) => s.provenance?.declarationCid);
  }

  getSoundsWithoutProvenance(): LibrarySoundWithProvenance[] {
    return this.getAll().filter((s) => !s.provenance?.declarationCid);
  }

  // ==================== Stats ====================

  getStats(): LibraryStats {
    const sounds = this.getAll();

    const byGameState: Record<string, number> = {};
    const byPalette: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    let totalDuration = 0;
    let withProvenance = 0;

    for (const sound of sounds) {
      totalDuration += sound.duration;

      if (sound.provenance?.declarationCid) {
        withProvenance++;
      }

      if (sound.gameState) {
        byGameState[sound.gameState] = (byGameState[sound.gameState] || 0) + 1;
      }

      if (sound.paletteId) {
        byPalette[sound.paletteId] = (byPalette[sound.paletteId] || 0) + 1;
      }

      byProvider[sound.provider] = (byProvider[sound.provider] || 0) + 1;
    }

    return {
      totalSounds: sounds.length,
      totalDuration,
      withProvenance,
      byGameState: byGameState as Record<GameState, number>,
      byPalette,
      byProvider,
    };
  }

  // ==================== Export ====================

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const sound of this.getAll()) {
      sound.tags.forEach((t) => tagSet.add(t));
    }
    return Array.from(tagSet).sort();
  }

  exportForLicensing(ids: string[]): Array<{
    sound: LibrarySoundWithProvenance;
    licenseData: {
      generatedBy: string;
      provenanceCid?: string;
      identityId?: string;
      timestamp: string;
      usageRights: string;
    };
  }> {
    return ids
      .map((id) => this.get(id))
      .filter((s): s is LibrarySoundWithProvenance => !!s)
      .map((sound) => ({
        sound,
        licenseData: {
          generatedBy: "Swanblade",
          provenanceCid: sound.provenance?.declarationCid,
          identityId: sound.provenance?.identityId,
          timestamp: sound.createdAt,
          usageRights: sound.provenance?.declarationCid
            ? "Full provenance - clear for commercial use"
            : "Generated content - verify usage terms",
        },
      }));
  }
}

/**
 * Convert a basic library sound to a provenance-tracked sound
 */
export function convertToProvenanceSound(
  basicSound: {
    id: string;
    name: string;
    prompt: string;
    createdAt: string;
    audioUrl: string | null;
    bpm?: number;
    key?: string;
    intensity?: number;
    texture?: number;
    brightness?: number;
    noisiness?: number;
    loraId?: string;
    loraStrength?: number;
    provenanceCid?: string;
    identityId?: string;
  },
  provider: string = "unknown"
): LibrarySoundWithProvenance {
  return {
    id: basicSound.id,
    name: basicSound.name,
    createdAt: basicSound.createdAt,
    audioUrl: basicSound.audioUrl || "",
    format: "wav",
    duration: 0, // Would need to analyze audio
    prompt: basicSound.prompt,
    provider,
    parameters: {
      bpm: basicSound.bpm,
      key: basicSound.key,
      intensity: basicSound.intensity,
      texture: basicSound.texture,
      brightness: basicSound.brightness,
      noisiness: basicSound.noisiness,
    },
    loraId: basicSound.loraId,
    loraStrength: basicSound.loraStrength,
    provenance: basicSound.provenanceCid
      ? {
          declarationCid: basicSound.provenanceCid,
          identityId: basicSound.identityId || "",
          timestamp: basicSound.createdAt,
          verified: false,
        }
      : undefined,
    tags: [],
    favorite: false,
    archived: false,
  };
}

/**
 * Singleton instance for easy access
 */
export const provenanceLibrary = new ProvenanceLibrary();
