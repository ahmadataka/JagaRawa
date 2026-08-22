# Data Catalogue

Use source terms and attribution requirements before operational deployment. Preserve raw snapshots where licences allow.

| Source | Variables | Cadence | MVP role | Notes |
|---|---|---:|---|---|
| [peatfr](https://github.com/mellygsln/peatfr) | water table, soil moisture, rainfall, temperature, PFVI | daily | Peat-specific risk forecast | Primary model; preserve model and input provenance. |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/web-services/) | VIIRS/MODIS active-fire detections and confidence | near-real time | Active-fire evidence and incident clusters | Use source confidence and acquisition time. |
| [SiPongi+](https://sipongi.gakkum.kehutanan.go.id/) | Indonesian hotspots, fire-area indications, emissions | daily/public | Official operational context and validation | Do not scrape where a supported download/API is unavailable. |
| [BMKG Karhutla](https://www.bmkg.go.id/cuaca/karhutla) | fire-weather indices, smoke imagery, wind, hotspots | daily | Weather danger and smoke interpretation | Attribute BMKG when displaying its imagery/products. |
| [BMKG PM2.5](https://www.bmkg.go.id/kualitas-udara/pm25) | measured PM2.5 | hourly | Exposure and impact signal | Treat station readings as point observations. |
| [GPM IMERG](https://gpm.nasa.gov/data/imerg) | precipitation | sub-daily | Rainfall fallback/validation | Use if local observations are incomplete. |
| [ERA5-Land](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land) | temperature, precipitation, soil variables | hourly/daily | Backfill and historical modelling | Reanalysis, not a local station substitute. |
| [Satu Peta / BIG](https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/37) | peat hydrological unit layers | static | Peatland context | Check layer metadata/version. |
| [ESA WorldCover](https://esa-worldcover.org/en/data-access) | land cover | periodic | Fuel/land-use feature | Static baseline for MVP. |
| [OpenStreetMap](https://welcome.openstreetmap.org/working-with-osm-data/downloading-and-using/) | roads, waterways, facilities | periodic | Access and exposure | Use ODbL attribution and maintain source data separation. |

## Minimum peatfr input contract

Each time series must include `location_id`, `observed_at`, `value`, `unit`, `source`, and `quality_flag`.

| Variable | Preferred source | MVP fallback | Confidence penalty when fallback is used |
|---|---|---|---:|
| Water-table depth | Local peat hydrology sensors/partner stations | Missing; do not fabricate | High |
| Soil moisture | In-situ or validated satellite product | ERA5-Land proxy | Medium |
| Rainfall | BMKG observation/forecast | GPM IMERG | Low to medium |
| Air temperature | BMKG observation/forecast | ERA5-Land | Low |

Missing water-table data should reduce decision confidence; it should never be silently represented as an observed value.
