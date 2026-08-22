# MVP Roadmap

## Week 1: credible risk prototype

1. Create PostGIS schema and a 5 x 5 km Central Kalimantan grid.
2. Containerize and test `peatfr` with a representative time-series input contract.
3. Ingest FIRMS, rainfall/temperature fallback data, peat boundaries, and basic population/road layers.
4. Publish a daily PFVI grid and a simple ranked incident CSV/API.
5. Build the map with risk, hotspots, peatland overlay, and source freshness.

## Week 2: decision support

1. Add BMKG fire-weather, wind, and PM2.5 inputs where permitted and technically supported.
2. Add incident clustering, exposure scoring, and explicit recommendation rules.
3. Add the transparent confidence score and missing-data warnings.
4. Backtest against one or more historical fire periods.
5. Pilot review with a local researcher, peatland practitioner, BPBD/agency contact, or field partner.

## Success criteria

- A user can identify the top 20 priority cells/incidents and understand why each is ranked.
- Every recommendation reports risk, confidence, source timestamps, and missing data.
- Historical backtest reports calibrated probability and alert lead time.
- At least one domain reviewer confirms the outputs are understandable and operationally plausible.

## Later work

- Integrate validated local water-table sensors.
- Add smoke dispersion/nowcasting and health-alert workflows.
- Add field-report collection with offline support.
- Evaluate offline RL for patrol, verification, or limited-resource allocation.
