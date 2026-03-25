-- Extensión PostGIS para geoespacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_properties_comuna ON properties(comuna);
CREATE INDEX IF NOT EXISTS idx_properties_precio_uf ON properties(precio_uf);
CREATE INDEX IF NOT EXISTS idx_valuations_score ON valuations(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
