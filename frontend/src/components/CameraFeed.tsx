"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface CameraFeedHandle {
  captureFrame: () => string | null;
}

type CameraState = "loading" | "active" | "denied" | "unavailable";

const CameraFeed = forwardRef<CameraFeedHandle>(function CameraFeed(_, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("loading");

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setState("active");
      } catch (err) {
        const error = err as DOMException;
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setState("denied");
        } else {
          setState("unavailable");
        }
      }
    }

    initCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureFrame(): string | null {
      const video = videoRef.current;
      if (!video || state !== "active") return null;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85);
    },
  }));

  return (
    <div className="relative w-full h-full min-h-[280px] bg-[#0d0d0d] overflow-hidden rounded-xl">
      {/* ── Loading state ── */}
      {state === "loading" && (
        <div className="absolute inset-0 shimmer-bg rounded-xl" />
      )}

      {/* ── Permission denied ── */}
      {state === "denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-[#3a3a3a]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
            />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-[#a09880] leading-relaxed max-w-[220px]">
            Camera access required.
            <br />
            Please allow camera permissions and refresh.
          </p>
        </div>
      )}

      {/* ── No camera / unavailable ── */}
      {state === "unavailable" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-[#3a3a3a]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
            />
          </svg>
          <p className="text-sm text-[#a09880] leading-relaxed max-w-[220px]">
            No camera detected — using demo mode
          </p>
          <span className="text-[10px] tracking-widest text-[#3a3a3a] uppercase">
            Generation still works
          </span>
        </div>
      )}

      {/* ── Live video ── */}
      {/* Video is always rendered so the ref is available; visibility tied to state */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={[
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
          state === "active" ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* ── Viewfinder gold border ── */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ border: "2px solid rgba(212,175,55,0.4)" }}
      />

      {/* ── Corner accents ── */}
      {/* Top-left */}
      <span className="absolute top-0 left-0 w-5 h-5 pointer-events-none"
        style={{ borderTop: "2px solid rgba(212,175,55,0.9)", borderLeft: "2px solid rgba(212,175,55,0.9)", borderRadius: "4px 0 0 0" }} />
      {/* Top-right */}
      <span className="absolute top-0 right-0 w-5 h-5 pointer-events-none"
        style={{ borderTop: "2px solid rgba(212,175,55,0.9)", borderRight: "2px solid rgba(212,175,55,0.9)", borderRadius: "0 4px 0 0" }} />
      {/* Bottom-left */}
      <span className="absolute bottom-0 left-0 w-5 h-5 pointer-events-none"
        style={{ borderBottom: "2px solid rgba(212,175,55,0.9)", borderLeft: "2px solid rgba(212,175,55,0.9)", borderRadius: "0 0 0 4px" }} />
      {/* Bottom-right */}
      <span className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none"
        style={{ borderBottom: "2px solid rgba(212,175,55,0.9)", borderRight: "2px solid rgba(212,175,55,0.9)", borderRadius: "0 0 4px 0" }} />

      {/* ── LIVE badge ── */}
      {state === "active" && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
              style={{ animation: "pulseRing 1.4s cubic-bezier(0.4,0,0.6,1) infinite" }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[9px] font-bold tracking-widest text-white/70 uppercase">
            Live
          </span>
        </div>
      )}
    </div>
  );
});

export default CameraFeed;
