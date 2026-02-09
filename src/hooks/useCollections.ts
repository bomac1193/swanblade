"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "swanblade-collections";

export interface Collection {
  id: string;
  name: string;
  color: string;
  soundIds: string[];
  createdAt: string;
}

const COLORS = [
  "#66023C", // Tyrian Purple
  "#2563EB", // Blue
  "#16A34A", // Green
  "#D97706", // Orange
  "#DC2626", // Red
  "#7C3AED", // Violet
  "#0891B2", // Cyan
];

function loadCollections(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCollections(collections: Collection[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    // Storage full or unavailable
  }
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);

  // Load on mount
  useEffect(() => {
    setCollections(loadCollections());
  }, []);

  // Create collection
  const createCollection = useCallback((name: string) => {
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      soundIds: [],
      createdAt: new Date().toISOString(),
    };

    setCollections((prev) => {
      const updated = [...prev, newCollection];
      saveCollections(updated);
      return updated;
    });

    return newCollection;
  }, []);

  // Rename collection
  const renameCollection = useCallback((id: string, name: string) => {
    setCollections((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, name } : c));
      saveCollections(updated);
      return updated;
    });
  }, []);

  // Delete collection
  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveCollections(updated);
      return updated;
    });
  }, []);

  // Add sound to collection
  const addToCollection = useCallback((collectionId: string, soundId: string) => {
    setCollections((prev) => {
      const updated = prev.map((c) =>
        c.id === collectionId && !c.soundIds.includes(soundId)
          ? { ...c, soundIds: [...c.soundIds, soundId] }
          : c
      );
      saveCollections(updated);
      return updated;
    });
  }, []);

  // Remove sound from collection
  const removeFromCollection = useCallback((collectionId: string, soundId: string) => {
    setCollections((prev) => {
      const updated = prev.map((c) =>
        c.id === collectionId
          ? { ...c, soundIds: c.soundIds.filter((id) => id !== soundId) }
          : c
      );
      saveCollections(updated);
      return updated;
    });
  }, []);

  // Add sounds to collection (bulk)
  const addManyToCollection = useCallback((collectionId: string, soundIds: string[]) => {
    setCollections((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== collectionId) return c;
        const newIds = soundIds.filter((id) => !c.soundIds.includes(id));
        return { ...c, soundIds: [...c.soundIds, ...newIds] };
      });
      saveCollections(updated);
      return updated;
    });
  }, []);

  // Get collections for a sound
  const getCollectionsForSound = useCallback(
    (soundId: string) => {
      return collections.filter((c) => c.soundIds.includes(soundId));
    },
    [collections]
  );

  return {
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    addManyToCollection,
    getCollectionsForSound,
  };
}
