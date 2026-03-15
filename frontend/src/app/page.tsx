"use client";

import React, { useRef } from "react";
import CameraFeed, { CameraFeedHandle } from "@/components/CameraFeed";
import { MoodInput } from "@/components/MoodInput";
import { StoryboardGrid } from "@/components/StoryboardGrid";
import { MediaPlayer } from "@/components/MediaPlayer";
import { AnimaticPlayer } from "@/components/AnimaticPlayer";
import { useStoryboardStore } from "@/store/storyboardStore";
import { startGeneration } from "@/components/StreamConsumer";

const PRESETS = [
  {
    label: "Noir thriller",
    description: "A shadowy figure moves through rain-slicked streets",
  },
  {
    label: "Epic fantasy",
    description: "Ancient magic stirs in a forgotten land",
  },
  {
    label: "Romantic drama",
    description: "Two strangers meet at the edge of the world",
  },
];

export default function HomePage() {
  const cameraRef = useRef<CameraFeedHandle>(null);
  const isGenerating = useStoryboardStore((s) => s.isGenerating);
  const panels = useStoryboardStore((s) => s.panels);
  const error = useStoryboardStore((s) => s.error);
  const showAnimatic = useStoryboardStore((s) => s.showAnimatic);
  const animaticStartScene = useStoryboardStore((s) => s.animaticStartScene);
  const closeAnimatic = useStoryboardStore((s) => s.closeAnimatic);
  const showBoard = panels.length > 0 || isGenerating;

  const handleGenerate = (mood: string, frameBase64: string) => {
    startGeneration(mood, frameBase64);
  };

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    if (isGenerating) return;
    const frame = cameraRef.current?.captureFrame() ?? "";
    startGeneration(preset.description, frame);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Navbar ── */}
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#e8c547] rounded-md flex items-center justify-center">
            {/* Camera/viewfinder icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-black"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 8a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm6.5-11H19l-1.5-2h-11L5 6H4.5A2.5 2.5 0 0 0 2 8.5v10A2.5 2.5 0 0 0 4.5 21h15a2.5 2.5 0 0 0 2.5-2.5v-10A2.5 2.5 0 0 0 18.5 6z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#f0ece0]">
              Scene One
            </h1>
            <p className="text-[10px] tracking-widest text-[#a09880] uppercase">
              Location-Aware Storyboard AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] font-semibold tracking-widest text-[#e8c547] uppercase">
            Mock Mode
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-10">
        {/* ── Hero copy ── */}
        <section className="text-center space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs font-semibold text-[#e8c547] tracking-widest uppercase">
            Hackathon Demo
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#f0ece0] leading-tight">
            Point. Speak.
            <br />
            <span className="text-[#e8c547]">Watch your surroundings</span> become cinema.
          </h2>
          <p className="text-[#a09880] max-w-md mx-auto text-sm leading-relaxed">
            Scene One uses Gemini Vision to read your environment and generate
            a cinematic storyboard in real time.
          </p>
        </section>

        {/* ── Two-column input ── */}
        <section className="flex flex-col md:flex-row gap-5 md:gap-6">
          {/* Left — camera (60%) */}
          <div className="w-full md:w-[60%] md:min-h-[420px]">
            <CameraFeed ref={cameraRef} />
          </div>

          {/* Right — controls (40%) */}
          <div className="w-full md:w-[40%] flex flex-col justify-between gap-6 py-1">
            {/* Branding inside panel */}
            <div className="space-y-1">
              <p className="text-[10px] tracking-widest text-[#a09880] uppercase font-semibold">
                Step 1 — frame your location &nbsp;/&nbsp; Step 2 — set the mood
              </p>
            </div>

            <MoodInput
              cameraRef={cameraRef}
              onGenerate={handleGenerate}
              disabled={isGenerating}
            />

            {/* ── Preset moods ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-px h-3.5 bg-[#e8c547]" />
                <span className="text-[10px] font-semibold tracking-widest text-[#a09880] uppercase">
                  Quick presets
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    disabled={isGenerating}
                    className={[
                      "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 group",
                      isGenerating
                        ? "border-[#1e1e1e] text-[#3a3a3a] cursor-not-allowed"
                        : "border-[#2a2a2a] hover:border-[#e8c547]/30 hover:bg-[#111]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "block text-xs font-bold tracking-wide uppercase",
                        isGenerating ? "text-[#3a3a3a]" : "text-[#e8c547]",
                      ].join(" ")}
                    >
                      ▶ {preset.label}
                    </span>
                    <span
                      className={[
                        "block text-xs mt-0.5",
                        isGenerating ? "text-[#2a2a2a]" : "text-[#a09880] group-hover:text-[#f0ece0]",
                      ].join(" ")}
                    >
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-sm text-red-300">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {/* ── Storyboard output ── */}
        {showBoard && (
          <section style={{ animation: "fadeIn 0.4s ease-out forwards" }}>
            <div className="border-t border-[#1e1e1e] pt-10">
              <MediaPlayer />
              <StoryboardGrid />
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1e1e1e] mt-20 px-6 py-6 text-center">
        <p className="text-xs text-[#3a3a3a] tracking-wide">
          Scene One &mdash; AI-powered location-aware cinematic storyboarding &mdash; Built for hackathon
        </p>
      </footer>

      {/* ── Animatic Player (fullscreen overlay) ── */}
      {showAnimatic && (
        <AnimaticPlayer
          startScene={animaticStartScene}
          onClose={closeAnimatic}
        />
      )}
    </div>
  );
}
