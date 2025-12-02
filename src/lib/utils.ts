export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function secondsToTimecode(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(1, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTimestamp(isoDate: string) {
  const created = new Date(isoDate);
  const diffMs = created.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_TIME.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return RELATIVE_TIME.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return RELATIVE_TIME.format(diffDays, "day");
}

const POWER_WORDS = [
  "Epic",
  "Massive",
  "Dark",
  "Heavy",
  "Deep",
  "Crisp",
  "Lush",
  "Raw",
  "Pure",
  "Ultra",
  "Hyper",
  "Infinite",
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "with",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "is",
  "are",
  "was",
  "were",
]);

export function generateSoundName(prompt: string): string {
  // Extract important words (nouns, adjectives, descriptors)
  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  // If we have 1-2 words, use them directly with title case
  if (words.length <= 2) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // For longer prompts, extract key terms
  const keyWords = words.slice(0, 3);

  // Add a power word occasionally for SEO hook
  const usePowerWord = Math.random() > 0.6;
  if (usePowerWord && keyWords.length >= 2) {
    const powerWord = POWER_WORDS[Math.floor(Math.random() * POWER_WORDS.length)];
    keyWords.unshift(powerWord);
  }

  // Capitalize and join (max 3-4 words for SEO)
  return keyWords
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
