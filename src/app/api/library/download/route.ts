import { NextResponse } from "next/server";
import { getLibrarySound, getAudioFilePath } from "@/lib/libraryStorage";
import { promises as fs } from "fs";

export const runtime = "nodejs";

// GET /api/library/download?id=:id - Download audio file
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sound ID required" }, { status: 400 });
    }

    const sound = await getLibrarySound(id);

    if (!sound || !sound.fileName) {
      return NextResponse.json({ error: "Sound or file not found" }, { status: 404 });
    }

    const filePath = getAudioFilePath(sound.fileName);

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Determine content type from file extension
      const ext = sound.fileName.split(".").pop()?.toLowerCase();
      const contentType = getContentType(ext || "mp3");

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${sound.name}.${ext}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } catch (error) {
      return NextResponse.json({ error: "Audio file not found on disk" }, { status: 404 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to download audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getContentType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    opus: "audio/opus",
  };

  return mimeTypes[ext] || "audio/mpeg";
}
