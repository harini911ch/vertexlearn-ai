BEGIN;

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    enrolled_at TIMESTAMPTZ DEFAULT now(),

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,

    completed_at TIMESTAMPTZ,

    UNIQUE (user_id, course_id)
);

COMMIT;