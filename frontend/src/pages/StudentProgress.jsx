import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./StudentProgress.css";

function StudentProgress() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [progressData, setProgressData] = useState(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
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
        setSelectedCourseId(loadedCourses[0].course_id);
      }
    } catch (error) {
      console.error("Failed to load courses:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load your courses."
      );
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    if (selectedCourseId) {
      loadProgress(selectedCourseId);
    } else {
      setProgressData(null);
    }
  }, [selectedCourseId]);

  async function loadProgress(courseId) {
    try {
      setLoadingProgress(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/${courseId}/my-progress`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        setProgressData(response.data);
      } else {
        setError("Failed to load progress data.");
      }
    } catch (error) {
      console.error("Progress loading error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load your progress."
      );
    } finally {
      setLoadingProgress(false);
    }
  }

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) =>
          course.course_id === selectedCourseId
      ),
    [courses, selectedCourseId]
  );

  const courseProgress = Number(
    progressData?.course_progress || 0
  );

  const quizPerformance =
    progressData?.quiz_performance || {};

  const topicMastery =
    progressData?.topic_mastery || [];

  const recommendations =
    progressData?.recommendations || [];

  return (
    <div className="student-progress-page">
      <header className="student-progress-topbar">
        <button
          className="student-progress-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="student-progress-brand">
          <div className="student-progress-brand-mark">
            ✦
          </div>

          <div>
            <strong>VertexLearn AI</strong>
            <span>Student Progress</span>
          </div>
        </div>
      </header>

      <main className="student-progress-container">
        <section className="student-progress-hero">
          <div className="student-progress-hero-icon">
            📊
          </div>

          <p className="student-progress-eyebrow">
            PERSONAL LEARNING INSIGHTS
          </p>

          <h1>My Progress</h1>

          <p>
            Track your course progress, understand your
            strengths, identify areas that need practice,
            and follow personalized recommendations.
          </p>
        </section>

        {error && (
          <div className="student-progress-error">
            <strong>Unable to load progress</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="student-progress-course-card">
          <div>
            <p className="student-progress-eyebrow">
              SELECT COURSE
            </p>

            <h2>
              Choose a course to view your progress
            </h2>
          </div>

          <select
            value={selectedCourseId}
            onChange={(event) =>
              setSelectedCourseId(event.target.value)
            }
            disabled={loadingCourses || loadingProgress}
          >
            <option value="">
              {loadingCourses
                ? "Loading courses..."
                : courses.length === 0
                ? "No courses available"
                : "Select a course"}
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
        </section>

        {loadingProgress && (
          <section className="student-progress-loading">
            <div className="student-progress-spinner"></div>

            <h3>Loading your learning insights</h3>

            <p>
              We're analyzing your latest course and
              quiz performance.
            </p>
          </section>
        )}

        {!loadingProgress &&
          progressData &&
          selectedCourse && (
            <>
              <section className="student-progress-course-title">
                <div>
                  <p className="student-progress-eyebrow">
                    CURRENT COURSE
                  </p>

                  <h2>{selectedCourse.title}</h2>
                </div>

                <span className="student-progress-course-badge">
                  Learning Analytics
                </span>
              </section>

              <section className="student-progress-stats-grid">
                <div className="student-progress-stat-card primary">
                  <div className="student-progress-stat-icon">
                    📈
                  </div>

                  <span>COURSE PROGRESS</span>

                  <strong>
                    {courseProgress.toFixed(0)}%
                  </strong>

                  <div className="student-progress-bar">
                    <div
                      style={{
                        width: `${Math.min(
                          courseProgress,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="student-progress-stat-card">
                  <div className="student-progress-stat-icon">
                    📝
                  </div>

                  <span>QUIZ ATTEMPTS</span>

                  <strong>
                    {quizPerformance.total_attempts || 0}
                  </strong>

                  <p>
                    Completed attempts
                  </p>
                </div>

                <div className="student-progress-stat-card">
                  <div className="student-progress-stat-icon">
                    🎯
                  </div>

                  <span>AVERAGE SCORE</span>

                  <strong>
                    {Number(
                      quizPerformance.average_score || 0
                    ).toFixed(0)}
                    %
                  </strong>

                  <p>
                    Across your completed quizzes
                  </p>
                </div>

                <div className="student-progress-stat-card">
                  <div className="student-progress-stat-icon">
                    🏆
                  </div>

                  <span>BEST SCORE</span>

                  <strong>
                    {Number(
                      quizPerformance.best_score || 0
                    ).toFixed(0)}
                    %
                  </strong>

                  <p>
                    Your highest quiz performance
                  </p>
                </div>
              </section>

              <section className="student-progress-section-card">
                <div className="student-progress-section-heading">
                  <div className="student-progress-heading-icon">
                    🧠
                  </div>

                  <div>
                    <p className="student-progress-eyebrow">
                      TOPIC MASTERY
                    </p>

                    <h3>
                      Understand your strengths
                    </h3>

                    <p>
                      Your mastery is calculated from
                      quiz performance across each module.
                    </p>
                  </div>
                </div>

                {topicMastery.length === 0 ? (
                  <div className="student-progress-empty">
                    <span>📚</span>

                    <strong>
                      No mastery data yet
                    </strong>

                    <p>
                      Complete a quiz to start building
                      your topic mastery insights.
                    </p>
                  </div>
                ) : (
                  <div className="student-mastery-list">
                    {topicMastery.map((topic) => {
                      const score = Number(
                        topic.mastery_score || 0
                      );

                      return (
                        <div
                          className="student-mastery-item"
                          key={topic.module_id}
                        >
                          <div className="student-mastery-top">
                            <div>
                              <strong>
                                {topic.module_title}
                              </strong>

                              <span>
                                {topic.attempts}{" "}
                                {topic.attempts === 1
                                  ? "attempt"
                                  : "attempts"}
                              </span>
                            </div>

                            <div className="student-mastery-score">
                              <strong>
                                {score.toFixed(0)}%
                              </strong>

                              <span
                                className={`mastery-level ${topic.mastery_level
                                  .toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )}`}
                              >
                                {topic.mastery_level}
                              </span>
                            </div>
                          </div>

                          <div className="student-mastery-bar">
                            <div
                              style={{
                                width: `${Math.min(
                                  score,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="student-progress-section-card recommendations-card">
                <div className="student-progress-section-heading">
                  <div className="student-progress-heading-icon">
                    💡
                  </div>

                  <div>
                    <p className="student-progress-eyebrow">
                      PERSONALIZED RECOMMENDATIONS
                    </p>

                    <h3>
                      What should you do next?
                    </h3>

                    <p>
                      Suggestions based on your current
                      performance.
                    </p>
                  </div>
                </div>

                <div className="student-recommendations-list">
                  {recommendations.map(
                    (recommendation, index) => (
                      <div
                        className="student-recommendation-item"
                        key={index}
                      >
                        <div className="recommendation-number">
                          {index + 1}
                        </div>

                        <div>
                          <strong>
                            {recommendation.title}
                          </strong>

                          <p>
                            {recommendation.message}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              <section className="student-progress-bottom-card">
                <div>
                  <span>KEEP GOING</span>

                  <h3>
                    Small consistent steps create
                    strong results.
                  </h3>

                  <p>
                    Continue with your lectures, quizzes,
                    assignments, and AI-powered learning
                    tools to keep improving.
                  </p>
                </div>

                <button
                  onClick={() =>
                    navigate(
                      `/course/${selectedCourseId}`
                    )
                  }
                >
                  Continue Learning →
                </button>
              </section>
            </>
          )}
      </main>
    </div>
  );
}

export default StudentProgress;