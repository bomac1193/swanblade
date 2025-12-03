import { NextResponse } from "next/server";
import {
  saveToLibrary,
  getLibrarySounds,
  updateLibrarySound,
  deleteLibrarySound,
  getLibraryStats,
} from "@/lib/libraryStorage";
import type { SoundGeneration } from "@/types";

export const runtime = "nodejs";

// GET /api/library - Get all library sounds or stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const stats = await getLibraryStats();
      return NextResponse.json(stats);
    }

    const sounds = await getLibrarySounds();
    return NextResponse.json({ sounds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get library sounds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/library - Save sound to library
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SoundGeneration;

    if (!body.id || !body.name) {
      return NextResponse.json({ error: "Invalid sound data" }, { status: 400 });
    }

    const librarySound = await saveToLibrary(body);
    return NextResponse.json({ sound: librarySound });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save to library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/library/:id - Update library sound
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sound ID required" }, { status: 400 });
    }

    const updates = await request.json();
    const updatedSound = await updateLibrarySound(id, updates);

    if (!updatedSound) {
      return NextResponse.json({ error: "Sound not found" }, { status: 404 });
    }

    return NextResponse.json({ sound: updatedSound });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update library sound";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/library/:id - Delete library sound
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sound ID required" }, { status: 400 });
    }

    const deleted = await deleteLibrarySound(id);

    if (!deleted) {
      return NextResponse.json({ error: "Sound not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete library sound";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
