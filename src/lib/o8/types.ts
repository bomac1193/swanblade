/**
 * o8 Creative Identity Protocol Types
 * Shared types for Swanblade integration with Starforge ecosystem
 */

export interface O8Identity {
  identity_id: string
  version: '2.0'
  creator: {
    name: string
    verification_level: 'none' | 'basic' | 'enhanced' | 'verified'
  }
  dna: {
    audio?: O8AudioDNA
    narrative?: O8NarrativeDNA
  }
  genome?: O8CharacterGenome
  licensing: O8LicensingTerms
}

export interface O8AudioDNA {
  source: 'starforge'
  sonic_palette: SonicPalette
  taste_coherence: number
  energy_profile: {
    average: number
    variance: number
    peak_ratio: number
  }
  tempo_range: {
    min: number
    max: number
    preferred: number
  }
  influence_genealogy?: {
    primary_genre: string
    secondary_genres: string[]
    era_influences: string[]
  }
}

export interface SonicPalette {
  sub_bass: number    // 20-60 Hz
  bass: number        // 60-250 Hz
  low_mid: number     // 250-500 Hz
  mid: number         // 500-2k Hz
  high_mid: number    // 2k-4k Hz
  presence: number    // 4k-6k Hz
  brilliance: number  // 6k-20k Hz
}

export interface O8NarrativeDNA {
  source: 'boveda'
  core_values: string[]
  central_conflicts: string[]
  recurring_themes: string[]
  telos: string
}

export interface O8CharacterGenome {
  genome_id: string
  orisha: {
    head_orisha: string
    shadow_form?: string
  }
  psychological_state: {
    individuation_level: number
    hot_cool_axis: number  // -1 (cool) to 1 (hot)
    trajectory: 'emergence' | 'ascent' | 'crisis' | 'descent' | 'integration' | 'transcendence'
  }
}

export interface O8LicensingTerms {
  training_rights: boolean
  derivative_rights: boolean
  commercial_rights: boolean
  attribution_required: boolean
}

export interface O8Provenance {
  identity_id: string
  timestamp: string
  content_type: 'audio'
  fingerprint: string
  generation_context?: {
    prompt: string
    parameters: Record<string, unknown>
    provider: string
  }
}

export interface O8ProvenanceResult {
  declaration_cid: string
  manifest_cid: string
  gateway_urls: {
    declaration: string
    manifest: string
  }
  timestamp: string
}

// Stem types for game audio export
export type StemType = 'drums' | 'bass' | 'melody' | 'harmony' | 'vocals' | 'atmosphere' | 'fx'

export interface StemConfig {
  type: StemType
  volume: number
  pan: number
  muted: boolean
}
