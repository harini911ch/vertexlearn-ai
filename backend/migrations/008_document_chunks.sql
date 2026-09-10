BEGIN;

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    course_id UUID NOT NULL
        REFERENCES courses(id)
        ON DELETE CASCADE,

    lecture_id UUID
        REFERENCES lectures(id)
        ON DELETE CASCADE,

    chunk_text TEXT NOT NULL,

    embedding VECTOR(1536) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX document_chunks_embedding_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);

COMMIT;
