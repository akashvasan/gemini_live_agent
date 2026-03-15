"use client";

import React, { useCallback, useRef, useState } from "react";
import { useStoryboardStore } from "@/store/storyboardStore";

export function MediaPlayer() {
  const panels = useStoryboardStore((s) => s.panels);
  const isComplete = useStoryboardStore((s) => s.isComplete);
  const setActivePlayIndex = useStoryboardStore((s) => s.setActivePlayIndex);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasAudio = panels.some((p) => p.audioUrl !== null);
  const isVisible = panels.length > 0;

  const playAll = useCallback(async () => {
    if (!hasAudio || isPlaying) return;
    setIsPlaying(true);

    const panelsWithAudio = panels.filter((p) => p.audioUrl);

    for (const panel of panelsWithAudio) {
      if (!panel.audioUrl) continue;
      setActivePlayIndex(panel.index);

      await new Promise<void>((resolve) => {
        const audio = new Audio(panel.audioUrl!);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    }

    setActivePlayIndex(null);
    setIsPlaying(false);
  }, [panels, hasAudio, isPlaying, setActivePlayIndex]);

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setActivePlayIndex(null);
  }, [setActivePlayIndex]);

  if (!isVisible) return null;

  return (
    <div
      className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-film-card border border-film-border mb-6"
      style={{ animation: "fadeIn 0.4s ease-out forwards" }}
    >
      <div className="flex items-center gap-3">
        {/* Play/Stop button */}
        <button
          onClick={isPlaying ? stopAll : playAll}
          disabled={!hasAudio}
          className={[
            "flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-bold tracking-wide uppercase transition-all duration-200",
            hasAudio && !isPlaying
              ? "bg-film-accent text-film-black hover:bg-yellow-400 hover:scale-[1.02]"
              : hasAudio && isPlaying
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-film-muted/50 text-film-muted cursor-not-allowed border border-film-border",
          ].join(" ")}
        >
          {isPlaying ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
              Play All
            </>
          )}
        </button>

        {/* Status */}
        <span className="text-xs text-film-sub">
          {isPlaying
            ? "Playing narration sequence..."
            : hasAudio
            ? `${panels.filter((p) => p.audioUrl).length} audio tracks ready`
            : "Audio unavailable in mock mode"}
        </span>
      </div>

      {/* Panel count / completion indicator */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {panels.map((p) => (
            <span
              key={p.index}
              className={[
                "w-2 h-2 rounded-full transition-all duration-300",
                p.status === "complete"
                  ? "bg-film-accent"
                  : p.status === "partial"
                  ? "bg-film-accent/40"
                  : p.status === "error"
                  ? "bg-red-500"
                  : "bg-film-muted",
              ].join(" ")}
            />
          ))}
        </div>
        {isComplete && (
          <span className="text-xs text-film-sub">
            {panels.length} / {panels.length} panels
          </span>
        )}
      </div>
    </div>
  );
}
