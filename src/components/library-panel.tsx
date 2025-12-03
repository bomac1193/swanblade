"use client";

import { useCallback, useEffect, useState } from "react";
import { LibrarySound } from "@/lib/libraryStorage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LibraryPanelProps {
  onPlaySound?: (sound: LibrarySound) => void;
}

type SortBy = "date" | "name" | "liked" | "type" | "group";
type FilterBy = "all" | "liked" | "category" | "group";

export function LibraryPanel({ onPlaySound }: LibraryPanelProps) {
  const [sounds, setSounds] = useState<LibrarySound[]>([]);
  const [filteredSounds, setFilteredSounds] = useState<LibrarySound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Load library sounds
  const loadLibrary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/library");
      const data = await response.json();
      setSounds(data.sounds || []);
    } catch (error) {
      console.error("Failed to load library:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Filter and sort sounds
  useEffect(() => {
    let filtered = [...sounds];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sound) =>
          sound.name.toLowerCase().includes(query) ||
          sound.prompt.toLowerCase().includes(query) ||
          sound.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filterBy === "liked") {
      filtered = filtered.filter((sound) => sound.liked);
    } else if (filterBy === "group" && selectedGroup) {
      filtered = filtered.filter((sound) => sound.group === selectedGroup);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "liked":
          return (b.liked ? 1 : 0) - (a.liked ? 1 : 0);
        case "type":
          return a.type.localeCompare(b.type);
        case "group":
          return (a.group || "").localeCompare(b.group || "");
        default:
          return 0;
      }
    });

    setFilteredSounds(filtered);
  }, [sounds, searchQuery, sortBy, filterBy, selectedGroup]);

  const handleToggleLike = async (id: string, currentLiked: boolean) => {
    try {
      const response = await fetch(`/api/library?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !currentLiked }),
      });

      if (response.ok) {
        setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, liked: !currentLiked } : s)));
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const response = await fetch(`/api/library?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, name: editName.trim() } : s)));
        setEditingId(null);
        setEditName("");
      }
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sound from your library?")) return;

    try {
      const response = await fetch(`/api/library?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSounds((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/library/download?id=${id}`, "_blank");
  };

  const startEditing = (sound: LibrarySound) => {
    setEditingId(sound.id);
    setEditName(sound.name);
  };

  const groups = Array.from(new Set(sounds.map((s) => s.group).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-white/60">Loading library...</p>
      </div>
    );
  }

  if (sounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="text-sm text-white/60">Your library is empty</p>
        <p className="text-xs text-white/40">Generate sounds and save them to build your collection</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <Input
          type="text"
          placeholder="Search sounds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-black/40 border-white/10"
        />

        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
          >
            <option value="date">Newest First</option>
            <option value="name">Name A-Z</option>
            <option value="liked">Liked First</option>
            <option value="type">By Type</option>
            <option value="group">By Group</option>
          </select>

          <button
            onClick={() => setFilterBy("all")}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              filterBy === "all" ? "bg-emerald-500 text-white" : "bg-black/40 text-white/60 hover:text-white"
            }`}
          >
            All ({sounds.length})
          </button>

          <button
            onClick={() => setFilterBy("liked")}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              filterBy === "liked" ? "bg-emerald-500 text-white" : "bg-black/40 text-white/60 hover:text-white"
            }`}
          >
            ❤️ Liked ({sounds.filter((s) => s.liked).length})
          </button>

          {groups.length > 0 && (
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setFilterBy("group");
              }}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sound List */}
      <div className="flex flex-col gap-2">
        {filteredSounds.map((sound) => (
          <Card
            key={sound.id}
            className="flex flex-col gap-3 border-white/10 bg-black/40 p-4 backdrop-blur-xl transition hover:border-emerald-400/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {editingId === sound.id ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(sound.id)}
                      className="flex-1 bg-black/40"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRename(sound.id)}>
                      ✓
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      ✗
                    </Button>
                  </div>
                ) : (
                  <h3
                    className="cursor-pointer text-base font-semibold hover:text-emerald-400"
                    onClick={() => startEditing(sound)}
                  >
                    {sound.name}
                  </h3>
                )}

                <p className="mt-1 text-xs text-white/60">{sound.prompt}</p>

                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge className="text-xs">
                    {sound.type}
                  </Badge>
                  {sound.group && (
                    <Badge className="text-xs">
                      📁 {sound.group}
                    </Badge>
                  )}
                  {sound.tags.map((tag) => (
                    <Badge key={tag} className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleToggleLike(sound.id, sound.liked)}
                  className="text-xl transition hover:scale-110"
                  title={sound.liked ? "Unlike" : "Like"}
                >
                  {sound.liked ? "❤️" : "🤍"}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => onPlaySound?.(sound)} className="flex-1">
                ▶️ Play
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownload(sound.id)}>
                ⬇️ Download
              </Button>
              <Button size="sm" variant="outline" onClick={() => startEditing(sound)}>
                ✏️ Rename
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(sound.id)}>
                🗑️ Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredSounds.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm text-white/60">No sounds match your filters</p>
        </div>
      )}
    </div>
  );
}
