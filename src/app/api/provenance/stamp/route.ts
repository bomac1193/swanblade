import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    declaration_cid: `Qm${Date.now().toString(36)}`,
    manifest_cid: `Qm${Date.now().toString(36)}manifest`,
    gateway_urls: {
      declaration: `https://gateway.example/Qm${Date.now().toString(36)}`,
      manifest: `https://gateway.example/Qm${Date.now().toString(36)}m`,
    },
    timestamp: new Date().toISOString(),
    identity_id: body.identity_id,
  });
}
