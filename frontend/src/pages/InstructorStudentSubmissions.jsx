import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import axios, {
  API_URL,
  COURSE_ID,
  getAuthHeaders,
} from "../services/api";

import "./InstructorStudentSubmissions.css";

function InstructorStudentSubmissions() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [grades, setGrades] = useState({});
  const [feedbacks, setFeedbacks] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudentSubmissions();
  }, [studentId]);

  async function loadStudentSubmissions() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/${COURSE_ID}/instructor-students/${studentId}/submissions`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = response.data;

      setStudent(data.student || null);

      const incomingSubmissions =
        data.submissions || [];

      setSubmissions(incomingSubmissions);

      const gradeValues = {};
      const feedbackValues = {};

      incomingSubmissions.forEach((submission) => {
        gradeValues[submission.id] =
          submission.grade ?? "";

        feedbackValues[submission.id] =
          submission.feedback ?? "";
      });

      setGrades(gradeValues);
      setFeedbacks(feedbackValues);
    } catch (error) {
      console.error(
        "Student submission page error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load student submissions"
      );
    } finally {
      setLoading(false);
    }
  }

  async function gradeSubmission(submissionId) {
    const grade = Number(grades[submissionId]);

    if (
      Number.isNaN(grade) ||
      grade < 0 ||
      grade > 100
    ) {
      setMessage(
        "Please enter a grade between 0 and 100."
      );
      return;
    }

    try {
      setSavingId(submissionId);
      setMessage("");

      const response = await axios.put(
        `${API_URL}/courses/submissions/${submissionId}/grade`,
        {
          grade,
          feedback:
            feedbacks[submissionId] || "",
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        setMessage(
          "Grade and feedback saved successfully ✅"
        );

        await loadStudentSubmissions();
      }
    } catch (error) {
      console.error(
        "Grade submission error:",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Failed to save grade"
      );
    } finally {
      setSavingId(null);
    }
  }

  const gradedCount = submissions.filter(
    (submission) =>
      submission.grade !== null &&
      submission.grade !== undefined
  ).length;

  const pendingCount =
    submissions.length - gradedCount;

  if (loading) {
    return (
      <div className="student-submissions-page">
        <div className="student-submissions-loading">
          Loading student submissions...
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="student-submissions-page">
        <header className="student-submissions-header">
          <div className="student-page-brand">
            <div className="student-page-brand-mark">
              ✦
            </div>

            <div>
              <strong>VertexLearn AI</strong>
              <span>Instructor workspace</span>
            </div>
          </div>

          <button
            className="back-button"
            onClick={() =>
              navigate("/instructor/submissions")
            }
          >
            ← Submissions
          </button>
        </header>

        <main className="student-submissions-container">
          <section className="student-empty-card">
            <div className="empty-icon">
              ⚠
            </div>

            <h2>
              Unable to load student
            </h2>

            <p>
              {error ||
                "Student information could not be found."}
            </p>

            <button
              className="primary-button"
              onClick={() =>
                navigate("/instructor/submissions")
              }
            >
              Back to Submissions
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="student-submissions-page">
      <header className="student-submissions-header">
        <div className="student-page-brand">
          <div className="student-page-brand-mark">
            ✦
          </div>

          <div>
            <strong>VertexLearn AI</strong>
            <span>Instructor workspace</span>
          </div>
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate("/instructor/submissions")
          }
        >
          ← Students
        </button>
      </header>

      <main className="student-submissions-container">
        <section className="student-profile-card">
          <div className="large-student-avatar">
            {student.full_name
              ?.charAt(0)
              ?.toUpperCase() || "S"}
          </div>

          <div className="student-profile-info">
            <span className="profile-eyebrow">
              STUDENT PROFILE
            </span>

            <h1>{student.full_name}</h1>

            <p>{student.email}</p>

            <small>
              Student ID: {student.id}
            </small>
          </div>
        </section>

        <section className="student-summary-grid">
          <div className="student-summary-box">
            <span>Total submissions</span>
            <strong>
              {submissions.length}
            </strong>
          </div>

          <div className="student-summary-box">
            <span>Graded</span>
            <strong>
              {gradedCount}
            </strong>
          </div>

          <div className="student-summary-box pending">
            <span>Pending review</span>
            <strong>
              {pendingCount}
            </strong>
          </div>
        </section>

        {message && (
          <div className="student-message success">
            {message}
          </div>
        )}

        <section className="student-assignment-section">
          <div className="section-heading">
            <div>
              <span>ASSIGNMENT HISTORY</span>

              <h2>
                {student.full_name}'s submissions
              </h2>
            </div>

            <p>
              Review, grade, and provide feedback for
              each submitted assignment.
            </p>
          </div>

          {submissions.length === 0 ? (
            <div className="student-empty-card">
              <div className="empty-icon">
                📭
              </div>

              <h2>No assignments submitted</h2>

              <p>
                This student has not submitted any
                assignments for this course yet.
              </p>
            </div>
          ) : (
            <div className="student-assignment-list">
              {submissions.map(
                (submission, index) => {
                  const isGraded =
                    submission.grade !== null &&
                    submission.grade !== undefined;

                  return (
                    <article
                      className="student-assignment-card"
                      key={submission.id}
                    >
                      <div className="assignment-card-top">
                        <div className="assignment-number">
                          {index + 1}
                        </div>

                        <div className="assignment-card-title">
                          <span>
                            {isGraded
                              ? "GRADED"
                              : "PENDING REVIEW"}
                          </span>

                          <h3>
                            {
                              submission.assignment_title
                            }
                          </h3>
                        </div>

                        <div
                          className={`assignment-status ${
                            isGraded
                              ? "graded"
                              : "pending"
                          }`}
                        >
                          {isGraded
                            ? `${submission.grade}/100`
                            : "Pending"}
                        </div>
                      </div>

                      <div className="assignment-details">
                        <div>
                          <span>
                            Submitted
                          </span>

                          <strong>
                            {submission.submitted_at
                              ? new Date(
                                  submission.submitted_at
                                ).toLocaleString()
                              : "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Submission file
                          </span>

                          <a
                            href={`http://localhost:5000${submission.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open submitted file →
                          </a>
                        </div>

                        {submission.due_date && (
                          <div>
                            <span>
                              Deadline
                            </span>

                            <strong>
                              {new Date(
                                submission.due_date
                              ).toLocaleString()}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="grading-area">
                        <div className="grade-field">
                          <label>
                            Grade
                          </label>

                          <div className="grade-input-wrapper">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                grades[
                                  submission.id
                                ] ?? ""
                              }
                              onChange={(event) =>
                                setGrades({
                                  ...grades,
                                  [submission.id]:
                                    event.target.value,
                                })
                              }
                            />

                            <span>
                              /100
                            </span>
                          </div>
                        </div>

                        <div className="feedback-field">
                          <label>
                            Instructor feedback
                          </label>

                          <textarea
                            rows="4"
                            value={
                              feedbacks[
                                submission.id
                              ] ?? ""
                            }
                            onChange={(event) =>
                              setFeedbacks({
                                ...feedbacks,
                                [submission.id]:
                                  event.target.value,
                              })
                            }
                            placeholder="Write feedback for this student..."
                          />
                        </div>
                      </div>

                      <div className="assignment-card-footer">
                        <span>
                          {isGraded
                            ? "You can update the grade or feedback."
                            : "This submission is waiting for review."}
                        </span>

                        <button
                          className="save-grade-button"
                          onClick={() =>
                            gradeSubmission(
                              submission.id
                            )
                          }
                          disabled={
                            savingId ===
                            submission.id
                          }
                        >
                          {savingId ===
                          submission.id
                            ? "Saving..."
                            : isGraded
                            ? "Update Grade"
                            : "Save Grade"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default InstructorStudentSubmissions;