import { NextResponse } from "next/server";
import { generateSound, type AudioProvider } from "@/lib/audioProvider";
import type { GenerateSoundRequestBody } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GenerateSoundRequestBody> & { provider?: AudioProvider };
  if (!body?.prompt || !body.prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (!body.parameters) {
    return NextResponse.json({ error: "Parameters missing from payload." }, { status: 400 });
  }

  const payload = body as GenerateSoundRequestBody;
  const provider = body.provider || resolveProvider();

  try {
    const result = await generateSound(provider, payload);
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
  ];

  if (configured && validProviders.includes(configured)) {
    return configured as AudioProvider;
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  return "mock";
}
