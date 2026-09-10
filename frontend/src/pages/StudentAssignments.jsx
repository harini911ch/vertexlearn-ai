import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";

import "./StudentAssignments.css";

function StudentAssignments() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignments, setAssignments] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAssignments, setLoadingAssignments] =
    useState(false);

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

        const loadedCourses =
          response.data.courses || [];

        setCourses(loadedCourses);

        if (loadedCourses.length > 0) {
          setSelectedCourseId(
            loadedCourses[0].course_id
          );
        }
      } catch (err) {
        console.error(
          "Student assignments course error:",
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
      setAssignments([]);
      return;
    }

    const loadAssignments = async () => {
      try {
        setLoadingAssignments(true);
        setError("");
        setAssignments([]);

        const response = await axios.get(
          `${API_URL}/courses/${selectedCourseId}/assignments`,
          {
            headers: getAuthHeaders(),
          }
        );

        setAssignments(
          response.data.assignments || []
        );
      } catch (err) {
        console.error(
          "Student assignments list error:",
          err
        );

        setAssignments([]);

        setError(
          err.response?.data?.message ||
            "Failed to load assignments."
        );
      } finally {
        setLoadingAssignments(false);
      }
    };

    loadAssignments();
  }, [selectedCourseId]);

  const selectedCourse = useMemo(() => {
    return courses.find(
      (course) =>
        course.course_id === selectedCourseId
    );
  }, [courses, selectedCourseId]);

  const handleOpenAssignment = (assignmentId) => {
    if (!assignmentId) {
      return;
    }

    navigate(`/assignment/${assignmentId}`);
  };

  const formatDate = (value) => {
    if (!value) {
      return "No deadline";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getAssignmentStatus = (assignment) => {
    if (!assignment.due_date) {
      return "Available";
    }

    const dueDate = new Date(
      assignment.due_date
    );

    if (Number.isNaN(dueDate.getTime())) {
      return "Available";
    }

    const now = new Date();

    if (dueDate < now) {
      return "Past due";
    }

    return "Open";
  };

  return (
    <div className="student-assignments-page">
      {/* HEADER */}
      <header className="student-assignments-header">
        <div className="student-assignments-brand">
          <div className="student-assignments-brand-mark">
            ✦
          </div>

          <div className="student-assignments-brand-text">
            <strong>VertexLearn AI</strong>
            <span>Student Learning Hub</span>
          </div>
        </div>

        <button
          type="button"
          className="student-assignments-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </header>

      <main className="student-assignments-content">
        {/* HERO */}
        <section className="student-assignments-hero">
          <div className="student-assignments-hero-copy">
            <span>
              COURSEWORK & SUBMISSIONS
            </span>

            <h1>Assignments</h1>

            <p>
              View your coursework, check deadlines,
              and submit your work from one place.
            </p>
          </div>

          <div className="student-assignments-hero-icon">
            📄
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="student-assignments-error">
            <div className="student-assignments-error-icon">
              !
            </div>

            <div>
              <strong>
                Unable to load assignments
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {/* COURSE SELECTION */}
        {loadingCourses ? (
          <div className="student-assignments-loading">
            <div className="student-assignments-spinner"></div>
            <p>Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <section className="student-assignments-empty">
            <div className="student-assignments-empty-icon">
              📚
            </div>

            <h2>No courses available</h2>

            <p>
              You need to be enrolled in a course
              before assignments can appear here.
            </p>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </section>
        ) : (
          <>
            <section className="student-assignment-course-card">
              <div className="student-assignment-section-heading">
                <div>
                  <span>STEP 1</span>
                  <h2>Select Course</h2>
                  <p>
                    Choose the course whose assignments
                    you want to view.
                  </p>
                </div>

                <div className="student-assignment-step-number">
                  01
                </div>
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
                <div className="student-assignment-course-preview">
                  <div>
                    <span>SELECTED COURSE</span>

                    <strong>
                      {selectedCourse.title}
                    </strong>
                  </div>

                  <div className="student-assignment-course-progress">
                    <span>Progress</span>
                    <strong>
                      {Number(
                        selectedCourse.progress_percent || 0
                      ).toFixed(0)}
                      %
                    </strong>
                  </div>
                </div>
              )}
            </section>

            {/* ASSIGNMENTS */}
            <section className="student-assignment-results">
              <div className="student-assignment-results-heading">
                <div>
                  <span>YOUR COURSEWORK</span>

                  <h2>
                    Available Assignments
                  </h2>

                  <p>
                    Open an assignment to read the
                    instructions and submit your work.
                  </p>
                </div>

                {!loadingAssignments && (
                  <div className="student-assignment-count">
                    {assignments.length}{" "}
                    {assignments.length === 1
                      ? "assignment"
                      : "assignments"}
                  </div>
                )}
              </div>

              {loadingAssignments ? (
                <div className="student-assignments-loading assignments">
                  <div className="student-assignments-spinner"></div>

                  <p>
                    Loading assignments...
                  </p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="student-assignment-no-results">
                  <div className="student-assignment-no-results-icon">
                    ✓
                  </div>

                  <h3>
                    No assignments yet
                  </h3>

                  <p>
                    There are currently no assignments
                    available for this course.
                  </p>
                </div>
              ) : (
                <div className="student-assignment-grid">
                  {assignments.map(
                    (assignment, index) => {
                      const status =
                        getAssignmentStatus(
                          assignment
                        );

                      return (
                        <article
                          className="student-assignment-card"
                          key={assignment.id}
                        >
                          <div className="student-assignment-card-top">
                            <div className="student-assignment-number">
                              {String(index + 1).padStart(
                                2,
                                "0"
                              )}
                            </div>

                            <span
                              className={`student-assignment-status ${status
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {status}
                            </span>
                          </div>

                          <h3>
                            {assignment.title}
                          </h3>

                          <p className="student-assignment-description">
                            {assignment.description ||
                              "Complete this assignment and submit your work for evaluation."}
                          </p>

                          <div className="student-assignment-meta">
                            <div>
                              <span>
                                MODULE
                              </span>

                              <strong>
                                {assignment.module_title ||
                                  assignment.module_name ||
                                  "Course Module"}
                              </strong>
                            </div>

                            <div>
                              <span>
                                DUE DATE
                              </span>

                              <strong>
                                {formatDate(
                                  assignment.due_date
                                )}
                              </strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="student-assignment-open-button"
                            onClick={() =>
                              handleOpenAssignment(
                                assignment.id
                              )
                            }
                          >
                            Open Assignment
                            <span>→</span>
                          </button>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default StudentAssignments;