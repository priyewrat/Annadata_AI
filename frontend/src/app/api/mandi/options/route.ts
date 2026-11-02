import { NextResponse } from "next/server";
import mandiOptions from "@/data/mandi_options.json";

export async function GET() {
  // 1. Try forwarding to the live FastAPI backend if running on port 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const backendRes = await fetch("http://127.0.0.1:8000/api/mandi/options", {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline or timeout -> fall through to static options
  }

  // 2. Serve from verified precomputed options
  return NextResponse.json(mandiOptions);
}

