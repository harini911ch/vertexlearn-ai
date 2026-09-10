import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import axios, {
  API_URL,
  COURSE_ID,
  getAuthHeaders,
} from "../services/api";

import "./AssignmentPage.css";

function AssignmentPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionLoading, setSubmissionLoading] =
    useState(true);

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAssignment();
    loadSubmission();
  }, [assignmentId]);

  async function loadAssignment() {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/courses/${COURSE_ID}/assignments`,
        {
          headers: getAuthHeaders(),
        }
      );

      const foundAssignment =
        response.data.assignments?.find(
          (item) => item.id === assignmentId
        );

      setAssignment(foundAssignment || null);
    } catch (error) {
      console.error(
        "Assignment error:",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Failed to load assignment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSubmission() {
    try {
      setSubmissionLoading(true);

      const response = await axios.get(
        `${API_URL}/courses/assignments/${assignmentId}/submission`,
        {
          headers: getAuthHeaders(),
        }
      );

      setSubmission(
        response.data.submission || null
      );
    } catch (error) {
      console.error(
        "Submission status error:",
        error
      );
    } finally {
      setSubmissionLoading(false);
    }
  }

  async function submitAssignment() {
    if (!file) {
      setMessage(
        "Please choose a file before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await axios.post(
        `${API_URL}/courses/assignments/${assignmentId}/submit`,
        formData,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        setMessage(
          "Assignment submitted successfully ✅"
        );

        setFile(null);

        await loadSubmission();
      }
    } catch (error) {
      console.error(
        "Submission error:",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Failed to submit assignment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "";
    }

    return new Date(dateValue).toLocaleString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  function getSubmissionStatus() {
    if (!submission) {
      return "Not submitted";
    }

    if (submission.grade !== null) {
      return "Graded";
    }

    return "Submitted";
  }

  function getStatusClass() {
    if (!submission) {
      return "status-not-submitted";
    }

    if (submission.grade !== null) {
      return "status-graded";
    }

    return "status-submitted";
  }

  if (loading) {
    return (
      <div className="assignment-page">
        <div className="assignment-loading">
          <div className="loading-spinner"></div>

          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="assignment-page">
        <div className="assignment-error-card">
          <div className="assignment-error-icon">
            !
          </div>

          <h2>
            Assignment not found
          </h2>

          <p>
            We couldn't find this assignment.
          </p>

          <button
            onClick={() =>
              navigate(`/course/${COURSE_ID}`)
            }
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-page">

      {/* --------------------------------------------------
          TOP NAVIGATION
      -------------------------------------------------- */}

      <div className="assignment-topbar">
        <button
          className="assignment-back-button"
          onClick={() =>
            navigate(`/course/${COURSE_ID}`)
          }
        >
          ← Back to Course
        </button>

        <div className="assignment-brand">
          <div className="assignment-brand-mark">
            ✦
          </div>

          <span>
            VertexLearn AI
          </span>
        </div>
      </div>

      {/* --------------------------------------------------
          ASSIGNMENT HERO
      -------------------------------------------------- */}

      <section className="assignment-hero">

        <div className="assignment-hero-decoration"></div>

        <div className="assignment-hero-content">

          <div className="assignment-label">
            PRACTICE & ASSESSMENT
          </div>

          <h1>
            {assignment.title}
          </h1>

          <p>
            Complete this assignment and
            submit your work for instructor
            feedback.
          </p>

          <div className="assignment-meta">

            <div className="assignment-meta-item">
              <span className="assignment-meta-icon">
                📚
              </span>

              <div>
                <small>
                  Course
                </small>

                <strong>
                  Java Full Stack Development
                </strong>
              </div>
            </div>

            {assignment.due_date && (
              <div className="assignment-meta-item">
                <span className="assignment-meta-icon">
                  🕒
                </span>

                <div>
                  <small>
                    Due date
                  </small>

                  <strong>
                    {formatDate(
                      assignment.due_date
                    )}
                  </strong>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* --------------------------------------------------
          MAIN CONTENT
      -------------------------------------------------- */}

      <main className="assignment-content">

        <div className="assignment-main-grid">

          {/* ------------------------------------------------
              INSTRUCTIONS
          ------------------------------------------------ */}

          <section className="assignment-instructions-card">

            <div className="assignment-section-heading">
              <div className="assignment-section-icon">
                📖
              </div>

              <div>
                <p className="assignment-eyebrow">
                  WHAT YOU NEED TO DO
                </p>

                <h2>
                  Instructions
                </h2>
              </div>
            </div>

            <div className="assignment-instructions">

              <p>
                {assignment.instructions ||
                  "Complete the assignment according to the requirements provided by your instructor."}
              </p>

            </div>

            {assignment.rubric && (
              <div className="assignment-rubric">

                <div className="assignment-section-heading small">

                  <div className="assignment-section-icon rubric-icon">
                    ✓
                  </div>

                  <div>
                    <p className="assignment-eyebrow">
                      EVALUATION
                    </p>

                    <h3>
                      Grading Rubric
                    </h3>
                  </div>

                </div>

                <div className="rubric-content">
                  {typeof assignment.rubric ===
                  "string" ? (
                    <p>
                      {assignment.rubric}
                    </p>
                  ) : (
                    Object.entries(
                      assignment.rubric
                    ).map(
                      ([criterion, marks]) => (
                        <div
                          className="rubric-row"
                          key={criterion}
                        >
                          <span>
                            {criterion}
                          </span>

                          <strong>
                            {marks} marks
                          </strong>
                        </div>
                      )
                    )
                  )}
                </div>

              </div>
            )}

          </section>

          {/* ------------------------------------------------
              SUBMISSION
          ------------------------------------------------ */}

          <section className="assignment-submit-card">

            <div className="assignment-section-heading">

              <div className="assignment-section-icon upload-icon">
                ↑
              </div>

              <div>
                <p className="assignment-eyebrow">
                  YOUR WORK
                </p>

                <h2>
                  Submit Assignment
                </h2>
              </div>

            </div>

            <div className="file-upload-area">

              <div className="file-upload-icon">
                📎
              </div>

              <h3>
                Upload your solution
              </h3>

              <p>
                Choose a file from your
                computer to submit your work.
              </p>

              <label className="file-select-button">
                Choose File

                <input
                  type="file"
                  onChange={(event) =>
                    setFile(
                      event.target.files[0] ||
                        null
                    )
                  }
                />
              </label>

              {file && (
                <div className="selected-file">

                  <span>
                    📄
                  </span>

                  <div>
                    <strong>
                      {file.name}
                    </strong>

                    <small>
                      File selected and ready
                      to submit
                    </small>
                  </div>

                </div>
              )}

              <button
                className="submit-assignment-button"
                onClick={submitAssignment}
                disabled={
                  submitting ||
                  !file
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Assignment →"}
              </button>

              {message && (
                <div className="assignment-message">
                  {message}
                </div>
              )}

            </div>

            <div className="accepted-files">
              Supported files:
              PDF, ZIP, TXT, Java, JavaScript,
              TypeScript, Python, C, C++
            </div>

          </section>

        </div>

        {/* --------------------------------------------------
            SUBMISSION STATUS
        -------------------------------------------------- */}

        <section className="assignment-status-card">

          <div className="status-card-heading">

            <div>
              <p className="assignment-eyebrow">
                SUBMISSION
              </p>

              <h2>
                Your Submission
              </h2>
            </div>

            {!submissionLoading && (
              <span
                className={`submission-status-badge ${getStatusClass()}`}
              >
                {getSubmissionStatus()}
              </span>
            )}

          </div>

          {submissionLoading ? (
            <div className="submission-loading">
              <div className="loading-spinner"></div>

              <p>
                Checking your submission...
              </p>
            </div>
          ) : !submission ? (
            <div className="no-submission">

              <div className="no-submission-icon">
                📂
              </div>

              <h3>
                No submission yet
              </h3>

              <p>
                Upload your work above to
                submit the assignment.
              </p>

            </div>
          ) : (
            <div className="submission-details">

              <div className="submission-detail-item">
                <span>
                  Status
                </span>

                <strong>
                  Submitted ✅
                </strong>
              </div>

              <div className="submission-detail-item">
                <span>
                  Submitted on
                </span>

                <strong>
                  {formatDate(
                    submission.submitted_at
                  )}
                </strong>
              </div>

              <div className="submission-detail-item">
                <span>
                  File
                </span>

                <strong>
                  {submission.file_url
                    ?.split("/")
                    .pop() ||
                    "Submitted file"}
                </strong>
              </div>

              <div className="submission-detail-item">
                <span>
                  Grade
                </span>

                <strong
                  className={
                    submission.grade !==
                    null
                      ? "graded-value"
                      : "pending-value"
                  }
                >
                  {submission.grade !==
                  null
                    ? `${submission.grade}/100`
                    : "Not graded yet"}
                </strong>
              </div>

              {submission.feedback && (
                <div className="feedback-box">

                  <div className="feedback-heading">
                    <span>
                      💬
                    </span>

                    <strong>
                      Instructor Feedback
                    </strong>
                  </div>

                  <p>
                    {submission.feedback}
                  </p>

                </div>
              )}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default AssignmentPage;