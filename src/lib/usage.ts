import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tier-based generation limits (per calendar month).
 *
 * Professional ($299/mo): 100 generations, 2 training jobs, 500 MB upload
 * Studio ($999/mo):       Unlimited generations, 10 training jobs, 5 GB upload
 * Enterprise:             Unlimited everything
 */

type MembershipTier = "professional" | "studio" | "enterprise";

interface TierLimits {
  generations: number;
  training_jobs: number;
  max_upload_bytes: number;
}

const TIER_LIMITS: Record<MembershipTier, TierLimits> = {
  professional: {
    generations: 100,
    training_jobs: 2,
    max_upload_bytes: 500 * 1024 * 1024, // 500 MB
  },
  studio: {
    generations: Infinity,
    training_jobs: 10,
    max_upload_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
  },
  enterprise: {
    generations: Infinity,
    training_jobs: Infinity,
    max_upload_bytes: 50 * 1024 * 1024 * 1024, // 50 GB
  },
};

interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
}

/**
 * Check whether a user can perform an action based on their tier limits.
 * Returns { allowed, current, limit, tier }.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  action: "generation" | "training"
): Promise<UsageCheckResult> {
  // Get user's membership tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier")
    .eq("id", userId)
    .single();

  const tier = (profile?.membership_tier || "pending") as string;

  if (tier === "pending" || !(tier in TIER_LIMITS)) {
    return { allowed: false, current: 0, limit: 0, tier };
  }

  const limits = TIER_LIMITS[tier as MembershipTier];
  const limitValue = action === "generation" ? limits.generations : limits.training_jobs;

  // Unlimited — skip DB query
  if (limitValue === Infinity) {
    return { allowed: true, current: 0, limit: limitValue, tier };
  }

  // Count this month's usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("period_start", monthStart.toISOString().split("T")[0]);

  const current = count ?? 0;

  return {
    allowed: current < limitValue,
    current,
    limit: limitValue,
    tier,
  };
}

/**
 * Record a usage event after a successful generation or training trigger.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  action: "generation" | "training",
  meta?: { provider?: string; model?: string; duration_ms?: number }
) {
  await supabase.from("usage").insert({
    user_id: userId,
    action,
    provider: meta?.provider,
    model: meta?.model,
    duration_ms: meta?.duration_ms,
    credits_used: 1,
    period_start: new Date().toISOString().split("T")[0],
  });
}

/**
 * Get the upload size limit in bytes for a user's tier.
 */
export async function getUploadLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier")
    .eq("id", userId)
    .single();

  const tier = (profile?.membership_tier || "pending") as string;
  if (tier === "pending" || !(tier in TIER_LIMITS)) return 0;
  return TIER_LIMITS[tier as MembershipTier].max_upload_bytes;
}
