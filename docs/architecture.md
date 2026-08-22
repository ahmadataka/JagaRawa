# Architecture

## System boundary

JagaRawa is a decision-support system, not an autonomous fire-dispatch system. It produces a ranked work queue for human operators and retains the evidence behind each recommendation.

```text
Data sources
  -> scheduled ingestion
  -> spatial/temporal harmonisation
  -> peatfr forecast service
  -> risk fusion and confidence calibration
  -> recommendation rules
  -> API, map, incident queue, and alerts
```

## Services

| Service | Technology | Responsibility |
|---|---|---|
| Ingestion worker | Python | Fetch, validate, snapshot, and normalize source feeds. |
| Spatial store | PostgreSQL + PostGIS | Store source observations, grids, boundaries, incidents, and feedback. |
| Peat-risk service | R + peatfr | Impute inputs and forecast PFVI using ARIMA, LSTM, or GRU. |
| Fusion API | Python + FastAPI | Build risk features, calculate probability/confidence, and serve recommendations. |
| Web application | React + TypeScript + MapLibre GL | Provide map, queue, incident detail, and data-health views. |
| Job scheduler | cron initially; Prefect later | Run hourly live-data jobs and daily forecast jobs. |

## Data flow

1. Normalize every observation to UTC, WGS84, source timestamp, fetch timestamp, resolution, and quality flag.
2. Aggregate dynamic data into 5 x 5 km Kalimantan grid cells and hourly/daily windows.
3. Supply water-table depth, soil moisture, rainfall, and temperature series to `peatfr`.
4. Store PFVI forecasts with model type, horizon, imputation method, and missing-input flags.
5. Join forecasts with hotspots, FWI/SPARTAN, wind, PM2.5, peat boundaries, population, and access features.
6. Produce risk probability, confidence, reason codes, and a human-readable recommendation.
7. Record field outcomes to evaluate calibration and improve the system.

## Initial deployment

Use Docker Compose with `postgres-postgis`, `api`, `worker`, `peatfr-r`, and `web`. Keep daily input snapshots in object storage so each published recommendation can be reproduced.

## Core entities

- `grid_cell`: geometry, administrative area, peatland and land-cover attributes.
- `observation`: source, variable, value, unit, observed/fetched time, geometry, quality.
- `forecast`: PFVI/risk outputs, model metadata, issue time, horizon.
- `incident`: clustered hotspot/fire event with status and linked grid cells.
- `recommendation`: action, urgency, probability, confidence, evidence, and expiry time.
- `field_feedback`: verification result, action taken, suppression status, and notes.
