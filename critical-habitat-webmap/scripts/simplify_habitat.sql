-- Optional: create a simplified layer for faster lower-zoom display.
DROP TABLE IF EXISTS critical_habitat_simplified;
CREATE TABLE critical_habitat_simplified AS
SELECT
  id, spcode, common_name, scientific_name, status, source_agency,
  ST_Multi(ST_SimplifyPreserveTopology(geom, 0.005))::geometry(MultiPolygon, 4326) AS geom,
  ST_Transform(ST_Multi(ST_SimplifyPreserveTopology(geom, 0.005))::geometry(MultiPolygon, 4326), 3857) AS geom_web
FROM critical_habitat;
CREATE INDEX critical_habitat_simplified_geom_web_idx ON critical_habitat_simplified USING gist (geom_web);
