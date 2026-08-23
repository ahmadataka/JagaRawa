#!/usr/bin/env python3
"""Build the ignored local access and population lookup used by the MVP API.

Inputs are public source snapshots. The output is intentionally a lightweight
JSON index, not a replacement for a proper PostGIS deployment.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import UTC, datetime
from pathlib import Path

import osmium
import rasterio
from rasterio.windows import from_bounds

KALIMANTAN_BOUNDS = (108.0, -4.8, 119.5, 5.0)  # west, south, east, north


class AccessCollector(osmium.SimpleHandler):
    def __init__(self) -> None:
        super().__init__()
        self.points: dict[str, list[list[float]]] = {
            "road": [], "waterway": [], "settlement": [], "facility": []
        }

    @staticmethod
    def add(points: list[list[float]], lon: float, lat: float, maximum: int) -> None:
        # A deterministic cap keeps the index practical for a serverless MVP.
        if len(points) < maximum:
            points.append([round(lat, 6), round(lon, 6)])

    def node(self, node: osmium.osm.Node) -> None:
        if not node.location.valid():
            return
        tags = node.tags
        if tags.get("place") in {"village", "town", "city"}:
            self.add(self.points["settlement"], node.location.lon, node.location.lat, 20_000)
        if tags.get("amenity") in {"school", "clinic", "hospital"}:
            self.add(self.points["facility"], node.location.lon, node.location.lat, 20_000)

    def way(self, way: osmium.osm.Way) -> None:
        kind = "road" if way.tags.get("highway") else "waterway" if way.tags.get("waterway") else None
        if not kind:
            return
        valid = [node for node in way.nodes if node.location.valid()]
        if not valid:
            return
        # A middle vertex is a stable, transparent sample of the mapped way.
        point = valid[len(valid) // 2].location
        self.add(self.points[kind], point.lon, point.lat, 100_000 if kind == "road" else 40_000)


def build_population_grid(path: Path, cell_degrees: float) -> list[list[float]]:
    west, south, east, north = KALIMANTAN_BOUNDS
    with rasterio.open(path) as dataset:
        window = from_bounds(west, south, east, north, dataset.transform).round_offsets().round_lengths()
        values = dataset.read(1, window=window, masked=True)
        transform = dataset.window_transform(window)
        bins: dict[tuple[int, int], float] = {}
        for row, column in zip(*values.nonzero()):
            value = float(values[row, column])
            if not math.isfinite(value) or value <= 0:
                continue
            lon, lat = rasterio.transform.xy(transform, int(row), int(column), offset="center")
            x = int((lon - west) // cell_degrees)
            y = int((lat - south) // cell_degrees)
            bins[(x, y)] = bins.get((x, y), 0) + value
    return [
        [round(south + (y + 0.5) * cell_degrees, 6), round(west + (x + 0.5) * cell_degrees, 6), round(total, 1)]
        for (x, y), total in sorted(bins.items())
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--osm", type=Path, default=Path("data/raw/kalimantan-latest.osm.pbf"))
    parser.add_argument("--population", type=Path, default=Path("data/raw/worldpop-idn-2025-1km.tif"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/local-context.json"))
    parser.add_argument("--population-cell-degrees", type=float, default=0.05)
    args = parser.parse_args()
    if not args.osm.exists() or not args.population.exists():
        raise SystemExit("Download the Geofabrik PBF and WorldPop TIFF before building the local index.")

    collector = AccessCollector()
    collector.apply_file(str(args.osm), locations=True)
    payload = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "bounds": {"west": KALIMANTAN_BOUNDS[0], "south": KALIMANTAN_BOUNDS[1], "east": KALIMANTAN_BOUNDS[2], "north": KALIMANTAN_BOUNDS[3]},
        "sources": {
            "osm": {"name": "Geofabrik Kalimantan OpenStreetMap extract", "url": "https://download.geofabrik.de/asia/indonesia/kalimantan.html", "snapshot": args.osm.name},
            "population": {"name": "WorldPop Global 2 Indonesia 2025, constrained 1 km", "url": "https://hub.worldpop.org/project/categories?id=3", "doi": "10.5258/SOTON/WP00840", "snapshot": args.population.name},
        },
        "method": {
            "access": "Nearest distance to a sampled OSM way vertex or mapped point. It is an access-context proxy, not routing distance.",
            "population": f"WorldPop people-per-pixel values aggregated to {args.population_cell_degrees} degree cells; the API sums cell centres within 5 km. It is an approximate exposure estimate.",
        },
        "access": collector.points,
        "population": {"cellDegrees": args.population_cell_degrees, "cells": build_population_grid(args.population, args.population_cell_degrees)},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {args.output} with " + ", ".join(f"{key}={len(value)}" for key, value in collector.points.items()))


if __name__ == "__main__":
    main()
