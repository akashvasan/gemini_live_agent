"use client";

import React, { useEffect, useState } from "react";
import { useStoryboardStore } from "@/store/storyboardStore";
import { StoryboardPanel } from "./StoryboardPanel";

const THINKING_PHRASES = [
  "Imagining your characters...",
  "Writing the tension...",
  "Composing the frame...",
  "Finding the light...",
  "Building the story...",
];

function ThinkingIndicator() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % THINKING_PHRASES.length);
        setVisible(true);
      }, 350);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-2.5 mb-8"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      {/* Pulsing gold dot */}
      <span
        className="inline-block w-2 h-2 rounded-full bg-[#e8c547] flex-shrink-0"
        style={{ animation: "thinkingPulse 1.5s ease-in-out infinite" }}
      />
      <span className="text-sm text-[#a09880]">{THINKING_PHRASES[idx]}</span>
    </div>
  );
}

export function StoryboardGrid() {
  const panels = useStoryboardStore((s) => s.panels);
  const isGenerating = useStoryboardStore((s) => s.isGenerating);
  const isComplete = useStoryboardStore((s) => s.isComplete);
  const activePlayIndex = useStoryboardStore((s) => s.activePlayIndex);
  const openAnimatic = useStoryboardStore((s) => s.openAnimatic);

  if (panels.length === 0 && !isGenerating) return null;

  return (
    <section className="w-full">
      {/* Thinking indicator */}
      {isGenerating && <ThinkingIndicator />}

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold tracking-wide text-[#f0ece0]">
          {isComplete
            ? `Storyboard — ${panels.length} scenes`
            : isGenerating
            ? "AI is imagining your film..."
            : "Storyboard"}
        </h2>

        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-[#a09880]">
            <span
              className="inline-block w-3 h-3 rounded-full border-2 border-[#a09880] border-t-[#e8c547]"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
            Streaming scenes
          </div>
        )}

        {isComplete && (
          <button
            onClick={() => openAnimatic(0)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e8c547] text-[#0a0a0a] text-sm font-bold tracking-widest uppercase hover:bg-yellow-400 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-[#e8c547]/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Film →
          </button>
        )}
      </div>

      {/* Panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {panels.map((panel) => (
          <StoryboardPanel
            key={panel.index}
            panel={panel}
            isActive={activePlayIndex === panel.index}
            showWatchFilm={isComplete}
            onOpenAnimatic={openAnimatic}
          />
        ))}
      </div>
    </section>
  );
}
