# Local exposure and access data

This MVP replaces fragile per-request Overpass and WorldPop API calls with two locally downloaded, ignored source snapshots. The repository contains the reproducible builder, not the downloaded data.

## Sources

| Input | Official source | Local file | Use in JagaRawa |
| --- | --- | --- | --- |
| Roads, waterways, mapped settlements, schools, clinics, hospitals | [Geofabrik Kalimantan extract](https://download.geofabrik.de/asia/indonesia/kalimantan.html), OpenStreetMap data | `data/raw/kalimantan-latest.osm.pbf` | Nearest mapped access and exposure context |
| Population | [WorldPop Global 2 Indonesia 2025](https://hub.worldpop.org/project/categories?id=3), DOI `10.5258/SOTON/WP00840`, CC-BY-4.0 | `data/raw/worldpop-idn-2025-1km.tif` | Approximate people within 5 km |

## Build

```bash
python3 -m venv .venv
./.venv/bin/pip install osmium rasterio
./.venv/bin/python scripts/build_local_context.py
```

The builder writes `data/processed/local-context.json`, which is ignored by Git. It samples each OSM road or waterway at one middle geometry vertex, so its distance is an **access-context proxy**, not road-network travel distance. WorldPop values are first summed to 0.05 degree cells and only cell centres inside the 5 km circle are added; this is a transparent MVP approximation, not a precise zonal statistic.

## Upgrade path

Use PostGIS with full OSM geometries for road-network travel time and population-weighted evacuation routes. Calculate population with exact raster/circle overlap rather than cell-centre inclusion before using it for operational thresholds.
