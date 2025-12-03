import { NextResponse } from "next/server";
import { generateSound, type AudioProvider } from "@/lib/audioProvider";
import type { GenerateSoundRequestBody } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GenerateSoundRequestBody>;
    if (!body?.prompt || !body.prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }
    if (!body.parameters) {
      return NextResponse.json({ error: "Parameters missing from payload." }, { status: 400 });
    }

    const provider = resolveProvider();
    const result = await generateSound(provider, body as GenerateSoundRequestBody);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while generating sound.";
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
  ];

  if (configured && validProviders.includes(configured)) {
    return configured as AudioProvider;
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  return "mock";
}
