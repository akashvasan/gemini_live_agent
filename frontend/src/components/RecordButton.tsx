"use client";

import React from "react";

type RecordState = "idle" | "recording" | "processing" | "error";

interface RecordButtonProps {
  state: RecordState;
  onClick: () => void;
}

export function RecordButton({ state, onClick }: RecordButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onClick}
        disabled={state === "processing" || state === "error"}
        className="relative flex items-center justify-center focus:outline-none disabled:cursor-not-allowed"
        aria-label={
          state === "idle"
            ? "Click to record"
            : state === "recording"
            ? "Click to stop recording"
            : "Processing audio"
        }
      >
        {/* Pulse rings — only visible while recording */}
        {state === "recording" && (
          <>
            <span
              className="absolute inline-flex h-20 w-20 rounded-full bg-film-red opacity-60"
              style={{ animation: "pulseRing 1.4s cubic-bezier(0.4,0,0.6,1) infinite" }}
            />
            <span
              className="absolute inline-flex h-20 w-20 rounded-full bg-film-red opacity-40"
              style={{
                animation:
                  "pulseRing 1.4s cubic-bezier(0.4,0,0.6,1) infinite 0.5s",
              }}
            />
          </>
        )}

        {/* Main button circle */}
        <span
          className={[
            "relative inline-flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300",
            state === "idle"
              ? "bg-film-accent hover:bg-yellow-400 shadow-lg shadow-film-accent/30 hover:scale-105"
              : state === "recording"
              ? "bg-film-red shadow-lg shadow-red-500/40"
              : state === "error"
              ? "bg-red-800"
              : "bg-film-muted",
          ].join(" ")}
        >
          {state === "idle" && (
            /* Microphone icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-film-black"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2zm-7 9a1 1 0 0 1 1 1 6 6 0 1 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.938V22h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.062A8.001 8.001 0 0 1 4 13a1 1 0 0 1 1-1z" />
            </svg>
          )}

          {state === "recording" && (
            /* Stop square */
            <span className="w-6 h-6 rounded-sm bg-white" />
          )}

          {state === "processing" && (
            /* Spinner */
            <span
              className="w-6 h-6 rounded-full border-2 border-film-sub border-t-film-accent"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          )}

          {state === "error" && (
            /* X icon */
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          )}
        </span>
      </button>

      {/* Label */}
      <span className="text-sm font-medium tracking-wide text-film-sub transition-all duration-300">
        {state === "idle" && "Click to record"}
        {state === "recording" && (
          <span className="text-film-red">Recording — click to stop</span>
        )}
        {state === "processing" && "Processing..."}
        {state === "error" && <span className="text-red-400">Transcription failed</span>}
      </span>
    </div>
  );
}
