/**
 * Starforge API Client
 *
 * Connects Swanblade to Starforge's Twin OS for:
 * - Audio DNA context
 * - Visual DNA import
 * - Cross-modal coherence
 */

const STARFORGE_API_URL = process.env.STARFORGE_API_URL || "http://localhost:5000/api";
const ECOSYSTEM_API_SECRET = process.env.ECOSYSTEM_API_SECRET || "dev-secret-change-in-production";

export interface AudioDNA {
  sonic_palette?: Record<string, number>;
  taste_coherence?: number;
  primary_genre?: string;
  track_count?: number;
  message?: string;
}

export interface VisualDNA {
  dominant_colors?: string[];
  warmth?: number;
  energy?: number;
  themes?: string[];
  confidence?: number;
  message?: string;
}

export interface TwinOSContext {
  user_id: string;
  twin_os: {
    audio_dna: AudioDNA;
    visual_dna: VisualDNA;
    cross_modal_coherence: number | null;
    archetype: string;
    brand_keywords: string[];
  };
  content_guidance: {
    visual_direction: string;
    caption_voice: string;
    avoid: string[];
  };
  last_updated: string;
}

export interface CrossModalAnalysis {
  coherence_score: number;
  alignment: {
    warmth: {
      visual: number;
      audio: number;
      delta: number;
      aligned: boolean;
    };
    energy: {
      visual: number;
      audio: number;
      delta: number;
      aligned: boolean;
    };
  };
  recommendation: string;
}

export interface AudioHints {
  suggested_warmth: number;
  suggested_energy: number;
  palette_affinity: string[];
  coherence_score: number | null;
}

/**
 * Get Twin OS context for a user
 * Includes Audio DNA, Visual DNA, and cross-modal coherence
 */
export async function getTwinContext(userId: string): Promise<TwinOSContext | null> {
  try {
    const response = await fetch(`${STARFORGE_API_URL}/twin/context/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Ecosystem-Secret": ECOSYSTEM_API_SECRET,
        "X-Source-App": "swanblade",
      },
    });

    if (!response.ok) {
      console.error("Failed to get Twin context:", response.status);
      return null;
    }

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error("Error fetching Twin context:", error);
    return null;
  }
}

/**
 * Get Visual DNA status for a user
 */
export async function getVisualDnaStatus(userId: string): Promise<{
  has_visual_dna: boolean;
  imported_at?: string;
  confidence?: number;
  source?: string;
} | null> {
  try {
    const response = await fetch(`${STARFORGE_API_URL}/twin/visual-dna/status/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Source-App": "swanblade",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error("Error checking Visual DNA status:", error);
    return null;
  }
}

/**
 * Import Visual DNA from Tizita via Starforge
 */
export async function importVisualDna(
  userId: string,
  tasteVector: number[],
  confidence: number,
  visualCharacteristics: {
    dominant_colors?: string[];
    warmth?: number;
    energy?: number;
    themes?: string[];
  }
): Promise<{ success: boolean; cross_modal_analysis?: CrossModalAnalysis }> {
  try {
    const response = await fetch(`${STARFORGE_API_URL}/twin/visual-dna/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ecosystem-Secret": ECOSYSTEM_API_SECRET,
        "X-Source-App": "swanblade",
      },
      body: JSON.stringify({
        user_id: userId,
        taste_vector: tasteVector,
        confidence,
        visual_characteristics: visualCharacteristics,
        source: "swanblade-sync",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to import Visual DNA:", error);
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    console.error("Error importing Visual DNA:", error);
    return { success: false };
  }
}

/**
 * Sync Visual DNA from Tizita through Starforge
 */
export async function syncVisualDnaFromTizita(
  userId: string,
  tizitaUrl?: string
): Promise<{ success: boolean; message?: string; cross_modal_analysis?: { coherence_score: number } }> {
  try {
    const response = await fetch(`${STARFORGE_API_URL}/twin/visual-dna/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ecosystem-Secret": ECOSYSTEM_API_SECRET,
        "X-Source-App": "swanblade",
      },
      body: JSON.stringify({
        user_id: userId,
        tizita_url: tizitaUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to sync from Tizita:", error);
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    console.error("Error syncing from Tizita:", error);
    return { success: false };
  }
}

/**
 * Derive audio generation hints from Twin OS context
 * Translates Visual DNA to audio parameters
 */
export function deriveAudioHints(context: TwinOSContext | null): AudioHints {
  const defaults: AudioHints = {
    suggested_warmth: 0.5,
    suggested_energy: 0.5,
    palette_affinity: ["ambient", "textural"],
    coherence_score: null,
  };

  if (!context?.twin_os) {
    return defaults;
  }

  const { visual_dna, audio_dna, cross_modal_coherence } = context.twin_os;

  // Get visual characteristics if available
  const visualWarmth = typeof visual_dna?.warmth === "number" ? visual_dna.warmth : 0.5;
  const visualEnergy = typeof visual_dna?.energy === "number" ? visual_dna.energy : 0.5;

  // Derive palette affinity from energy levels
  const palettes: string[] = [];

  if (visualEnergy < 0.3) {
    palettes.push("ambient", "drone", "minimal");
  } else if (visualEnergy < 0.5) {
    palettes.push("textural", "atmospheric", "downtempo");
  } else if (visualEnergy < 0.7) {
    palettes.push("rhythmic", "melodic", "progressive");
  } else {
    palettes.push("percussive", "dynamic", "energetic");
  }

  if (visualWarmth > 0.6) {
    palettes.push("warm", "analog");
  } else if (visualWarmth < 0.4) {
    palettes.push("cold", "digital", "synthetic");
  }

  return {
    suggested_warmth: visualWarmth,
    suggested_energy: visualEnergy,
    palette_affinity: palettes,
    coherence_score: cross_modal_coherence,
  };
}

/**
 * Check if Starforge is available
 */
export async function checkStarforgeConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${STARFORGE_API_URL}/health`, {
      method: "GET",
      headers: {
        "X-Source-App": "swanblade",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Starforge client singleton
 */
export const starforge = {
  getTwinContext,
  getVisualDnaStatus,
  importVisualDna,
  syncVisualDnaFromTizita,
  deriveAudioHints,
  checkConnection: checkStarforgeConnection,
};

export default starforge;
