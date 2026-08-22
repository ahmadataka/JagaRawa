# Water-Table Ingestion And PeatFR Contract

JagaRawa accepts water-table data only from a named, authorized partner source. Do not use guessed values or values copied from a map as station observations.

## Configure a feed

Set `WATER_TABLE_CSV_URL` in `app/.env.local` to an HTTPS CSV endpoint. The endpoint must return the exact header order-independent schema below. The public template is available at `/data/water-table-template.csv`.

```text
station_id,latitude,longitude,observed_at,water_table_depth_m,unit,source,quality_flag
```

Rules:

- `observed_at` must be UTC ISO-8601.
- `water_table_depth_m` is a non-negative depth below ground surface in metres.
- `unit` must be `m`.
- `quality_flag` must be `verified` before it can feed PeatFR.
- Preserve the partner source name and station ID; never overwrite them during normalization.

`GET /api/hydrology?lat={lat}&lng={lng}` validates the feed, finds the nearest station, reports distance and observation age, and marks it fresh only if it is verified and at most 48 hours old.

## PeatFR handoff

The validated input table for `services/peatfr/run_peatfr.R` requires:

```text
location_id,observed_at,rainfall_mm,temperature_c,soil_moisture_m3m3,water_table_depth_m,source,quality_flag
```

The runner rejects missing or unverified water-table values. It writes a PFVI output contract with issue time, model identity, and 72-hour horizon. The final forecasting call must use the installed [`peatfr`](https://github.com/mellygsln/peatfr) version selected and validated with Indonesian field partners.
