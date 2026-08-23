import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";

type Resource = {
  resourceId: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  availability: number;
  capabilities: string;
  updatedAt: string;
  source: string;
  quality: string;
};
const required = [
  "resource_id",
  "name",
  "latitude",
  "longitude",
  "status",
  "availability",
  "capabilities",
  "updated_at",
  "source",
  "quality_flag",
];

const distanceKm = (a: number, b: number, c: number, d: number) => {
  const radians = Math.PI / 180;
  const x =
    Math.sin(((c - a) * radians) / 2) ** 2 +
    Math.cos(a * radians) *
      Math.cos(c * radians) *
      Math.sin(((d - b) * radians) / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const parseCsv = (csv: string): Resource[] => {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header?.split(",").map((value) => value.trim()) ?? [];
  if (required.some((name) => !columns.includes(name)))
    throw new Error(`CSV must include: ${required.join(", ")}`);
  return rows.flatMap((row) => {
    const values = row.split(",").map((value) => value.trim());
    const record = Object.fromEntries(
      columns.map((column, index) => [column, values[index] ?? ""]),
    );
    const lat = Number(record.latitude);
    const lng = Number(record.longitude);
    const availability = Number(record.availability);
    if (
      !record.resource_id ||
      !record.name ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(availability)
    )
      return [];
    return [
      {
        resourceId: record.resource_id,
        name: record.name,
        lat,
        lng,
        status: record.status.toLowerCase(),
        availability,
        capabilities: record.capabilities,
        updatedAt: record.updated_at,
        source: record.source,
        quality: record.quality_flag.toLowerCase(),
      },
    ];
  });
};

const loadRoster = async () => {
  const url = process.env.RESPONSE_RESOURCES_CSV_URL;
  if (url) {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok)
      throw new Error(`Resource roster returned ${response.status}`);
    return { resources: parseCsv(await response.text()), source: url };
  }
  try {
    return {
      resources: parseCsv(
        await readFile(
          resolve(process.cwd(), "../data/processed/response-resources.csv"),
          "utf8",
        ),
      ),
      source: "local response-resources.csv",
    };
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  try {
    const roster = await loadRoster();
    if (!roster)
      return NextResponse.json({
        available: false,
        reason: "No local response roster configured",
        template: "/data/response-resources-template.csv",
        schema: required,
      });
    const candidates = roster.resources
      .filter(
        (resource) =>
          resource.status === "available" &&
          resource.availability > 0 &&
          resource.quality === "verified",
      )
      .map((resource) => ({
        ...resource,
        proximityKm: distanceKm(lat, lng, resource.lat, resource.lng),
      }))
      .sort((a, b) => a.proximityKm - b.proximityKm);
    const selected = candidates[0] ?? null;
    return NextResponse.json({
      available: Boolean(selected),
      source: roster.source,
      candidate: selected,
      availableResources: candidates.length,
      method:
        "Nearest straight-line proximity to a verified available unit. It is not a road route, travel time, dispatch order, or automatic deployment decision.",
      recommendation: selected
        ? `Confirm availability with ${selected.name}; do not dispatch solely from this estimate.`
        : "No verified available resource is reported in the configured roster.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        reason:
          error instanceof Error
            ? error.message
            : "Resource roster unavailable",
        schema: required,
      },
      { status: 502 },
    );
  }
}
