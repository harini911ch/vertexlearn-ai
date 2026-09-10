BEGIN;

DROP INDEX IF EXISTS document_chunks_embedding_idx;

ALTER TABLE document_chunks
ALTER COLUMN embedding TYPE VECTOR(1024);

CREATE INDEX document_chunks_embedding_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);

COMMIT;
