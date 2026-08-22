import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.FIRMS_MAP_KEY;
  if (!apiKey) return NextResponse.json({ mode: 'demo', message: 'FIRMS_MAP_KEY is not configured. The map is showing representative incidents.', incidents: [] });
  return NextResponse.json({ mode: 'configured', message: 'FIRMS connector is configured. Fetch and normalization are the next data-pipeline task.', incidents: [], apiKeyPresent: Boolean(apiKey) });
}
