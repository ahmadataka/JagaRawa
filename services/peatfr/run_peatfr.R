#!/usr/bin/env Rscript

# JagaRawa PeatFR service contract. Run only with validated partner observations.
required <- c("location_id", "observed_at", "rainfall_mm", "temperature_c", "soil_moisture_m3m3", "water_table_depth_m", "source", "quality_flag")
input_path <- Sys.getenv("PEATFR_INPUT_CSV", "data/processed/peatfr-input.csv")
output_path <- Sys.getenv("PEATFR_OUTPUT_CSV", "data/processed/peatfr-output.csv")

if (!file.exists(input_path)) stop("Missing PeatFR input CSV: ", input_path)
input <- read.csv(input_path, stringsAsFactors = FALSE)
missing_columns <- setdiff(required, names(input))
if (length(missing_columns)) stop("Missing columns: ", paste(missing_columns, collapse = ", "))
if (any(!is.finite(input$water_table_depth_m)) || any(input$water_table_depth_m < 0)) stop("Water-table depth must be a non-negative numeric value")
if (any(input$quality_flag != "verified")) stop("Only verified observations may be passed to PeatFR")

# Install peatfr in the service image and replace this contract row with the
# package's selected forecasting call (ARIMA, LSTM, or GRU), preserving model metadata.
output <- data.frame(
  location_id = unique(input$location_id),
  issued_at = format(Sys.time(), tz = "UTC", usetz = TRUE),
  pfvi = NA_real_,
  model = "peatfr-pending-runtime",
  horizon_hours = 72,
  stringsAsFactors = FALSE
)
write.csv(output, output_path, row.names = FALSE)
message("Validated input contract. Configure the peatfr package runtime to generate PFVI.")
