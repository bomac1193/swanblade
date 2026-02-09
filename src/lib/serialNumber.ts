/**
 * Swanblade Serial Number System
 *
 * Every sound forged by Swanblade receives a unique serial number.
 * Format: SB-YYYY-NNNNN
 *
 * Example: SB-2026-00847
 */

let counter = 0;

export function generateSerialNumber(): string {
  const year = new Date().getFullYear();
  counter += 1;
  const sequence = String(counter).padStart(5, "0");
  return `SB-${year}-${sequence}`;
}

export function generateExportFilename(
  name: string,
  serial: string,
  format: string = "wav"
): string {
  // Clean the name: lowercase, replace spaces with hyphens, remove special chars
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 32);

  return `${cleanName}_${serial}.${format}`;
}

export function generateMemberNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `SBM-${year}-${random}`;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous chars
  let code = "SB-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Metadata to embed in exported audio files
 */
export interface SwanbladeMetadata {
  serial: string;
  forgedAt: string;
  forgedBy: string; // Member number or "Swanblade"
  engine: string;
  version: string;
}

export const ENGINE_NAME = "Obsidian"; // The engine has a name

export function generateMetadata(
  serial: string,
  memberNumber?: string
): SwanbladeMetadata {
  return {
    serial,
    forgedAt: new Date().toISOString(),
    forgedBy: memberNumber || "Swanblade",
    engine: ENGINE_NAME,
    version: "1.0.0",
  };
}

/**
 * Format metadata as a comment string for embedding
 */
export function formatMetadataComment(metadata: SwanbladeMetadata): string {
  return [
    `Forged by Swanblade`,
    `Serial: ${metadata.serial}`,
    `Engine: ${metadata.engine}`,
    `Date: ${metadata.forgedAt.split("T")[0]}`,
  ].join(" | ");
}
