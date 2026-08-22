import { NextResponse } from 'next/server';

const KALIMANTAN_BBOX = '106,-5,119,3';
const HISTORY_DAYS = 10;
const ACTIVE_HOURS = 24;
type Detection = { latitude: string; longitude: string; confidence: string; frp: string; acq_date: string; acq_time: string };

function parseCsv(text: string): Detection[] {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  if (!header || !rows.length) return [];
  const names = header.split(',');
  return rows.map((row) => Object.fromEntries(row.split(',').map((value, index) => [names[index], value])) as Detection).filter((row) => row.latitude && row.longitude);
}

function observedAt(detection: Detection) {
  const time = detection.acq_time.padStart(4, '0');
  return new Date(`${detection.acq_date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`);
}

export async function GET() {
  const apiKey = process.env.FIRMS_MAP_KEY;
  if (!apiKey) return NextResponse.json({ mode: 'demo', message: 'FIRMS_MAP_KEY is not configured. Representative incidents remain visible.', incidents: [] });

  try {
    const now = Date.now();
    const historyStart = new Date(now - 9 * 86_400_000).toISOString().slice(0, 10);
    const responses = await Promise.all([
      fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${KALIMANTAN_BBOX}/5`, { next: { revalidate: 900 } }),
      fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${KALIMANTAN_BBOX}/5/${historyStart}`, { next: { revalidate: 900 } }),
    ]);
    const successfulResponses = responses.filter((response) => response.ok);
    if (!successfulResponses.length) throw new Error(`FIRMS returned ${responses.find((response) => !response.ok)?.status}`);
    const historyWindowDays = successfulResponses.length === 2 ? HISTORY_DAYS : 5;
    const detections = (await Promise.all(successfulResponses.map((response) => response.text()))).flatMap(parseCsv);
    const clusters = new Map<string, Detection[]>();
    for (const detection of detections) {
      const key = `${(Math.round(Number(detection.latitude) * 10) / 10).toFixed(1)},${(Math.round(Number(detection.longitude) * 10) / 10).toFixed(1)}`;
      clusters.set(key, [...(clusters.get(key) ?? []), detection]);
    }

    const incidents = [...clusters.entries()].flatMap(([key, detections]) => {
      const ordered = detections.sort((a, b) => observedAt(b).getTime() - observedAt(a).getTime());
      const latest = ordered[0];
      const active = ordered.filter((detection) => {
        const ageHours = (now - observedAt(detection).getTime()) / 3_600_000;
        return ageHours >= 0 && ageHours <= ACTIVE_HOURS;
      });
      if (!active.length) return [];

      const [lat, lng] = key.split(',').map(Number);
      const high = ['h', 'high'].includes(latest.confidence.toLowerCase());
      const persistenceDays = new Set(ordered.map((detection) => detection.acq_date)).size;
      const persistenceBonus = 6 * Math.min(3, Math.max(0, persistenceDays - 1));
      const confidence = Math.min(90, (high ? 76 : 54) + (persistenceDays >= 2 ? 8 : 0));
      const risk = Math.min(92, 45 + active.length * 12 + (high ? 16 : 0) + persistenceBonus);
      const frp = Number(latest.frp);

      return [{
        id: `firms-${key}`, place: `FIRMS cluster ${key}`, region: 'Kalimantan', priority: risk >= 78 ? 'critical' : 'high', risk, confidence,
        confidenceBand: confidence >= 75 ? 'high' : 'medium', action: high ? 'Verify within 2 hours' : 'Acquire observations before deployment', deadline: 'From latest satellite pass',
        coords: { lng, lat }, hotspot: true, pm25: 'No linked station yet',
        evidence: [
          `${active.length} FIRMS detection${active.length === 1 ? '' : 's'} in 0.1 degree cluster during last 24 hours`,
          `Observed on ${persistenceDays} of the last ${historyWindowDays} days`,
          `VIIRS confidence: ${latest.confidence}`,
          `Fire radiative power: ${Number.isFinite(frp) ? frp.toFixed(2) : 'not reported'} MW`,
          `Acquired ${latest.acq_date} ${latest.acq_time} UTC`,
        ],
        limitation: 'Ten-day persistence is satellite evidence, not confirmed burned area. Peat, exposure, and access layers are not yet used in this live score.', status: 'Live FIRMS observation',
      }];
    }).sort((a, b) => b.risk - a.risk);

    return NextResponse.json({ mode: 'live', message: `${incidents.length} active FIRMS clusters; ranked with ${historyWindowDays}-day persistence.`, incidents, fetchedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ mode: 'error', message: error instanceof Error ? error.message : 'FIRMS request failed', incidents: [] }, { status: 502 });
  }
}
