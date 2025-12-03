import OpenAI from "openai";
import type { GenerateSoundRequestBody, GenerateSoundResponse } from "@/types";

export type AudioProvider =
  | "mock"
  | "openai"
  | "stability"
  | "elevenlabs"
  | "rave"
  | "audiocraft"
  | "neuralgrains"
  | "sigilwave"
  | "physim";

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const stabilityApiKey = process.env.STABILITY_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

// Experimental audio generation providers
const raveModelPath = process.env.RAVE_MODEL_PATH; // TODO: Set path to RAVE model checkpoint
const audiocraftEndpoint = process.env.AUDIOCRAFT_ENDPOINT; // TODO: Set AudioCraft API endpoint
const neuralgrainsEndpoint = process.env.NEURALGRAINS_ENDPOINT; // TODO: Set NeuralGrains API endpoint

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

export async function generateSound(
  provider: AudioProvider,
  request: GenerateSoundRequestBody
): Promise<GenerateSoundResponse> {
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
    case "rave":
      return generateWithRAVE(request);
    case "audiocraft":
      return generateWithAudioCraft(request);
    case "neuralgrains":
      return generateWithNeuralGrains(request);
    case "sigilwave":
      return generateWithSigilWave(request);
    case "physim":
      return generateWithPhysim(request);
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
          "You are Swanblade, an advanced sound designer. Craft immersive, original SFX or musical textures from prompts without narration. No spoken words or silence—fill the entire duration with evocative sound design.",
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

/**
 * RAVE (Realtime Audio Variational autoEncoder) - Neural audio synthesis
 * Generates audio by encoding/decoding through a trained neural audio model
 * Requires: Python environment with RAVE installed, trained model checkpoint
 */
async function generateWithRAVE(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!raveModelPath) {
    throw new Error("RAVE model path missing. Add RAVE_MODEL_PATH to .env.local pointing to your .ts checkpoint.");
  }

  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");

  // Build enriched prompt for neural synthesis
  const targetLength = Math.max(2, Math.min(60, request.parameters.lengthSeconds ?? 10));
  const enrichedPrompt = buildRAVEPrompt(request, targetLength);

  // Generate unique output filename
  const outputDir = path.join(os.tmpdir(), "swanblade-rave");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `rave_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.wav`);

  // TODO: Adjust command based on your RAVE installation
  // This example uses the RAVE prior sampling mode
  // You may need to adjust arguments based on your model and RAVE version
  const pythonPath = process.env.RAVE_PYTHON_PATH ?? "python";
  const sampleRate = 48000;
  const numSamples = Math.floor(targetLength * sampleRate);

  // RAVE command structure (adjust to your setup):
  // python -m rave.core sample --model <path> --duration <seconds> --output <file>
  const command = [
    pythonPath,
    "-m",
    "rave.core",
    "sample",
    "--model",
    `"${raveModelPath}"`,
    "--duration",
    targetLength.toString(),
    "--output",
    `"${outputFile}"`,
    "--temperature",
    (request.parameters.intensity / 100).toFixed(2), // Use intensity as temperature
    "--seed",
    (request.parameters.seed ?? Math.floor(Math.random() * 100000)).toString(),
  ].join(" ");

  try {
    // Execute RAVE generation
    console.log(`[RAVE] Executing: ${command}`);
    console.log(`[RAVE] Prompt context: ${enrichedPrompt.substring(0, 100)}...`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 2 minute timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    if (stderr && !stderr.includes("Warning")) {
      console.warn(`[RAVE] stderr: ${stderr}`);
    }

    // Check if output file exists
    if (!fs.existsSync(outputFile)) {
      throw new Error("RAVE did not produce output file");
    }

    // Read generated audio file
    const audioBuffer = fs.readFileSync(outputFile);
    const audioBase64 = audioBuffer.toString("base64");

    // Clean up temporary file
    fs.unlinkSync(outputFile);

    return { audioUrl: `data:audio/wav;base64,${audioBase64}` };
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }

    if (error instanceof Error) {
      throw new Error(`RAVE generation failed: ${error.message}`);
    }
    throw new Error("RAVE generation failed with unknown error");
  }
}

