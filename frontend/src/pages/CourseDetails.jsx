import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";

function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [courseLoading, setCourseLoading] =
    useState(true);

  const [assignmentLoading, setAssignmentLoading] =
    useState(true);

  const [quizLoading, setQuizLoading] =
    useState(true);

  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // Load course
  // ----------------------------------------------------------

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setCourseLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/courses/${courseId}`
        );

        setCourse(
          response.data.course || null
        );
      } catch (error) {
        console.error(
          "Course error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Failed to load course"
        );
      } finally {
        setCourseLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  // ----------------------------------------------------------
  // Load assignments
  // ----------------------------------------------------------

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        setAssignmentLoading(true);

        const response = await axios.get(
          `${API_URL}/courses/${courseId}/assignments`,
          {
            headers: getAuthHeaders(),
          }
        );

        setAssignments(
          response.data.assignments || []
        );
      } catch (error) {
        console.error(
          "Assignment error:",
          error
        );

        setAssignments([]);
      } finally {
        setAssignmentLoading(false);
      }
    };

    if (courseId) {
      loadAssignments();
    }
  }, [courseId]);

  // ----------------------------------------------------------
  // Load quizzes
  // ----------------------------------------------------------

  useEffect(() => {
    const loadQuizzes = async () => {
      if (!course?.modules?.length) {
        setQuizzes([]);
        setQuizLoading(false);
        return;
      }

      try {
        setQuizLoading(true);

        const quizResults = await Promise.all(
          course.modules.map(
            async (module) => {
              try {
                const response =
                  await axios.get(
                    `${API_URL}/courses/modules/${module.id}/quizzes`,
                    {
                      headers:
                        getAuthHeaders(),
                    }
                  );

                return (
                  response.data.quizzes ||
                  []
                ).map((quiz) => ({
                  ...quiz,
                  module_title:
                    module.title,
                  module_index:
                    module.order_index,
                  module_id: module.id,
                }));
              } catch (error) {
                console.error(
                  `Quiz error for module ${module.id}:`,
                  error
                );

                return [];
              }
            }
          )
        );

        setQuizzes(
          quizResults
            .flat()
            .sort(
              (a, b) =>
                Number(
                  a.module_index || 0
                ) -
                Number(
                  b.module_index || 0
                )
            )
        );
      } catch (error) {
        console.error(
          "Quiz loading error:",
          error
        );

        setQuizzes([]);
      } finally {
        setQuizLoading(false);
      }
    };

    if (course) {
      loadQuizzes();
    }
  }, [course]);

  // ----------------------------------------------------------
  // Total lectures
  // ----------------------------------------------------------

  const totalLectures = useMemo(() => {
    if (!course?.modules) {
      return 0;
    }

    return course.modules.reduce(
      (total, module) =>
        total +
        (module.lectures?.length || 0),
      0
    );
  }, [course]);

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  if (courseLoading) {
    return (
      <div className="course-details-page">
        <header className="dashboard-header">
          <div className="brand-block">
            <div className="brand-mark">
              ✦
            </div>

            <div>
              <h1>
                VertexLearn AI
              </h1>

              <p>
                AI-powered learning platform
              </p>
            </div>
          </div>
        </header>

        <main className="course-details-content">
          <div className="course-page-loading">
            <div className="loading-spinner"></div>

            <p>
              Loading course...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Error
  // ----------------------------------------------------------

  if (error || !course) {
    return (
      <div className="course-details-page">
        <header className="dashboard-header">
          <div className="brand-block">
            <div className="brand-mark">
              ✦
            </div>

            <div>
              <h1>
                VertexLearn AI
              </h1>

              <p>
                AI-powered learning platform
              </p>
            </div>
          </div>
        </header>

        <main className="course-details-content">
          <div className="course-error-card">
            <div className="course-error-icon">
              !
            </div>

            <h2>
              {error ||
                "Course not found"}
            </h2>

            <p>
              We couldn't load this course.
            </p>

            <button
              onClick={() =>
                navigate("/dashboard")
              }
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Main course page
  // ----------------------------------------------------------

  return (
    <div className="course-details-page">

      <header className="dashboard-header">
        <div className="brand-block">
          <div className="brand-mark">
            ✦
          </div>

          <div>
            <h1>
              VertexLearn AI
            </h1>

            <p>
              AI-powered learning platform
            </p>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          Dashboard
        </button>
      </header>

      <main className="course-details-content">

        {/* Back */}

        <button
          className="course-back-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

        {/* Course hero */}

        <section className="course-hero">
          <div className="course-hero-decoration"></div>

          <div className="course-hero-content">
            <div className="course-hero-label">
              YOUR COURSE
            </div>

            <h2>
              {course.title}
            </h2>

            <p className="course-hero-description">
              {course.description}
            </p>

            <div className="course-hero-tags">
              <span>
                {course.category}
              </span>

              <span>
                {course.difficulty}
              </span>

              <span>
                {totalLectures}{" "}
                {totalLectures === 1
                  ? "lecture"
                  : "lectures"}
              </span>

              <span>
                {quizzes.length}{" "}
                {quizzes.length === 1
                  ? "quiz"
                  : "quizzes"}
              </span>
            </div>
          </div>
        </section>

        {/* Course overview */}

        <section className="course-overview-grid">
          <div className="course-overview-card">
            <div className="overview-icon">
              📚
            </div>

            <div>
              <span>
                Learning format
              </span>

              <strong>
                Self-paced
              </strong>
            </div>
          </div>

          <div className="course-overview-card">
            <div className="overview-icon">
              🎓
            </div>

            <div>
              <span>
                Level
              </span>

              <strong>
                {course.difficulty}
              </strong>
            </div>
          </div>

          <div className="course-overview-card">
            <div className="overview-icon">
              🤖
            </div>

            <div>
              <span>
                AI support
              </span>

              <strong>
                AI Tutor enabled
              </strong>
            </div>
          </div>
        </section>

        {/* Course content */}

        <section className="course-learning-section">
          <div className="course-section-heading">
            <div>
              <p className="eyebrow">
                LEARNING PATH
              </p>

              <h2>
                Course Content
              </h2>

              <p>
                Work through each lecture at
                your own pace and use the AI
                Tutor whenever you need help.
              </p>
            </div>
          </div>

          {course.modules?.length === 0 ? (
            <div className="empty-course-state">
              <div className="empty-icon">
                📖
              </div>

              <h3>
                No modules available yet
              </h3>

              <p>
                Course content will appear here
                once your instructor adds it.
              </p>
            </div>
          ) : (
            course.modules?.map(
              (module, moduleIndex) => (
                <div
                  className="module-card-enhanced"
                  key={module.id}
                >
                  <div className="module-header">
                    <div className="module-number">
                      {String(
                        moduleIndex + 1
                      ).padStart(2, "0")}
                    </div>

                    <div className="module-heading">
                      <span>
                        MODULE{" "}
                        {moduleIndex + 1}
                      </span>

                      <h3>
                        {module.title}
                      </h3>
                    </div>

                    <div className="module-count">
                      {module.lectures?.length ||
                        0}{" "}
                      {(module.lectures?.length ||
                        0) === 1
                        ? "lecture"
                        : "lectures"}
                    </div>
                  </div>

                  <div className="lecture-list-enhanced">
                    {module.lectures?.map(
                      (
                        lecture,
                        lectureIndex
                      ) => (
                        <div
                          className="lecture-item-enhanced"
                          key={lecture.id}
                        >
                          <div className="lecture-number">
                            {String(
                              lectureIndex + 1
                            ).padStart(2, "0")}
                          </div>

                          <div className="lecture-main">
                            <strong>
                              {lecture.title}
                            </strong>

                            <p>
                              <span>
                                Video lecture
                              </span>

                              <span>
                                •
                              </span>

                              <span>
                                {Math.floor(
                                  lecture.duration_seconds /
                                    60
                                )}{" "}
                                minutes
                              </span>
                            </p>
                          </div>

                          <button
                            className="lecture-open-button"
                            onClick={() =>
                              navigate(
                                `/lecture/${lecture.id}?courseId=${encodeURIComponent(
                                  courseId
                                )}&moduleId=${encodeURIComponent(
                                  module.id
                                )}`
                              )
                            }
                          >
                            Open

                            <span>
                              →
                            </span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )
          )}
        </section>

        {/* Quizzes */}

        <section className="course-quiz-section">
          <div className="course-section-heading">
            <div>
              <p className="eyebrow">
                CHECK YOUR KNOWLEDGE
              </p>

              <h2>
                Quizzes
              </h2>

              <p>
                Test your understanding of the
                concepts you learned in each module.
              </p>
            </div>
          </div>

          {quizLoading ? (
            <div className="quiz-loading-state">
              <div className="loading-spinner"></div>

              <p>
                Loading quizzes...
              </p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="empty-course-state">
              <div className="empty-icon">
                🧠
              </div>

              <h3>
                No quizzes available
              </h3>

              <p>
                Quizzes will appear here when
                your instructor publishes them.
              </p>
            </div>
          ) : (
            <div className="quiz-grid-enhanced">
              {quizzes.map(
                (quiz, index) => (
                  <div
                    className="quiz-card-enhanced"
                    key={quiz.id}
                  >
                    <div className="quiz-card-icon">
                      🧠
                    </div>

                    <div className="quiz-card-content">
                      <div className="quiz-top-row">
                        <span>
                          QUIZ {index + 1}
                        </span>

                        <span className="quiz-module-badge">
                          {quiz.module_title}
                        </span>
                      </div>

                      <h3>
                        {quiz.title}
                      </h3>

                      <p>
                        Test your understanding of
                        the topics covered in this
                        module.
                      </p>

                      <div className="quiz-meta">
                        <span>
                          {Number(
                            quiz.question_count ||
                              0
                          )}{" "}
                          {Number(
                            quiz.question_count ||
                              0
                          ) === 1
                            ? "question"
                            : "questions"}
                        </span>

                        <span>
                          Auto-graded
                        </span>
                      </div>

                      <button
                        className="quiz-open-button"
                        onClick={() =>
                          navigate(
                            `/quiz/${quiz.id}`
                          )
                        }
                      >
                        Take Quiz

                        <span>
                          →
                        </span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Assignments */}

        <section className="course-assignment-section">
          <div className="course-section-heading">
            <div>
              <p className="eyebrow">
                PRACTICE & ASSESSMENT
              </p>

              <h2>
                Assignments
              </h2>

              <p>
                Apply what you learn and submit
                your work for instructor feedback.
              </p>
            </div>
          </div>

          {assignmentLoading ? (
            <div className="assignment-loading">
              <div className="loading-spinner"></div>

              <p>
                Loading assignments...
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-course-state">
              <div className="empty-icon">
                ✅
              </div>

              <h3>
                No assignments available
              </h3>

              <p>
                New assignments will appear here
                when they are published.
              </p>
            </div>
          ) : (
            <div className="assignment-grid-enhanced">
              {assignments.map(
                (assignment) => (
                  <div
                    className="assignment-card-enhanced"
                    key={assignment.id}
                  >
                    <div className="assignment-icon">
                      📝
                    </div>

                    <div className="assignment-content">
                      <div className="assignment-top-row">
                        <span>
                          ASSIGNMENT
                        </span>

                        {assignment.due_date && (
                          <span className="assignment-due-badge">
                            Due soon
                          </span>
                        )}
                      </div>

                      <h3>
                        {assignment.title}
                      </h3>

                      {assignment.instructions && (
                        <p>
                          {
                            assignment.instructions
                          }
                        </p>
                      )}

                      {assignment.due_date && (
                        <div className="assignment-due">
                          <span>
                            Due date
                          </span>

                          <strong>
                            {new Date(
                              assignment.due_date
                            ).toLocaleDateString(
                              undefined,
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </strong>
                        </div>
                      )}

                      <button
                        className="assignment-open-button"
                        onClick={() =>
                          navigate(
                            `/assignment/${assignment.id}`
                          )
                        }
                      >
                        Open Assignment

                        <span>
                          →
                        </span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CourseDetails;