import { promises as fs } from "fs";
import path from "path";
import type { SoundGeneration } from "@/types";

export interface LibrarySound extends SoundGeneration {
  liked: boolean;
  tags: string[];
  group?: string;
  downloadedAt: string;
  fileName: string;
  // Lineage tracking
  parentId?: string;
  lineageId?: string;
  generation?: number;
}

export interface Library {
  sounds: LibrarySound[];
  groups: string[];
}

const LIBRARY_DIR = path.join(process.cwd(), ".swanblade-library");
const LIBRARY_FILE = path.join(LIBRARY_DIR, "library.json");
const AUDIO_DIR = path.join(LIBRARY_DIR, "audio");

/**
 * Ensure library directory structure exists
 */
async function ensureLibraryDirectory(): Promise<void> {
  try {
    await fs.mkdir(LIBRARY_DIR, { recursive: true });
    await fs.mkdir(AUDIO_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create library directory:", error);
    throw new Error("Failed to initialize library storage");
  }
}

/**
 * Load library from disk
 */
async function loadLibrary(): Promise<Library> {
  await ensureLibraryDirectory();

  try {
    const data = await fs.readFile(LIBRARY_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Library doesn't exist yet, return empty library
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { sounds: [], groups: [] };
    }
    throw error;
  }
}

/**
 * Save library to disk
 */
async function saveLibrary(library: Library): Promise<void> {
  await ensureLibraryDirectory();
  await fs.writeFile(LIBRARY_FILE, JSON.stringify(library, null, 2), "utf-8");
}

/**
 * Save sound to library
 */
export async function saveToLibrary(sound: SoundGeneration): Promise<LibrarySound> {
  const library = await loadLibrary();

  // Check if already exists
  const existing = library.sounds.find((s) => s.id === sound.id);
  if (existing) {
    return existing;
  }

  // Save audio file to disk
  let audioFilePath: string | null = null;
  if (sound.audioUrl) {
    const fileName = `${sound.id}.${getAudioExtension(sound.audioUrl)}`;
    audioFilePath = path.join(AUDIO_DIR, fileName);

    if (sound.audioUrl.startsWith("data:")) {
      // Convert base64 to file
      const base64Data = sound.audioUrl.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      await fs.writeFile(audioFilePath, buffer);
    } else {
      // Download from URL
      const response = await fetch(sound.audioUrl);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(audioFilePath, Buffer.from(buffer));
    }
  }

  // Auto-detect group from mood tags
  const autoGroup = detectGroup(sound);

  const librarySound: LibrarySound = {
    ...sound,
    liked: false,
    tags: sound.moodTags || [],
    group: autoGroup,
    downloadedAt: new Date().toISOString(),
    fileName: audioFilePath ? path.basename(audioFilePath) : "",
  };

  library.sounds.push(librarySound);

  // Add group if new
  if (autoGroup && !library.groups.includes(autoGroup)) {
    library.groups.push(autoGroup);
  }

  await saveLibrary(library);
  return librarySound;
}

/**
 * Get all library sounds
 */
export async function getLibrarySounds(): Promise<LibrarySound[]> {
  const library = await loadLibrary();
  return library.sounds;
}

/**
 * Get library sound by ID
 */
export async function getLibrarySound(id: string): Promise<LibrarySound | null> {
  const library = await loadLibrary();
  return library.sounds.find((s) => s.id === id) || null;
}

/**
 * Update library sound
 */
export async function updateLibrarySound(
  id: string,
  updates: Partial<Omit<LibrarySound, "id">>
): Promise<LibrarySound | null> {
  const library = await loadLibrary();
  const soundIndex = library.sounds.findIndex((s) => s.id === id);

  if (soundIndex === -1) {
    return null;
  }

  library.sounds[soundIndex] = {
    ...library.sounds[soundIndex],
    ...updates,
  };

  await saveLibrary(library);
  return library.sounds[soundIndex];
}

/**
 * Delete library sound
 */
export async function deleteLibrarySound(id: string): Promise<boolean> {
  const library = await loadLibrary();
  const soundIndex = library.sounds.findIndex((s) => s.id === id);

  if (soundIndex === -1) {
    return false;
  }

  const sound = library.sounds[soundIndex];

  // Delete audio file
  if (sound.fileName) {
    const filePath = path.join(AUDIO_DIR, sound.fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete audio file: ${filePath}`, error);
    }
  }

  library.sounds.splice(soundIndex, 1);
  await saveLibrary(library);
  return true;
}

/**
 * Get library statistics
 */
export async function getLibraryStats() {
  const library = await loadLibrary();

  return {
    totalSounds: library.sounds.length,
    totalLiked: library.sounds.filter((s) => s.liked).length,
    totalGroups: library.groups.length,
    soundsByCategory: library.sounds.reduce(
      (acc, sound) => {
        acc[sound.type] = (acc[sound.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    soundsByGroup: library.sounds.reduce(
      (acc, sound) => {
        const group = sound.group || "Ungrouped";
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

/**
 * Get audio file path for serving
 */
export function getAudioFilePath(fileName: string): string {
  return path.join(AUDIO_DIR, fileName);
}

/**
 * Auto-detect group from sound properties
 */
function detectGroup(sound: SoundGeneration): string {
  // Group by type first
  if (sound.type === "FX" || sound.type === "Foley" || sound.type === "UI") {
    return "Sound Effects";
  }

  if (sound.type === "Ambience") {
    return "Ambience";
  }

  if (sound.type === "Melody" || sound.type === "Bass" || sound.type === "Percussion") {
    return "Musical Elements";
  }

  // Group by mood tags
  if (sound.moodTags && sound.moodTags.length > 0) {
    const firstTag = sound.moodTags[0];
    return firstTag;
  }

  return "Uncategorized";
}

/**
 * Get audio file extension from data URL or URL
 */
function getAudioExtension(audioUrl: string): string {
  if (audioUrl.startsWith("data:")) {
    const mimeType = audioUrl.split(";")[0].split(":")[1];
    const mimeToExt: Record<string, string> = {
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/wave": "wav",
      "audio/ogg": "ogg",
      "audio/flac": "flac",
      "audio/aac": "aac",
      "audio/opus": "opus",
    };
    return mimeToExt[mimeType] || "mp3";
  }

  // Extract extension from URL
  const urlPath = new URL(audioUrl).pathname;
  const ext = path.extname(urlPath).slice(1);
  return ext || "mp3";
}
