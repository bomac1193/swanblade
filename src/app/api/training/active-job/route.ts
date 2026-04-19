import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/training/active-job
 *
 * Checks if the current user has an in-progress training job.
 * Used by the training panel to recover polling after page refresh.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job, error } = await supabase
    .from("training_jobs")
    .select("id, status, model_type, started_at")
    .eq("user_id", user.id)
    .eq("status", "training")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    job_id: job.id,
    status: job.status,
    model_type: job.model_type || "lora",
    started_at: job.started_at,
  });
}
