import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/courses/my-courses`,
          {
            headers: getAuthHeaders(),
          }
        );

        setCourses(response.data.courses || []);
      } catch (error) {
        console.error("Dashboard error:", error);

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        setError(
          error.response?.data?.message ||
            "Failed to load your courses."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const totalCourses = courses.length;

  const completedCourses = useMemo(() => {
    return courses.filter(
      (course) =>
        course.enrollment_status === "completed" ||
        Number(course.progress_percent || 0) >= 100
    ).length;
  }, [courses]);

  const overallProgress = useMemo(() => {
    if (courses.length === 0) {
      return 0;
    }

    const total = courses.reduce(
      (sum, course) =>
        sum + Number(course.progress_percent || 0),
      0
    );

    return Math.round(total / courses.length);
  }, [courses]);

  const continueCourse = useMemo(() => {
    if (courses.length === 0) {
      return null;
    }

    const activeCourses = courses.filter(
      (course) =>
        course.enrollment_status !== "completed" &&
        Number(course.progress_percent || 0) < 100
    );

    const source =
      activeCourses.length > 0 ? activeCourses : courses;

    return source.reduce((current, course) => {
      if (!current) {
        return course;
      }

      return Number(course.progress_percent || 0) <
        Number(current.progress_percent || 0)
        ? course
        : current;
    }, null);
  }, [courses]);

  const primaryCourse = continueCourse || courses[0] || null;

  const handleCourseClick = (courseId) => {
    if (!courseId) {
      return;
    }

    navigate(`/course/${courseId}`);
  };

  const handleQuizClick = () => {
    if (primaryCourse?.course_id) {
      navigate(`/course/${primaryCourse.course_id}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleAssignmentsClick = () => {
    if (primaryCourse?.course_id) {
      navigate(`/course/${primaryCourse.course_id}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleNotesClick = () => {
    if (primaryCourse?.course_id) {
      navigate(`/course/${primaryCourse.course_id}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleTutorClick = () => {
    if (primaryCourse?.course_id) {
      navigate(`/course/${primaryCourse.course_id}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleStudyPlanClick = () => {
    if (primaryCourse?.course_id) {
      navigate(`/course/${primaryCourse.course_id}`);
      return;
    }

    navigate("/dashboard");
  };

  const handleCertificatesClick = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="brand-block">
            <div className="brand-mark">✦</div>

            <div>
              <h1>VertexLearn AI</h1>
              <p>AI-powered learning platform</p>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-loading">
            <div className="loading-spinner"></div>
            <p>Preparing your learning space...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="dashboard-header">
        <div className="brand-block">
          <div className="brand-mark">✦</div>

          <div>
            <h1>VertexLearn AI</h1>
            <p>Your personalized learning space</p>
          </div>
        </div>

        <div className="student-header-actions">
          <button
            className="dashboard-home-button"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content dashboard-v2">
        {/* =====================================================
            WELCOME HERO
        ===================================================== */}
        <section className="student-hero">
          <div className="student-hero-glow"></div>

          <div className="student-hero-content">
            <div className="student-hero-copy">
              <p className="eyebrow">STUDENT LEARNING HUB</p>

              <h2>
                Welcome back 👋
              </h2>

              <p className="welcome-text">
                Continue your courses, practice with quizzes,
                ask your AI tutor, manage assignments, and
                stay on track with personalized learning.
              </p>

              {primaryCourse ? (
                <div className="student-hero-course">
                  <span>YOUR CURRENT COURSE</span>

                  <strong>
                    {primaryCourse.title}
                  </strong>
                </div>
              ) : (
                <div className="student-hero-course">
                  <span>GET STARTED</span>

                  <strong>
                    Explore your learning journey
                  </strong>
                </div>
              )}
            </div>

            <div className="student-hero-side">
              <div className="hero-progress-ring">
                <div className="hero-progress-inner">
                  <strong>{overallProgress}%</strong>
                  <span>Progress</span>
                </div>
              </div>

              <p>Overall course progress</p>
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}
        {error && (
          <div className="dashboard-error">
            <div>
              <strong>Unable to load dashboard data</strong>
              <span>{error}</span>
            </div>

            <button
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again
            </button>
          </div>
        )}

        {/* =====================================================
            CONTINUE LEARNING
        ===================================================== */}
        {primaryCourse && (
          <section className="continue-card dashboard-continue-v2">
            <div className="continue-decoration"></div>

            <div className="continue-content">
              <div className="continue-label">
                PICK UP WHERE YOU LEFT OFF
              </div>

              <h3>{primaryCourse.title}</h3>

              <p>
                {primaryCourse.description ||
                  "Continue learning and make progress in your course."}
              </p>

              <div className="continue-progress">
                <div className="progress-info">
                  <span>Your progress</span>

                  <strong>
                    {Number(
                      primaryCourse.progress_percent || 0
                    ).toFixed(0)}
                    %
                  </strong>
                </div>

                <div className="dashboard-progress-bar">
                  <div
                    className="dashboard-progress-fill"
                    style={{
                      width: `${Math.min(
                        Number(
                          primaryCourse.progress_percent || 0
                        ),
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <button
                className="continue-button"
                onClick={() =>
                  handleCourseClick(
                    primaryCourse.course_id
                  )
                }
              >
                Continue Learning
                <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* =====================================================
            OVERVIEW STATS
        ===================================================== */}
        <section className="stats-section dashboard-stats-v2">
          <button
            className="stat-card dashboard-stat-action"
            onClick={() =>
              document
                .getElementById("my-courses")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <div className="stat-icon course-icon">
              📚
            </div>

            <div>
              <p>My Courses</p>
              <h3>{totalCourses}</h3>
              <span>View enrolled courses</span>
            </div>

            <b>→</b>
          </button>

          <button
            className="stat-card dashboard-stat-action"
            onClick={() =>
              document
                .getElementById("quick-actions")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <div className="stat-icon quiz-stat-icon">
              🧠
            </div>

            <div>
              <p>Completed</p>
              <h3>{completedCourses}</h3>
              <span>Finished courses</span>
            </div>

            <b>→</b>
          </button>

          <button
            className="stat-card dashboard-stat-action"
            onClick={() =>
              document
                .getElementById("quick-actions")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <div className="stat-icon progress-icon">
              ◔
            </div>

            <div>
              <p>Overall Progress</p>
              <h3>{overallProgress}%</h3>
              <span>Keep improving</span>
            </div>

            <b>→</b>
          </button>
        </section>

        {/* =====================================================
            QUICK LEARNING HUB
        ===================================================== */}
        <section
          id="quick-actions"
          className="student-dashboard-section quick-learning-section"
        >
          <div className="section-heading dashboard-section-heading-v2">
            <div>
              <p className="eyebrow">
                EVERYTHING IN ONE PLACE
              </p>

              <h2>Quick Learning Hub</h2>

              <p>
                Jump directly to the tools you use most
                while learning.
              </p>
            </div>
          </div>

          <div className="quick-action-grid">
            {/* COURSES */}
            <button
              className="quick-action-card quick-action-primary"
              onClick={() =>
                document
                  .getElementById("my-courses")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <div className="quick-action-icon">
                📚
              </div>

              <div className="quick-action-content">
                <span>LEARNING</span>
                <h3>My Courses</h3>
                <p>
                  Open your enrolled courses and continue
                  learning.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* QUIZ */}
            <button
              className="quick-action-card"
              onClick={handleQuizClick}
            >
              <div className="quick-action-icon quiz-action-icon">
                📝
              </div>

              <div className="quick-action-content">
                <span>PRACTICE</span>
                <h3>Take Quiz</h3>
                <p>
                  Test your understanding and check your
                  performance.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* AI TUTOR */}
            <button
              className="quick-action-card ai-quick-action"
              onClick={handleTutorClick}
            >
              <div className="quick-action-icon ai-action-icon">
                🤖
              </div>

              <div className="quick-action-content">
                <span>AI POWERED</span>
                <h3>AI Tutor</h3>
                <p>
                  Ask questions and understand difficult
                  topics with AI.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* STUDY PLAN */}
            <button
              className="quick-action-card study-plan-quick-action"
              onClick={handleStudyPlanClick}
            >
              <div className="quick-action-icon study-action-icon">
                🧠
              </div>

              <div className="quick-action-content">
                <span>PERSONALIZED</span>
                <h3>Study Plan</h3>
                <p>
                  Get a learning plan based on your quiz
                  performance.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* ASSIGNMENTS */}
            <button
              className="quick-action-card"
              onClick={handleAssignmentsClick}
            >
              <div className="quick-action-icon assignment-action-icon">
                📄
              </div>

              <div className="quick-action-content">
                <span>SUBMISSIONS</span>
                <h3>Assignments</h3>
                <p>
                  View your assignments and submit your
                  work.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* NOTES */}
            <button
              className="quick-action-card"
              onClick={handleNotesClick}
            >
              <div className="quick-action-icon notes-action-icon">
                🗒
              </div>

              <div className="quick-action-content">
                <span>REVISION</span>
                <h3>Notes</h3>
                <p>
                  Quickly access lecture notes and revision
                  material.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* CERTIFICATES */}
            <button
              className="quick-action-card"
              onClick={handleCertificatesClick}
            >
              <div className="quick-action-icon certificate-action-icon">
                🎓
              </div>

              <div className="quick-action-content">
                <span>ACHIEVEMENTS</span>
                <h3>Certificates</h3>
                <p>
                  View your completed learning achievements.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>

            {/* PROGRESS */}
            <button
              className="quick-action-card"
              onClick={() =>
                document
                  .getElementById("learning-overview")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <div className="quick-action-icon progress-action-icon">
                📈
              </div>

              <div className="quick-action-content">
                <span>TRACKING</span>
                <h3>My Progress</h3>
                <p>
                  See how far you've come across your
                  courses.
                </p>
              </div>

              <div className="quick-action-arrow">
                →
              </div>
            </button>
          </div>
        </section>

        {/* =====================================================
            LEARNING OVERVIEW
        ===================================================== */}
        <section
          id="learning-overview"
          className="student-dashboard-section learning-overview-section"
        >
          <div className="dashboard-overview-grid">
            <div className="dashboard-overview-card">
              <div className="overview-card-icon">
                🎯
              </div>

              <div>
                <span>YOUR FOCUS</span>

                <h3>
                  {primaryCourse
                    ? primaryCourse.title
                    : "Start a course"}
                </h3>

                <p>
                  {primaryCourse
                    ? "Keep building your knowledge through lectures, quizzes, notes, and practice."
                    : "Enroll in a course to begin your personalized learning journey."}
                </p>
              </div>
            </div>

            <div className="dashboard-overview-card">
              <div className="overview-card-icon">
                ⚡
              </div>

              <div>
                <span>NEXT STEP</span>

                <h3>
                  {primaryCourse &&
                  Number(
                    primaryCourse.progress_percent || 0
                  ) >= 100
                    ? "Explore another course"
                    : "Continue learning"}
                </h3>

                <p>
                  {primaryCourse
                    ? "Use the quick learning tools above whenever you need practice or support."
                    : "Your dashboard will become your central learning workspace."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MY COURSES
        ===================================================== */}
        <section
          id="my-courses"
          className="courses-section student-dashboard-section dashboard-courses-v2"
        >
          <div className="section-heading dashboard-section-heading-v2">
            <div>
              <p className="eyebrow">
                YOUR LEARNING
              </p>

              <h2>My Courses</h2>

              <p>
                Open a course directly or continue where
                you stopped.
              </p>
            </div>

            <span className="course-count">
              {totalCourses}{" "}
              {totalCourses === 1
                ? "course"
                : "courses"}
            </span>
          </div>

          {courses.length === 0 ? (
            <div className="empty-course-state dashboard-empty-v2">
              <div className="empty-icon">
                📖
              </div>

              <h3>
                Your learning journey starts here
              </h3>

              <p>
                No enrolled courses are available yet.
              </p>
            </div>
          ) : (
            <div className="course-grid dashboard-course-grid-v2">
              {courses.map((course) => {
                const progress = Math.min(
                  Number(course.progress_percent || 0),
                  100
                );

                const isCompleted =
                  course.enrollment_status ===
                    "completed" ||
                  progress >= 100;

                return (
                  <article
                    className="course-card dashboard-course-card-v2"
                    key={course.course_id}
                  >
                    <div className="course-card-top">
                      <div className="course-category">
                        COURSE
                      </div>

                      {isCompleted && (
                        <div className="completed-badge">
                          ✓ Completed
                        </div>
                      )}
                    </div>

                    <h3>{course.title}</h3>

                    <p className="course-description">
                      {course.description ||
                        "Continue your learning journey in this course."}
                    </p>

                    <div className="course-progress-section">
                      <div className="course-progress-info">
                        <span>Progress</span>

                        <strong>
                          {progress.toFixed(0)}%
                        </strong>
                      </div>

                      <div className="course-progress-bar">
                        <div
                          className="course-progress-fill"
                          style={{
                            width: `${progress}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="course-footer dashboard-course-footer-v2">
                      <span className="course-status">
                        {isCompleted
                          ? "Course completed"
                          : progress > 0
                          ? "In progress"
                          : "Not started"}
                      </span>

                      <button
                        onClick={() =>
                          handleCourseClick(
                            course.course_id
                          )
                        }
                      >
                        {isCompleted
                          ? "Review Course"
                          : progress > 0
                          ? "Continue"
                          : "Open Course"}
                        <span>→</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            LEARNING JOURNEY
        ===================================================== */}
        <section className="student-dashboard-section journey-section">
          <div className="section-heading dashboard-section-heading-v2">
            <div>
              <p className="eyebrow">
                YOUR LEARNING JOURNEY
              </p>

              <h2>Learn. Practice. Improve.</h2>

              <p>
                VertexLearn AI brings your complete learning
                workflow together in one place.
              </p>
            </div>
          </div>

          <div className="learning-journey-grid">
            <div className="journey-step">
              <div className="journey-number">01</div>

              <div>
                <h3>Learn</h3>
                <p>
                  Watch lectures, study notes, and explore
                  course content.
                </p>
              </div>
            </div>

            <div className="journey-step">
              <div className="journey-number">02</div>

              <div>
                <h3>Practice</h3>
                <p>
                  Take quizzes and use assignments to test
                  your understanding.
                </p>
              </div>
            </div>

            <div className="journey-step">
              <div className="journey-number">03</div>

              <div>
                <h3>Improve</h3>
                <p>
                  Use AI Tutor and personalized study plans
                  to improve weak areas.
                </p>
              </div>
            </div>

            <div className="journey-step">
              <div className="journey-number">04</div>

              <div>
                <h3>Achieve</h3>
                <p>
                  Complete your courses and move toward
                  your certificates.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;