"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStoryboardStore } from "@/store/storyboardStore";

const SCENE_DURATION = 5000;   // ms each scene plays
const DISSOLVE_MS    = 400;    // cross-dissolve duration
const INTRO_HOLD_MS  = 2200;   // how long the title card shows

const KB_ANIMS = [
  "kenBurnsZoomIn",
  "kenBurnsZoomOut",
  "kenBurnsPanLeft",
  "kenBurnsPanRight",
] as const;

type Phase = "intro" | "playing" | "ended";

interface AnimaticPlayerProps {
  startScene?: number;
  onClose: () => void;
}

export function AnimaticPlayer({ startScene = 0, onClose }: AnimaticPlayerProps) {
  const panels   = useStoryboardStore((s) => s.panels);
  const concept  = useStoryboardStore((s) => s.concept);

  const [phase, setPhase]               = useState<Phase>("intro");
  const [sceneIdx, setSceneIdx]         = useState(startScene);
  const [isPlaying, setIsPlaying]       = useState(true);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showControls, setShowControls]   = useState(true);
  const [introVisible, setIntroVisible]   = useState(true);

  // Refs for stable access in callbacks / intervals
  const sceneIdxRef    = useRef(startScene);
  const isPlayingRef   = useRef(true);
  const phaseRef       = useRef<Phase>("intro");
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync
  useEffect(() => { sceneIdxRef.current  = sceneIdx; },  [sceneIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { phaseRef.current     = phase; },     [phase]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Intro sequence ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "intro") return;
    const fadeOut = setTimeout(() => setIntroVisible(false), INTRO_HOLD_MS - 400);
    const start   = setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        setPhase("playing");
        setTransitioning(false);
      }, DISSOLVE_MS);
    }, INTRO_HOLD_MS);
    return () => { clearTimeout(fadeOut); clearTimeout(start); };
  }, [phase]);

  // ── Scene advance ─────────────────────────────────────────────────────────
  const advanceScene = useCallback(() => {
    const next = sceneIdxRef.current + 1;
    if (next >= panels.length) {
      setPhase("ended");
      setSceneProgress(1);
      return;
    }
    setTransitioning(true);
    setTimeout(() => {
      setSceneIdx(next);
      setSceneProgress(0);
    }, DISSOLVE_MS / 2);
    setTimeout(() => setTransitioning(false), DISSOLVE_MS);
  }, [panels.length]);

  // ── Playback timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !isPlaying) return;

    const capturedProgress = sceneProgress;
    const startedAt = Date.now() - capturedProgress * SCENE_DURATION;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const p = Math.min(elapsed / SCENE_DURATION, 1);
      setSceneProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        advanceScene();
      }
    }, 50);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sceneIdx, isPlaying, advanceScene]);
  // Intentionally omit sceneProgress from deps — captured once at effect start

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const nudgeControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2000);
  }, []);

  useEffect(() => {
    nudgeControls();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const goToScene = useCallback((idx: number) => {
    if (idx < 0 || idx >= panels.length) return;
    setTransitioning(true);
    setTimeout(() => {
      setSceneIdx(idx);
      setSceneProgress(0);
      setIsPlaying(true);
    }, DISSOLVE_MS / 2);
    setTimeout(() => setTransitioning(false), DISSOLVE_MS);
  }, [panels.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      { onClose(); return; }
      if (e.key === " ")           { e.preventDefault(); togglePlay(); return; }
      if (e.key === "ArrowRight")  { goToScene(sceneIdxRef.current + 1); return; }
      if (e.key === "ArrowLeft")   { goToScene(sceneIdxRef.current - 1); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, togglePlay, goToScene]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const panel = panels[sceneIdx];
  const kbAnim = KB_ANIMS[sceneIdx % 4];
  const overallProgress = panels.length
    ? (sceneIdx + sceneProgress) / panels.length
    : 0;
  const sceneLabel = String(sceneIdx + 1).padStart(2, "0");
  const totalLabel = String(panels.length).padStart(2, "0");

  // Extract first name/word from character string
  const charName = panel?.character
    ? panel.character.split(",")[0].trim()
    : "";

  // Word-by-word subtitle split
  const narrationWords = panel?.narration?.split(" ") ?? [];
  const dirSlug = panel?.sceneDirection?.split(" ").slice(0, 6).join(" ") ?? "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] bg-black select-none"
      onMouseMove={nudgeControls}
    >
      {/* ── INTRO CARD ─────────────────────────────────────────────────── */}
      {phase === "intro" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-20"
          style={{
            opacity: introVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.3em] text-[#e8c547]/60 uppercase mb-6">
            A Scene One Film
          </p>
          <h1
            style={{
              fontFamily: "Georgia, 'Palatino Linotype', serif",
              fontSize: "clamp(2rem, 6vw, 4rem)",
              color: "#e8c547",
              animation: "titleExpand 1.2s ease forwards",
              letterSpacing: "0.25em",
            }}
          >
            SCENE ONE
          </h1>
          {concept && (
            <p
              className="mt-5 text-sm text-[#a09880] max-w-sm text-center"
              style={{ animation: "fadeIn 0.8s ease 0.4s both" }}
            >
              {concept}
            </p>
          )}
        </div>
      )}

      {/* ── MAIN PLAYER ────────────────────────────────────────────────── */}
      {(phase === "playing" || phase === "ended") && panel && (
        <>
          {/* Image layer — full screen, overflow hidden for ken burns */}
          <div className="absolute inset-0 overflow-hidden">
            {panel.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={`kb-${sceneIdx}`}
                src={panel.imageUrl}
                alt={`Scene ${sceneIdx + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  animation: `${kbAnim} ${SCENE_DURATION / 1000 + 0.4}s linear forwards`,
                  animationPlayState: isPlaying ? "running" : "paused",
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#111] to-[#000]" />
            )}

            {/* Vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          </div>

          {/* Cross-dissolve overlay */}
          <div
            className="absolute inset-0 bg-black z-30 pointer-events-none"
            style={{
              opacity: transitioning ? 1 : 0,
              transition: `opacity ${DISSOLVE_MS / 2}ms ease`,
            }}
          />

          {/* ── TOP LETTERBOX ────────────────────────────────────────── */}
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-between px-6"
            style={{ height: "10vh", background: "rgba(0,0,0,0.85)", zIndex: 20 }}
          >
            {/* Character name */}
            <span
              className="text-[11px] font-bold tracking-[0.2em] text-white/80 uppercase"
              style={{ animation: "fadeIn 0.5s ease 0.2s both" }}
            >
              {charName}
            </span>

            {/* Scene counter */}
            <span
              className="text-[11px] tracking-[0.2em] font-mono"
              style={{ color: "#e8c547" }}
            >
              {sceneLabel} / {totalLabel}
            </span>
          </div>

          {/* ── BOTTOM LETTERBOX ─────────────────────────────────────── */}
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-center px-6"
            style={{
              height: "10vh",
              background: "rgba(0,0,0,0.85)",
              zIndex: 20,
            }}
          >
            {/* Subtitles — word-by-word reveal */}
            <div
              key={`sub-${sceneIdx}`}
              className="text-center"
              style={{ maxWidth: "70%" }}
            >
              <p className="text-[15px] leading-relaxed text-white">
                {narrationWords.map((word, i) => (
                  <span
                    key={i}
                    className="word-reveal"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      animationPlayState: isPlaying ? "running" : "paused",
                      marginRight: "0.3em",
                    }}
                  >
                    {word}
                  </span>
                ))}
              </p>
            </div>

            {/* Scene direction slug — bottom right */}
            <span
              className="absolute right-6 bottom-3 text-[10px] font-mono"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {dirSlug}
            </span>
          </div>

          {/* ── CONTROLS OVERLAY ─────────────────────────────────────── */}
          <div
            className="animatic-controls absolute inset-x-0 flex flex-col"
            style={{
              bottom: "10vh",
              zIndex: 25,
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? "auto" : "none",
              transition: "opacity 0.3s ease",
            }}
          >
            {/* Progress bar */}
            <div className="h-[2px] w-full bg-white/10">
              <div
                className="h-full bg-[#e8c547] transition-none"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>

            {/* Controls row */}
            <div
              className="flex items-center justify-between px-5 py-2"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              {/* Scene label */}
              <span className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
                Scene {sceneLabel}
              </span>

              {/* Playback buttons */}
              <div className="flex items-center gap-4">
                {/* Prev */}
                <button
                  onClick={() => goToScene(sceneIdx - 1)}
                  disabled={sceneIdx === 0}
                  className="text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                  aria-label="Previous scene"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={() => goToScene(sceneIdx + 1)}
                  disabled={sceneIdx >= panels.length - 1}
                  className="text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                  aria-label="Next scene"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Close animatic"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── END SCREEN ─────────────────────────────────────────────────── */}
      {phase === "ended" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-40"
          style={{ background: "rgba(0,0,0,0.75)", animation: "fadeIn 1s ease forwards" }}
        >
          <p
            className="text-xs tracking-[0.4em] text-[#e8c547]/60 uppercase mb-4"
            style={{ animation: "fadeIn 0.6s ease 0.5s both" }}
          >
            End
          </p>
          <div className="h-px w-16 bg-[#e8c547]/30 mb-8" />
          <div className="flex gap-4">
            <button
              onClick={() => { setSceneIdx(0); setSceneProgress(0); setIsPlaying(true); setPhase("playing"); }}
              className="px-5 py-2.5 rounded-lg bg-[#e8c547] text-[#0a0a0a] text-sm font-bold tracking-widest uppercase hover:bg-yellow-400 transition-all"
            >
              ↺ Replay
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-white/20 text-white/70 text-sm font-bold tracking-widest uppercase hover:border-white/40 hover:text-white transition-all"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
