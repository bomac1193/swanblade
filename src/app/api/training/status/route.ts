import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Training timing estimates (A10G GPU)
const OVERHEAD_SECONDS = 150; // model loading + encoding + saving
const STEPS_PER_SECOND = 1.1; // empirical on A10G 24GB
const DEFAULT_STEPS = 1000;

/**
 * GET /api/training/status?job_id=<uuid>
 *
 * Returns the current status of a training job.
 * During training, includes progress estimate based on elapsed time.
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
    .select(
      "id, status, file_count, lora_model_url, audio_deleted_at, error_message, created_at, started_at, completed_at, source_files, training_log, model_name"
    )
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // Calculate training progress estimate
  let progress = 0;
  let eta_seconds: number | null = null;
  let current_step: number | null = null;
  let total_steps = DEFAULT_STEPS;

  if (job.status === "training" && job.started_at) {
    const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 1000;
    const totalEstimate = OVERHEAD_SECONDS + DEFAULT_STEPS / STEPS_PER_SECOND;

    if (elapsed < OVERHEAD_SECONDS) {
      // Still in overhead (loading model, encoding audio)
      progress = Math.min(15, (elapsed / OVERHEAD_SECONDS) * 15);
      eta_seconds = Math.round(totalEstimate - elapsed);
    } else {
      // In training loop
      const trainingElapsed = elapsed - OVERHEAD_SECONDS;
      current_step = Math.min(
        DEFAULT_STEPS,
        Math.floor(trainingElapsed * STEPS_PER_SECOND)
      );
      progress = 15 + (current_step / DEFAULT_STEPS) * 85;
      const remainingSteps = DEFAULT_STEPS - current_step;
      eta_seconds = Math.max(0, Math.round(remainingSteps / STEPS_PER_SECOND));
    }

    progress = Math.min(95, Math.round(progress)); // Cap at 95 until actually complete
  } else if (job.status === "completed") {
    progress = 100;
  } else if (job.status === "uploading") {
    progress = 10;
  }

  // Parse final_loss from training_log if available
  let final_loss: number | null = null;
  if (job.training_log) {
    try {
      const log = JSON.parse(job.training_log);
      final_loss = log.final_loss ?? null;
    } catch {
      // training_log might be plain text
    }
  }

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    file_count: job.file_count,
    lora_model_url: job.lora_model_url,
    audio_deleted_at: job.audio_deleted_at,
    error_message: job.error_message,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    model_name: job.model_name,
    source_files: job.source_files || [],
    final_loss,
    // Progress fields
    progress,
    eta_seconds,
    current_step,
    total_steps,
  });
}
