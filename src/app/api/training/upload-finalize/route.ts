import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";

export const runtime = "nodejs";

/**
 * POST /api/training/upload-finalize
 *
 * Writes the manifest.json to Modal volume after all files have been
 * uploaded individually via /api/training/upload-file.
 *
 * Body: { job_id: string, files: Array<{ encrypted_name, original_name, iv, size }> }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id, files } = await request.json();

  if (!job_id || !files?.length) {
    return NextResponse.json(
      { error: "Missing job_id or files." },
      { status: 400 }
    );
  }

  // Verify job belongs to user
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
      { error: `Job is ${job.status}, cannot finalize.` },
      { status: 400 }
    );
  }

  const tempDir = join(tmpdir(), `swanblade-finalize-${job_id}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const manifest = {
      job_id,
      files,
      file_count: files.length,
    };
    const manifestPath = join(tempDir, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const volumeName = "swanblade-training";
    const remoteJobDir = `jobs/${job_id}`;

    execSync(
      `modal volume put ${volumeName} "${manifestPath}" "${remoteJobDir}/manifest.json"`,
      { timeout: 15000 }
    );

    // Update job config with manifest (without session key in response)
    const configWithoutKey = { ...job.training_config };
    await supabase
      .from("training_jobs")
      .update({
        training_config: {
          ...configWithoutKey,
          file_manifest: files,
        },
        file_count: files.length,
      })
      .eq("id", job_id);

    console.log(
      `[training/upload-finalize] Manifest written for job ${job_id} (${files.length} files)`
    );

    return NextResponse.json({
      job_id,
      file_count: files.length,
      status: "ready_to_train",
    });
  } catch (err) {
    console.error("[training/upload-finalize] Failed:", err);
    return NextResponse.json(
      { error: "Failed to finalize upload." },
      { status: 500 }
    );
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
