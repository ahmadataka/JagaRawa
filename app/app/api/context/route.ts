import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get('lat'));
  const longitude = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  try {
    const [weather, air] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5&timezone=UTC`, { next: { revalidate: 900 } }),
    ]);
    if (!weather.ok || !air.ok) throw new Error('Upstream weather or air-quality feed failed');
    const weatherData = await weather.json(); const airData = await air.json();
    return NextResponse.json({ source: 'Open-Meteo', observedAt: weatherData.current?.time, weather: weatherData.current, air: airData.current });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Context lookup failed' }, { status: 502 });
  }
}
