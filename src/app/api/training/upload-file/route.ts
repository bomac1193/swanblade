import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { randomBytes, createCipheriv } from "crypto";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";

export const runtime = "nodejs";

/**
 * Server-side AES-256-GCM encryption.
 * Matches Web Crypto API output for Python decryption compatibility.
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
 * POST /api/training/upload-file
 *
 * Uploads a single file for a training job using FormData (binary).
 * Used for RAVE catalog training where the catalog may be large.
 *
 * FormData fields:
 *   file: File (raw audio binary)
 *   job_id: string
 *   file_index: string (number)
 *   original_name: string
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const job_id = formData.get("job_id") as string | null;
  const fileIndexStr = formData.get("file_index") as string | null;
  const original_name = formData.get("original_name") as string | null;

  if (!file || !job_id || fileIndexStr == null || !original_name) {
    return NextResponse.json(
      { error: "Missing file, job_id, file_index, or original_name." },
      { status: 400 }
    );
  }

  const file_index = parseInt(fileIndexStr, 10);

  // Verify job belongs to user and is in uploading state
  const { data: job, error: jobErr } = await supabase
    .from("training_jobs")
    .select("id, status, training_config")
    .eq("id", job_id)
    .eq("user_id", user.id)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "uploading") {
    return NextResponse.json(
      { error: `Job is ${job.status}, cannot upload files.` },
      { status: 400 }
    );
  }

  // Get session key from job config for server-side encryption
  const keyB64 = job.training_config?.session_key_b64;
  if (!keyB64) {
    return NextResponse.json(
      { error: "Session key missing from job config." },
      { status: 400 }
    );
  }

  const keyBytes = Buffer.from(keyB64, "base64");
  const encName = `${job_id}_${file_index}.enc`;
  const tempDir = join(tmpdir(), `swanblade-upload-file-${job_id}-${file_index}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const encPath = join(tempDir, encName);

    // Read raw binary from FormData File and encrypt server-side
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const result = encryptServerSide(rawBuffer, keyBytes);
    writeFileSync(encPath, result.encrypted);

    // Push to Modal volume
    const volumeName = "swanblade-training";
    const remoteJobDir = `jobs/${job_id}`;

    execSync(
      `modal volume put ${volumeName} "${encPath}" "${remoteJobDir}/encrypted/${encName}"`,
      { timeout: 120000 }
    );

    console.log(
      `[training/upload-file] Pushed file ${file_index} (${original_name}) for job ${job_id}`
    );

    return NextResponse.json({
      job_id,
      file_index,
      encrypted_name: encName,
      iv: result.iv,
      original_name,
      original_size: file.size,
      status: "uploaded",
    });
  } catch (err) {
    console.error("[training/upload-file] Failed:", err);
    return NextResponse.json(
      { error: "Failed to upload file to training server." },
      { status: 500 }
    );
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
