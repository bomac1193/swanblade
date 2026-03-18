import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

/**
 * Find the safetensors file anywhere under a directory.
 * `modal volume get` may nest contents in a subdirectory.
 */
function findSafetensors(dir: string): string | null {
  if (!existsSync(dir)) return null;
  // Direct match
  const direct = join(dir, "lora_weights.safetensors");
  if (existsSync(direct)) return direct;

  // Check one level deep (modal volume get may create a "model/" subdir)
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const nested = join(dir, entry.name, "lora_weights.safetensors");
        if (existsSync(nested)) return nested;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * GET /api/training/download?job_id=<uuid>
 *
 * Downloads the LoRA model from Modal volume and streams it to the client.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return NextResponse.json({ error: "job_id required." }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("training_jobs")
    .select("id, status, model_name")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      { error: `Job is ${job.status}, model not available yet.` },
      { status: 400 }
    );
  }

  const localModelDir = join(
    process.cwd(),
    ".swanblade-library",
    "models",
    jobId
  );

  let safetensorsPath = findSafetensors(localModelDir);

  if (!safetensorsPath) {
    // Download from Modal volume
    try {
      execSync(`mkdir -p "${localModelDir}"`, { timeout: 5000 });
      execSync(
        `cd /home/sphinxy/modal-audio && modal volume get swanblade-training "jobs/${jobId}/model" "${localModelDir}/"`,
        { timeout: 120000, stdio: "pipe" }
      );
      safetensorsPath = findSafetensors(localModelDir);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[training/download] Modal volume get failed:", msg.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to download model from training server." },
        { status: 500 }
      );
    }
  }

  if (!safetensorsPath) {
    // List what we actually got for debugging
    try {
      const contents = execSync(`find "${localModelDir}" -type f 2>/dev/null || true`, {
        encoding: "utf-8",
        timeout: 5000,
      });
      console.error("[training/download] Files found:", contents.trim());
    } catch { /* ignore */ }
    return NextResponse.json(
      { error: "Model file not found after download." },
      { status: 404 }
    );
  }

  const fileBuffer = readFileSync(safetensorsPath);

  // Use model name for filename if available
  const safeName = (job.model_name || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const fileName = safeName
    ? `${safeName}.safetensors`
    : `swanblade-lora-${jobId.slice(0, 8)}.safetensors`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(fileBuffer.byteLength),
    },
  });
}
