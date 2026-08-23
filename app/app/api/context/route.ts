import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const km = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

type LocalIndex = { generatedAt: string; sources: { osm: { name: string; url: string }; population: { name: string; url: string } }; method: { access: string; population: string }; access: Record<string, Array<[number, number]>>; population: { cellDegrees: number; cells: Array<[number, number, number]> } };
let localIndex: Promise<LocalIndex | null> | undefined;

const getLocalIndex = () => {
  localIndex ??= readFile(resolve(process.cwd(), '../data/processed/local-context.json'), 'utf8')
    .then((value) => JSON.parse(value) as LocalIndex)
    .catch(() => null);
  return localIndex;
};

const localDistance = (points: Array<[number, number]> | undefined, lat: number, lng: number) => points?.reduce<number | null>((best, [pointLat, pointLng]) => {
  const value = km(lat, lng, pointLat, pointLng);
  return best === null || value < best ? value : best;
}, null) ?? null;

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });

  try {
    const [weather, air, peat, local] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,soil_moisture_0_to_1cm&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37/query?${new URLSearchParams({ where: '1=1', geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'true', f: 'geojson' })}`, { next: { revalidate: 86400 } }),
      getLocalIndex(),
    ]);
    if (!weather.ok || !air.ok) throw new Error('Weather context unavailable');
    const weatherData = await weather.json();
    const airData = await air.json();
    const peatData = peat.ok ? await peat.json() : { features: [] };
    const peatFeature = peatData.features?.[0] ?? null;
    const estimatedPopulation = local?.population.cells.reduce((total, [cellLat, cellLng, people]) => km(lat, lng, cellLat, cellLng) <= 5 ? total + people : total, 0) ?? null;
    return NextResponse.json({
      source: 'Open-Meteo', observedAt: weatherData.current?.time, weather: weatherData.current, air: airData.current,
      peat: { inside: Boolean(peatFeature), feature: peatFeature, source: 'BIG Satu Peta KHG layer 37', url: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37' },
      osm: { available: Boolean(local), roadKm: localDistance(local?.access.road, lat, lng), waterwayKm: localDistance(local?.access.waterway, lat, lng), settlementKm: localDistance(local?.access.settlement, lat, lng), facilityKm: localDistance(local?.access.facility, lat, lng), source: local?.sources.osm.name ?? 'Local OSM index not built', url: local?.sources.osm.url, method: local?.method.access, generatedAt: local?.generatedAt },
      population: { available: Boolean(local), estimate: estimatedPopulation, radiusKm: 5, year: 2025, resolution: '1km source / 0.05 degree local aggregation', source: local?.sources.population.name ?? 'Local WorldPop index not built', url: local?.sources.population.url, method: local?.method.population, generatedAt: local?.generatedAt },
      readiness: { peatfr: { rainfall: true, temperature: true, soilMoisture: weatherData.current?.soil_moisture_0_to_1cm !== undefined, waterTable: false }, worldCover: 'visual map overlay only; numeric analysis pending', bmkg: 'pending accessible feed' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Context lookup failed' }, { status: 502 });
  }
}
