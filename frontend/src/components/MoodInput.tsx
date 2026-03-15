"use client";

import React, { useRef, useState } from "react";
import { VoiceCapture } from "./VoiceCapture";
import { CameraFeedHandle } from "./CameraFeed";

const MOOD_CHIPS = ["Noir thriller", "Epic fantasy", "Romantic drama"];

interface MoodInputProps {
  cameraRef: React.RefObject<CameraFeedHandle>;
  onGenerate: (mood: string, frameBase64: string) => void;
  disabled?: boolean;
}

export function MoodInput({ cameraRef, onGenerate, disabled }: MoodInputProps) {
  const [mood, setMood] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  const handleGenerate = async (overrideMood?: string) => {
    const finalMood = (overrideMood ?? mood).trim();
    if (!finalMood || isCapturing || disabled) return;

    setIsCapturing(true);
    // captureFrame is sync — wrapped in try/finally to always reset state
    try {
      const frame = cameraRef.current?.captureFrame() ?? "";
      onGenerate(finalMood, frame);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleChip = (chip: string) => {
    setMood(chip);
    handleGenerate(chip);
  };

  return (
    <div className="space-y-4">
      {/* Voice capture */}
      <VoiceCapture onTranscript={setMood} />

      {/* Text input */}
      <input
        type="text"
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        placeholder="Describe the mood... 'make this a noir thriller' or 'epic fantasy adventure'"
        disabled={disabled}
        className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[#f0ece0] text-sm placeholder-[#3a3a3a] focus:outline-none focus:border-[#e8c547]/50 focus:ring-1 focus:ring-[#e8c547]/20 transition-colors disabled:opacity-40"
      />

      {/* Mood chips */}
      <div className="flex flex-wrap gap-2">
        {MOOD_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleChip(chip)}
            disabled={disabled || isCapturing}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200",
              mood === chip
                ? "bg-[#e8c547]/10 border-[#e8c547]/50 text-[#e8c547]"
                : "border-[#2a2a2a] text-[#a09880] hover:border-[#e8c547]/30 hover:text-[#f0ece0]",
              disabled || isCapturing ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={() => handleGenerate()}
        disabled={!mood.trim() || isCapturing || !!disabled}
        className={[
          "w-full py-3.5 rounded-lg text-sm font-bold tracking-widest uppercase transition-all duration-300",
          mood.trim() && !isCapturing && !disabled
            ? "bg-[#e8c547] text-[#0a0a0a] hover:bg-yellow-400 hover:scale-[1.01] shadow-lg shadow-[#e8c547]/20"
            : "bg-[#1a1a1a] text-[#3a3a3a] cursor-not-allowed border border-[#2a2a2a]",
        ].join(" ")}
      >
        {isCapturing ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="w-4 h-4 rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a]"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
            Capturing frame...
          </span>
        ) : (
          "Generate Storyboard →"
        )}
      </button>
    </div>
  );
}
