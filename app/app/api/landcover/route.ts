import { fromUrl } from "geotiff";
import { NextRequest, NextResponse } from "next/server";

const classes: Record<number, string> = {
  10: "Tree cover",
  20: "Shrubland",
  30: "Grassland",
  40: "Cropland",
  50: "Built-up",
  60: "Bare / sparse vegetation",
  70: "Snow and ice",
  80: "Permanent water",
  90: "Herbaceous wetland",
  95: "Mangroves",
  100: "Moss and lichen",
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const tilePart = (
  value: number,
  step: number,
  rounding: "floor" | "ceil",
  positive: string,
  negative: string,
) => {
  const tile =
    (rounding === "floor"
      ? Math.floor(value / step)
      : Math.ceil(value / step)) * step;
  return `${tile < 0 ? negative : positive}${String(Math.abs(tile)).padStart(2, "0")}`;
};

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );

  const latPart = tilePart(lat, 3, "floor", "N", "S");
  const lngPart = tilePart(lng, 3, "floor", "E", "W");
  const tile = `ESA_WorldCover_10m_2021_v200_${latPart}${lngPart}_Map.tif`;
  const url = `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/${tile}`;
  try {
    const image = await (await fromUrl(url)).getImage();
    const [west, south, east, north] = image.getBoundingBox();
    const radiusLat = 5 / 110.57;
    const radiusLng = 5 / (111.32 * Math.cos((lat * Math.PI) / 180));
    const imageWidth = image.getWidth();
    const imageHeight = image.getHeight();
    const left = clamp(
      Math.floor(((lng - radiusLng - west) / (east - west)) * imageWidth),
      0,
      imageWidth - 1,
    );
    const right = clamp(
      Math.ceil(((lng + radiusLng - west) / (east - west)) * imageWidth),
      left + 1,
      imageWidth,
    );
    const top = clamp(
      Math.floor(((north - (lat + radiusLat)) / (north - south)) * imageHeight),
      0,
      imageHeight - 1,
    );
    const bottom = clamp(
      Math.ceil(((north - (lat - radiusLat)) / (north - south)) * imageHeight),
      top + 1,
      imageHeight,
    );
    const values = (await image.readRasters({
      window: [left, top, right, bottom],
      width: 256,
      height: 256,
      interleave: true,
    })) as unknown as ArrayLike<number>;
    const counts: Record<string, number> = {};
    for (let index = 0; index < values.length; index += 1) {
      const value = Number(values[index]);
      if (classes[value])
        counts[String(value)] = (counts[String(value)] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const share = (code: number) =>
      total ? Math.round(((counts[String(code)] ?? 0) / total) * 1000) / 10 : 0;
    const dominantCode = Number(
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0,
    );
    return NextResponse.json({
      available: total > 0,
      source: "ESA WorldCover 2021 v200",
      url: "https://esa-worldcover.org/en/data-access",
      tile,
      radiusKm: 5,
      samplePixels: total,
      method:
        "256 x 256 nearest-neighbour sample of the public 10 m COG over the incident 5 km bounding box; composition is context, not a fuel model.",
      dominant: classes[dominantCode] ?? "Unavailable",
      composition: {
        treeCoverPct: share(10),
        croplandPct: share(40),
        builtUpPct: share(50),
        waterPct: share(80),
        wetlandPct: share(90),
        mangrovePct: share(95),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        source: "ESA WorldCover 2021 v200",
        url: "https://esa-worldcover.org/en/data-access",
        reason:
          error instanceof Error ? error.message : "WorldCover lookup failed",
      },
      { status: 502 },
    );
  }
}
