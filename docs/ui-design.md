# UI Design

The primary interface is an operations workspace for an analyst or incident coordinator. It should prioritize explainability and speed over visual novelty.

```text
┌──────────────────────────────────────────────────────────────────┐
│ JagaRawa | Kalimantan | Updated 12:00 WIB                        │
│ [Now] [24h] [72h]  Risk [All v]  Confidence [All v]              │
├──────────────────────┬───────────────────────────┬───────────────┤
│ Incident queue       │ Interactive map           │ Detail        │
│ Critical  82% / high │ 5 km risk grid            │ Risk 78%      │
│ Pulang Pisau         │ hotspots + peat boundary  │ Conf. 71%     │
│ Verify within 2h     │ wind/smoke + exposure     │ Action        │
│                      │ roads/water access        │ Verify < 2h  │
│ High 74% / medium    │                           │ Why           │
│ Kubu Raya            │                           │ PFVI, FIRMS,  │
│ Patrol today         │                           │ dry weather   │
└──────────────────────┴───────────────────────────┴───────────────┘
```

## Screens

### Operations map

- Risk-grid layer, incident clusters, peat boundaries, wind arrows, smoke corridor, and optional exposure/access layers.
- Layer toggles and time horizon selector.
- `critical` red, `high` orange, `watch` yellow, and `insufficient data` grey hatch.

### Incident queue

Rank incidents by urgency, combining risk probability, confidence, exposure, and action deadline. Each row shows location, recommended action, risk, confidence, and evidence summary.

### Incident detail

Show a map, 72-hour trend, source freshness, confidence breakdown, reason codes, recommended action, nearby people/assets, and field-feedback controls: `false alarm`, `active fire`, `contained`, `smoke observed`.

### Exposure view

Show PM2.5 station readings, wind-aligned smoke corridor, and potentially affected schools, clinics, villages, and population estimates.

### Data health view

Show stale feeds, missing water-table observations, cloud-affected coverage, last successful forecast, and model-version status. A user must be able to distinguish "low risk" from "insufficient data".

## Accessible recommendation language

Use direct verbs and a clear deadline, for example: "Verify within 2 hours", "Conduct preventive patrol today", "Prepare downwind health advisory", or "Acquire observations before deployment".
