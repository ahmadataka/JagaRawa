# RawaGuard

**Peat Fire Intelligence for Kalimantan**

RawaGuard is an open, human-in-the-loop decision-support prototype for Indonesian peatland fire prevention and response. It combines the Indonesian-developed [`peatfr`](https://github.com/mellygsln/peatfr) risk model with active-fire, weather, smoke, peatland, exposure, and access data.

The product does not autonomously dispatch people or equipment. It helps an operator answer four practical questions:

1. Where is peat-fire risk highest in the next 72 hours?
2. Which satellite detections should be verified or acted on first?
3. Who may be exposed to smoke?
4. What action is appropriate, and how confident is the system?

## Why this project is needed

Peatland fires can grow underground, return after apparent suppression, and produce smoke that affects communities far from the original fire. Responders must often decide where to send limited teams, water, and aircraft while the available information is spread across different maps and systems.

Indonesia already has important government capabilities. SiPongi+ provides official hotspot and fire information; BMKG provides fire-weather warnings, satellite smoke analysis, and air-quality monitoring; BNPB and BPBD coordinate prevention and response. RawaGuard is designed to support, not replace, these systems.

The difference is the decision layer. Existing products primarily show the current fire, weather, smoke, or air-quality situation. RawaGuard brings those signals together with `peatfr`'s peat-specific forecast, nearby people and critical facilities, and access constraints. It then creates a ranked queue that states: **where to look first, what action to consider, why, and how confident the system is.**

For example, instead of showing a hotspot alone, RawaGuard can identify it as a high-confidence peatland incident with dry forecast conditions, an at-risk village downwind, and a recommendation to verify it within two hours. If a critical input is missing, such as water-table depth, the system clearly lowers its confidence rather than presenting false certainty.

## MVP

The first pilot targets Central Kalimantan using a 5 x 5 km spatial grid and a 72-hour forecast window.

```text
peatfr forecast + live hotspots + fire weather + peatland + exposure/access
                              ->
                    risk, confidence, and recommended action
```

See [the architecture](docs/architecture.md), [data catalogue](docs/data-sources.md), [confidence model](docs/confidence.md), [UI brief](docs/ui-design.md), and [delivery roadmap](docs/roadmap.md).

## Principles

- Reuse Indonesian science: run `peatfr` directly as the peat-risk engine.
- Prefer open data and open-source components.
- Show evidence, uncertainty, freshness, and missing inputs beside every recommendation.
- Keep a human accountable for every operational decision.
- Learn from field feedback, without hiding decisions inside a black-box score.

## Proposed Stack

- `R` and `peatfr` for peat-fire risk forecasting.
- `Python`, FastAPI, Pandas, GeoPandas, and scikit-learn for ingestion, fusion, and API services.
- PostgreSQL with PostGIS for spatial data.
- React, TypeScript, and MapLibre GL for the operations map.
- Docker Compose for the MVP deployment.

## Status

Planning and research repository. No operational use or safety-critical deployment should occur before local validation with responsible agencies and field partners.
