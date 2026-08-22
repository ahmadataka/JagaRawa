import { NextRequest, NextResponse } from 'next/server';

const km = (a: number, b: number, c: number, d: number) => { const r = Math.PI / 180; const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
const nearest = (items: Array<Record<string, unknown>>, lat: number, lng: number) => items.reduce<number | null>((best, item) => { const p = item.center as { lat?: number; lon?: number } | undefined; const a = Number(item.lat ?? p?.lat); const b = Number(item.lon ?? p?.lon); const value = Number.isFinite(a) && Number.isFinite(b) ? km(lat, lng, a, b) : null; return value !== null && (best === null || value < best) ? value : best; }, null);

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat')); const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  try {
    const query = `[out:json][timeout:20];(way(around:5000,${lat},${lng})[highway];way(around:5000,${lat},${lng})[waterway];node(around:5000,${lat},${lng})[place~"village|town|city"];node(around:5000,${lat},${lng})[amenity~"school|clinic|hospital"];);out center tags;`;
    const [weather, air, peat, osm] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,soil_moisture_0_to_1cm&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5&timezone=UTC`, { next: { revalidate: 900 } }),
      fetch(`https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37/query?${new URLSearchParams({ where: '1=1', geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'true', f: 'geojson' })}`, { next: { revalidate: 86400 } }),
      fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }), next: { revalidate: 3600 } }),
    ]);
    if (!weather.ok || !air.ok) throw new Error('Weather context unavailable');
    const w = await weather.json(); const a = await air.json(); const p = peat.ok ? await peat.json() : { features: [] }; const o = osm.ok ? await osm.json() : { elements: [] };
    const elements = o.elements as Array<Record<string, unknown>>; const tagged = (key: string, values?: string[]) => elements.filter((item) => { const tags = item.tags as Record<string, string> | undefined; return tags?.[key] && (!values || values.includes(tags[key])); });
    const feature = p.features?.[0] ?? null;
    return NextResponse.json({ source: 'Open-Meteo', observedAt: w.current?.time, weather: w.current, air: a.current, peat: { inside: Boolean(feature), feature, source: 'BIG Satu Peta KHG layer 37', url: 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37' }, osm: { available: osm.ok, roadKm: nearest(tagged('highway'), lat, lng), waterwayKm: nearest(tagged('waterway'), lat, lng), settlementKm: nearest(tagged('place', ['village', 'town', 'city']), lat, lng), facilityKm: nearest(tagged('amenity', ['school', 'clinic', 'hospital']), lat, lng), source: 'OpenStreetMap / Overpass' }, readiness: { peatfr: { rainfall: true, temperature: true, soilMoisture: w.current?.soil_moisture_0_to_1cm !== undefined, waterTable: false }, worldPop: 'pending raster integration', worldCover: 'pending raster integration', bmkg: 'pending accessible feed' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Context lookup failed' }, { status: 502 }); }
}
