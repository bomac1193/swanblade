import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exec } from "child_process";

export const runtime = "nodejs";

/**
 * Extract JSON from Modal stdout.
 * Modal may print logs before the JSON result line.
 * Scans lines in reverse to find the first valid JSON object.
 */
function extractJsonFromOutput(stdout: string): Record<string, unknown> | null {
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

  const { job_id } = await request.json();

  if (!job_id) {
    return NextResponse.json({ error: "job_id required." }, { status: 400 });
  }

  // Verify job belongs to user
  const { data: job, error } = await supabase
    .from("training_jobs")
    .select("id, status, training_config")
    .eq("id", job_id)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "uploading") {
    return NextResponse.json(
      { error: `Job is ${job.status}, cannot trigger training.` },
      { status: 400 }
    );
  }

  const sessionKey = job.training_config?.session_key_b64;
  if (!sessionKey) {
    return NextResponse.json(
      { error: "Session key missing from job config." },
      { status: 400 }
    );
  }

  // Clear session key and update status in a single update (avoid race condition)
  const configWithoutKey = { ...job.training_config };
  delete configWithoutKey.session_key_b64;

  await supabase
    .from("training_jobs")
    .update({
      status: "training",
      started_at: new Date().toISOString(),
      training_config: configWithoutKey,
    })
    .eq("id", job_id);

  // Pass session key via environment variable, not CLI arg (security)
  const modalCmd = `cd /home/sphinxy/modal-audio && modal run lora_train.py --job-id "${job_id}" --key "$SWANBLADE_SESSION_KEY"`;

  exec(
    modalCmd,
    {
      timeout: 10800000,
      env: { ...process.env, SWANBLADE_SESSION_KEY: sessionKey },
    },
    async (err, stdout, stderr) => {
      if (err) {
        console.error(`[training/trigger] Modal process error:`, err.message);
        await supabase
          .from("training_jobs")
          .update({
            status: "failed",
            error_message: err.message.slice(0, 500),
          })
          .eq("id", job_id);
        return;
      }

      console.log(`[training/trigger] Modal stdout:`, stdout.slice(0, 2000));
      if (stderr) console.warn(`[training/trigger] Modal stderr:`, stderr.slice(0, 500));

      // Parse JSON result from Modal output (scans lines in reverse)
      const result = extractJsonFromOutput(stdout);

      if (result && result.status === "completed") {
        await supabase
          .from("training_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            lora_model_url: `modal://swanblade-training/jobs/${job_id}/model`,
            audio_deleted_at:
              (result.audio_deleted_at as string) || new Date().toISOString(),
            training_log: JSON.stringify({
              final_loss: result.final_loss,
              dataset_chunks: result.dataset_chunks,
              file_count: result.file_count,
            }),
          })
          .eq("id", job_id);

        console.log(`[training/trigger] Job ${job_id} completed successfully`);
      } else if (result && result.status === "failed") {
        await supabase
          .from("training_jobs")
          .update({
            status: "failed",
            error_message: ((result.error as string) || "Training failed.").slice(0, 500),
          })
          .eq("id", job_id);
      } else if (stdout.includes("Training complete")) {
        // Fallback: no parseable JSON but log indicates success
        await supabase
          .from("training_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            lora_model_url: `modal://swanblade-training/jobs/${job_id}/model`,
          })
          .eq("id", job_id);
      } else {
        await supabase
          .from("training_jobs")
          .update({
            status: "failed",
            error_message: "Training finished with unknown status.",
          })
          .eq("id", job_id);
      }
    }
  );

  console.log(`[training/trigger] Training triggered for job ${job_id}`);

  return NextResponse.json({
    job_id,
    status: "training",
    message: "Training job triggered on Modal GPU.",
  });
}
