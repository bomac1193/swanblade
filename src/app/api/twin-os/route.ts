/**
 * Twin OS API
 *
 * Connects Swanblade to Starforge's Twin OS
 *
 * GET: Get Twin OS context + audio hints for current user
 * POST: Sync Visual DNA from Clarosa
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { starforge, deriveAudioHints } from "@/lib/starforge/client";

// ==================== GET ====================

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check Starforge connection
  const isConnected = await starforge.checkConnection();

  if (!isConnected) {
    return NextResponse.json({
      connected: false,
      message: "Starforge is not available. Start Starforge to enable Twin OS features.",
      audio_hints: deriveAudioHints(null),
    });
  }

  // Get Twin OS context
  const context = await starforge.getTwinContext(user.id);

  if (!context) {
    return NextResponse.json({
      connected: true,
      has_context: false,
      message: "No Twin OS context found. Upload tracks to Starforge or sync Visual DNA from Clarosa.",
      audio_hints: deriveAudioHints(null),
    });
  }

  // Derive audio hints from context
  const audioHints = deriveAudioHints(context);

  return NextResponse.json({
    connected: true,
    has_context: true,
    twin_os: context.twin_os,
    audio_hints: audioHints,
    content_guidance: context.content_guidance,
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Sync Visual DNA from Clarosa
    if (action === "sync_visual_dna") {
      const result = await starforge.syncVisualDnaFromClarosa(user.id);

      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to sync Visual DNA. Make sure Clarosa is running." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        cross_modal_coherence: result.cross_modal_analysis?.coherence_score,
      });
    }

    // Check Visual DNA status
    if (action === "check_visual_dna") {
      const status = await starforge.getVisualDnaStatus(user.id);

      return NextResponse.json({
        success: true,
        ...status,
      });
    }

    // Get full context
    if (action === "get_context") {
      const context = await starforge.getTwinContext(user.id);
      const audioHints = deriveAudioHints(context);

      return NextResponse.json({
        success: true,
        context,
        audio_hints: audioHints,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Twin OS API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
