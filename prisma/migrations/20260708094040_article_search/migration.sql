CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Article_search_document_idx"
ON "Article"
USING GIN (
  (
    setweight(to_tsvector('simple', COALESCE("title", '')), 'A')
    || setweight(to_tsvector('simple', COALESCE("description", '')), 'B')
    || setweight(to_tsvector('simple', COALESCE("content", '')), 'C')
  )
)
WHERE "published" = true;

CREATE INDEX "Article_search_title_trgm_idx"
ON "Article"
USING GIN ("title" gin_trgm_ops)
WHERE "published" = true;
