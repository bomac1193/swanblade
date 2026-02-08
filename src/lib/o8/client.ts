/**
 * o8 API Client for Swanblade
 * Connects to Starforge for identity management and provenance
 */

import type { O8Identity, O8Provenance, O8ProvenanceResult, SonicPalette } from './types'

export interface O8ClientConfig {
  apiUrl: string
  apiKey?: string
}

const DEFAULT_CONFIG: O8ClientConfig = {
  apiUrl: process.env.NEXT_PUBLIC_O8_API_URL || 'http://localhost:3001',
}

export class O8Client {
  private config: O8ClientConfig

  constructor(config: Partial<O8ClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
    }
  }

  /**
   * Fetch an identity from the o8 API (Starforge)
   */
  async getIdentity(identityId: string): Promise<O8Identity | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/identity/${identityId}`, {
        headers: this.headers,
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`o8 API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch o8 identity:', error)
      return null
    }
  }

  /**
   * List available identities
   */
  async listIdentities(): Promise<O8Identity[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/identities`, {
        headers: this.headers,
      })

      if (!response.ok) {
        throw new Error(`o8 API error: ${response.status}`)
      }

      const data = await response.json()
      return data.identities || []
    } catch (error) {
      console.error('Failed to list identities:', error)
      return []
    }
  }

  /**
   * Validate identity has audio DNA
   */
  async validateForAudio(identityId: string): Promise<{ valid: boolean; missing: string[] }> {
    try {
      const identity = await this.getIdentity(identityId)
      if (!identity) {
        return { valid: false, missing: ['Identity not found'] }
      }

      const missing: string[] = []
      if (!identity.dna?.audio) missing.push('Audio DNA')
      if (!identity.dna?.audio?.sonic_palette) missing.push('Sonic Palette')

      return { valid: missing.length === 0, missing }
    } catch (error) {
      console.error('Failed to validate identity:', error)
      return { valid: false, missing: ['API unavailable'] }
    }
  }

  /**
   * Stamp generated audio with provenance
   */
  async stampAudio(
    identityId: string,
    options: {
      prompt: string
      audioFingerprint: string
      parameters: Record<string, unknown>
      provider: string
    }
  ): Promise<O8ProvenanceResult | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/provenance/stamp`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          identity_id: identityId,
          content_type: 'audio',
          content_fingerprint: options.audioFingerprint,
          metadata: {
            prompt: options.prompt,
            parameters: options.parameters,
            provider: options.provider,
            tool: 'swanblade',
            timestamp: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        console.error('Provenance stamping failed:', response.status)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to stamp audio:', error)
      return null
    }
  }

  /**
   * Verify provenance of audio
   */
  async verifyProvenance(fingerprint: string): Promise<O8Provenance | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/provenance/verify`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ content_fingerprint: fingerprint }),
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to verify provenance:', error)
      return null
    }
  }
}

/**
 * Generate audio fingerprint from audio data
 */
export function generateAudioFingerprint(audioData: ArrayBuffer): string {
  // Simple hash - in production would use proper audio fingerprinting
  const view = new Uint8Array(audioData)
  let hash = 0
  for (let i = 0; i < view.length; i += 100) {
    hash = ((hash << 5) - hash) + view[i]
    hash = hash & hash
  }
  return `swanblade-${Math.abs(hash).toString(16)}-${audioData.byteLength}`
}

/**
 * Convert sonic palette to prompt hints
 */
export function sonicPaletteToPromptHints(palette: SonicPalette): string[] {
  const hints: string[] = []

  // Bass character
  if (palette.sub_bass > 0.7) hints.push('deep sub bass')
  if (palette.bass > 0.7) hints.push('punchy bass')
  if (palette.bass < 0.3) hints.push('light bass')

  // Mid character
  if (palette.low_mid > 0.7) hints.push('warm')
  if (palette.mid > 0.7) hints.push('present mids')
  if (palette.high_mid > 0.7) hints.push('bright')

  // High character
  if (palette.presence > 0.7) hints.push('crisp')
  if (palette.brilliance > 0.7) hints.push('airy', 'sparkling highs')
  if (palette.brilliance < 0.3) hints.push('dark', 'muted highs')

  return hints
}

/**
 * Generate prompt modifier from o8 identity
 */
export function identityToPromptModifier(identity: O8Identity): string {
  const parts: string[] = []

  // From audio DNA
  if (identity.dna?.audio) {
    const audio = identity.dna.audio

    // Genre influence
    if (audio.influence_genealogy?.primary_genre) {
      parts.push(`${audio.influence_genealogy.primary_genre} style`)
    }

    // Tempo hint
    if (audio.tempo_range) {
      const tempo = audio.tempo_range.preferred
      if (tempo < 90) parts.push('slow tempo')
      else if (tempo > 140) parts.push('fast tempo')
    }

    // Sonic palette hints
    const paletteHints = sonicPaletteToPromptHints(audio.sonic_palette)
    parts.push(...paletteHints)

    // Energy
    if (audio.energy_profile.average > 0.7) parts.push('high energy')
    if (audio.energy_profile.average < 0.3) parts.push('calm', 'ambient')
  }

  // From narrative DNA
  if (identity.dna?.narrative?.recurring_themes) {
    const themes = identity.dna.narrative.recurring_themes.slice(0, 2)
    parts.push(...themes.map(t => `${t.toLowerCase()} vibes`))
  }

  // From character genome
  if (identity.genome?.psychological_state) {
    const state = identity.genome.psychological_state
    if (state.hot_cool_axis > 0.5) parts.push('intense', 'passionate')
    if (state.hot_cool_axis < -0.5) parts.push('cool', 'controlled')
    if (state.trajectory === 'crisis') parts.push('tension', 'dramatic')
    if (state.trajectory === 'transcendence') parts.push('ethereal', 'expansive')
  }

  return parts.join(', ')
}

// Singleton instance
let clientInstance: O8Client | null = null

export function getO8Client(config?: Partial<O8ClientConfig>): O8Client {
  if (!clientInstance || config) {
    clientInstance = new O8Client(config)
  }
  return clientInstance
}
