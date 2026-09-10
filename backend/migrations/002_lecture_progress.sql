BEGIN;

CREATE TABLE lecture_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,

    progress_seconds INT NOT NULL DEFAULT 0,

    is_completed BOOLEAN NOT NULL DEFAULT FALSE,

    completed_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE (user_id, lecture_id)
);

COMMIT;