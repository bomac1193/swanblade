import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (id === "swanblade-default") {
    return NextResponse.json({
      identity_id: "swanblade-default",
      version: "2.0",
      creator: { name: "Swanblade Studio", verification_level: "basic" },
      dna: {
        audio: {
          source: "starforge",
          sonic_palette: {
            sub_bass: 0.5, bass: 0.6, low_mid: 0.5, mid: 0.5,
            high_mid: 0.4, presence: 0.5, brilliance: 0.4,
          },
          taste_coherence: 0.7,
          energy_profile: { average: 0.5, variance: 0.3, peak_ratio: 0.6 },
          tempo_range: { min: 80, max: 160, preferred: 120 },
        },
      },
      licensing: {
        training_rights: false, derivative_rights: true,
        commercial_rights: true, attribution_required: true,
      },
    });
  }

  return NextResponse.json({ error: "Identity not found" }, { status: 404 });
}
