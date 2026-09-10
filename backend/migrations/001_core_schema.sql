BEGIN;

-- ============================================================
-- 1. Enable UUID generation
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. Create the new PRD-compliant users table
-- ============================================================

CREATE TABLE users_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 3. Preserve the existing user
-- ============================================================

INSERT INTO users_new (
    full_name,
    email,
    password_hash,
    is_active,
    created_at,
    updated_at
)
SELECT
    name,
    email,
    password,
    TRUE,
    created_at,
    created_at
FROM users;


-- ============================================================
-- 4. Replace old users table
-- ============================================================

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;


-- ============================================================
-- 5. Roles
-- ============================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO roles (name)
VALUES
    ('student'),
    ('instructor'),
    ('admin')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 6. User ↔ Role relationship
-- ============================================================

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);


-- Existing user becomes a student
INSERT INTO user_roles (user_id, role_id)
SELECT
    u.id,
    r.id
FROM users u
JOIN roles r ON r.name = 'student'
WHERE u.email = 'harini@example.com';


-- ============================================================
-- 7. Courses
-- ============================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(80),
    difficulty VARCHAR(20),
    thumbnail_url TEXT,
    price NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 8. Modules
-- ============================================================

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    order_index INT NOT NULL
);


-- ============================================================
-- 9. Lectures
-- ============================================================

CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    video_url TEXT,
    transcript TEXT,
    duration_seconds INT,
    order_index INT NOT NULL,
    resource_urls TEXT[]
);


COMMIT;