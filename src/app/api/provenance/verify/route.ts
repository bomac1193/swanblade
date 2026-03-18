import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    identity_id: "swanblade-default",
    timestamp: new Date().toISOString(),
    content_type: "audio",
    fingerprint: body.content_fingerprint,
  });
}