/**
 * AudioCraft / MusicGen - Meta's music generation model
 * Can generate music from text descriptions
 * TODO: Implement REST API client or local model inference
 */
async function generateWithAudioCraft(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  // TODO: Replace with actual AudioCraft API or local inference
  if (!audiocraftEndpoint) {
    throw new Error(
      "AudioCraft endpoint missing. Add AUDIOCRAFT_ENDPOINT to .env.local or run local AudioCraft server."
    );
  }

  const targetLength = Math.max(2, Math.min(30, request.parameters.lengthSeconds ?? 10));
  const enrichedPrompt = buildMusicGenPrompt(request, targetLength);

  // TODO: Implement actual API call structure
  // Example structure for a hypothetical AudioCraft REST API:
  const body = {
    prompt: enrichedPrompt,
    duration: targetLength,
    temperature: request.parameters.intensity / 100,
    top_k: 250,
    top_p: 0.95,
    cfg_coef: 3.0,
    seed: request.parameters.seed ?? Math.floor(Math.random() * 100000),
  };

  try {
    const response = await fetch(audiocraftEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: Add authentication if required
        // 'Authorization': `Bearer ${process.env.AUDIOCRAFT_API_KEY}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AudioCraft request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { audio_base64?: string; audio_url?: string };

    if (data.audio_base64) {
      return { audioUrl: `data:audio/wav;base64,${data.audio_base64}` };
    }

    if (data.audio_url) {
      return { audioUrl: data.audio_url };
    }

    throw new Error("AudioCraft response missing audio data");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AudioCraft generation failed: ${error.message}`);
    }
    throw new Error("AudioCraft generation failed with unknown error");
  }
}

/**
 * NeuralGrains - Experimental granular synthesis engine
 * Uses neural networks to generate and arrange audio grains
 * TODO: Implement connection to NeuralGrains service or local process
 */
async function generateWithNeuralGrains(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  // TODO: Replace with actual NeuralGrains implementation
  if (!neuralgrainsEndpoint) {
    throw new Error("NeuralGrains endpoint missing. Add NEURALGRAINS_ENDPOINT to .env.local.");
  }

  const targetLength = Math.max(2, Math.min(60, request.parameters.lengthSeconds ?? 10));

  // Build synthesis parameters from request
  const synthesisParams = {
    prompt: request.prompt,
    duration: targetLength,
    grain_size_ms: 50, // TODO: Map from request.parameters.texture
    grain_density: request.parameters.texture / 100,
    pitch_variance: request.parameters.brightness / 100,
    amplitude_envelope: request.parameters.intensity / 100,
    noise_amount: request.parameters.noisiness,
    seed: request.parameters.seed ?? Math.floor(Math.random() * 100000),
  };

  // TODO: Implement actual API call
  // This is a placeholder structure
  try {
    const response = await fetch(neuralgrainsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: Add auth headers if needed
      },
      body: JSON.stringify(synthesisParams),
    });

    if (!response.ok) {
      throw new Error(`NeuralGrains request failed (${response.status})`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return { audioUrl: `data:audio/wav;base64,${audioBase64}` };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`NeuralGrains generation failed: ${error.message}`);
    }
    throw new Error("NeuralGrains generation failed");
  }
}

/**
 * SigilWave - Experimental concatenative synthesis model
 * Analyzes corpus and reassembles audio fragments based on semantic similarity
 * MOCKED: This is a conceptual/experimental provider
 */
async function generateWithSigilWave(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  // Mock implementation - represents experimental concatenative synthesis
  console.log("[SigilWave] Experimental provider - generating mock audio");

  const targetLength = Math.max(2, Math.min(60, request.parameters.lengthSeconds ?? 10));

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000 + targetLength * 100));

  // TODO: Implement actual SigilWave engine
  // Would require:
  // 1. Audio corpus analysis and feature extraction
  // 2. Semantic embedding of prompt
  // 3. Fragment selection based on similarity
  // 4. Concatenation with crossfading
  // 5. Post-processing and normalization

  // For now, return placeholder
  // In production, this would call the actual synthesis engine
  const mockResponse = {
    prompt: request.prompt,
    analysis: {
      segments_analyzed: 1247,
      fragments_selected: Math.floor(targetLength * 50),
      semantic_coherence: 0.87,
    },
    // TODO: Replace with actual generated audio
  };

  console.log("[SigilWave] Mock synthesis:", mockResponse.analysis);

  // Return mock audio for now
  return { audioUrl: "/dummy-audio/demo1.mp3" };
}

/**
 * Physim - Physical modeling synthesis
 * Simulates acoustic instruments and physical sound-producing systems
 * MOCKED: Placeholder for physical modeling engine
 */
async function generateWithPhysim(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  // Mock implementation - represents physical modeling synthesis
  console.log("[Physim] Physical modeling provider - generating mock audio");

  const targetLength = Math.max(2, Math.min(60, request.parameters.lengthSeconds ?? 10));

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1500 + targetLength * 80));

  // TODO: Implement actual physical modeling synthesis
  // Would require:
  // 1. Parse prompt for instrument/material descriptors
  // 2. Initialize physical model (string, membrane, tube, etc.)
  // 3. Set excitation parameters (bow, strike, breath)
  // 4. Run physics simulation at audio rate
  // 5. Apply resonance and damping characteristics

  const physicalModel = {
    type: detectModelType(request.prompt), // TODO: Implement
    excitation: request.parameters.intensity / 100,
    resonance: request.parameters.brightness / 100,
    damping: 1 - request.parameters.texture / 100,
    noise_coupling: request.parameters.noisiness,
    duration: targetLength,
  };

  console.log("[Physim] Mock physical model:", physicalModel);

  // Return mock audio for now
  // TODO: Replace with actual physical modeling engine output
  return { audioUrl: "/dummy-audio/demo1.mp3" };
}

// ========== Helper Functions ==========

/**
 * Build RAVE-specific prompt with neural synthesis cues
 */
function buildRAVEPrompt(request: GenerateSoundRequestBody, targetLength: number): string {
  const { parameters } = request;

  const notes: string[] = [
    `Duration: ${targetLength}s`,
    `Neural temperature: ${(parameters.intensity / 100).toFixed(2)}`,
    `Latent texture: ${parameters.texture}/100`,
    `Spectral brightness: ${parameters.brightness}/100`,
    `Stochastic noise: ${parameters.noisiness}`,
  ];

  if (parameters.seed != null) {
    notes.push(`Seed: ${parameters.seed}`);
  }

  return [
    `Neural audio generation prompt:`,
    request.prompt.trim(),
    "",
    "Synthesis parameters:",
    ...notes.map((line) => `- ${line}`),
    "",
    "Generate continuous, evolving neural audio without silence or clicks.",
  ].join("\n");
}

/**
 * Build MusicGen/AudioCraft-specific prompt
 */
function buildMusicGenPrompt(request: GenerateSoundRequestBody, targetLength: number): string {
  const { parameters } = request;

  // MusicGen works well with musical descriptors
  const musicalContext = [];

  if (parameters.bpm) {
    musicalContext.push(`${parameters.bpm} BPM`);
  }

  if (parameters.key && parameters.key !== "Atonal / FX") {
    musicalContext.push(`in ${parameters.key}`);
  }

  const moodTags = parameters.moodTags?.join(", ");
  if (moodTags) {
    musicalContext.push(`mood: ${moodTags}`);
  }

  const contextStr = musicalContext.length > 0 ? ` (${musicalContext.join(", ")})` : "";

  return `${request.prompt.trim()}${contextStr}`;
}

/**
 * Detect physical model type from prompt keywords
 * TODO: Implement more sophisticated NLP-based detection
 */
function detectModelType(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("string") || lower.includes("guitar") || lower.includes("violin")) {
    return "string";
  }
  if (lower.includes("drum") || lower.includes("percussion") || lower.includes("hit")) {
    return "membrane";
  }
  if (lower.includes("wind") || lower.includes("breath") || lower.includes("flute")) {
    return "tube";
  }
  if (lower.includes("bell") || lower.includes("metal") || lower.includes("chime")) {
    return "metal-bar";
  }

  return "generic-resonator";
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
