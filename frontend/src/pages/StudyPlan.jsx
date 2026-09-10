import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./StudyPlan.css";

function StudyPlan() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [plan, setPlan] = useState(null);
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

  async function generateStudyPlan() {
    if (!selectedCourseId) {
      setError("Please select a course.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setPlan(null);

      const response = await axios.post(
        `${API_URL}/ai/study-plan`,
        {
          course_id: selectedCourseId,
        },
        {
          headers: getAuthHeaders(),
          timeout: 300000,
        }
      );

      if (response.data.success && response.data.plan) {
        setPlan(response.data.plan);
      } else {
        setError(
          "The AI service did not return a study plan."
        );
      }
    } catch (error) {
      console.error("Study plan error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to generate your study plan."
      );
    } finally {
      setGenerating(false);
    }
  }

  const selectedCourse = courses.find(
    (course) => course.course_id === selectedCourseId
  );

  const planData =
    plan?.plan_json ||
    plan?.plan ||
    plan;

  const overview =
    planData?.overview ||
    planData?.summary ||
    planData?.description ||
    "";

  const goals =
    planData?.goals ||
    planData?.learning_goals ||
    [];

  const schedule =
    planData?.schedule ||
    planData?.weekly_plan ||
    planData?.study_schedule ||
    [];

  const recommendations =
    planData?.recommendations ||
    planData?.recommendation ||
    [];

  const focusAreas =
    planData?.focus_areas ||
    planData?.focusAreas ||
    [];

  function renderList(items) {
    if (!Array.isArray(items)) {
      return null;
    }

    return (
      <div className="study-plan-list">
        {items.map((item, index) => {
          if (typeof item === "string") {
            return (
              <div
                className="study-plan-list-item"
                key={index}
              >
                <span>✓</span>
                <p>{item}</p>
              </div>
            );
          }

          if (typeof item === "object" && item !== null) {
            return (
              <div
                className="study-plan-list-card"
                key={index}
              >
                {item.title && (
                  <h4>{item.title}</h4>
                )}

                {item.topic && (
                  <h4>{item.topic}</h4>
                )}

                {item.description && (
                  <p>{item.description}</p>
                )}

                {item.task && (
                  <p>{item.task}</p>
                )}

                {item.duration && (
                  <span>{item.duration}</span>
                )}

                {item.time && (
                  <span>{item.time}</span>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  }

  return (
    <div className="study-plan-page">
      <header className="study-plan-topbar">
        <button
          className="study-plan-back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="study-plan-brand">
          VertexLearn AI
        </div>
      </header>

      <main className="study-plan-container">
        <section className="study-plan-hero">
          <div className="study-plan-hero-icon">
            🧠
          </div>

          <p className="eyebrow">
            AI-POWERED PERSONALIZATION
          </p>

          <h1>Your Personalized Study Plan</h1>

          <p>
            Get a learning plan based on your quiz
            performance so you can focus your time
            where it matters most.
          </p>
        </section>

        {error && (
          <div className="study-plan-error">
            {error}
          </div>
        )}

        <section className="study-plan-selection-card">
          <div className="study-plan-section-heading">
            <div>
              <p className="eyebrow">
                STEP 1
              </p>

              <h2>Select your course</h2>

              <p>
                We'll use your completed quiz
                performance from this course.
              </p>
            </div>
          </div>

          <div className="study-plan-selection-row">
            <select
              value={selectedCourseId}
              onChange={(event) =>
                setSelectedCourseId(event.target.value)
              }
              disabled={loadingCourses || generating}
            >
              <option value="">
                {loadingCourses
                  ? "Loading courses..."
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

            <button
              onClick={generateStudyPlan}
              disabled={
                generating ||
                loadingCourses ||
                !selectedCourseId
              }
            >
              {generating
                ? "Generating..."
                : "Generate Study Plan →"}
            </button>
          </div>

          {selectedCourse && (
            <div className="study-plan-selected-course">
              <span>Selected course</span>

              <strong>
                {selectedCourse.title}
              </strong>
            </div>
          )}
        </section>

        {generating && (
          <section className="study-plan-loading-card">
            <div className="study-plan-spinner"></div>

            <h3>
              Creating your personalized plan
            </h3>

            <p>
              The AI is analyzing your quiz
              performance and preparing your
              learning recommendations.
            </p>

            <span>
              This may take a little while on the
              local AI model.
            </span>
          </section>
        )}

        {planData && !generating && (
          <>
            <section className="study-plan-result-header">
              <div>
                <p className="eyebrow">
                  YOUR AI PLAN
                </p>

                <h2>
                  {selectedCourse?.title ||
                    "Personalized Learning Plan"}
                </h2>
              </div>

              <span className="study-plan-success-badge">
                ✦ AI Generated
              </span>
            </section>

            {overview && (
              <section className="study-plan-overview-card">
                <div className="study-plan-card-icon">
                  🎯
                </div>

                <div>
                  <p className="eyebrow">
                    STUDY FOCUS
                  </p>

                  <h3>Recommended Focus</h3>

                  <p>{overview}</p>
                </div>
              </section>
            )}

            {goals.length > 0 && (
              <section className="study-plan-content-card">
                <div className="study-plan-content-heading">
                  <div className="study-plan-heading-icon">
                    🎯
                  </div>

                  <div>
                    <p className="eyebrow">
                      LEARNING GOALS
                    </p>

                    <h3>
                      What to focus on
                    </h3>
                  </div>
                </div>

                {renderList(goals)}
              </section>
            )}

            {focusAreas.length > 0 && (
              <section className="study-plan-content-card">
                <div className="study-plan-content-heading">
                  <div className="study-plan-heading-icon">
                    🔍
                  </div>

                  <div>
                    <p className="eyebrow">
                      FOCUS AREAS
                    </p>

                    <h3>
                      Topics that need attention
                    </h3>
                  </div>
                </div>

                {renderList(focusAreas)}
              </section>
            )}

            {schedule.length > 0 && (
              <section className="study-plan-content-card">
                <div className="study-plan-content-heading">
                  <div className="study-plan-heading-icon">
                    📅
                  </div>

                  <div>
                    <p className="eyebrow">
                      STUDY SCHEDULE
                    </p>

                    <h3>
                      Your recommended routine
                    </h3>
                  </div>
                </div>

                {renderList(schedule)}
              </section>
            )}

            {recommendations.length > 0 && (
              <section className="study-plan-content-card">
                <div className="study-plan-content-heading">
                  <div className="study-plan-heading-icon">
                    💡
                  </div>

                  <div>
                    <p className="eyebrow">
                      AI RECOMMENDATIONS
                    </p>

                    <h3>
                      How to improve
                    </h3>
                  </div>
                </div>

                {renderList(recommendations)}
              </section>
            )}

            {!overview &&
              goals.length === 0 &&
              schedule.length === 0 &&
              recommendations.length === 0 &&
              focusAreas.length === 0 && (
                <section className="study-plan-raw-card">
                  <p>
                    Your personalized plan has been
                    generated successfully.
                  </p>

                  <pre>
                    {JSON.stringify(
                      planData,
                      null,
                      2
                    )}
                  </pre>
                </section>
              )}

            <button
              className="study-plan-regenerate-button"
              onClick={generateStudyPlan}
              disabled={generating}
            >
              ↻ Generate Again
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default StudyPlan;