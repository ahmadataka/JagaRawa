#!/usr/bin/env python3
"""Create a local, transparent historical burned-area baseline for Kalimantan.

This is a seasonal calibration input, not a spatial 5 km fire-label dataset.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import zipfile
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

KALIMANTAN = {"Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara"}
LAND_COVER_COLUMNS = ("forest", "savannas", "shrublands_grasslands", "croplands", "other")


def quantile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    position = (len(ordered) - 1) * fraction
    lower, upper = int(position), min(int(position) + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def summarize(values: list[float], regional_peak: float) -> dict[str, float | int | str]:
    median = statistics.median(values)
    p75 = quantile(values, 0.75)
    relative = median / regional_peak if regional_peak else 0
    return {
        "medianHa": round(median, 1),
        "p75Ha": round(p75, 1),
        "yearsWithBurn": sum(value > 0 for value in values),
        "years": len(values),
        "seasonality": "high" if relative >= 0.67 else "medium" if relative >= 0.33 else "low",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("data/raw/gwis-mcd64a1-2002-2024.zip"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/historical-burn-baseline.json"))
    args = parser.parse_args()
    if not args.input.exists():
        raise SystemExit("Download the GWIS MCD64A1 archive before building the baseline.")

    values: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    with zipfile.ZipFile(args.input) as archive:
        csv_name = next(name for name in archive.namelist() if name.endswith(".csv"))
        with archive.open(csv_name, "r") as raw:
            for row in csv.DictReader((line.decode("utf-8") for line in raw), delimiter=";"):
                if row["gid_0"] != "IDN" or row["region"] not in KALIMANTAN:
                    continue
                value = sum(float(row[column] or 0) for column in LAND_COVER_COLUMNS)
                values[row["region"]][int(row["month"])].append(value)

    output_regions: dict[str, dict[str, dict[str, float | int | str]]] = {}
    for region, months in values.items():
        monthly_medians = {month: statistics.median(series) for month, series in months.items()}
        peak = max(monthly_medians.values(), default=0)
        output_regions[region] = {str(month): summarize(series, peak) for month, series in sorted(months.items())}

    grouped: dict[int, list[float]] = defaultdict(list)
    for months in values.values():
        for month, series in months.items():
            grouped[month].extend(series)
    grouped_medians = {month: statistics.median(series) for month, series in grouped.items()}
    output_regions["Kalimantan"] = {str(month): summarize(series, max(grouped_medians.values(), default=0)) for month, series in sorted(grouped.items())}

    payload = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "source": {"name": "GWIS Global Monthly Burned Area, MCD64A1-derived", "url": "https://gwis.jrc.ec.europa.eu/apps/country.profile/downloads", "coverage": "2002-2024", "resolution": "province-month"},
        "method": "For each province and calendar month, sum GWIS burned hectares across its published land-cover classes. Report the 2002-2024 median, 75th percentile, and number of years with non-zero burned area. Seasonality compares the monthly median with that region's highest monthly median.",
        "limitations": "This is a province-month seasonal baseline, not a 5 km burned-area label. It must not be used as a fire probability or merged into the live FIRMS score until spatial labels and time-split feature data are available.",
        "regions": output_regions,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {args.output} for {len(values)} Kalimantan provinces and aggregate baseline")


if __name__ == "__main__":
    main()
