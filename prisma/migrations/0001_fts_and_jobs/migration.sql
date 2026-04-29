-- Full-text search columns + indexes.
-- Prisma can't model GENERATED + tsvector cleanly yet, so we manage these
-- columns + triggers in raw SQL. Reads in app code use $queryRaw against
-- band_search_tsv / article_search_tsv.

-- ---- enable required extensions (pg_trgm for fallback/typo tolerance) ----
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---- Band tsvector --------------------------------------------------------
ALTER TABLE "Band"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector;

CREATE OR REPLACE FUNCTION band_search_tsv_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.city, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."countryCode", ''))), 'D') ||
    setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.themes, ' '), ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.tags, ' '), ''))), 'C') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.bio, ''))), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS band_search_tsv_trg ON "Band";
CREATE TRIGGER band_search_tsv_trg
  BEFORE INSERT OR UPDATE ON "Band"
  FOR EACH ROW EXECUTE FUNCTION band_search_tsv_update();

-- Backfill existing rows
UPDATE "Band" SET "search_tsv" = "search_tsv";

CREATE INDEX IF NOT EXISTS band_search_tsv_idx ON "Band" USING GIN ("search_tsv");
CREATE INDEX IF NOT EXISTS band_name_trgm_idx ON "Band" USING GIN (name gin_trgm_ops);

-- ---- Article tsvector -----------------------------------------------------
ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector;

CREATE OR REPLACE FUNCTION article_search_tsv_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('english', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.subtitle, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.excerpt, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW."contentText", ''))), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS article_search_tsv_trg ON "Article";
CREATE TRIGGER article_search_tsv_trg
  BEFORE INSERT OR UPDATE ON "Article"
  FOR EACH ROW EXECUTE FUNCTION article_search_tsv_update();

UPDATE "Article" SET "search_tsv" = "search_tsv";

CREATE INDEX IF NOT EXISTS article_search_tsv_idx ON "Article" USING GIN ("search_tsv");
