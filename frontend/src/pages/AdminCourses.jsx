import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./AdminCourses.css";

function AdminCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState("");

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/admin/courses`,
        {
          headers: getAuthHeaders(),
        }
      );

      setCourses(response.data?.courses || []);
    } catch (err) {
      console.error("Failed to load admin courses:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load courses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function updateCourseStatus(courseId, status) {
    try {
      setProcessingId(courseId);
      setError("");

      await axios.patch(
        `${API_URL}/admin/courses/${courseId}/status`,
        {
          status,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      await loadCourses();
    } catch (err) {
      console.error(
        "Failed to update course status:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to update course status."
      );
    } finally {
      setProcessingId("");
    }
  }

  const filteredCourses = courses.filter((course) => {
    if (filter === "all") {
      return true;
    }

    return course.status === filter;
  });

  const pendingCount = courses.filter(
    (course) => course.status === "pending"
  ).length;

  const publishedCount = courses.filter(
    (course) => course.status === "published"
  ).length;

  const rejectedCount = courses.filter(
    (course) => course.status === "rejected"
  ).length;

  return (
    <div className="admin-courses-page">
      {/* Header */}
      <header className="admin-courses-header">
        <div>
          <p className="admin-courses-eyebrow">
            ADMIN CONTROL
          </p>

          <h1>Course Management</h1>

          <p className="admin-courses-subtitle">
            Review instructor courses and manage publication
            approvals.
          </p>
        </div>

        <button
          type="button"
          className="admin-courses-back-btn"
          onClick={() => navigate("/admin")}
        >
          ← Back to Dashboard
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="admin-courses-error">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="admin-course-summary-grid">
        <div className="admin-course-summary-card purple">
          <span>All Courses</span>
          <strong>{courses.length}</strong>
          <small>Total platform courses</small>
        </div>

        <div className="admin-course-summary-card orange">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
          <small>Awaiting approval</small>
        </div>

        <div className="admin-course-summary-card green">
          <span>Published</span>
          <strong>{publishedCount}</strong>
          <small>Available to students</small>
        </div>

        <div className="admin-course-summary-card pink">
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
          <small>Not currently published</small>
        </div>
      </section>

      {/* Main card */}
      <section className="admin-course-management-card">
        <div className="admin-course-card-header">
          <div>
            <h2>Course Approvals</h2>
            <p>
              Review submitted courses and update their status.
            </p>
          </div>

          <button
            type="button"
            className="admin-course-refresh-btn"
            onClick={loadCourses}
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="admin-course-filter-bar">
          <button
            type="button"
            className={
              filter === "all"
                ? "admin-course-filter active"
                : "admin-course-filter"
            }
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            type="button"
            className={
              filter === "pending"
                ? "admin-course-filter pending active"
                : "admin-course-filter pending"
            }
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>

          <button
            type="button"
            className={
              filter === "published"
                ? "admin-course-filter published active"
                : "admin-course-filter published"
            }
            onClick={() => setFilter("published")}
          >
            Published
          </button>

          <button
            type="button"
            className={
              filter === "rejected"
                ? "admin-course-filter rejected active"
                : "admin-course-filter rejected"
            }
            onClick={() => setFilter("rejected")}
          >
            Rejected
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="admin-course-state">
            Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="admin-course-empty">
            <div className="admin-course-empty-icon">
              📚
            </div>

            <h3>No courses found</h3>

            <p>
              There are no courses matching the selected filter.
            </p>
          </div>
        ) : (
          <div className="admin-course-table-wrapper">
            <table className="admin-course-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Instructor</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="admin-course-title-cell">
                        <strong>
                          {course.title || "Untitled Course"}
                        </strong>

                        <span>
                          {course.description
                            ? course.description.slice(0, 65) +
                              (course.description.length > 65
                                ? "..."
                                : "")
                            : "No description available"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="admin-course-instructor">
                        <strong>
                          {course.instructor_name ||
                            course.instructor_full_name ||
                            "Unknown Instructor"}
                        </strong>

                        <span>
                          {course.instructor_email ||
                            ""}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="admin-course-category">
                        {course.category || "General"}
                      </span>
                    </td>

                    <td>
                      {course.difficulty_level ||
                        course.difficulty ||
                        "Beginner"}
                    </td>

                    <td>
                      <span
                        className={`admin-course-status ${(
                          course.status || "pending"
                        ).toLowerCase()}`}
                      >
                        {course.status || "pending"}
                      </span>
                    </td>

                    <td>
                      {course.created_at
                        ? new Date(
                            course.created_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>
                      <div className="admin-course-actions">
                        {course.status !== "published" && (
                          <button
                            type="button"
                            className="admin-course-approve-btn"
                            disabled={
                              processingId === course.id
                            }
                            onClick={() =>
                              updateCourseStatus(
                                course.id,
                                "published"
                              )
                            }
                          >
                            {processingId === course.id
                              ? "..."
                              : "Approve"}
                          </button>
                        )}

                        {course.status !== "rejected" && (
                          <button
                            type="button"
                            className="admin-course-reject-btn"
                            disabled={
                              processingId === course.id
                            }
                            onClick={() =>
                              updateCourseStatus(
                                course.id,
                                "rejected"
                              )
                            }
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminCourses;