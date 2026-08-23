# JagaRawa

**Sistem Intelijen Kebakaran Gambut untuk Kalimantan**

JagaRawa is an open, human-in-the-loop decision-support prototype for Indonesian peatland fire prevention and response. It combines the Indonesian-developed [`peatfr`](https://github.com/mellygsln/peatfr) risk model with active-fire, weather, smoke, peatland, exposure, and access data.

The product does not autonomously dispatch people or equipment. It helps an operator answer four practical questions:

1. Where is peat-fire risk highest in the next 72 hours?
2. Which satellite detections should be verified or acted on first?
3. Who may be exposed to smoke?
4. What action is appropriate, and how confident is the system?

## Why this project is needed

Peatland fires can grow underground, return after apparent suppression, and produce smoke that affects communities far from the original fire. Responders must often decide where to send limited teams, water, and aircraft while the available information is spread across different maps and systems.

Indonesia already has important government capabilities. SiPongi+ provides official hotspot and fire information; BMKG provides fire-weather warnings, satellite smoke analysis, and air-quality monitoring; BNPB and BPBD coordinate prevention and response. JagaRawa is designed to support, not replace, these systems.

The difference is the decision layer. Existing products primarily show the current fire, weather, smoke, or air-quality situation. JagaRawa brings those signals together with `peatfr`'s peat-specific forecast, nearby people and critical facilities, and access constraints. It then creates a ranked queue that states: **where to look first, what action to consider, why, and how confident the system is.**

For example, instead of showing a hotspot alone, JagaRawa can identify it as a high-confidence peatland incident with dry forecast conditions, an at-risk village downwind, and a recommendation to verify it within two hours. If a critical input is missing, such as water-table depth, the system clearly lowers its confidence rather than presenting false certainty.

## MVP

The first pilot targets Central Kalimantan using a 5 x 5 km spatial grid and a 72-hour forecast window.

```text
peatfr forecast + live hotspots + fire weather + peatland + exposure/access
                              ->
                    risk, confidence, and recommended action
```

See [the architecture](docs/architecture.md), [data catalogue](docs/data-sources.md), [confidence model](docs/confidence.md), [water-table ingestion contract](docs/water-table-ingestion.md), [open historical water-table import](docs/open-water-table-data.md), [UI brief](docs/ui-design.md), and [delivery roadmap](docs/roadmap.md).

## Data Sources And Status

Every displayed value must retain its original source, source timestamp, retrieval time, unit, spatial resolution, and quality flag. The web prototype labels values as **live**, **official context**, **prototype only**, or **not integrated**. A missing or unreachable source must never be treated as a zero or as evidence that a feature does not exist.

| Source | Data used or planned | Status in current web prototype | How it is used | Important limitation |
|---|---|---|---|---|
| [NASA FIRMS VIIRS S-NPP NRT](https://firms.modaps.eosdis.nasa.gov/web-services/) | Active-fire detection coordinates, acquisition date/time, confidence, fire radiative power (FRP) | **Live**, active clusters from the last 24 hours plus up to 10-day history, using a user-supplied FIRMS map key | Creates and ranks incident clusters and persistence evidence | The API is queried in two five-day windows; when its dated window is unavailable, the UI reports a five-day fallback. A satellite detection is evidence, not ground confirmation or burned area. |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | Temperature, precipitation, 10 m wind speed/direction, 0-1 cm soil-moisture proxy | **Live** per selected incident | Fire-weather context and PeatFR input readiness | Model/reanalysis-derived context; soil moisture is not peat water-table depth. |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | PM2.5 estimate | **Live** per selected incident | Smoke/exposure context | An estimate, not an authoritative BMKG station observation. |
| [BIG Satu Peta KHG layer 37](https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37) | Kesatuan Hidrologis Gambut (peat hydrological unit) geometry | **Live official context** per selected coordinate | Point-in-polygon peat/KHG intersection | An intersection is contextual evidence, not a fire probability. |
| [Geofabrik Kalimantan OpenStreetMap extract](https://download.geofabrik.de/asia/indonesia/kalimantan.html) | Roads, waterways, settlements, schools, clinics, hospitals | **Integrated locally after running the builder** | Nearest sampled mapped-feature access and exposure context | Mapping completeness varies. Distances use sampled OSM geometry and are not road-network travel distance. The dated source snapshot stays local and ignored; OSM attribution and ODbL terms apply. |
| OpenStreetMap raster tiles / MapLibre | Basemap and map rendering | **Live** | Visual geographic context | Basemap does not provide incident or risk evidence. |
| [`peatfr`](https://github.com/mellygsln/peatfr) | Peat-fire vulnerability forecast (PFVI), using water table, soil moisture, rainfall, temperature | **Prototype/readiness only** | Intended peat-specific risk engine | The browser prototype does not yet execute PeatFR or publish a PFVI value. |
| Local peat hydrology sensors / partner stations | Water-table depth | **Ingestion-ready; no partner feed configured** | Required preferred PeatFR input | Configure `WATER_TABLE_CSV_URL` with the validated CSV contract. Missing water-table depth lowers confidence; it must not be imputed as an observation. |
| [Taufik et al. 2022 supplementary workbook](https://ars.els-cdn.com/content/image/1-s2.0-S2352340922001159-mmc1.xlsx) | Historical daily groundwater-table observations from Batanghari and Kubu Raya research stations | **Import-ready historical validation data** | PeatFR development and proxy validation | Requires independently verified station coordinates before map use. Never treat as live Central Kalimantan monitoring. |
| [BMKG Karhutla](https://www.bmkg.go.id/cuaca/karhutla) | Fire-weather indices, smoke imagery, wind and hotspot interpretation | **Not integrated** | Official weather and smoke validation | Requires a supported, reliable feed and applicable attribution before ingestion. |
| [BMKG PM2.5](https://www.bmkg.go.id/kualitas-udara/pm25) | Station PM2.5 observations | **Not integrated** | Preferred authoritative air-quality context | Station observations are point measurements and need spatial matching. |
| [SiPongi+](https://sipongi.gakkum.kehutanan.go.id/) | Indonesian hotspot, fire-area and emissions context | **Not integrated** | Official operational cross-check | Use an approved download/API; do not scrape unsupported services. |
| [GPM IMERG](https://gpm.nasa.gov/data/imerg) | Satellite precipitation | **Not integrated** | Rainfall fallback and validation | Satellite rainfall is not a local rain gauge. |
| [ERA5-Land](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land) | Historical temperature, precipitation and soil variables | **Not integrated** | Backfill and historical model training | Reanalysis is not a substitute for local sensors. |
| [ESA WorldCover](https://esa-worldcover.org/en/data-access) | 2021 land-cover map | **Visual map overlay** | Operator geographic context | Public WMS imagery is not suitable for numeric analysis; a COG-processing worker is needed for fuel/land-use features. |
| [Copernicus Data Space Sentinel-1 catalogue](https://dataspace.copernicus.eu/) | Latest scene metadata intersecting each incident | **Live catalogue metadata** | Shows satellite availability for a future wetness-proxy workflow | This does not download or analyse imagery. The dashboard explicitly labels the wetness proxy as not computed. |
| [WorldPop Global 2 Indonesia 2025](https://hub.worldpop.org/project/categories?id=3), DOI `10.5258/SOTON/WP00840` | 1 km constrained population raster, locally aggregated to estimate people within 5 km | **Integrated locally after running the builder** | Population exposure context | Uses 0.05 degree aggregate cells and cell-centre inclusion, so it is an approximate exposure estimate, not a live evacuation count or exact zonal statistic. |
| Historical FIRMS / validated burned-area and field feedback | Past events and confirmed outcomes | **Not integrated** | Training, calibration, and evaluation | Field confirmation is the strongest outcome label. |

The detailed input contract and attribution notes are maintained in [docs/data-sources.md](docs/data-sources.md).
The reproducible local OSM and WorldPop build procedure is in [docs/local-exposure-data.md](docs/local-exposure-data.md).

## Classification And Confidence Formulas

### Current live FIRMS prototype

The current live queue is intentionally simple and does **not** yet blend the contextual data above into the displayed risk number. It groups FIRMS detections from the preceding up-to-10-day window by a rounded `0.1 degree x 0.1 degree` latitude/longitude cell, but only displays clusters with at least one detection in the past 24 hours. If the dated historical request is unavailable, the response reports and uses a five-day window:

```text
cluster_lat = round(latitude * 10) / 10
cluster_lng = round(longitude * 10) / 10
```

For each active cluster, let `n` be the number of detections during the last 24 hours, `d` be the number of distinct acquisition dates in the preceding 10 days, and `H` equal `1` when the latest VIIRS confidence is `h`/`high`, otherwise `0`.

```text
prototype_risk = min(92, 45 + 12 * n + 16 * H + 6 * min(3, max(0, d - 1)))
```

```text
priority = Critical  if prototype_risk >= 78
           High      otherwise

prototype_confidence = min(90, (76 if H = 1 else 54) + 8 * I(d >= 2)) percent

confidence_band = High    if prototype_confidence >= 75%
                  Medium  otherwise
```

Ten-day persistence is capped at 18 risk points and contributes an 8-point confidence increase after a second observed day. FRP, detection timestamp, selected-coordinate weather, PM2.5, soil moisture, KHG status, and access/exposure lookups are displayed as evidence or readiness context. They are **not currently used** in `prototype_risk` or `prototype_confidence`. This prevents the UI from claiming a sophisticated fused model that does not exist yet.

### Target calibrated classification model

The production approach is a calibrated, interpretable binary classifier for a peat-fire event in a `5 x 5 km` grid cell during the selected forecast horizon. Start with logistic regression and publish the feature values and calibrated probability:

```text
z = beta_0
  + beta_1 * PFVI
  + beta_2 * hotspot_recency
  + beta_3 * hotspot_cluster_strength
  + beta_4 * fire_weather
  + beta_5 * peat_context
  + beta_6 * fuel_and_burn_history
  + beta_7 * exposure
  + beta_8 * access

risk_probability = 1 / (1 + exp(-z))
```

`beta` coefficients are learned only from time-split historical data, then the probability is calibrated on a held-out period using isotonic regression or Platt scaling. Thresholds must be selected with agency partners using recall, false-alarm burden, lead time, and available response capacity; they are not fixed in this repository.

### Target decision-confidence score

Risk probability and decision confidence are separate. Risk answers “how likely is the event?”; confidence answers “how trustworthy is this recommendation given its evidence?” The initial transparent score is:

```text
decision_confidence = 100 * (
    0.30 * data_completeness
  + 0.25 * data_freshness
  + 0.25 * sensor_model_agreement
  + 0.10 * peatfr_model_stability
  + 0.10 * historical_calibration_quality
)
```

All five terms are normalized to `[0, 1]` and returned with the recommendation. The proposed display bands are `High >= 75%`, `Medium 50-74%`, and `Low < 50%`. Missing water-table data, stale satellite observations, cloud impacts, unavailable access data, disagreement between active-fire and weather signals, or weak out-of-sample calibration reduce confidence. They should not automatically reduce the underlying risk probability.

Bayesian updating is a later option: a calibrated prior probability can be updated with independent live evidence such as a confirmed field report. Reinforcement learning is not part of the operational risk score; it should first be evaluated offline for patrol or verification allocation after field outcome data is available.

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
