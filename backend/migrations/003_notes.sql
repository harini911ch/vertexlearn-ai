BEGIN;

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    timestamp_seconds INT,

    created_at TIMESTAMPTZ DEFAULT now(),

    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMIT;