"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { RecordButton } from "./RecordButton";

type RecordState = "idle" | "recording" | "processing";

interface VoiceCaptureProps {
  onTranscript: (text: string) => void;
}

export function VoiceCapture({ onTranscript }: VoiceCaptureProps) {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Waveform drawing loop
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barCount = 48;
    const barWidth = (width / barCount) * 0.6;
    const gap = (width / barCount) * 0.4;
    const step = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] / 255;
      const barH = Math.max(4, value * height * 0.9);
      const x = i * (barWidth + gap) + gap / 2;
      const y = (height - barH) / 2;

      // Gradient: gold to orange
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, `rgba(232, 197, 71, ${0.4 + value * 0.6})`);
      grad.addColorStop(1, `rgba(255, 140, 50, ${0.2 + value * 0.5})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 2);
      ctx.fill();
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // Idle waveform — flat ambient bars
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barCount = 48;
    const barWidth = (width / barCount) * 0.6;
    const gap = (width / barCount) * 0.4;

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap) + gap / 2;
      const barH = 4;
      const y = (height - barH) / 2;
      ctx.fillStyle = "rgba(58,58,58,0.8)";
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 2);
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    drawIdle();
  }, [drawIdle]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecordState("processing");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // TODO: send blob to backend for transcription
        // For now, use a hardcoded transcript
        await new Promise((r) => setTimeout(r, 800)); // simulate processing
        const hardcodedTranscript =
          "A luxury car racing through winding coastal roads at golden hour, cinematic and dramatic";
        onTranscript(hardcodedTranscript);
        setRecordState("idle");

        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
        drawIdle();
      };

      recorder.start();
      setRecordState("recording");
      drawWaveform();
    } catch {
      console.error("Microphone access denied");
      setRecordState("idle");
    }
  }, [drawWaveform, drawIdle, onTranscript]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleClick = useCallback(() => {
    if (recordState === "idle") startRecording();
    else if (recordState === "recording") stopRecording();
  }, [recordState, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Waveform canvas */}
      <div className="w-full max-w-md h-16 relative">
        <canvas
          ref={canvasRef}
          width={480}
          height={64}
          className="w-full h-full"
        />
      </div>

      <RecordButton state={recordState} onClick={handleClick} />
    </div>
  );
}
