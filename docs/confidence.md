# Risk and Confidence

RawaGuard shows both **risk probability** and **decision confidence**. They are deliberately separate.

- Risk probability asks: "How likely is a peat-fire event in this grid cell during the forecast window?"
- Decision confidence asks: "How trustworthy is this recommendation given the available evidence?"

## Risk fusion

Start with an interpretable calibrated classifier. Inputs include:

- `peatfr` PFVI forecast and model spread.
- FIRMS/SiPongi hotspot confidence, recency, count, and spatial clustering.
- Fire-weather values: FWI/SPARTAN, wind, rainfall deficit, and humidity where available.
- Peat hydrological unit, land cover, prior-burn history, and seasonality.
- Nearby population, schools/clinics, roads, waterways, and response-access indicators.
- PM2.5 trend and wind-aligned smoke evidence.

Use logistic regression as the baseline. Compare it with gradient boosting only if it produces a meaningful validated improvement. Fit isotonic regression or Platt scaling on a held-out historical period so published probabilities are calibrated.

## Confidence score

For MVP, publish a transparent weighted score:

```text
confidence =
  0.30 * data_completeness
  0.25 * data_freshness
  0.25 * sensor_model_agreement
  0.10 * peatfr_model_stability
  0.10 * historical_calibration_quality
```

Each component is normalized to `[0, 1]` and retained in the API response. Display `high` for >= 0.75, `medium` for 0.50-0.74, and `low` below 0.50.

Examples:

- A fresh high-confidence hotspot, high PFVI, dry-fire weather, and worsening downwind PM2.5: high risk and high confidence.
- High PFVI estimated without water-table data and no matching live signal: high risk but medium/low confidence.
- Cloud-obscured or old imagery with contradictory weather signals: low confidence, regardless of risk level.

## Probabilistic next phase

Run `peatfr` ARIMA, LSTM, and GRU variants as an ensemble when adequate data exists. Use their forecast dispersion as a model-uncertainty feature. Bayesian updating can then adjust prior risk using live evidence such as a confirmed hotspot or field report.

Do not use reinforcement learning in the operational UI until field feedback and resource-outcome data are sufficient. First use it offline to compare patrol or verification allocation policies.

## Evaluation

- Split validation chronologically to avoid future-data leakage.
- Measure event recall, precision, Brier score, calibration error, and alert lead time.
- Report results by province, peat/non-peat class, season, and data-availability group.
- Treat field confirmation as the strongest label; satellite hotspots are evidence, not perfect ground truth.
