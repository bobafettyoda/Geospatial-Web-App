CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS species (
  spcode text PRIMARY KEY,
  common_name text,
  scientific_name text,
  status text,
  species_type text,
  species_group text,
  species_family text,
  listing_date date,
  ecos_url text,
  source text,
  source_updated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS critical_habitat (
  id bigserial PRIMARY KEY,
  spcode text REFERENCES species(spcode),
  common_name text,
  scientific_name text,
  status text,
  source_agency text,
  habitat_status text,
  source_id text,
  source_url text,
  source_updated_at timestamptz,
  geom geometry(MultiPolygon, 4326),
  geom_web geometry(MultiPolygon, 3857),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS critical_habitat_geom_idx ON critical_habitat USING gist (geom);
CREATE INDEX IF NOT EXISTS critical_habitat_geom_web_idx ON critical_habitat USING gist (geom_web);
CREATE INDEX IF NOT EXISTS species_common_name_trgm_idx ON species USING gin (common_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS species_scientific_name_trgm_idx ON species USING gin (scientific_name gin_trgm_ops);

CREATE OR REPLACE FUNCTION refresh_habitat_web_geom()
RETURNS trigger AS $$
BEGIN
  NEW.geom = ST_Multi(ST_MakeValid(NEW.geom));
  NEW.geom_web = ST_Transform(NEW.geom, 3857);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS critical_habitat_geom_trigger ON critical_habitat;
CREATE TRIGGER critical_habitat_geom_trigger
BEFORE INSERT OR UPDATE OF geom ON critical_habitat
FOR EACH ROW EXECUTE FUNCTION refresh_habitat_web_geom();
