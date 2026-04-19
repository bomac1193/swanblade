import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const runtime = "nodejs";

// LoRA timing estimates (A10G GPU)
const LORA_OVERHEAD_SECONDS = 150;
const LORA_STEPS_PER_SECOND = 1.1;
const LORA_DEFAULT_STEPS = 1000;

// RAVE timing estimates (A100 GPU)
const RAVE_OVERHEAD_SECONDS = 300; // preprocess + model init
const RAVE_STEPS_PER_SECOND = 1.7;
const RAVE_DEFAULT_STEPS = 500000;

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
      "id, status, file_count, lora_model_url, audio_deleted_at, error_message, created_at, started_at, completed_at, source_files, training_log, model_name, model_type"
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
  const isRave = job.model_type === "rave";
  let total_steps = isRave ? RAVE_DEFAULT_STEPS : LORA_DEFAULT_STEPS;
  let phase: string | null = null;

  if (job.status === "training" && job.started_at) {
    if (isRave) {
      // RAVE: read status.json from Modal volume for real progress
      let raveStatus: Record<string, unknown> | null = null;
      const dlDir = join(tmpdir(), `swanblade-rave-status-${jobId}`);
      try {
        mkdirSync(dlDir, { recursive: true });
        const localPath = join(dlDir, "status.json");
        execSync(
          `cd /home/sphinxy/modal-audio && modal volume get swanblade-training "rave_jobs/${jobId}/status.json" "${localPath}"`,
          { timeout: 15000 }
        );
        if (existsSync(localPath)) {
          raveStatus = JSON.parse(readFileSync(localPath, "utf-8"));
        }
      } catch {
        // Volume read failed — fall back to time-based estimate
      } finally {
        if (existsSync(dlDir)) {
          rmSync(dlDir, { recursive: true, force: true });
        }
      }

      if (raveStatus) {
        phase = raveStatus.phase as string;
        progress = (raveStatus.progress as number) || 0;
        current_step = (raveStatus.step as number) || null;
        total_steps = (raveStatus.total as number) || RAVE_DEFAULT_STEPS;

        if (current_step && total_steps) {
          const remainingSteps = total_steps - current_step;
          eta_seconds = Math.max(0, Math.round(remainingSteps / RAVE_STEPS_PER_SECOND));
        }

        // Self-healing: if volume says completed/failed but DB still says training
        if (phase === "completed" && job.status === "training") {
          console.log(`[training/status] Self-healing: job ${jobId} completed on volume, updating DB`);
          await supabase
            .from("training_jobs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              lora_model_url: `modal://swanblade-training/rave_jobs/${jobId}`,
              training_log: JSON.stringify({
                model_path: raveStatus.model_path,
                donor_clips: raveStatus.donor_clips,
                final_step: raveStatus.final_step,
                file_count: raveStatus.file_count,
                config: raveStatus.config,
              }),
            })
            .eq("id", jobId);
          // Return completed status immediately
          return NextResponse.json({
            job_id: job.id,
            status: "completed",
            model_type: "rave",
            file_count: job.file_count,
            progress: 100,
            phase: "completed",
          });
        } else if (phase === "failed" && job.status === "training") {
          console.log(`[training/status] Self-healing: job ${jobId} failed on volume, updating DB`);
          await supabase
            .from("training_jobs")
            .update({
              status: "failed",
              error_message: (raveStatus.error as string) || "Training failed (recovered from volume).",
            })
            .eq("id", jobId);
          return NextResponse.json({
            job_id: job.id,
            status: "failed",
            model_type: "rave",
            error_message: (raveStatus.error as string) || "Training failed.",
            progress: 0,
          });
        }
      } else {
        // Fallback: time-based estimate
        const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 1000;
        const totalEstimate = RAVE_OVERHEAD_SECONDS + RAVE_DEFAULT_STEPS / RAVE_STEPS_PER_SECOND;

        if (elapsed < RAVE_OVERHEAD_SECONDS) {
          progress = Math.min(10, (elapsed / RAVE_OVERHEAD_SECONDS) * 10);
          phase = "preprocessing";
        } else {
          const trainingElapsed = elapsed - RAVE_OVERHEAD_SECONDS;
          current_step = Math.min(
            RAVE_DEFAULT_STEPS,
            Math.floor(trainingElapsed * RAVE_STEPS_PER_SECOND)
          );
          progress = 10 + (current_step / RAVE_DEFAULT_STEPS) * 85;
          phase = "training";
        }
        eta_seconds = Math.max(0, Math.round(totalEstimate - elapsed));
        progress = Math.min(95, Math.round(progress));
      }
    } else {
      // LoRA: time-based estimate
      const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 1000;
      const totalEstimate = LORA_OVERHEAD_SECONDS + LORA_DEFAULT_STEPS / LORA_STEPS_PER_SECOND;

      if (elapsed < LORA_OVERHEAD_SECONDS) {
        progress = Math.min(15, (elapsed / LORA_OVERHEAD_SECONDS) * 15);
        eta_seconds = Math.round(totalEstimate - elapsed);
      } else {
        const trainingElapsed = elapsed - LORA_OVERHEAD_SECONDS;
        current_step = Math.min(
          LORA_DEFAULT_STEPS,
          Math.floor(trainingElapsed * LORA_STEPS_PER_SECOND)
        );
        progress = 15 + (current_step / LORA_DEFAULT_STEPS) * 85;
        const remainingSteps = LORA_DEFAULT_STEPS - current_step;
        eta_seconds = Math.max(0, Math.round(remainingSteps / LORA_STEPS_PER_SECOND));
      }

      progress = Math.min(95, Math.round(progress));
    }
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
    model_type: job.model_type || "lora",
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
    phase,
  });
}
