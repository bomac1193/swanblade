import OpenAI from "openai";
import type { GenerateSoundRequestBody, GenerateSoundResponse } from "@/types";

export type AudioProvider = "mock" | "openai" | "stability" | "elevenlabs";

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const stabilityApiKey = process.env.STABILITY_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

type OpenAIAudioFormat = "wav" | "aac" | "mp3" | "flac" | "opus" | "pcm16";
type OpenAIAudioVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse"
  | "marin"
  | "cedar"
  | (string & {});

export async function generateSound(provider: AudioProvider, request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  switch (provider) {
    case "mock":
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { audioUrl: "/dummy-audio/demo1.mp3" };
    case "openai":
      if (!openaiClient) {
        throw new Error("OpenAI API key missing. Add OPENAI_API_KEY to .env.local.");
      }
      return generateWithOpenAI(request);
    case "stability":
      return generateWithStability(request);
    case "elevenlabs":
      return generateWithElevenLabs(request);
    default:
      throw new Error("Unknown provider");
  }
}

async function generateWithOpenAI(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!openaiClient) {
    throw new Error("OpenAI client unavailable.");
  }

  const format = (process.env.OPENAI_AUDIO_FORMAT as OpenAIAudioFormat) ?? "wav";
  const model = process.env.OPENAI_AUDIO_MODEL ?? "gpt-4o-audio-preview";
  const voice = (process.env.OPENAI_AUDIO_VOICE as OpenAIAudioVoice) ?? "alloy";
  const targetLength = Math.max(2, Math.min(60, request.parameters.lengthSeconds ?? 10));

  const result = await openaiClient.chat.completions.create({
    model,
    modalities: ["text", "audio"],
    audio: {
      voice,
      format,
    },
    messages: [
      {
        role: "system",
        content:
          "You are Audiogen, an advanced sound designer. Craft immersive, original SFX or musical textures from prompts without narration. No spoken words or silence—fill the entire duration with evocative sound design.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildSoundDesignPrompt(request, targetLength),
          },
        ],
      },
    ],
  });

  const audioBase64 = result.choices?.[0]?.message?.audio?.data;
  if (!audioBase64) {
    throw new Error("OpenAI response did not include audio data.");
  }

  return { audioUrl: `data:${formatToMime(format)};base64,${audioBase64}` };
}

async function generateWithStability(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!stabilityApiKey) {
    throw new Error("Stability API key missing. Add STABILITY_API_KEY to .env.local.");
  }

  const endpoint = process.env.STABILITY_AUDIO_ENDPOINT ?? "https://api.stability.ai/v2beta/stable-audio/text-to-audio";
  const format = (process.env.STABILITY_AUDIO_FORMAT ?? "wav").toLowerCase();
  const model = process.env.STABILITY_AUDIO_MODEL ?? "stable-audio";
  const lengthSeconds = request.parameters.lengthSeconds ?? 10;

  const body = {
    model,
    prompt: request.prompt,
    negative_prompt: "",
    cfg_scale: 7,
    seed: request.parameters.seed ?? Math.floor(Math.random() * 10000),
    duration: lengthSeconds,
    audio_format: format,
    mode: "text-to-audio",
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stabilityApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stability request failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as {
    audio?: Array<{ audio_base64?: string; mime?: string }>;
    output?: Array<{ audio?: string }>;
    audio_base64?: string;
  };
  const audioBase64 = json.audio?.[0]?.audio_base64 ?? json.output?.[0]?.audio ?? json.audio_base64;
  if (!audioBase64) {
    throw new Error(`Stability response missing audio data. Raw payload: ${JSON.stringify(json).slice(0, 400)}...`);
  }

  const mimeFromResponse = json.audio?.[0]?.mime;
  const mime =
    mimeFromResponse ??
    (format === "mp3" ? "audio/mpeg" : format === "aac" ? "audio/aac" : format === "flac" ? "audio/flac" : "audio/wav");
  return { audioUrl: `data:${mime};base64,${audioBase64}` };
}

async function generateWithElevenLabs(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!elevenlabsApiKey) {
    throw new Error("ElevenLabs API key missing. Add ELEVENLABS_API_KEY to .env.local.");
  }

  const endpoint = "https://api.elevenlabs.io/v1/sound-generation";
  const durationSeconds = Math.max(0.5, Math.min(22, request.parameters.lengthSeconds ?? 10));
  // Use mp3_44100_192 for best browser compatibility while maintaining high quality
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_192";

  const body = {
    text: request.prompt,
    duration_seconds: durationSeconds,
    prompt_influence: 0.5,
  };

  const url = new URL(endpoint);
  url.searchParams.append("output_format", outputFormat);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "xi-api-key": elevenlabsApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs request failed (${response.status}): ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");

  let mime = "audio/wav";
  if (outputFormat.startsWith("mp3")) {
    mime = "audio/mpeg";
  } else if (outputFormat.startsWith("opus")) {
    mime = "audio/opus";
  } else if (outputFormat.startsWith("pcm")) {
    mime = "audio/wav";
  }

  return { audioUrl: `data:${mime};base64,${audioBase64}` };
}

function buildSoundDesignPrompt(request: GenerateSoundRequestBody, targetLength: number) {
  const { parameters } = request;
  const moodTags = parameters.moodTags?.length ? parameters.moodTags.join(", ") : "Free-form";
  const notes: string[] = [
    `Category: ${parameters.type}`,
    `Target length: ${targetLength} seconds`,
    `Mood tags: ${moodTags}`,
    `BPM: ${parameters.bpm ?? "Free"} | Key: ${parameters.key ?? "Atonal / FX"}`,
    `Dynamics — intensity ${parameters.intensity}/100, texture ${parameters.texture}/100`,
    `Tone sculpting — brightness ${parameters.brightness}/100, noisiness ${parameters.noisiness}/100`,
  ];
  if (parameters.seed != null) {
    notes.push(`Seed: ${parameters.seed} (use for repeatable structure)`);
  }

  return [
    `Primary concept:\n${request.prompt.trim()}`,
    "",
    "Production notes:",
    ...notes.map((line) => `- ${line}`),
    "",
    "Create layers (bed, accents, transitions) that feel handcrafted.",
    "No narration, speech, or text-to-voice artifacts. Keep it purely sound design.",
  ].join("\n");
}

function formatToMime(format: OpenAIAudioFormat) {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "opus":
      return "audio/opus";
    case "pcm16":
      return "audio/wav";
    case "wav":
    default:
      return "audio/wav";
  }
}
