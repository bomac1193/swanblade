import { NextResponse } from "next/server";
import { generateSound, type AudioProvider } from "@/lib/audioProvider";
import type { GenerateSoundRequestBody, GameState } from "@/types";
import { correctAudioBPM, isFfmpegAvailable } from "@/lib/bpmCorrection";
import {
  type SoundPalette,
  applyPaletteConstraints,
  validateAgainstPalette,
  paletteToPromptSuffix,
} from "@/lib/soundPalette";
import {
  GAME_STATE_CONFIGS,
  applyGameStateModifiers,
} from "@/lib/gameStateEngine";

export const runtime = "nodejs";

// Check if BPM correction should be applied
function shouldCorrectBPM(prompt: string, bpm: number | undefined): boolean {
  if (!bpm || bpm <= 0) return false;

  const lower = prompt.toLowerCase();
  const rhythmicKeywords = [
    "drum",
    "drums",
    "percussion",
    "beat",
    "loop",
    "rhythm",
    "groove",
    "kick",
    "snare",
    "bpm",
  ];

  return rhythmicKeywords.some((keyword) => lower.includes(keyword));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GenerateSoundRequestBody> & {
    provider?: AudioProvider;
    palette?: SoundPalette;
    gameState?: GameState;
  };

  if (!body?.prompt || !body.prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (!body.parameters) {
    return NextResponse.json({ error: "Parameters missing from payload." }, { status: 400 });
  }

  let payload = body as GenerateSoundRequestBody;
  const provider = body.provider || resolveProvider();
  const { palette, gameState } = body;

  // Apply game state modifiers if specified
  if (gameState && GAME_STATE_CONFIGS[gameState]) {
    const stateConfig = GAME_STATE_CONFIGS[gameState];
    const modifiedParams = applyGameStateModifiers(
      {
        bpm: payload.parameters.bpm ?? 120,
        intensity: payload.parameters.intensity ?? 50,
        texture: payload.parameters.texture ?? 50,
        brightness: payload.parameters.brightness ?? 50,
      },
      gameState
    );

    payload = {
      ...payload,
      prompt: `${payload.prompt}, ${stateConfig.promptKeywords.slice(0, 3).join(", ")}`,
      parameters: {
        ...payload.parameters,
        bpm: modifiedParams.bpm,
        intensity: modifiedParams.intensity,
        texture: modifiedParams.texture,
        brightness: modifiedParams.brightness,
      },
    };
  }

  // Apply palette constraints if specified
  if (palette) {
    // Validate current params against palette
    const validation = validateAgainstPalette(
      {
        bpm: payload.parameters.bpm,
        intensity: payload.parameters.intensity,
        texture: payload.parameters.texture,
        brightness: payload.parameters.brightness,
        noisiness: payload.parameters.noisiness,
      },
      palette
    );

    if (!validation.valid) {
      console.log(`[generate-sound] Palette violations: ${validation.violations.join(", ")}`);
      console.log(`[generate-sound] Applying constraints: ${validation.suggestions.join(", ")}`);
    }

    // Apply palette constraints
    const constrainedParams = applyPaletteConstraints(
      {
        bpm: payload.parameters.bpm,
        intensity: payload.parameters.intensity,
        texture: payload.parameters.texture,
        brightness: payload.parameters.brightness,
        noisiness: payload.parameters.noisiness,
        moodTags: payload.parameters.moodTags,
      },
      palette
    );

    // Add palette context to prompt
    const paletteSuffix = paletteToPromptSuffix(palette);

    payload = {
      ...payload,
      prompt: `${payload.prompt}, ${paletteSuffix}`,
      parameters: {
        ...payload.parameters,
        bpm: constrainedParams.bpm ?? payload.parameters.bpm,
        intensity: constrainedParams.intensity ?? payload.parameters.intensity,
        texture: constrainedParams.texture ?? payload.parameters.texture,
        brightness: constrainedParams.brightness ?? payload.parameters.brightness,
        noisiness: constrainedParams.noisiness ?? payload.parameters.noisiness,
        moodTags: constrainedParams.moodTags ?? payload.parameters.moodTags,
      },
    };
  }

  try {
    const result = await generateSound(provider, payload);

    // Apply BPM correction if needed
    const needsBPMCorrection = shouldCorrectBPM(payload.prompt, payload.parameters.bpm);

    if (needsBPMCorrection && payload.parameters.bpm) {
      const ffmpegAvailable = await isFfmpegAvailable();

      if (ffmpegAvailable && result.audioUrl.startsWith("data:")) {
        // Extract format and base64 from data URL
        const match = result.audioUrl.match(/^data:audio\/(.*?);base64,(.*)$/);

        if (match) {
          const [, format, base64] = match;
          const audioFormat = format === "mpeg" ? "mp3" : format;

          console.log(
            `[generate-sound] Applying BPM correction: target ${payload.parameters.bpm} BPM`
          );

          try {
            const correctedBase64 = await correctAudioBPM(
              base64,
              payload.parameters.bpm,
              null,
              audioFormat
            );

            result.audioUrl = `data:audio/${format};base64,${correctedBase64}`;
            console.log(`[generate-sound] BPM correction applied successfully`);
          } catch (bpmError) {
            console.error("[generate-sound] BPM correction failed, using original audio:", bpmError);
          }
        }
      } else if (!ffmpegAvailable) {
        console.warn("[generate-sound] ffmpeg not available, skipping BPM correction");
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while generating sound.";

    if (provider === "fal") {
      console.warn(`[generate-sound] fal.ai failed (${message}). Falling back to Replicate.`);
      try {
        const fallbackResult = await generateSound("replicate", payload);
        return NextResponse.json(fallbackResult);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : "Unknown error while generating sound.";
        return NextResponse.json({ error: fallbackMessage }, { status: 500 });
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function resolveProvider(): AudioProvider {
  const configured = process.env.AUDIO_PROVIDER?.toLowerCase();
  const validProviders = [
    "mock",
    "openai",
    "stability",
    "elevenlabs",
    "replicate",
    "fal",
    "huggingface",
    "modal",
    "rave",
    "audiocraft",
    "neuralgrains",
    "sigilwave",
    "physim",
    "suno",
    "starforge",
  ];

  if (configured && validProviders.includes(configured)) {
    return configured as AudioProvider;
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  return "mock";
}
