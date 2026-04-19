import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/training/models
 *
 * Returns list of completed training jobs for the current user.
 * Used by the LoRA selector in the generate view.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: jobs, error } = await supabase
    .from("training_jobs")
    .select(
      "id, status, file_count, lora_model_url, training_log, created_at, completed_at, model_name, model_description, model_type"
    )
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[training/models] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models." },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const models = (jobs || []).map((job: any) => {
    let trainingInfo: { final_loss?: number; dataset_chunks?: number; donor_clips?: number[] } = {};
    if (job.training_log) {
      try {
        trainingInfo =
          typeof job.training_log === "string"
            ? JSON.parse(job.training_log)
            : job.training_log;
      } catch {
        // ignore parse errors
      }
    }

    const modelType = job.model_type || "lora";

    return {
      id: job.id,
      name: job.model_name || `${modelType === "rave" ? "My Sound" : "Model"} ${job.id.slice(0, 8)}`,
      description: job.model_description || null,
      model_type: modelType,
      file_count: job.file_count,
      final_loss: trainingInfo.final_loss,
      dataset_chunks: trainingInfo.dataset_chunks,
      donor_clips: modelType === "rave" ? (trainingInfo.donor_clips || []) : undefined,
      created_at: job.created_at,
      completed_at: job.completed_at,
      available: !!job.lora_model_url,
    };
  });

  const loraModels = models.filter((m: { model_type: string }) => m.model_type === "lora");
  const raveModels = models.filter((m: { model_type: string }) => m.model_type === "rave");

  return NextResponse.json({ models, loraModels, raveModels });
}
