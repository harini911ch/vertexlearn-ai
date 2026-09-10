BEGIN;

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,

    instructions TEXT,

    rubric JSONB,

    due_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    file_url TEXT,

    submitted_at TIMESTAMPTZ DEFAULT now(),

    grade NUMERIC(5,2),

    feedback TEXT
);

COMMIT;