import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8002";

export async function POST(req: NextRequest) {
  try {
    // ✅ Forward the raw body stream directly — do NOT call req.formData()
    // Calling formData() causes Next.js to re-encode the multipart body,
    // which corrupts the boundary string that FastAPI uses to parse uploads.
    const contentType = req.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${BACKEND_URL}/transcribe`, {
      method: "POST",
      headers: {
        // ✅ Pass the original Content-Type including the boundary param
        "content-type": contentType,
      },
      // ✅ Stream the raw body bytes straight through
      body: req.body,
      // @ts-expect-error — Node 18+ fetch requires this to stream a ReadableStream
      duplex: "half",
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("Transcribe backend error:", upstream.status, text);
      return NextResponse.json(
        { error: `Backend error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Transcribe proxy error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Proxy error" },
      { status: 500 }
    );
  }
}