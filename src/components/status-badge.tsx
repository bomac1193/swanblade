import { Badge } from "@/components/ui/badge";
import type { SoundGenerationStatus } from "@/types";

const labelMap: Record<SoundGenerationStatus, { label: string; tone: "ready" | "pending" | "error" | "neutral" }> = {
  ready: { label: "Ready", tone: "ready" },
  pending: { label: "Generating…", tone: "pending" },
  error: { label: "Error", tone: "error" },
};

interface StatusBadgeProps {
  status: SoundGenerationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const data = labelMap[status] ?? labelMap.pending;
  return <Badge tone={data.tone}>{data.label}</Badge>;
}
