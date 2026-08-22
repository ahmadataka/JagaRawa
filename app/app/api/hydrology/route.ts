import { NextRequest, NextResponse } from 'next/server';

type Observation = { stationId: string; lat: number; lng: number; observedAt: string; depthM: number; source: string; quality: string };

const required = ['station_id', 'latitude', 'longitude', 'observed_at', 'water_table_depth_m', 'unit', 'source', 'quality_flag'];

const distanceKm = (a: number, b: number, c: number, d: number) => {
  const radians = Math.PI / 180;
  const x = Math.sin((c - a) * radians / 2) ** 2 + Math.cos(a * radians) * Math.cos(c * radians) * Math.sin((d - b) * radians / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

function parseCsv(csv: string): Observation[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header?.split(',').map((value) => value.trim()) ?? [];
  if (required.some((name) => !columns.includes(name))) throw new Error(`CSV must include: ${required.join(', ')}`);
  return rows.flatMap((row) => {
    const values = row.split(',').map((value) => value.trim());
    const value = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
    if (value.unit !== 'm') return [];
    const lat = Number(value.latitude); const lng = Number(value.longitude); const depthM = Number(value.water_table_depth_m);
    if (!value.station_id || !value.observed_at || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(depthM) || depthM < 0) return [];
    return [{ stationId: value.station_id, lat, lng, observedAt: value.observed_at, depthM, source: value.source, quality: value.quality_flag }];
  });
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  const sourceUrl = process.env.WATER_TABLE_CSV_URL;
  if (!sourceUrl) return NextResponse.json({ available: false, reason: 'No WATER_TABLE_CSV_URL configured', schema: required, template: '/data/water-table-template.csv' });
  try {
    const response = await fetch(sourceUrl, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Water-table feed returned ${response.status}`);
    const observations = parseCsv(await response.text()).map((observation) => ({ ...observation, distanceKm: distanceKm(lat, lng, observation.lat, observation.lng) }));
    const nearest = observations.sort((a, b) => a.distanceKm - b.distanceKm)[0];
    if (!nearest) return NextResponse.json({ available: false, reason: 'No valid observations in feed', schema: required });
    const ageHours = Math.max(0, (Date.now() - new Date(nearest.observedAt).getTime()) / 3_600_000);
    return NextResponse.json({ available: true, nearest, ageHours, fresh: ageHours <= 48 && nearest.quality.toLowerCase() === 'verified', schema: required });
  } catch (error) {
    return NextResponse.json({ available: false, reason: error instanceof Error ? error.message : 'Water-table feed unavailable', schema: required }, { status: 502 });
  }
}
