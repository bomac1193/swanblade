import { NextResponse } from "next/server";
import type { SoundDNA } from "@/lib/soundDna";

export const runtime = "nodejs";

// Starforge API for audio analysis
const starforgeApiUrl = process.env.STARFORGE_API_URL || "http://localhost:5000";

/**
 * POST /api/sound-dna - Extract Sound DNA from audio
 *
 * Request body:
 * - audio: base64 encoded audio data
 * - name: name for the DNA profile
 * - filename: original filename (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { audio, name, filename } = body as {
      audio: string;
      name: string;
      filename?: string;
    };

    if (!audio) {
      return NextResponse.json({ error: "Audio data is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Call Starforge audio analysis endpoint
    const analysisResponse = await fetch(`${starforgeApiUrl}/api/audio/analyze-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio,
        filename: filename || name,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("[sound-dna] Starforge analysis failed:", errorText);

      // Return mock DNA for development when Starforge is unavailable
      if (process.env.NODE_ENV === "development") {
        console.warn("[sound-dna] Using mock DNA in development mode");
        const mockDna = createMockDNA(name);
        return NextResponse.json({ dna: mockDna, mock: true });
      }

      return NextResponse.json(
        { error: `DNA extraction failed: ${errorText}` },
        { status: 500 }
      );
    }

    const analysis = await analysisResponse.json();

    // Map Starforge analysis to Sound DNA format
    const dna: SoundDNA = {
      id: `dna_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      extractedAt: new Date().toISOString(),

      bpm: analysis.bpm || 120,
      key: analysis.key || null,
      energy: Math.round((analysis.energy || 0.5) * 100),
      valence: Math.round((analysis.valence || 0.5) * 100),

      brightness: Math.round((analysis.brightness || 0.5) * 100),
      warmth: Math.round((1 - (analysis.brightness || 0.5)) * 100),
      texture: Math.round((analysis.texture || 0.5) * 100),
      noisiness: Math.round((analysis.noisiness || 0.2) * 100),

      bassPresence: Math.round((analysis.spectral?.bass || 0.5) * 100),
      midPresence: Math.round((analysis.spectral?.mid || 0.5) * 100),
      highPresence: Math.round((analysis.spectral?.high || 0.5) * 100),

      genres: analysis.genres || [],
      moods: analysis.moods || [],

      sourceType: "upload",
      fingerprint: analysis.fingerprint,
    };

    return NextResponse.json({ dna });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sound-dna] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Create mock DNA for development/testing
 */
function createMockDNA(name: string): SoundDNA {
  return {
    id: `dna_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    extractedAt: new Date().toISOString(),

    bpm: 110 + Math.floor(Math.random() * 30),
    key: ["C Minor", "D Minor", "G Minor", "A Minor"][Math.floor(Math.random() * 4)],
    energy: 40 + Math.floor(Math.random() * 40),
    valence: 30 + Math.floor(Math.random() * 40),

    brightness: 30 + Math.floor(Math.random() * 40),
    warmth: 40 + Math.floor(Math.random() * 30),
    texture: 40 + Math.floor(Math.random() * 40),
    noisiness: 10 + Math.floor(Math.random() * 30),

    bassPresence: 40 + Math.floor(Math.random() * 30),
    midPresence: 50 + Math.floor(Math.random() * 20),
    highPresence: 30 + Math.floor(Math.random() * 30),

    genres: ["Electronic", "Ambient"],
    moods: ["Atmospheric", "Dark"],

    sourceType: "upload",
    fingerprint: `mock_${Date.now()}`,
  };
}
