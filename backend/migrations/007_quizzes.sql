BEGIN;

CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    module_id UUID NOT NULL
        REFERENCES modules(id)
        ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,

    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,

    generated_from_lecture_id UUID
        REFERENCES lectures(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    quiz_id UUID NOT NULL
        REFERENCES quizzes(id)
        ON DELETE CASCADE,

    question_text TEXT NOT NULL,

    question_type VARCHAR(20) NOT NULL,

    order_index INT NOT NULL,

    CONSTRAINT valid_question_type
        CHECK (question_type IN ('mcq', 'multi_select', 'short_answer'))
);

CREATE TABLE quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    question_id UUID NOT NULL
        REFERENCES quiz_questions(id)
        ON DELETE CASCADE,

    option_text TEXT NOT NULL,

    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    quiz_id UUID NOT NULL
        REFERENCES quizzes(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    score NUMERIC(5,2),

    started_at TIMESTAMPTZ DEFAULT now(),

    submitted_at TIMESTAMPTZ
);

CREATE TABLE quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    attempt_id UUID NOT NULL
        REFERENCES quiz_attempts(id)
        ON DELETE CASCADE,

    question_id UUID NOT NULL
        REFERENCES quiz_questions(id)
        ON DELETE CASCADE,

    selected_option_ids UUID[],

    text_answer TEXT,

    is_correct BOOLEAN
);

COMMIT;