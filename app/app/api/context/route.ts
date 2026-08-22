import { NextRequest, NextResponse } from 'next/server';

const km = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const nearest = (items: Array<Record<string, unknown>>, lat: number, lng: number) => items.reduce<number | null>((best, item) => {
  const point = item.center as { lat?: number; lon?: number } | undefined;
  const itemLat = Number(item.lat ?? point?.lat);
  const itemLng = Number(item.lon ?? point?.lon);
  const value = Number.isFinite(itemLat) && Number.isFinite(itemLng) ? km(lat, lng, itemLat, itemLng) : null;
  return value !== null && (best === null || value < best) ? value : best;
}, null);

const circle = (lat: number, lng: number, radiusKm: number) => ({
  type: 'Polygon',
  coordinates: [Array.from({ length: 33 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2;
    return [lng + (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.cos(angle), lat + (radiusKm / 110.57) * Math.sin(angle)];
  })],
});

const populationTotal = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of ['population', 'total_population', 'totalPopulation', 'pop']) {
    const number = Number(record[key]);
    if (Number.isFinite(number)) return number;
  }
  for (const nested of Object.values(record)) {
    const number = populationTotal(nested);
    if (number !== null) return number;
  }
  return null;
};

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });

  try {
    const osmQuery = `[out:json][timeout:20];(way(around:5000,${lat},${lng})[highway];way(around:5000,${lat},${lng})[waterway];node(around:5000,${lat},${lng})[place~"village|town|city"];node(around:5000,${lat},${lng})[amenity~"school|clinic|hospital"];);out center tags;`;
    const [weather, air, peat, osm, population] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,soil_moisture_0_to_1cm&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37/query?${new URLSearchParams({ where: '1=1', geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'true', f: 'geojson' })}`, { next: { revalidate: 86400 } }),
      fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: osmQuery }), next: { revalidate: 3600 } }),
      fetch('https://api.worldpop.org/v2/population', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ geojson: circle(lat, lng, 5), year: 2025, resolution: '1km' }), next: { revalidate: 86400 } }),
    ]);
    if (!weather.ok || !air.ok) throw new Error('Weather context unavailable');
    const weatherData = await weather.json();
    const airData = await air.json();
    const peatData = peat.ok ? await peat.json() : { features: [] };
    const osmData = osm.ok ? await osm.json() : { elements: [] };
    const populationData = population.ok ? await population.json() : null;
    const elements = osmData.elements as Array<Record<string, unknown>>;
    const tagged = (key: string, values?: string[]) => elements.filter((item) => {
      const tags = item.tags as Record<string, string> | undefined;
      return tags?.[key] && (!values || values.includes(tags[key]));
    });
    const peatFeature = peatData.features?.[0] ?? null;
    const estimatedPopulation = populationTotal(populationData);
    return NextResponse.json({
      source: 'Open-Meteo', observedAt: weatherData.current?.time, weather: weatherData.current, air: airData.current,
      peat: { inside: Boolean(peatFeature), feature: peatFeature, source: 'BIG Satu Peta KHG layer 37', url: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37' },
      osm: { available: osm.ok, roadKm: nearest(tagged('highway'), lat, lng), waterwayKm: nearest(tagged('waterway'), lat, lng), settlementKm: nearest(tagged('place', ['village', 'town', 'city']), lat, lng), facilityKm: nearest(tagged('amenity', ['school', 'clinic', 'hospital']), lat, lng), source: 'OpenStreetMap / Overpass' },
      population: { available: population.ok && estimatedPopulation !== null, estimate: estimatedPopulation, radiusKm: 5, year: 2025, resolution: '1km', source: 'WorldPop Global 2 API', url: 'https://api.worldpop.org/v2/' },
      readiness: { peatfr: { rainfall: true, temperature: true, soilMoisture: weatherData.current?.soil_moisture_0_to_1cm !== undefined, waterTable: false }, worldCover: 'visual map overlay only; numeric analysis pending', bmkg: 'pending accessible feed' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Context lookup failed' }, { status: 502 });
  }
}
