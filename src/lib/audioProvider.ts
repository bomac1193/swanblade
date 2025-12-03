import OpenAI from "openai";
import type { AudioReferencePayload, GenerateSoundRequestBody, GenerateSoundResponse } from "@/types";

export type AudioProvider =
  | "mock"
  | "openai"
  | "stability"
  | "elevenlabs"
  | "replicate"
  | "fal"
  | "huggingface"
  | "modal"
  | "rave"
  | "audiocraft"
  | "neuralgrains"
  | "sigilwave"
  | "physim"
  | "suno";

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const stabilityApiKey = process.env.STABILITY_API_KEY;
const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

// Cloud audio generation providers
const replicateApiKey = process.env.REPLICATE_API_KEY;
const falApiKey = process.env.FAL_API_KEY;
const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
const modalApiKey = process.env.MODAL_API_KEY;

// Experimental audio generation providers
const raveModelPath = process.env.RAVE_MODEL_PATH; // TODO: Set path to RAVE model checkpoint
const audiocraftEndpoint = process.env.AUDIOCRAFT_ENDPOINT; // TODO: Set AudioCraft API endpoint
const neuralgrainsEndpoint = process.env.NEURALGRAINS_ENDPOINT; // TODO: Set NeuralGrains API endpoint

// Suno/MiniMax - Professional vocal/music generation
// Option 1: AIML API with MiniMax Music (Suno was deprecated, now uses MiniMax)
const aimlApiKey = process.env.AIML_API_KEY; // https://aimlapi.com/minimax-music-api
// Option 2: Self-hosted suno-api (https://github.com/gcui-art/suno-api)
const sunoApiEndpoint = process.env.SUNO_API_ENDPOINT; // e.g., http://localhost:3000
const sunoCookie = process.env.SUNO_COOKIE; // Your Suno account cookie

type ReplicateFileOutput = {
  url: string | (() => string);
};

type FalAudioResponse = {
  audio_file?: {
    url?: string;
  };
};

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
    case "replicate":
      return generateWithReplicate(request);
    case "fal":
      return generateWithFal(request);
    case "huggingface":
      return generateWithHuggingFace(request);
    case "modal":
      return generateWithModal(request);
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
    case "suno":
      return generateWithSuno(request);
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
 * Replicate - MusicGen music generation via Replicate API
 * Generates high-quality music from text prompts using Meta's MusicGen model
 */
