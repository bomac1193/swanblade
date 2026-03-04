import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { randomBytes, createCipheriv } from "crypto";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Server-side AES-256-GCM encryption for non-secure contexts.
 * Produces output compatible with the Python decryption in lora_train.py.
 */
function encryptServerSide(
  data: Buffer,
  keyBytes: Buffer
): { encrypted: Buffer; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);
  return { encrypted: combined, iv: iv.toString("base64") };
}

/**
 * Extract JSON from Modal stdout.
 * Scans lines in reverse to find the first valid JSON object.
 */
function extractJsonFromOutput(
  stdout: string
): Record<string, unknown> | null {
  const lines = stdout.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        return JSON.parse(line);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    prompt,
    strength = 0.5,
    duration_seconds = 10,
    seed,
    lora_job_id,
    original_name,
    engine = "stable-audio",
    periodic_prompt = 7,
    upper_codebook_mask = 3,
    onset_mask_width = 0,
    temperature = 1.0,
    feedback_steps = 1,
  } = body;

  // Accept either client-encrypted or raw audio
  const isClientEncrypted = !!body.encrypted_b64;
  const clientSessionKey: string | undefined = body.session_key_b64;
  const rawAudioB64: string | undefined = body.audio_b64;

  if (!isClientEncrypted && !rawAudioB64) {
    return NextResponse.json(
      { error: "No audio data provided." },
      { status: 400 }
    );
  }

  if (isClientEncrypted && !clientSessionKey) {
    return NextResponse.json(
      { error: "Missing session key for client-encrypted upload." },
      { status: 400 }
    );
  }

  // If LoRA specified, verify it belongs to user and is completed
  if (lora_job_id) {
    const { data: job, error } = await supabase
      .from("training_jobs")
      .select("id, status")
      .eq("id", lora_job_id)
      .eq("user_id", user.id)
      .single();

    if (error || !job || job.status !== "completed") {
      return NextResponse.json(
        { error: "LoRA model not found or not ready." },
        { status: 400 }
      );
    }
  }

  const remixId = crypto.randomUUID();
  const tempDir = join(tmpdir(), `swanblade-remix-${remixId}`);
  mkdirSync(tempDir, { recursive: true });

  let keyB64: string;
  let iv: string;

  try {
    const encPath = join(tempDir, "input.enc");

    if (isClientEncrypted) {
      // Client already encrypted — write directly
      const encBuffer = Buffer.from(body.encrypted_b64, "base64");
      writeFileSync(encPath, encBuffer);
      keyB64 = clientSessionKey!;
      iv = body.iv;
    } else {
      // Server-side encryption
      const keyBytes = randomBytes(32);
      keyB64 = keyBytes.toString("base64");
      const rawBuffer = Buffer.from(rawAudioB64!, "base64");
      const result = encryptServerSide(rawBuffer, keyBytes);
      writeFileSync(encPath, result.encrypted);
      iv = result.iv;
    }

    // Write metadata
    const meta = {
      remix_id: remixId,
      original_name: original_name || "input.wav",
      iv,
    };
    const metaPath = join(tempDir, "meta.json");
    writeFileSync(metaPath, JSON.stringify(meta));

    // Push encrypted file + metadata to Modal volume
    const volumeName = "swanblade-training";
    const remotePath = `remix/${remixId}`;

    execSync(
      `modal volume put ${volumeName} "${encPath}" "${remotePath}/input.enc"`,
      { timeout: 60000 }
    );
    execSync(
      `modal volume put ${volumeName} "${metaPath}" "${remotePath}/meta.json"`,
      { timeout: 15000 }
    );

    console.log(`[remix] Uploaded encrypted audio to Modal volume for remix ${remixId}`);
  } catch (err) {
    console.error("[remix] Failed to upload to Modal volume:", err);
    return NextResponse.json(
      { error: "Failed to upload audio to GPU server." },
      { status: 500 }
    );
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // Run remix on Modal
  const seedValue = seed ?? Math.floor(Math.random() * 100000);
  const safeStrength = Math.max(0.05, Math.min(1.0, Number(strength)));
  const promptArg = (prompt || "").trim();

  // Build command — branch on engine type
  let modalCmd: string;

  if (engine === "vampnet") {
    const safePeriodicPrompt = Math.max(1, Math.min(16, Math.round(Number(periodic_prompt))));
    const safeUpperMask = Math.max(0, Math.min(8, Math.round(Number(upper_codebook_mask))));
    const safeOnsetMask = Math.max(0, Math.min(5, Math.round(Number(onset_mask_width))));
    const safeTemperature = Math.max(0.1, Math.min(3.0, Number(temperature)));
    const safeFeedbackSteps = Math.max(1, Math.min(4, Math.round(Number(feedback_steps))));

    modalCmd = `cd /home/sphinxy/modal-audio && modal run remix_engines.py --vampnet --remix-id "${remixId}" --key "$SWANBLADE_KEY" --periodic-prompt ${safePeriodicPrompt} --upper-codebook-mask ${safeUpperMask} --onset-mask-width ${safeOnsetMask} --temperature ${safeTemperature} --feedback-steps ${safeFeedbackSteps} --seed ${Number(seedValue)}`;
  } else {
    // Stable Audio (default) — pass prompt via env var to prevent shell injection
    modalCmd = `cd /home/sphinxy/modal-audio && modal run lora_train.py --remix --remix-id "${remixId}" --key "$SWANBLADE_KEY" --strength ${safeStrength} --duration ${Number(duration_seconds)} --seed ${Number(seedValue)}`;
    if (promptArg) {
      modalCmd += ` --prompt "$SWANBLADE_PROMPT"`;
    }
    if (lora_job_id) {
      modalCmd += ` --lora-job "${lora_job_id}"`;
    }
  }

  let result: Record<string, unknown>;
  try {
    console.log(`[remix] Starting ${engine} remix ${remixId}...`);
    const stdout = execSync(modalCmd, {
      timeout: 600000,
      encoding: "utf-8",
      env: {
        ...process.env,
        SWANBLADE_KEY: keyB64,
        SWANBLADE_PROMPT: promptArg,
      },
    });

    const parsed = extractJsonFromOutput(stdout);
    if (!parsed) {
      console.error("[remix] No JSON in Modal output:", stdout.slice(0, 500));
      return NextResponse.json(
        { error: "No result from GPU server." },
        { status: 500 }
      );
    }
    result = parsed;
  } catch (err) {
    console.error("[remix] Modal remix failed:", err);
    return NextResponse.json(
      { error: "Remix failed on GPU server." },
      { status: 500 }
    );
  }

  if (result.status !== "completed" || !result.generation_id) {
    return NextResponse.json(
      { error: (result.error as string) || "Remix failed." },
      { status: 500 }
    );
  }

  // Download the generated audio from Modal volume
  const genId = result.generation_id as string;
  const downloadDir = join(tmpdir(), `swanblade-remix-dl-${genId}`);
  mkdirSync(downloadDir, { recursive: true });
  const localWavPath = join(downloadDir, `${genId}.wav`);

  try {
    execSync(
      `cd /home/sphinxy/modal-audio && modal volume get swanblade-training "generations/${genId}.wav" "${localWavPath}"`,
      { timeout: 60000 }
    );

    if (!existsSync(localWavPath)) {
      throw new Error("Downloaded file not found");
    }

    const audioBuffer = readFileSync(localWavPath);
    const base64 = audioBuffer.toString("base64");
    const audioUrl = `data:audio/wav;base64,${base64}`;

    console.log(
      `[remix] Complete: ${genId} (${(audioBuffer.byteLength / 1e6).toFixed(1)} MB)`
    );

    return NextResponse.json({
      audioUrl,
      generationId: genId,
      remixId,
    });
  } catch (err) {
    console.error("[remix] Failed to download from Modal:", err);
    return NextResponse.json(
      { error: "Failed to retrieve remixed audio." },
      { status: 500 }
    );
  } finally {
    if (existsSync(downloadDir)) {
      rmSync(downloadDir, { recursive: true, force: true });
    }
  }
}
