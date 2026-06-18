#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL}"
: "${INPUT_PATH:?Set INPUT_PATH to a shapefile, GeoPackage, or FileGDB layer path}"
: "${SOURCE_AGENCY:=USFWS}"
: "${LAYER_NAME:=critical_habitat_raw}"

ogr2ogr \
  -f PostgreSQL "PG:$DATABASE_URL" "$INPUT_PATH" \
  -nln "$LAYER_NAME" \
  -lco GEOMETRY_NAME=geom \
  -lco FID=id \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -overwrite

psql "$DATABASE_URL" <<SQL
INSERT INTO species (spcode, common_name, scientific_name, status, source, updated_at)
SELECT DISTINCT
  COALESCE(NULLIF(spcode, ''), NULLIF(SPCODE, '')) AS spcode,
  COALESCE(comname, common_nam, commonname, COMNAME) AS common_name,
  COALESCE(sciname, sci_name, scientific, SCINAME) AS scientific_name,
  COALESCE(status, STATUS) AS status,
  '$SOURCE_AGENCY' AS source,
  now()
FROM "$LAYER_NAME"
WHERE COALESCE(NULLIF(spcode, ''), NULLIF(SPCODE, '')) IS NOT NULL
ON CONFLICT (spcode) DO UPDATE SET
  common_name = COALESCE(EXCLUDED.common_name, species.common_name),
  scientific_name = COALESCE(EXCLUDED.scientific_name, species.scientific_name),
  status = COALESCE(EXCLUDED.status, species.status),
  updated_at = now();

INSERT INTO critical_habitat (spcode, common_name, scientific_name, status, source_agency, geom)
SELECT
  COALESCE(NULLIF(spcode, ''), NULLIF(SPCODE, '')) AS spcode,
  COALESCE(comname, common_nam, commonname, COMNAME) AS common_name,
  COALESCE(sciname, sci_name, scientific, SCINAME) AS scientific_name,
  COALESCE(status, STATUS) AS status,
  '$SOURCE_AGENCY' AS source_agency,
  ST_Multi(ST_MakeValid(geom))::geometry(MultiPolygon,4326) AS geom
FROM "$LAYER_NAME"
WHERE geom IS NOT NULL;
SQL
