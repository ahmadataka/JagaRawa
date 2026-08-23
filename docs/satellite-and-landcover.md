# Satellite and land-cover stage

## What is implemented

`/api/landcover` samples the relevant public ESA WorldCover 2021 v200 Cloud-Optimized GeoTIFF (COG) tile for a 5 km incident context. It returns the dominant class and estimated shares of tree cover, cropland, built-up land, permanent water, herbaceous wetland, and mangroves. The endpoint reads a `256 x 256` nearest-neighbour sample over the 5 km bounding box, so percentages are a transparent composition estimate, not exact class area or a fuel model.

The source is [ESA WorldCover data access](https://esa-worldcover.org/en/data-access), 2021 v200, CC-BY-4.0. Map attribution: `© ESA WorldCover project / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium`.

`/api/satellite` searches the public [Copernicus Data Space STAC catalogue](https://stac.dataspace.copernicus.eu/v1/) for two recent Sentinel-1 GRD scenes intersecting a small incident area. Two scenes make a future before/after wetness calculation feasible, but this API currently returns metadata only.

## What is deliberately not claimed

- WorldCover is a 2021 land-cover baseline. It does not measure current fuel moisture, burned area, or plantation management.
- A Sentinel-1 catalogue result is not a SAR pixel value. No wetness index is returned until an authenticated download/processing path, radiometric calibration, speckle handling, incidence-angle normalization, and local validation are implemented.
- Neither product is included in the current FIRMS prototype risk or confidence score. They are transparent decision context only.

## Water-table status

The existing `/api/hydrology` CSV contract is now displayed for each incident. It only treats observations as PeatFR-ready when the closest reading is `verified` and no more than 48 hours old. The open Taufik et al. research workbook remains historical validation data; it has no independently verified station coordinates in this project and is not used as a live observation.
