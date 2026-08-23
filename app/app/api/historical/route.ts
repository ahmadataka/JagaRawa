import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

type Baseline = { generatedAt: string; source: { name: string; url: string; coverage: string; resolution: string }; method: string; limitations: string; regions: Record<string, Record<string, { medianHa: number; p75Ha: number; yearsWithBurn: number; years: number; seasonality: string }>> };
let baseline: Promise<Baseline | null> | undefined;

const getBaseline = () => {
  baseline ??= readFile(resolve(process.cwd(), '../data/processed/historical-burn-baseline.json'), 'utf8').then((value) => JSON.parse(value) as Baseline).catch(() => null);
  return baseline;
};

export async function GET(request: NextRequest) {
  const data = await getBaseline();
  if (!data) return NextResponse.json({ available: false, reason: 'Historical baseline has not been built. Run scripts/build_historical_burn_baseline.py.' }, { status: 404 });
  const region = request.nextUrl.searchParams.get('region') || 'Kalimantan';
  const month = Number(request.nextUrl.searchParams.get('month')) || new Date().getUTCMonth() + 1;
  const selectedRegion = data.regions[region] ?? data.regions.Kalimantan;
  const summary = selectedRegion?.[String(month)];
  return NextResponse.json({ available: Boolean(summary), region: data.regions[region] ? region : 'Kalimantan', month, summary, source: data.source, method: data.method, limitations: data.limitations, generatedAt: data.generatedAt });
}
