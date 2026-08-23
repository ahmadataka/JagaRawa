import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );

  const delta = 0.05;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const url = "https://stac.dataspace.copernicus.eu/v1/search";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        collections: ["sentinel-1-grd"],
        bbox: [lng - delta, lat - delta, lng + delta, lat + delta],
        datetime: `${since}/${new Date().toISOString()}`,
        limit: 2,
      }),
      next: { revalidate: 86400 },
    });
    if (!response.ok)
      throw new Error(`Copernicus catalogue returned ${response.status}`);
    const data = await response.json();
    const scenes = (data.features ?? []).map(
      (feature: { id?: string; properties?: { datetime?: string } }) => ({
        product: feature.id ?? null,
        acquisition: feature.properties?.datetime ?? null,
      }),
    );
    return NextResponse.json({
      available: scenes.length > 0,
      pairAvailable: scenes.length >= 2,
      latest: scenes[0] ?? null,
      baseline: scenes[1] ?? null,
      role:
        scenes.length >= 2
          ? "Two scene metadata records available; pixel wetness proxy still requires authenticated SAR processing and calibration."
          : "Catalogue metadata only; wetness proxy not computed",
      source: "Copernicus Data Space Ecosystem Sentinel-1 GRD catalogue",
      url: "https://stac.dataspace.copernicus.eu/v1/",
    });
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        acquisition: null,
        product: null,
        role: "catalogue lookup unavailable; wetness proxy not computed",
        source: "Copernicus Data Space Ecosystem Sentinel-1 catalogue",
        url: "https://dataspace.copernicus.eu/",
        reason:
          error instanceof Error ? error.message : "Catalogue lookup failed",
      },
      { status: 502 },
    );
  }
}