async function generateWithReplicate(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!replicateApiKey) {
    throw new Error("Replicate API key missing. Add REPLICATE_API_KEY to .env.local.");
  }

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: replicateApiKey });

  const targetLength = Math.max(1, Math.min(30, request.parameters.lengthSeconds ?? 10));
  const prompt = buildMusicGenPrompt(request, targetLength);

  try {
    const output = await replicate.run("meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb", {
      input: {
        prompt: prompt,
        model_version: "stereo-large",
        duration: targetLength,
        temperature: (request.parameters.intensity ?? 50) / 100,
        top_k: 320,
        top_p: 0.3,
        output_format: "wav",
        seed: request.parameters.seed ?? -1,
      },
    });

    // Replicate MusicGen returns a URL, FileOutput, or array of URLs
    let audioUrl: string;

    const resolveUrl = (value: ReplicateFileOutput) => {
      const raw = typeof value.url === "function" ? value.url() : value.url;
      return String(raw);
    };

    if (typeof output === "string") {
      audioUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      // Handle FileOutput objects with url() method
      if (isReplicateFileOutput(first)) {
        audioUrl = resolveUrl(first);
      } else if (typeof first === "string") {
        audioUrl = first;
      } else {
        throw new Error(`Unexpected array element type: ${typeof first}`);
      }
    } else if (isReplicateFileOutput(output)) {
      // Handle FileOutput object with url() method
      audioUrl = resolveUrl(output);
    } else {
      throw new Error(`Unexpected Replicate output format: ${typeof output}`);
    }

    if (!audioUrl) {
      throw new Error(`No audio URL from Replicate`);
    }

    // Fetch the audio and convert to base64
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch generated audio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return { audioUrl: `data:audio/wav;base64,${audioBase64}` };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Replicate generation failed: ${error.message}`);
    }
    throw new Error("Replicate generation failed with unknown error");
  }
}

/**
 * fal.ai - Stable Audio generation via fal.ai API
 * Generates high-quality audio using Stability AI's Stable Audio models
 */
async function generateWithFal(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!falApiKey) {
    throw new Error("fal.ai API key missing. Add FAL_API_KEY to .env.local.");
  }

  const { fal } = await import("@fal-ai/client");

  fal.config({
    credentials: falApiKey,
  });

  const targetLength = Math.max(1, Math.min(180, request.parameters.lengthSeconds ?? 10));
  const prompt = buildMusicGenPrompt(request, targetLength);

  try {
    // Use Stable Audio 2.5 for enterprise-grade stereo quality
    const falInput: Record<string, unknown> = {
      prompt: prompt,
      duration: targetLength,
      num_inference_steps: 100,
      guidance_scale: 7.0,
    };

    const result = (await fal.subscribe("fal-ai/stable-audio-25/text-to-audio", {
      input: falInput,
    })) as FalAudioResponse;

    // Access audio_file from result
    const audioFile = result.audio_file;
    const audioUrl = audioFile?.url;
    if (!audioUrl) {
      throw new Error("fal.ai did not return audio URL");
    }

    // Fetch the audio and convert to base64
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch generated audio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    const contentType = audioFile?.content_type ?? "audio/wav";

    return { audioUrl: `data:${contentType};base64,${audioBase64}` };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`fal.ai generation failed: ${error.message}`);
    }
    throw new Error("fal.ai generation failed with unknown error");
  }
}

/**
 * Hugging Face - Audio generation via Hugging Face Inference API
 * Supports multiple audio generation models from the Hugging Face Hub
 */
async function generateWithHuggingFace(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!huggingfaceApiKey) {
    throw new Error("Hugging Face API key missing. Add HUGGINGFACE_API_KEY to .env.local.");
  }

  const model = process.env.HUGGINGFACE_MODEL ?? "facebook/musicgen-small";
  const endpoint = `https://api-inference.huggingface.co/models/${model}`;

  const targetLength = Math.max(1, Math.min(30, request.parameters.lengthSeconds ?? 10));
  const prompt = buildMusicGenPrompt(request, targetLength);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${huggingfaceApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: Math.floor(targetLength * 50), // Approximate tokens for duration
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face request failed (${response.status}): ${errorText}`);
    }

    // Hugging Face Inference API returns audio as binary
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // Most HF audio models output WAV
    return { audioUrl: `data:audio/wav;base64,${audioBase64}` };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Hugging Face generation failed: ${error.message}`);
    }
    throw new Error("Hugging Face generation failed with unknown error");
  }
}

/**
 * Modal - Custom deployed MusicGen endpoint on Modal infrastructure
 * Requires user to deploy their own Modal MusicGen endpoint
 * See: https://modal.com/docs/examples/musicgen
 */
