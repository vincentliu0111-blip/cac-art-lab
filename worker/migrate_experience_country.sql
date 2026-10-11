-- Apply once to the existing v7 D1 table before deploying the country-aware Worker.
-- Existing choices keep NULL: their country cannot be reconstructed.
ALTER TABLE experience_choices
  ADD COLUMN country_code TEXT CHECK (country_code IS NULL OR country_code GLOB '[A-Z][A-Z]');
CREATE INDEX experience_country
  ON experience_choices (environment,dataset_version,country_code,session_id);
