import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });

  const delta = 0.05;
  const polygon = `POLYGON((${lng - delta} ${lat - delta},${lng + delta} ${lat - delta},${lng + delta} ${lat + delta},${lng - delta} ${lat + delta},${lng - delta} ${lat - delta}))`;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const filter = `Collection/Name eq 'SENTINEL-1' and ContentDate/Start gt ${since} and OData.CSC.Intersects(area=geography'SRID=4326;${polygon}')`;
  const url = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products?${new URLSearchParams({ '$filter': filter, '$select': 'Name,ContentDate', '$orderby': 'ContentDate/Start desc', '$top': '1' })}`;

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Copernicus catalogue returned ${response.status}`);
    const data = await response.json();
    const product = data.value?.[0];
    return NextResponse.json({ available: Boolean(product), acquisition: product?.ContentDate?.Start ?? null, product: product?.Name ?? null, role: 'catalogue metadata only; wetness proxy not computed', source: 'Copernicus Data Space Ecosystem Sentinel-1 catalogue', url: 'https://dataspace.copernicus.eu/' });
  } catch (error) {
    return NextResponse.json({ available: false, acquisition: null, product: null, role: 'catalogue lookup unavailable; wetness proxy not computed', source: 'Copernicus Data Space Ecosystem Sentinel-1 catalogue', url: 'https://dataspace.copernicus.eu/', reason: error instanceof Error ? error.message : 'Catalogue lookup failed' }, { status: 502 });
  }
}
