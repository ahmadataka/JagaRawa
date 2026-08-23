# Open Historical Water-Table Data

The initial no-partner-data source is the supplementary workbook for Taufik et al. (2022), *Groundwater table and soil-hydrological properties datasets of Indonesian peatlands*.

- Source workbook: `https://ars.els-cdn.com/content/image/1-s2.0-S2352340922001159-mmc1.xlsx`
- Article and license: [PMC8847808](https://pmc.ncbi.nlm.nih.gov/articles/PMC8847808/), CC BY-NC 4.0.
- Coverage: daily historical groundwater-table observations from eight research stations in Batanghari, Jambi and Kubu Raya, West Kalimantan.
- Use: PeatFR development and historical validation only. It is not a current Central Kalimantan operational feed.

## Import procedure

1. Download the workbook into `data/raw/taufik-2022-groundwater.xlsx`; raw data is intentionally ignored by Git.
2. Fill `data/templates/taufik-2022-stations.csv` only with verified station coordinates and cite the source in `coordinate_source`.
3. Run:

```bash
python3 scripts/import_taufik_2022.py
```

The importer rejects missing coordinates. It converts the source's negative below-ground measurements to the positive `water_table_depth_m` convention required by JagaRawa. The output is tagged `historical_research`, so it cannot be confused with a fresh verified operational observation.