async function generateWithModal(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!modalApiKey) {
    throw new Error("Modal API key missing. Add MODAL_API_KEY to .env.local.");
  }

  const modalEndpoint = process.env.MODAL_ENDPOINT;
  if (!modalEndpoint) {
    throw new Error(
      "Modal endpoint missing. Deploy a Modal MusicGen function and add MODAL_ENDPOINT to .env.local."
    );
  }

  const targetLength = Math.max(1, Math.min(300, request.parameters.lengthSeconds ?? 10));
  const prompt = buildMusicGenPrompt(request, targetLength);

  try {
    // Modal endpoints typically use JSON POST requests
    const response = await fetch(modalEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modalApiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        lyrics: "[inst]", // Instrumental only
        duration: targetLength,
        format: "mp3",
        manual_seeds: request.parameters.seed ?? 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Modal request failed (${response.status}): ${errorText}`);
    }

    // Modal endpoints can return either JSON with audio data or raw audio bytes
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = (await response.json()) as { audio_base64?: string; audio_url?: string };

      if (data.audio_base64) {
        return { audioUrl: `data:audio/mpeg;base64,${data.audio_base64}` };
      }

      if (data.audio_url) {
        // Fetch the audio from the URL
        const audioResponse = await fetch(data.audio_url);
        const audioBuffer = await audioResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");
        return { audioUrl: `data:audio/mpeg;base64,${audioBase64}` };
      }

      throw new Error("Modal response missing audio data");
    } else {
      // Assume raw audio bytes
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      return { audioUrl: `data:audio/mpeg;base64,${audioBase64}` };
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Modal generation failed: ${error.message}`);
    }
    throw new Error("Modal generation failed with unknown error");
  }
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

    const { stderr } = await execAsync(command, {
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

/**
 * Suno AI - Professional vocal and music generation
 * Supports full songs with vocals, choir, and complex musical arrangements
 * Best for: Angel choirs, vocals, singing, full musical compositions
 *
 * Two integration options:
 * 1. Self-hosted suno-api (https://github.com/gcui-art/suno-api)
 * 2. AIML API service (https://aimlapi.com/suno-ai-api)
 */
async function generateWithSuno(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  // Check which Suno integration method is configured
  if (aimlApiKey) {
    return generateWithSunoAIMLAPI(request);
  } else if (sunoApiEndpoint) {
    return generateWithSunoSelfHosted(request);
  } else {
    throw new Error(
      "Suno AI not configured. Add either AIML_API_KEY or SUNO_API_ENDPOINT + SUNO_COOKIE to .env.local."
    );
  }
}

/**
 * Suno via AIML API - Now uses MiniMax Music (Suno was deprecated)
 * MiniMax supports vocals, choir, and full musical compositions
 */
async function generateWithSunoAIMLAPI(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!aimlApiKey) {
    throw new Error("AIML API key missing. Add AIML_API_KEY to .env.local.");
  }

  const endpoint = "https://api.aimlapi.com/v2/generate/audio";
  const targetLength = Math.max(1, Math.min(240, request.parameters.lengthSeconds ?? 10));

  // Build vocal-enhanced prompt
  const musicPrompt = buildSunoPrompt(request, targetLength);
  const makeInstrumental = process.env.SUNO_INSTRUMENTAL === "true" ? true : false;

  try {
    // Step 1: Initiate generation with MiniMax Music
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aimlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "minimax-music",
        prompt: musicPrompt,
        // MiniMax doesn't have explicit instrumental flag, but we can add it to prompt
        ...(makeInstrumental && { prompt: `${musicPrompt} (instrumental only, no vocals)` }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AIML API MiniMax request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      generation_id?: string;
      id?: string;
    };

    // Get the generation ID
    const generationId = data.generation_id || data.id;
    if (!generationId) {
      throw new Error("AIML API did not return a generation ID");
    }

    // Step 2: Poll for completion (MiniMax typically takes 30-120 seconds)
    const maxAttempts = 60;
    const pollInterval = 3000; // 3 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`${endpoint}?generation_id=${generationId}`, {
        headers: {
          "Authorization": `Bearer ${aimlApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        continue; // Retry on error
      }

      const statusData = (await statusResponse.json()) as {
        status?: string;
        audio_url?: string;
        url?: string;
        audio_file?: { url: string; content_type?: string };
      };

      const status = statusData.status;
      const audioUrl = statusData.audio_url || statusData.url || statusData.audio_file?.url;

      if (status === "completed" || status === "success") {
        if (!audioUrl) {
          throw new Error("MiniMax generation complete but no audio URL provided");
        }

        // Fetch and convert to base64
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch MiniMax audio: ${audioResponse.status}`);
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");

        const contentType = statusData.audio_file?.content_type || "audio/mpeg";

        return { audioUrl: `data:${contentType};base64,${audioBase64}` };
      } else if (status === "failed" || status === "error") {
        throw new Error("MiniMax generation failed");
      }
      // If status is "processing" or "pending", continue polling
    }

    throw new Error("MiniMax generation timed out after 3 minutes");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`MiniMax (AIML API) generation failed: ${error.message}`);
    }
    throw new Error("MiniMax (AIML API) generation failed with unknown error");
  }
}

/**
 * Suno via Self-Hosted suno-api
 * Requires running https://github.com/gcui-art/suno-api
 */
