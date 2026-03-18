import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { randomBytes, createCipheriv } from "crypto";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";

export const runtime = "nodejs";

interface EncryptedFileEntry {
  encrypted_b64: string;
  iv: string;
  original_name: string;
  original_size: number;
}

interface RawFileEntry {
  data_b64: string;
  original_name: string;
  original_size: number;
  mime_type: string;
}

/**
 * Server-side AES-256-GCM encryption for non-secure contexts (WSL IP, etc).
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
  // AES-GCM: ciphertext + auth tag (matches Web Crypto API output)
  const combined = Buffer.concat([encrypted, authTag]);
  return {
    encrypted: combined,
    iv: iv.toString("base64"),
  };
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
    consent_timestamp,
    model_name,
    model_description,
  } = body;

  // Determine upload mode: client-encrypted or server-side encryption
  const isServerSideEncrypt = !!body.encrypt_server_side;
  const inputFiles: EncryptedFileEntry[] | RawFileEntry[] = isServerSideEncrypt
    ? body.raw_files
    : body.files;
  const sessionKeyB64: string | undefined = body.session_key_b64;

  if (!inputFiles?.length || !consent_timestamp) {
    return NextResponse.json(
      { error: "Missing files or consent timestamp." },
      { status: 400 }
    );
  }

  if (!isServerSideEncrypt && !sessionKeyB64) {
    return NextResponse.json(
      { error: "Missing session key for client-encrypted upload." },
      { status: 400 }
    );
  }

  // Generate server-side key if needed
  let keyB64 = sessionKeyB64;
  let keyBytes: Buffer | null = null;
  if (isServerSideEncrypt) {
    keyBytes = randomBytes(32);
    keyB64 = keyBytes.toString("base64");
  }

  const totalSize = inputFiles.reduce(
    (sum: number, f: { original_size: number }) => sum + f.original_size,
    0
  );

  // Build source file metadata (persists after training for user reference)
  const sourceFiles = inputFiles.map((f: EncryptedFileEntry | RawFileEntry) => ({
    name: f.original_name,
    size: f.original_size,
    mime_type: "mime_type" in f ? (f as RawFileEntry).mime_type : "audio/*",
  }));

  const { data: job, error: jobError } = await supabase
    .from("training_jobs")
    .insert({
      user_id: user.id,
      status: "uploading",
      file_count: inputFiles.length,
      total_size_bytes: totalSize,
      consent_timestamp,
      data_protection_enabled: true,
      model_name: model_name || null,
      model_description: model_description || null,
      source_files: sourceFiles,
      training_config: {
        session_key_b64: keyB64,
      },
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[training/upload] Failed to create job:", jobError);
    return NextResponse.json(
      { error: "Failed to create training job." },
      { status: 500 }
    );
  }

  const jobId = job.id;

  const tempDir = join(tmpdir(), `swanblade-upload-${jobId}`);
  const encDir = join(tempDir, "encrypted");
  mkdirSync(encDir, { recursive: true });

  const fileManifest: {
    encrypted_name: string;
    original_name: string;
    iv: string;
    size: number;
  }[] = [];

  try {
    for (let i = 0; i < inputFiles.length; i++) {
      const encName = `${jobId}_${i}.enc`;
      const encPath = join(encDir, encName);

      if (isServerSideEncrypt) {
        // Server-side encryption
        const raw = inputFiles[i] as RawFileEntry;
        const rawBuffer = Buffer.from(raw.data_b64, "base64");
        const { encrypted, iv } = encryptServerSide(rawBuffer, keyBytes!);
        writeFileSync(encPath, encrypted);
        fileManifest.push({
          encrypted_name: encName,
          original_name: raw.original_name,
          iv,
          size: raw.original_size,
        });
      } else {
        // Client already encrypted
        const enc = inputFiles[i] as EncryptedFileEntry;
        const encBuffer = Buffer.from(enc.encrypted_b64, "base64");
        writeFileSync(encPath, encBuffer);
        fileManifest.push({
          encrypted_name: encName,
          original_name: enc.original_name,
          iv: enc.iv,
          size: enc.original_size,
        });
      }
    }

    // Write manifest
    const manifest = {
      job_id: jobId,
      files: fileManifest,
      file_count: fileManifest.length,
    };
    const manifestPath = join(tempDir, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Push to Modal volume
    const volumeName = "swanblade-training";
    const remoteJobDir = `jobs/${jobId}`;

    for (let i = 0; i < fileManifest.length; i++) {
      const localPath = join(encDir, fileManifest[i].encrypted_name);
      execSync(
        `modal volume put ${volumeName} "${localPath}" "${remoteJobDir}/encrypted/${fileManifest[i].encrypted_name}"`,
        { timeout: 60000 }
      );
    }

    execSync(
      `modal volume put ${volumeName} "${manifestPath}" "${remoteJobDir}/manifest.json"`,
      { timeout: 15000 }
    );

    console.log(
      `[training/upload] Pushed ${inputFiles.length} files to Modal volume for job ${jobId} (${isServerSideEncrypt ? "server-encrypted" : "client-encrypted"})`
    );
  } catch (err) {
    console.error("[training/upload] Failed to push to Modal volume:", err);

    await supabase
      .from("training_jobs")
      .update({
        status: "failed",
        error_message: "Failed to upload files to training server.",
      })
      .eq("id", jobId);

    return NextResponse.json(
      { error: "Failed to upload files to training server." },
      { status: 500 }
    );
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // Update job config with manifest (without raw data)
  await supabase
    .from("training_jobs")
    .update({
      training_config: {
        session_key_b64: keyB64,
        file_manifest: fileManifest,
      },
    })
    .eq("id", jobId);

  return NextResponse.json({
    job_id: jobId,
    file_count: inputFiles.length,
    status: "uploading",
  });
}
