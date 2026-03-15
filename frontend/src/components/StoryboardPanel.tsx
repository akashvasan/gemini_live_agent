"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Panel } from "@/types";

interface StoryboardPanelProps {
  panel: Panel;
  isActive: boolean;
  showWatchFilm: boolean;
  onOpenAnimatic: (startScene: number) => void;
}

export function StoryboardPanel({
  panel,
  isActive,
  showWatchFilm,
  onOpenAnimatic,
}: StoryboardPanelProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (panel.status === "error") {
    return (
      <div className="rounded-xl bg-[#1a1a1a] border border-red-900/40 p-6 flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <div className="text-red-400 text-2xl mb-2">⚠</div>
          <p className="text-red-400 text-sm">Failed to generate this panel</p>
        </div>
      </div>
    );
  }

  const dirSlug = panel.sceneDirection?.split(" ").slice(0, 4).join(" ") ?? "";

  return (
    <div
      className={[
        "panel-enter rounded-xl bg-[#1a1a1a] border overflow-hidden flex flex-col transition-all duration-500",
        isActive
          ? "border-[#e8c547] shadow-lg shadow-[#e8c547]/20"
          : "border-[#2a2a2a] hover:border-[#3a3a3a]",
      ].join(" ")}
      style={{ animationDelay: `${panel.index * 150}ms` }}
    >
      {/* ── Image area ─────────────────────────────────── */}
      <div className="relative w-full aspect-video bg-[#111] overflow-hidden">
        {/* Skeleton shimmer */}
        {!panel.imageUrl && <div className="absolute inset-0 shimmer-bg" />}

        {/* Image with clip-path wipe reveal */}
        {panel.imageUrl && (
          <Image
            src={panel.imageUrl}
            alt={`Scene ${panel.index + 1}`}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className={[
              "object-cover",
              imgLoaded ? "img-clip-reveal" : "",
            ].join(" ")}
            style={{ opacity: imgLoaded ? undefined : 0 }}
            onLoad={() => setImgLoaded(true)}
          />
        )}

        {/* Scene badge */}
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
          <span className="text-xs font-bold tracking-widest text-[#e8c547] uppercase">
            Scene {panel.index + 1}
          </span>
        </div>

        {/* Gradient at image bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1a1a1a] to-transparent pointer-events-none" />

        {/* Character bar — overlaid on image bottom */}
        {panel.character && (
          <div
            className="absolute bottom-0 inset-x-0 z-10 h-14 flex items-center justify-between px-3 gap-2"
            style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(4px)",
              animation: "fadeIn 0.5s ease-out forwards",
            }}
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-[9px] font-bold tracking-[0.15em] text-[#e8c547] uppercase">
                Character
              </span>
              <span className="text-[11px] text-white/90 leading-tight truncate">
                {panel.character}
              </span>
            </div>
            {dirSlug && (
              <span
                className="text-[9px] text-[#a09880]/60 text-right leading-tight flex-shrink-0 max-w-[100px]"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                {dirSlug}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Text content ───────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Narration */}
        <div className="flex-1">
          {panel.narration ? (
            <div
              className="pl-3"
              style={{
                borderLeft: "3px solid rgba(212, 175, 55, 0.5)",
                animation: "fadeIn 0.5s ease-out forwards",
              }}
            >
              <p
                className="text-sm leading-relaxed italic"
                style={{ color: "#F5F0E8" }}
              >
                {panel.narration}
              </p>
              {panel.sceneDirection && (
                <p
                  className="mt-2 text-[11px] leading-relaxed text-[#6a6a6a]"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  <span style={{ color: "#e8c547" }}>DIR: </span>
                  {panel.sceneDirection}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 pl-3" style={{ borderLeft: "3px solid #2a2a2a" }}>
              <div className="h-3 shimmer-bg rounded w-full" />
              <div className="h-3 shimmer-bg rounded w-5/6" />
              <div className="h-3 shimmer-bg rounded w-4/6" />
            </div>
          )}
        </div>

        {/* Bottom row: status + watch film */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {panel.status === "loading" && (
              <span className="text-[11px] text-[#a09880]">Generating...</span>
            )}
            {panel.status === "partial" && !panel.imageUrl && (
              <span className="text-[11px] text-[#a09880]">Rendering image...</span>
            )}
            {panel.status === "complete" && (
              <span className="text-[11px] text-green-500/60">✓ Ready</span>
            )}
          </div>

          {showWatchFilm && panel.imageUrl && (
            <button
              onClick={() => onOpenAnimatic(panel.index)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase bg-[#e8c547]/10 border border-[#e8c547]/30 text-[#e8c547] hover:bg-[#e8c547]/20 transition-all duration-200"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
