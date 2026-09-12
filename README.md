# VertexLearn AI

VertexLearn AI is a full-stack Learning Management System (LMS) developed as part of my full-stack internship project.

The project provides role-based learning features for students, instructors, and administrators, along with an AI service for learning assistance.

## Project Overview

VertexLearn AI is designed to provide a centralized platform where users can access courses, lectures, assignments, quizzes, progress tracking, study plans, certificates, and AI-assisted learning features.

The application is divided into separate frontend, backend, and AI-service components.

## Main Features

### Authentication and Authorization

- User registration and login
- JWT-based authentication
- Password hashing using bcrypt
- Role-based access control
- Student, Instructor, and Admin roles

### Student Features

- Student dashboard
- Course browsing and enrollment
- Lecture access
- Lecture progress tracking
- Notes and bookmarks
- Assignments
- Quizzes
- Study plans
- Certificates
- AI Tutor

### Instructor Features

- Instructor dashboard
- Course management
- Course content and lecture management
- Assignment and quiz management
- Student submission management
- Instructor access to learning analytics/features

### Admin Features

- Admin dashboard
- User management
- Role management
- Course management
- Administrative controls

### AI Service

The project includes a separate Python-based AI service for AI-assisted learning functionality.

The AI service contains components for:

- AI service API
- Question processing
- Question embedding data
- Content ingestion

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- Axios
- CSS

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- JWT
- bcrypt
- Multer
- Axios

### AI Service

- Python
- FastAPI
- AI and embedding-related processing

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- Redis

### Development Tools

- Git
- GitHub
- Visual Studio Code

## Project Structure

```text
vertexlearn-ai/
│
├── ai-service/
│   ├── app/
│   │   ├── main.py
│   │   └── ingest.py
│   ├── requirements.txt
│   └── question_embedding.json
│
├── backend/
│   ├── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
│
├── infra/
│   └── docker-compose.yml
│
├── docs/
│
└── README.md
```

## Backend API

The backend provides REST APIs for authentication, users, courses, lectures, assignments, quizzes, administration, and AI-related functionality.

Authentication-protected routes use JWT-based authentication and role-based authorization where required.

## Database

PostgreSQL is used as the main relational database.

The project contains database migrations for features including:

- Core user and course data
- Lecture progress
- Notes
- Bookmarks
- Enrollments
- Assignments
- Quizzes
- Document chunks
- Study plans
- Certificates

## Running the Project Locally

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL or Docker
- Docker Desktop
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/harini911ch/vertexlearn-ai.git
cd vertexlearn-ai
```

### 2. Start Infrastructure Services

From the project root:

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Start the Backend

Open a terminal and run:

```bash
cd backend
npm install
npm run dev
```

The backend development server uses the TypeScript server configuration in `src/server.ts`.

### 4. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will provide the local frontend development URL in the terminal.

### 5. AI Service

The AI service is located in:

```text
ai-service/
```

Its Python dependencies are listed in:

```text
ai-service/requirements.txt
```

The AI service can be configured separately according to the environment and required AI functionality.

## Environment Variables

Environment-specific configuration is stored locally in `.env` files.

For security reasons, actual environment files and secrets are not committed to GitHub.

Create the required environment variables locally before running the services.

## Security

The project follows basic security practices including:

- JWT authentication
- Password hashing with bcrypt
- Role-based authorization
- Environment variables for configuration
- Ignoring local `.env` files
- Keeping uploaded/local files outside version control

## Development Challenges

During development, some of the main challenges included:

- Setting up the backend and database connection
- Configuring PostgreSQL and Redis with Docker
- Implementing JWT authentication
- Implementing role-based authorization
- Connecting frontend and backend services
- Managing file and resource uploads
- Organizing multiple application services
- Debugging environment and development configuration issues

These challenges helped me understand the practical workflow of developing and integrating a full-stack application.

## GitHub Repository

Repository:

https://github.com/harini911ch/vertexlearn-ai

## Project Status

This project was developed as an internship project with a focus on implementing the core LMS functionality, backend APIs, frontend pages, database integration, authentication, role-based access control, and AI-assisted learning components.

## Author

**CH Harini**

Full-Stack Development Intern