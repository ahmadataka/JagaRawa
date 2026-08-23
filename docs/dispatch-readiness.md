# Dispatch readiness

The `/api/dispatch` endpoint is a human-in-the-loop planning aid. It reads either `RESPONSE_RESOURCES_CSV_URL` or the ignored local file `data/processed/response-resources.csv`, validates a strict roster contract, and identifies the nearest **verified, available** unit by straight-line distance.

It does not dispatch a resource, reserve equipment, estimate road travel time, or claim capacity when no roster is present. The dashboard must display `Not configured` until an accountable operator maintains the roster.

```bash
cp data/templates/response-resources-template.csv data/processed/response-resources.csv
```

The roster may include fire crews, patrol teams, pumps, boats, aircraft, or health-response assets in `capabilities`. Each update needs a source, UTC timestamp, status, availability count, and `verified` quality flag. The next upgrade is local road-network routing and operator-approved capacity rules.
