import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8002";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const upstream = await fetch(`${BACKEND_URL}/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Backend error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Proxy error" },
      { status: 500 }
    );
  }
}
