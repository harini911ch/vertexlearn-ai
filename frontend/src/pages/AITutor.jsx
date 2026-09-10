import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./AITutor.css";

function AITutor() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lectures, setLectures] = useState([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLectureId, setSelectedLectureId] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [asking, setAsking] = useState(false);

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
      loadModules(selectedCourseId);
    } else {
      setModules([]);
      setLectures([]);
      setSelectedModuleId("");
      setSelectedLectureId("");
    }
  }, [selectedCourseId]);

  async function loadModules(courseId) {
    try {
      setLoadingModules(true);
      setError("");
      setModules([]);
      setLectures([]);
      setSelectedModuleId("");
      setSelectedLectureId("");

      const response = await axios.get(
        `${API_URL}/courses/${courseId}/modules`,
        {
          headers: getAuthHeaders(),
        }
      );

      const loadedModules = response.data.modules || [];
      setModules(loadedModules);

      if (loadedModules.length > 0) {
        setSelectedModuleId(loadedModules[0].id);
      }
    } catch (error) {
      console.error("Failed to load modules:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load modules."
      );
    } finally {
      setLoadingModules(false);
    }
  }

  useEffect(() => {
    if (selectedModuleId) {
      loadLectures(selectedModuleId);
    } else {
      setLectures([]);
      setSelectedLectureId("");
    }
  }, [selectedModuleId]);

  async function loadLectures(moduleId) {
    try {
      setLoadingLectures(true);
      setError("");
      setLectures([]);
      setSelectedLectureId("");

      const response = await axios.get(
        `${API_URL}/courses/modules/${moduleId}/lectures`,
        {
          headers: getAuthHeaders(),
        }
      );

      const loadedLectures = response.data.lectures || [];
      setLectures(loadedLectures);

      if (loadedLectures.length > 0) {
        setSelectedLectureId(loadedLectures[0].id);
      }
    } catch (error) {
      console.error("Failed to load lectures:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load lectures."
      );
    } finally {
      setLoadingLectures(false);
    }
  }

  async function askAI() {
    const trimmedQuestion = question.trim();

    if (!selectedCourseId) {
      setError("Please select a course.");
      return;
    }

    if (!trimmedQuestion) {
      setError("Please enter a question.");
      return;
    }

    try {
      setAsking(true);
      setError("");
      setAnswer("");
      setSources([]);

      const response = await axios.post(
        `${API_URL}/ai/chat`,
        {
          course_id: selectedCourseId,
          question: trimmedQuestion,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setAnswer(
        response.data.answer ||
          "No answer was received from the AI Tutor."
      );

      setSources(response.data.sources || []);
    } catch (error) {
      console.error("AI Tutor error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to contact AI Tutor."
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="ai-tutor-page">
      <div className="ai-tutor-topbar">
        <button
          className="ai-tutor-back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <span className="ai-tutor-brand">
          VertexLearn AI
        </span>
      </div>

      <main className="ai-tutor-container">
        <section className="ai-tutor-hero">
          <div className="ai-tutor-hero-icon">✦</div>

          <p className="eyebrow">
            AI-POWERED LEARNING
          </p>

          <h1>Meet your AI Tutor</h1>

          <p>
            Ask questions about your course material
            and get answers grounded in your learning
            content.
          </p>
        </section>

        {error && (
          <div className="ai-tutor-error">
            {error}
          </div>
        )}

        <section className="ai-context-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                LEARNING CONTEXT
              </p>
              <h2>Choose what you're studying</h2>
            </div>
          </div>

          <div className="selection-grid">
            <div className="selection-group">
              <label>Course</label>

              <select
                value={selectedCourseId}
                onChange={(event) =>
                  setSelectedCourseId(event.target.value)
                }
                disabled={loadingCourses}
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
            </div>

            <div className="selection-group">
              <label>Module</label>

              <select
                value={selectedModuleId}
                onChange={(event) =>
                  setSelectedModuleId(event.target.value)
                }
                disabled={
                  loadingModules ||
                  modules.length === 0
                }
              >
                <option value="">
                  {loadingModules
                    ? "Loading modules..."
                    : modules.length === 0
                    ? "No modules available"
                    : "Select a module"}
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
            </div>

            <div className="selection-group">
              <label>Lecture</label>

              <select
                value={selectedLectureId}
                onChange={(event) =>
                  setSelectedLectureId(event.target.value)
                }
                disabled={
                  loadingLectures ||
                  lectures.length === 0
                }
              >
                <option value="">
                  {loadingLectures
                    ? "Loading lectures..."
                    : lectures.length === 0
                    ? "No lectures available"
                    : "Select a lecture"}
                </option>

                {lectures.map((lecture) => (
                  <option
                    key={lecture.id}
                    value={lecture.id}
                  >
                    {lecture.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="selected-context">
            <span>Current context</span>

            <strong>
              {lectures.find(
                (lecture) =>
                  lecture.id === selectedLectureId
              )?.title ||
                modules.find(
                  (module) =>
                    module.id === selectedModuleId
                )?.title ||
                courses.find(
                  (course) =>
                    course.course_id ===
                    selectedCourseId
                )?.title ||
                "Select your learning material"}
            </strong>
          </div>
        </section>

        <section className="ai-question-card">
          <div className="question-header">
            <div className="ai-small-icon">✦</div>

            <div>
              <p className="eyebrow">
                ASK YOUR QUESTION
              </p>

              <h2>What would you like to learn?</h2>
            </div>
          </div>

          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            placeholder="For example: What does the JVM do?"
            rows="6"
            disabled={asking}
          />

          <div className="question-footer">
            <span>
              Answers are grounded in your course material.
            </span>

            <button
              onClick={askAI}
              disabled={asking}
            >
              {asking
                ? "Thinking..."
                : "Ask AI Tutor →"}
            </button>
          </div>
        </section>

        {answer && (
          <section className="ai-answer-card">
            <div className="answer-header">
              <div>
                <p className="eyebrow">
                  AI RESPONSE
                </p>

                <h2>AI Tutor</h2>
              </div>

              <span className="grounded-badge">
                Course grounded
              </span>
            </div>

            <div className="answer-content">
              <div className="answer-mark">✦</div>

              <p>{answer}</p>
            </div>

            {sources.length > 0 && (
              <div className="sources-section">
                <h3>Learning Sources</h3>

                <div className="sources-list">
                  {sources.map((source, index) => (
                    <div
                      className="source-item"
                      key={`${source.lecture_id}-${index}`}
                    >
                      <div className="source-icon">
                        📚
                      </div>

                      <div>
                        <strong>
                          {source.lecture_title}
                        </strong>

                        <small>
                          Relevance:{" "}
                          {Number(
                            source.similarity
                          ).toFixed(2)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="ai-tutor-info">
          <div className="info-item">
            <span>✦</span>
            <div>
              <strong>Grounded answers</strong>
              <p>
                Responses are based on your course
                learning material.
              </p>
            </div>
          </div>

          <div className="info-item">
            <span>📚</span>
            <div>
              <strong>Lecture-aware learning</strong>
              <p>
                Select the lecture you are currently
                studying before asking your question.
              </p>
            </div>
          </div>

          <div className="info-item">
            <span>⚡</span>
            <div>
              <strong>Personal learning support</strong>
              <p>
                Use the tutor whenever you need help
                understanding a concept.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AITutor;