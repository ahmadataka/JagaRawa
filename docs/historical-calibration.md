# Historical outcomes and calibration

## Current implementation

The reproducible builder `scripts/build_historical_burn_baseline.py` imports the public [GWIS Global Monthly Burned Area](https://gwis.jrc.ec.europa.eu/apps/country.profile/downloads) archive. Its values are derived from MODIS MCD64A1 burned area and cover 2002-2024. The downloaded administrative version currently provides Kalimantan Barat, Selatan, Tengah, and Timur; the API uses an all-Kalimantan fallback for a province absent from that source snapshot.

For each calendar month, the dashboard displays:

```text
monthly_burned_hectares = forest + savannas + shrublands_grasslands + croplands + other
median_ha = median(monthly_burned_hectares across 2002-2024)
p75_ha = 75th_percentile(monthly_burned_hectares across 2002-2024)
years_with_burn = count(monthly_burned_hectares > 0)
```

`seasonality` is `high`, `medium`, or `low` by comparing the monthly median with the maximum monthly median within the same region. It is **not** a fire probability, model score, or training label.

## Calibration work still required

A valid 5 km fire-risk model needs spatial labels and lagged features at matching locations and times. The next data build must add one of:

- GWIS GlobFire perimeters (large public download) intersected with a 5 km grid; or
- MCD64A1/FireCCI pixel burned-area labels, with documented quality filtering.

For each monthly prediction timestamp `t`, build features only from data available before `t`, use an event label from a later fixed horizon, then split chronologically:

```text
train: earlier years
validation: later held-out years for model/threshold selection
test: final unseen years for reported performance
```

Use precision-recall, recall at response capacity, calibration error, Brier score, lead time, and provincial fairness/error slices. Do not tune on the test period or turn the current seasonal baseline into a spatial risk estimate.
