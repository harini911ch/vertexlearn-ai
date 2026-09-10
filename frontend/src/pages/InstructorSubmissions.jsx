import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios, {
  API_URL,
  COURSE_ID,
  getAuthHeaders,
} from "../services/api";

import "./InstructorSubmissions.css";

function InstructorSubmissions() {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/${COURSE_ID}/assignment-submissions`,
        {
          headers: getAuthHeaders(),
        }
      );

      setSubmissions(
        response.data.submissions || []
      );
    } catch (error) {
      console.error(
        "Instructor submissions error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load submissions"
      );
    } finally {
      setLoading(false);
    }
  }

  const students = useMemo(() => {
    const grouped = new Map();

    submissions.forEach((submission) => {
      const studentId =
        submission.student_id ||
        submission.user_id;

      if (!studentId) {
        return;
      }

      if (!grouped.has(studentId)) {
        grouped.set(studentId, {
          student_id: studentId,
          student_name:
            submission.student_name ||
            "Unknown Student",
          student_email:
            submission.student_email ||
            "No email available",
          submissions: [],
        });
      }

      grouped
        .get(studentId)
        .submissions.push(submission);
    });

    return Array.from(grouped.values()).map(
      (student) => {
        const graded =
          student.submissions.filter(
            (submission) =>
              submission.grade !== null &&
              submission.grade !== undefined
          ).length;

        return {
          ...student,
          total: student.submissions.length,
          graded,
          pending:
            student.submissions.length - graded,
        };
      }
    );
  }, [submissions]);

  const totalSubmissions = submissions.length;

  const gradedSubmissions = submissions.filter(
    (submission) =>
      submission.grade !== null &&
      submission.grade !== undefined
  ).length;

  const pendingSubmissions =
    totalSubmissions - gradedSubmissions;

  if (loading) {
    return (
      <div className="submissions-page">
        <div className="submissions-loading">
          Loading submitted work...
        </div>
      </div>
    );
  }

  return (
    <div className="submissions-page">
      <header className="submissions-header">
        <div className="submissions-brand">
          <div className="submissions-brand-mark">
            ✦
          </div>

          <div>
            <strong>VertexLearn AI</strong>
            <span>Instructor workspace</span>
          </div>
        </div>

        <button
          className="submissions-back-button"
          onClick={() =>
            navigate("/instructor")
          }
        >
          ← Dashboard
        </button>
      </header>

      <main className="submissions-container">
        <section className="submissions-hero">
          <div>
            <span>STUDENT WORK</span>

            <h1>Submitted assignments</h1>

            <p>
              Select a student to review all
              assignments they have submitted.
            </p>
          </div>

          <div className="submissions-hero-number">
            <strong>{students.length}</strong>
            <span>Students</span>
          </div>
        </section>

        {error && (
          <div className="submissions-error">
            {error}
          </div>
        )}

        <section className="submission-summary-grid">
          <div className="submission-summary-card">
            <span>Total submissions</span>
            <strong>
              {totalSubmissions}
            </strong>
          </div>

          <div className="submission-summary-card">
            <span>Graded</span>
            <strong>
              {gradedSubmissions}
            </strong>
          </div>

          <div className="submission-summary-card pending">
            <span>Pending review</span>
            <strong>
              {pendingSubmissions}
            </strong>
          </div>
        </section>

        <section className="students-section">
          <div className="students-heading">
            <div>
              <span>SUBMITTED STUDENTS</span>

              <h2>Students who submitted work</h2>
            </div>

            <button
              className="refresh-button"
              onClick={loadSubmissions}
            >
              ↻ Refresh
            </button>
          </div>

          {students.length === 0 ? (
            <div className="no-submissions-card">
              <div>📭</div>

              <h2>No submissions yet</h2>

              <p>
                Students will appear here after
                they submit assignments.
              </p>
            </div>
          ) : (
            <div className="student-submission-list">
              {students.map((student) => (
                <button
                  key={student.student_id}
                  className="student-submission-card"
                  onClick={() =>
                    navigate(
                      `/instructor/student/${student.student_id}`
                    )
                  }
                >
                  <div className="student-avatar-large">
                    {student.student_name
                      ?.charAt(0)
                      ?.toUpperCase() || "S"}
                  </div>

                  <div className="student-details">
                    <h3>
                      {student.student_name}
                    </h3>

                    <p>
                      {student.student_email}
                    </p>

                    <small>
                      Student ID:{" "}
                      {student.student_id}
                    </small>
                  </div>

                  <div className="student-submission-stats">
                    <div>
                      <strong>
                        {student.total}
                      </strong>
                      <span>Submitted</span>
                    </div>

                    <div>
                      <strong>
                        {student.graded}
                      </strong>
                      <span>Graded</span>
                    </div>

                    <div
                      className={
                        student.pending > 0
                          ? "pending-stat"
                          : ""
                      }
                    >
                      <strong>
                        {student.pending}
                      </strong>
                      <span>Pending</span>
                    </div>
                  </div>

                  <div className="student-open">
                    View →
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default InstructorSubmissions;