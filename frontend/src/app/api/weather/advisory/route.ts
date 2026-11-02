import { NextRequest, NextResponse } from "next/server";
import weatherSample from "@/data/weather_sample.json";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location") || "Patna";
  const source = searchParams.get("source") || "sample";

  // 1. Try forwarding to the live FastAPI backend if running on port 8000
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const backendRes = await fetch(
      `http://127.0.0.1:8000/api/weather/advisory?location=${encodeURIComponent(
        location
      )}&source=${encodeURIComponent(source)}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline or timeout -> fall through to static sample
  }

  // 2. Serve from verified weather sample
  return NextResponse.json(weatherSample);
}

