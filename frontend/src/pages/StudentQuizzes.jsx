import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";
import "./StudentQuizzes.css";

function StudentQuizzes() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [quizzes, setQuizzes] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/courses/my-courses`,
          {
            headers: getAuthHeaders(),
          }
        );

        const loadedCourses = response.data.courses || [];

        setCourses(loadedCourses);

        if (loadedCourses.length > 0) {
          setSelectedCourseId(
            loadedCourses[0].course_id
          );
        }
      } catch (err) {
        console.error(
          "Student quizzes course error:",
          err
        );

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        setError(
          err.response?.data?.message ||
            "Failed to load your courses."
        );
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, [navigate]);

  useEffect(() => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId("");
      setQuizzes([]);
      return;
    }

    const loadModules = async () => {
      try {
        setLoadingModules(true);
        setError("");
        setSelectedModuleId("");
        setQuizzes([]);

        const response = await axios.get(
          `${API_URL}/courses/${selectedCourseId}/modules`
        );

        const loadedModules =
          response.data.modules || [];

        setModules(loadedModules);

        if (loadedModules.length > 0) {
          setSelectedModuleId(loadedModules[0].id);
        }
      } catch (err) {
        console.error(
          "Student quizzes module error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load course modules."
        );
      } finally {
        setLoadingModules(false);
      }
    };

    loadModules();
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedModuleId) {
      setQuizzes([]);
      return;
    }

    const loadQuizzes = async () => {
      try {
        setLoadingQuizzes(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/courses/modules/${selectedModuleId}/quizzes`,
          {
            headers: getAuthHeaders(),
          }
        );

        setQuizzes(response.data.quizzes || []);
      } catch (err) {
        console.error(
          "Student quizzes list error:",
          err
        );

        setQuizzes([]);

        setError(
          err.response?.data?.message ||
            "Failed to load quizzes."
        );
      } finally {
        setLoadingQuizzes(false);
      }
    };

    loadQuizzes();
  }, [selectedModuleId]);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) =>
          course.course_id === selectedCourseId
      ),
    [courses, selectedCourseId]
  );

  const selectedModule = useMemo(
    () =>
      modules.find(
        (module) => module.id === selectedModuleId
      ),
    [modules, selectedModuleId]
  );

  const handleStartQuiz = (quizId) => {
    navigate(`/quiz/${quizId}`);
  };

  return (
    <div className="student-feature-page">
      <header className="student-feature-header">
        <div className="brand-block">
          <div className="brand-mark">✦</div>

          <div>
            <h1>VertexLearn AI</h1>
            <p>Student Learning Hub</p>
          </div>
        </div>

        <button
          className="feature-back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </header>

      <main className="student-feature-content">
        <section className="feature-hero quiz-feature-hero">
          <div>
            <p className="feature-eyebrow">
              PRACTICE & ASSESSMENT
            </p>

            <h2>Take a Quiz</h2>

            <p>
              Test your understanding, strengthen your
              knowledge, and track how well you're learning.
            </p>
          </div>

          <div className="feature-hero-icon">📝</div>
        </section>

        {error && (
          <div className="feature-error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {loadingCourses ? (
          <div className="feature-loading">
            <div className="loading-spinner"></div>
            <p>Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <section className="feature-empty-card">
            <div>📚</div>
            <h3>No courses available</h3>
            <p>
              You need to be enrolled in a course before
              taking a quiz.
            </p>

            <button
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </section>
        ) : (
          <>
            <section className="feature-selection-card">
              <div className="selection-heading">
                <div>
                  <p className="feature-eyebrow">
                    STEP 1
                  </p>

                  <h3>Select Course</h3>

                  <p>
                    Choose the course you want to practice.
                  </p>
                </div>

                <span className="selection-number">
                  01
                </span>
              </div>

              <select
                value={selectedCourseId}
                onChange={(event) =>
                  setSelectedCourseId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select a course
                </option>

                {courses.map((course) => (
                  <option
                    key={course.course_id}
                    value={course.course_id}
                  >
                    {course.title}
                  </option>
                ))}
              </select>

              {selectedCourse && (
                <div className="selection-preview">
                  <strong>
                    {selectedCourse.title}
                  </strong>

                  <span>
                    {Number(
                      selectedCourse.progress_percent || 0
                    ).toFixed(0)}
                    % course progress
                  </span>
                </div>
              )}
            </section>

            <section className="feature-selection-card">
              <div className="selection-heading">
                <div>
                  <p className="feature-eyebrow">
                    STEP 2
                  </p>

                  <h3>Select Module</h3>

                  <p>
                    Choose the module containing the quiz
                    you want to attempt.
                  </p>
                </div>

                <span className="selection-number">
                  02
                </span>
              </div>

              {loadingModules ? (
                <div className="inline-loading">
                  <div className="loading-spinner"></div>
                  <span>
                    Loading modules...
                  </span>
                </div>
              ) : modules.length === 0 ? (
                <div className="feature-inline-empty">
                  No modules are available for this course.
                </div>
              ) : (
                <select
                  value={selectedModuleId}
                  onChange={(event) =>
                    setSelectedModuleId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select a module
                  </option>

                  {modules.map((module) => (
                    <option
                      key={module.id}
                      value={module.id}
                    >
                      {module.title}
                    </option>
                  ))}
                </select>
              )}

              {selectedModule && (
                <div className="selection-preview">
                  <strong>
                    {selectedModule.title}
                  </strong>

                  <span>
                    Choose from the quizzes below
                  </span>
                </div>
              )}
            </section>

            <section className="feature-results-section">
              <div className="feature-section-heading">
                <div>
                  <p className="feature-eyebrow">
                    STEP 3
                  </p>

                  <h3>Available Quizzes</h3>

                  <p>
                    Start a quiz when you're ready.
                  </p>
                </div>

                {quizzes.length > 0 && (
                  <span className="feature-count">
                    {quizzes.length}{" "}
                    {quizzes.length === 1
                      ? "quiz"
                      : "quizzes"}
                  </span>
                )}
              </div>

              {loadingQuizzes ? (
                <div className="feature-loading quiz-list-loading">
                  <div className="loading-spinner"></div>
                  <p>
                    Loading available quizzes...
                  </p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="feature-empty-inline">
                  <div className="feature-empty-icon">
                    📝
                  </div>

                  <h3>No quizzes available</h3>

                  <p>
                    There are currently no quizzes for
                    this module.
                  </p>
                </div>
              ) : (
                <div className="student-quiz-hub-grid">
                  {quizzes.map((quiz, index) => (
                    <article
                      className="student-quiz-hub-card"
                      key={quiz.id}
                    >
                      <div className="quiz-hub-card-top">
                        <div className="quiz-hub-number">
                          {String(index + 1).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        {quiz.is_ai_generated && (
                          <span className="ai-generated-badge">
                            ✨ AI Generated
                          </span>
                        )}
                      </div>

                      <h3>{quiz.title}</h3>

                      <p>
                        Practice your knowledge from{" "}
                        {selectedModule?.title ||
                          "this module"}.
                      </p>

                      <div className="quiz-hub-meta">
                        <span>📝 Quiz</span>
                        <span>
                          {quiz.question_count ??
                            "Multiple"}{" "}
                          Questions
                        </span>
                      </div>

                      <button
                        className="quiz-hub-start-button"
                        onClick={() =>
                          handleStartQuiz(quiz.id)
                        }
                      >
                        Start Quiz
                        <span>→</span>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default StudentQuizzes;