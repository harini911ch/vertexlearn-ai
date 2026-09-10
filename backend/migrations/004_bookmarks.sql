BEGIN;

CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,

    timestamp_seconds INT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE (user_id, lecture_id, timestamp_seconds)
);

COMMIT;