async function generateWithSunoSelfHosted(request: GenerateSoundRequestBody): Promise<GenerateSoundResponse> {
  if (!sunoApiEndpoint) {
    throw new Error("Suno API endpoint missing. Add SUNO_API_ENDPOINT to .env.local.");
  }

  const targetLength = Math.max(1, Math.min(240, request.parameters.lengthSeconds ?? 10));
  const musicPrompt = buildSunoPrompt(request, targetLength);
  const makeInstrumental = process.env.SUNO_INSTRUMENTAL === "true" ? true : false;

  try {
    // Generate with custom parameters
    const generateEndpoint = `${sunoApiEndpoint}/api/custom_generate`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add cookie if provided
    if (sunoCookie) {
      headers["Cookie"] = sunoCookie;
    }

    const response = await fetch(generateEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: musicPrompt,
        make_instrumental: makeInstrumental,
        wait_audio: false, // We'll poll for results
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Suno API request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as Array<{
      id: string;
      status: string;
      audio_url?: string;
    }>;

    if (!data || data.length === 0) {
      throw new Error("Suno API did not return any clips");
    }

    const clipId = data[0].id;

    // Poll for completion
    const maxAttempts = 60;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`${sunoApiEndpoint}/api/get?ids=${clipId}`, {
        headers: sunoCookie ? { Cookie: sunoCookie } : {},
      });

      if (!statusResponse.ok) {
        continue; // Retry on error
      }

      const statusData = (await statusResponse.json()) as Array<{
        id: string;
        status: string;
        audio_url?: string;
      }>;

      if (statusData && statusData.length > 0) {
        const clip = statusData[0];

        if (clip.status === "streaming" || clip.status === "complete") {
          if (!clip.audio_url) {
            throw new Error("Suno generation complete but no audio URL");
          }

          // Fetch and convert to base64
          const audioResponse = await fetch(clip.audio_url);
          if (!audioResponse.ok) {
            throw new Error(`Failed to fetch Suno audio: ${audioResponse.status}`);
          }

          const audioBuffer = await audioResponse.arrayBuffer();
          const audioBase64 = Buffer.from(audioBuffer).toString("base64");

          return { audioUrl: `data:audio/mpeg;base64,${audioBase64}` };
        } else if (clip.status === "error") {
          throw new Error("Suno generation failed");
        }
      }
    }

    throw new Error("Suno generation timed out after 2 minutes");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Suno self-hosted generation failed: ${error.message}`);
    }
    throw new Error("Suno self-hosted generation failed with unknown error");
  }
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
 * Build Suno-specific prompt with vocal and musical emphasis
 * Suno excels at full musical compositions with vocals, harmonies, and complex arrangements
 */
function buildSunoPrompt(request: GenerateSoundRequestBody, targetLength: number): string {
  const { parameters } = request;

  // Suno loves detailed musical descriptions with emotion and vocal characteristics
  const musicalElements = [];

  if (parameters.bpm) {
    musicalElements.push(`${parameters.bpm} BPM`);
  }

  if (parameters.key && parameters.key !== "Atonal / FX") {
    musicalElements.push(`in ${parameters.key}`);
  }

  // Add intensity as musical energy
  if (parameters.intensity > 70) {
    musicalElements.push("high energy");
  } else if (parameters.intensity > 40) {
    musicalElements.push("moderate energy");
  } else {
    musicalElements.push("gentle, calm");
  }

  // Add texture as production quality
  if (parameters.texture > 60) {
    musicalElements.push("rich layered production");
  } else if (parameters.texture > 30) {
    musicalElements.push("clear production");
  } else {
    musicalElements.push("minimal sparse production");
  }

  musicalElements.push(`target length ${targetLength}s`);

  // Add brightness as tonal characteristics
  if (parameters.brightness > 60) {
    musicalElements.push("bright crystalline tones");
  } else if (parameters.brightness < 40) {
    musicalElements.push("warm dark tones");
  }

  const moodTags = parameters.moodTags?.join(", ");
  if (moodTags) {
    musicalElements.push(moodTags.toLowerCase());
  }

  const contextStr = musicalElements.length > 0 ? ` | ${musicalElements.join(", ")}` : "";

  // Enhance prompt with vocal keywords if present
  let enhancedPrompt = request.prompt.trim();

  // If the prompt mentions vocals/choir but isn't detailed enough, enhance it
  const vocalKeywords = ["vocal", "choir", "singing", "angel", "voice", "harmony"];
  const hasVocalMention = vocalKeywords.some((keyword) => enhancedPrompt.toLowerCase().includes(keyword));

  if (hasVocalMention && enhancedPrompt.length < 100) {
    // Add emphasis on vocal clarity for Suno
    enhancedPrompt = `${enhancedPrompt}, with clear expressive vocals, rich harmonies, and professional vocal production`;
  }

  const referenceSummary = formatReferenceSummary(request.references);
  const fidelityLine =
    "Studio-grade mix: lush stereo field, pristine transients, absolutely no lo-fi stock cues or aliasing artifacts.";
  const tempoLine = parameters.bpm
    ? `Keep vocals and arrangement locked to ${parameters.bpm} BPM with consistent phrasing.`
    : "Maintain a deliberate, consistent tempo even if free-form.";
  const durationLine = `Keep the composition alive for ${targetLength} seconds; no truncation or early fade-outs.`;

  return [enhancedPrompt + contextStr, referenceSummary, tempoLine, durationLine, fidelityLine]
    .filter(Boolean)
    .join(" ");
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

  musicalContext.push(`duration ~${targetLength}s`);

  const contextStr = musicalContext.length > 0 ? ` (${musicalContext.join(", ")})` : "";

  const tempoLine = parameters.bpm
    ? `Lock groove tightly to ${parameters.bpm} BPM with consistent percussion/transients.`
    : "Tempo can be free-form but maintain a steady pulse.";
  const referenceSummary = formatReferenceSummary(request.references);
  const durationLine = `Fill the full ${targetLength} seconds with evolving layers; no dead air until the final tail.`;
  const fidelityLine =
    "Hi-fi, cinematic mixdown at 48kHz+. Avoid aliasing, plastic presets, or generic stock music tropes.";

  return [request.prompt.trim() + contextStr, tempoLine, referenceSummary, durationLine, fidelityLine]
    .filter(Boolean)
    .join(" ");
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
    parameters.bpm ? `Lock tempo grid to exactly ${parameters.bpm} BPM with no drift.` : "Tempo can float but must feel intentional.",
    "Render at 48kHz+ ultra high fidelity. Avoid aliasing, lo-fi grit, or preset stock loops.",
    "Fill the entire duration with evolving material—no gaps or trailing silence.",
  ];
  if (parameters.seed != null) {
    notes.push(`Seed: ${parameters.seed} (use for repeatable structure)`);
  }

  const referenceSection = buildReferenceSection(request.references);

  return [
    `Primary concept:\n${request.prompt.trim()}`,
    "",
    "Production notes:",
    ...notes.map((line) => `- ${line}`),
    ...referenceSection,
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

function formatFileSize(bytes: number) {
  if (!bytes) return "unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : unitIndex === 1 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function isReplicateFileOutput(value: unknown): value is ReplicateFileOutput {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "url" in value && typeof (value as ReplicateFileOutput).url !== "undefined";
}

function buildReferenceSection(references: AudioReferencePayload[] | undefined) {
  if (!references?.length) {
    return [];
  }
  return [
    "",
    "Audio reference DNA provided (treat as primary stems):",
    ...references.map(
      (ref, index) =>
        `- Ref ${index + 1}: ${ref.name} (${ref.mimeType || "audio"}, ${formatFileSize(ref.size)}) — resample and feature prominently.`,
    ),
    "Aggressively sample, chop, stretch, and texture these references to match the requested BPM/key. Their fingerprint should be obvious.",
  ];
}

function formatReferenceSummary(references: AudioReferencePayload[] | undefined) {
  if (!references?.length) return "";
  const names = references.map((ref) => ref.name).join(", ");
  return `Reference DNA: ${names}. Sample heavily from these stems so their timbre drives the piece—treat them as the main instrumentation rather than background inspiration.`;
}
