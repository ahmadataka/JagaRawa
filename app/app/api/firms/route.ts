import { NextResponse } from 'next/server';

const KALIMANTAN_BBOX = '106,-5,119,3';
type Detection = { latitude: string; longitude: string; confidence: string; frp: string; acq_date: string; acq_time: string };

function parseCsv(text: string): Detection[] {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  if (!header || !rows.length) return [];
  const names = header.split(',');
  return rows.map((row) => Object.fromEntries(row.split(',').map((value, index) => [names[index], value])) as Detection).filter((row) => row.latitude && row.longitude);
}

export async function GET() {
  const apiKey = process.env.FIRMS_MAP_KEY;
  if (!apiKey) return NextResponse.json({ mode: 'demo', message: 'FIRMS_MAP_KEY is not configured. Representative incidents remain visible.', incidents: [] });
  try {
    const response = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${KALIMANTAN_BBOX}/1`, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`FIRMS returned ${response.status}`);
    const clusters = new Map<string, Detection[]>();
    for (const detection of parseCsv(await response.text())) {
      const key = `${(Math.round(Number(detection.latitude) * 10) / 10).toFixed(1)},${(Math.round(Number(detection.longitude) * 10) / 10).toFixed(1)}`;
      clusters.set(key, [...(clusters.get(key) ?? []), detection]);
    }
    const incidents = [...clusters.entries()].map(([key, detections]) => {
      const latest = detections[0]; const [lat, lng] = key.split(',').map(Number); const high = ['h', 'high'].includes(latest.confidence.toLowerCase());
      const confidence = high ? 76 : 54; const risk = Math.min(92, 45 + detections.length * 12 + (high ? 16 : 0));
      return { id: `firms-${key}`, place: `FIRMS cluster ${key}`, region: 'Kalimantan', priority: risk >= 78 ? 'critical' : 'high', risk, confidence, confidenceBand: high ? 'high' : 'medium', action: high ? 'Verify within 2 hours' : 'Acquire observations before deployment', deadline: 'From latest satellite pass', coords: { lng, lat }, hotspot: true, pm25: 'No linked station yet', evidence: [`${detections.length} FIRMS detection${detections.length === 1 ? '' : 's'} in 0.1 degree cluster`, `VIIRS confidence: ${latest.confidence}`, `Fire radiative power: ${latest.frp || 'not reported'} MW`, `Acquired ${latest.acq_date} ${latest.acq_time} UTC`], limitation: 'Peat, exposure, and access layers are not yet joined to this live cluster.', status: 'Live FIRMS observation' };
    }).sort((a, b) => b.risk - a.risk);
    return NextResponse.json({ mode: 'live', message: `${incidents.length} FIRMS incident clusters from the last 24 hours.`, incidents, fetchedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ mode: 'error', message: error instanceof Error ? error.message : 'FIRMS request failed', incidents: [] }, { status: 502 });
  }
}
