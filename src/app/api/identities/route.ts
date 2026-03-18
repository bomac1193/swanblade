import { NextResponse } from "next/server";

const MOCK_IDENTITIES = [
  {
    identity_id: "swanblade-default",
    version: "2.0",
    creator: {
      name: "Swanblade Studio",
      verification_level: "basic",
    },
    dna: {
      audio: {
        source: "starforge",
        sonic_palette: {
          sub_bass: 0.5,
          bass: 0.6,
          low_mid: 0.5,
          mid: 0.5,
          high_mid: 0.4,
          presence: 0.5,
          brilliance: 0.4,
        },
        taste_coherence: 0.7,
        energy_profile: { average: 0.5, variance: 0.3, peak_ratio: 0.6 },
        tempo_range: { min: 80, max: 160, preferred: 120 },
        influence_genealogy: {
          primary_genre: "Electronic",
          secondary_genres: ["Ambient", "Cinematic"],
          era_influences: ["2010s", "2020s"],
        },
      },
    },
    licensing: {
      training_rights: false,
      derivative_rights: true,
      commercial_rights: true,
      attribution_required: true,
    },
  },
];

export async function GET() {
  return NextResponse.json({ identities: MOCK_IDENTITIES });
}
