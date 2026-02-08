import { NextResponse } from "next/server";
import { generateSound, type AudioProvider } from "@/lib/audioProvider";
import {
  type GameState,
  GAME_STATE_CONFIGS,
  applyGameStateModifiers,
} from "@/lib/gameStateEngine";
import {
  type SoundPalette,
  applyPaletteConstraints,
  paletteToPromptSuffix,
} from "@/lib/soundPalette";
import {
  buildStemPrompts,
  getDefaultStemsForState,
  createBundleManifest,
  type StemBundle,
  type StemResult,
} from "@/lib/stemGenerator";

export const runtime = "nodejs";

// o8 Protocol for provenance stamping
const o8ApiUrl = process.env.O8_API_URL || "http://localhost:3001";
const o8IdentityId = process.env.O8_IDENTITY_ID;

interface GenerateGameAudioRequest {
  gameState: GameState;
  palette?: SoundPalette;
  paletteId?: string;
  stemTypes?: string[];
  duration?: number;
  bpm?: number;
  key?: string;
  basePrompt?: string;
  provider?: AudioProvider;
}

/**
 * POST /api/generate-game-audio - Generate game-state aware audio with stems
 *
 * Generates a coherent stem bundle for a specific game state,
 * optionally constrained by a sound palette.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateGameAudioRequest;

    const {
      gameState,
      palette,
      stemTypes,
      duration = 30,
      bpm,
      key,
      basePrompt,
      provider = resolveProvider(),
    } = body;

    // Validate game state
    if (!gameState || !GAME_STATE_CONFIGS[gameState]) {
      return NextResponse.json(
        { error: `Invalid game state: ${gameState}` },
        { status: 400 }
      );
    }

    const stateConfig = GAME_STATE_CONFIGS[gameState];
    const requestedStems = stemTypes || getDefaultStemsForState(gameState);

    // Build stem prompts with game state and palette context
    const stemRequests = buildStemPrompts(
      {
        gameState,
        palette,
        stemTypes: requestedStems,
        duration,
        bpm,
        key,
        basePrompt,
      },
      stateConfig
    );

    // Generate each stem
    const stemResults: StemResult[] = [];
    const errors: string[] = [];

    for (const stemRequest of stemRequests) {
      try {
        // Build base parameters
        const baseParams = {
          bpm: stemRequest.bpm ?? 120,
          intensity: stemRequest.intensity ?? 50,
          texture: 50,
          brightness: 50,
        };

        // Apply game state modifiers
        const modifiedParams = applyGameStateModifiers(baseParams, gameState);

        // Build params with additional fields
        let params = {
          ...modifiedParams,
          noisiness: 0.1,
          moodTags: stateConfig.promptKeywords.slice(0, 3),
        };

        // Apply palette constraints if provided
        if (palette) {
          const constrained = applyPaletteConstraints(params, palette);
          params = {
            ...params,
            bpm: constrained.bpm ?? params.bpm,
            intensity: constrained.intensity ?? params.intensity,
            texture: constrained.texture ?? params.texture,
            brightness: constrained.brightness ?? params.brightness,
            noisiness: constrained.noisiness ?? params.noisiness,
            moodTags: constrained.moodTags ?? params.moodTags,
          };
        }

        // Build final prompt
        let prompt = stemRequest.prompt;
        if (palette) {
          prompt += `, ${paletteToPromptSuffix(palette)}`;
        }

        // Generate the stem
        const result = await generateSound(provider, {
          prompt,
          parameters: {
            type: "Melody",
            moodTags: params.moodTags || [],
            lengthSeconds: stemRequest.duration,
            bpm: params.bpm || 120,
            key: stemRequest.key || "C Minor",
            intensity: params.intensity || 50,
            texture: params.texture || 50,
            brightness: params.brightness || 50,
            noisiness: params.noisiness || 0.1,
          },
        });

        // Stamp with provenance if configured
        let provenanceCid: string | undefined;
        if (o8IdentityId && result.audioUrl) {
          try {
            provenanceCid = await stampStemProvenance({
              audioUrl: result.audioUrl,
              stemType: stemRequest.stemType,
              gameState,
              prompt,
            });
          } catch (err) {
            console.warn(`[game-audio] Provenance stamping failed for ${stemRequest.stemType}:`, err);
          }
        }

        stemResults.push({
          stemType: stemRequest.stemType,
          audioUrl: result.audioUrl,
          provenanceCid,
          duration: stemRequest.duration,
          metadata: {
            bpm: params.bpm,
            key: stemRequest.key,
            intensity: params.intensity,
          },
        });
      } catch (stemError) {
        const message = stemError instanceof Error ? stemError.message : "Unknown error";
        errors.push(`${stemRequest.stemType}: ${message}`);
        console.error(`[game-audio] Failed to generate ${stemRequest.stemType}:`, stemError);
      }
    }

    // Check if we have at least some stems
    if (stemResults.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any stems", details: errors },
        { status: 500 }
      );
    }

    // Create the bundle
    const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const bundleData: Omit<StemBundle, "manifest"> = {
      id: bundleId,
      name: `${gameState} Bundle`,
      gameState,
      paletteId: palette?.id,
      createdAt: new Date().toISOString(),
      stems: stemResults,
    };

    const manifest = createBundleManifest(bundleData, o8IdentityId);

    const bundle: StemBundle = {
      ...bundleData,
      manifest,
    };

    return NextResponse.json({
      success: true,
      bundle,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[game-audio] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Stamp a stem with o8 provenance
 */
async function stampStemProvenance(input: {
  audioUrl: string;
  stemType: string;
  gameState: GameState;
  prompt: string;
}): Promise<string> {
  const { audioUrl, stemType, gameState, prompt } = input;

  // Extract base64 from data URL
  const match = audioUrl.match(/^data:audio\/.*?;base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid audio URL format");
  }

  const audioBase64 = match[1];

  // Get fingerprint
  const fingerprintResponse = await fetch(`${o8ApiUrl}/api/provenance/fingerprint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: audioBase64 }),
  });

  if (!fingerprintResponse.ok) {
    throw new Error("Failed to generate fingerprint");
  }

  const { fingerprint } = await fingerprintResponse.json();

  // Stamp with provenance
  const stampResponse = await fetch(`${o8ApiUrl}/api/provenance/stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity_id: o8IdentityId,
      content_type: "audio",
      content_fingerprint: fingerprint,
      title: `${gameState} - ${stemType}`,
      ai_contribution: 1.0,
      ai_model: {
        name: "swanblade",
        provider: "swanblade",
        version: "1.0",
      },
      metadata: {
        stem_type: stemType,
        game_state: gameState,
        prompt,
        source: "swanblade-game-audio",
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (!stampResponse.ok) {
    throw new Error("Failed to stamp provenance");
  }

  const { declaration_cid } = await stampResponse.json();
  return declaration_cid;
}

/**
 * Resolve the audio provider to use
 */
function resolveProvider(): AudioProvider {
  const configured = process.env.AUDIO_PROVIDER?.toLowerCase();
  const validProviders = [
    "mock", "openai", "stability", "elevenlabs", "replicate",
    "fal", "huggingface", "modal", "suno", "starforge",
  ];

  if (configured && validProviders.includes(configured)) {
    return configured as AudioProvider;
  }

  if (process.env.FAL_API_KEY) return "fal";
  if (process.env.REPLICATE_API_KEY) return "replicate";
  if (process.env.OPENAI_API_KEY) return "openai";

  return "mock";
}
