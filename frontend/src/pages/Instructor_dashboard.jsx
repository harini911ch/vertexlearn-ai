import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";

import "./InstructorDashboard.css";
function InstructorDashboard() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  // Keep the existing dashboard code working
  // without changing every COURSE_ID reference.
  const COURSE_ID = courseId;
  // ==========================================================
  // OVERVIEW STATE
  // ==========================================================

  const [overview, setOverview] = useState(null);
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "",
    thumbnail_url: "",
    price: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // WORKSPACE STATE
  // ==========================================================

  const [workspace, setWorkspace] = useState(null);

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  // ==========================================================
// CERTIFICATE STATE
// ==========================================================

const [certificates, setCertificates] = useState([]);
const [certificatesLoading, setCertificatesLoading] = useState(false);
const [certificatesError, setCertificatesError] = useState("");
const [approvingCertificateId, setApprovingCertificateId] = useState("");
const [approvedCertificates, setApprovedCertificates] = useState([]);
const [approvedCertificatesLoading, setApprovedCertificatesLoading] = useState(false);
const [approvedCertificatesError, setApprovedCertificatesError] = useState("");
  // ==========================================================
  // ASSIGNMENT STATE
  // ==========================================================

  const [showAssignmentForm, setShowAssignmentForm] =
    useState(false);

  const [creatingAssignment, setCreatingAssignment] =
    useState(false);

  const [message, setMessage] = useState("");

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    instructions: "",
    due_date: "",
    correctness: 40,
    code_quality: 30,
    oop_usage: 30,
  });

  // ==========================================================
  // SECTION REFS
  // ==========================================================

  const workspaceRef = useRef(null);
  const assignmentFormRef = useRef(null);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadInstructorCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadDashboard(selectedCourseId);
    } else {
      setOverview(null);
      setLoading(false);
    }
  }, [selectedCourseId]);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  async function loadInstructorCourses() {
    try {
      setCoursesLoading(true);
      setCoursesError("");

      const response = await axios.get(
        `${API_URL}/courses/instructor-courses`,
        {
          headers: getAuthHeaders(),
        }
      );

      const courses = Array.isArray(response.data?.courses)
        ? response.data.courses
        : [];

      setInstructorCourses(courses);

      if (courses.length > 0) {
        setSelectedCourseId((current) =>
          current && courses.some((course) => course.id === current)
            ? current
            : courses[0].id
        );
      } else {
        setSelectedCourseId("");
      }
    } catch (error) {
      console.error("Instructor courses error:", error);
      setInstructorCourses([]);
      setSelectedCourseId("");
      setCoursesError(
        error.response?.data?.message ||
          "Failed to load your courses"
      );
    } finally {
      setCoursesLoading(false);
    }
  }

  async function loadDashboard(courseId = selectedCourseId) {
    if (!courseId) {
      setOverview(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/${courseId}/instructor-overview`,
        {
          headers: getAuthHeaders(),
        }
      );

      setOverview(response.data);
    } catch (error) {
      console.error("Instructor dashboard error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load instructor dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCourseChange(event) {
    const nextCourseId = event.target.value;
    setWorkspace(null);
    setMessage("");
    setSelectedCourseId(nextCourseId);
  }

  function handleCourseFormChange(event) {
    const { name, value } = event.target;

    setCourseForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function createCourse(event) {
    event.preventDefault();

    if (!courseForm.title.trim()) {
      setMessage("Course title is required.");
      return;
    }

    try {
      setCreatingCourse(true);
      setMessage("");

      const response = await axios.post(
        `${API_URL}/courses`,
        {
          title: courseForm.title.trim(),
          description: courseForm.description.trim() || null,
          category: courseForm.category.trim() || null,
          difficulty: courseForm.difficulty || null,
          thumbnail_url: courseForm.thumbnail_url.trim() || null,
          price: Number(courseForm.price) || 0,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data?.success) {
        const createdCourse = response.data.course;

        setMessage("Course created successfully ✅");
        setCourseForm({
          title: "",
          description: "",
          category: "",
          difficulty: "",
          thumbnail_url: "",
          price: 0,
        });
        setShowCourseForm(false);

        await loadInstructorCourses();
        if (createdCourse?.id) {
          setSelectedCourseId(createdCourse.id);
        }
      }
    } catch (error) {
      console.error("Create course error:", error);
      setMessage(
        error.response?.data?.message ||
          "Failed to create course"
      );
    } finally {
      setCreatingCourse(false);
    }
  }

  // ==========================================================
  // LOAD STUDENTS
  // ==========================================================

  async function loadStudents() {
    if (!selectedCourseId) return;

    try {
      setStudentsLoading(true);
      setStudentsError("");

      const response = await axios.get(
        `${API_URL}/courses/${selectedCourseId}/instructor-students`,
        {
          headers: getAuthHeaders(),
        }
      );

      const responseData = response.data || {};

      const studentList =
        responseData.students ||
        responseData.data?.students ||
        [];

      setStudents(
        Array.isArray(studentList)
          ? studentList
          : []
      );
    } catch (error) {
      console.error(
        "Instructor students error:",
        error
      );

      setStudentsError(
        error.response?.data?.message ||
          "Unable to load student list."
      );

      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }

  // ==========================================================
// LOAD PENDING CERTIFICATE REQUESTS
// ==========================================================

async function loadCertificates() {
  if (!selectedCourseId) return;

  try {
    setCertificatesLoading(true);
    setCertificatesError("");

    const response = await axios.get(
      `${API_URL}/courses/${selectedCourseId}/certificate-requests`,
      {
        headers: getAuthHeaders(),
      }
    );

    setCertificates(response.data.certificates || []);
  } catch (error) {
    console.error(
      "Instructor certificates error:",
      error
    );

    setCertificatesError(
      error.response?.data?.message ||
        "Unable to load certificate requests."
    );

    setCertificates([]);
  } finally {
    setCertificatesLoading(false);
  }
}

async function loadApprovedCertificates() {
  if (!selectedCourseId) return;

  try {
    setApprovedCertificatesLoading(true);
    setApprovedCertificatesError("");

    const response = await axios.get(
      `${API_URL}/courses/${selectedCourseId}/approved-certificates`,
      {
        headers: getAuthHeaders(),
      }
    );

    setApprovedCertificates(
      response.data.certificates || []
    );
  } catch (error) {
    console.error(
      "Failed to load approved certificates:",
      error
    );

    setApprovedCertificatesError(
      error.response?.data?.message ||
        "Failed to load approved certificates."
    );
  } finally {
    setApprovedCertificatesLoading(false);
  }
}

// ==========================================================
// APPROVE CERTIFICATE
// ==========================================================

async function approveCertificate(certificateId) {
  if (!selectedCourseId) return;

  try {
    setApprovingCertificateId(certificateId);
    setMessage("");

    const response = await axios.patch(
      `${API_URL}/courses/${selectedCourseId}/certificates/${certificateId}/approve`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );

    if (response.data.success) {
      setMessage(
        "Certificate approved successfully ✅"
      );

      await loadCertificates();
      await loadDashboard();
    }
  } catch (error) {
    console.error(
      "Approve certificate error:",
      error
    );

    setMessage(
      error.response?.data?.message ||
        "Failed to approve certificate"
    );
  } finally {
    setApprovingCertificateId("");
  }
}

  // ==========================================================
  // SMOOTH SCROLL HELPERS
  // ==========================================================

  function scrollToWorkspace() {
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function scrollToAssignmentForm() {
    setTimeout(() => {
      assignmentFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  // ==========================================================
  // OPEN WORKSPACE
  // ==========================================================

  function openWorkspace(type) {
  setMessage("");
  setWorkspace(type);

  if (
    (type === "enrolled" ||
      type === "active") &&
    students.length === 0
  ) {
    loadStudents();
  }

  if (
    type === "certificates" &&
    certificates.length === 0
  ) {
    loadCertificates();
  }

  if (type === "certificates") {
  loadCertificates();
  loadApprovedCertificates();
}

  scrollToWorkspace();
}

  // ==========================================================
  // CLOSE WORKSPACE
  // ==========================================================

  function closeWorkspace() {
    setWorkspace(null);
    setMessage("");
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ==========================================================
  // ASSIGNMENT FORM CHANGE
  // ==========================================================

  const handleAssignmentChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setAssignmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================================
  // CREATE ASSIGNMENT
  // ==========================================================

  async function createAssignment(event) {
    if (!selectedCourseId) {
      setMessage("Select a course first.");
      return;
    }


    event.preventDefault();

    if (!assignmentForm.title.trim()) {
      setMessage(
        "Assignment title is required."
      );
      return;
    }

    const rubricTotal =
      Number(assignmentForm.correctness) +
      Number(assignmentForm.code_quality) +
      Number(assignmentForm.oop_usage);

    if (rubricTotal !== 100) {
      setMessage(
        "Rubric percentages must add up to 100."
      );
      return;
    }

    try {
      setCreatingAssignment(true);
      setMessage("");

      const response = await axios.post(
        `${API_URL}/courses/${selectedCourseId}/assignments`,
        {
          title:
            assignmentForm.title.trim(),

          instructions:
            assignmentForm.instructions.trim() ||
            null,

          due_date:
            assignmentForm.due_date || null,

          rubric: {
            correctness: Number(
              assignmentForm.correctness
            ),

            code_quality: Number(
              assignmentForm.code_quality
            ),

            oop_usage: Number(
              assignmentForm.oop_usage
            ),
          },
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        setMessage(
          "Assignment created successfully ✅"
        );

        setAssignmentForm({
          title: "",
          instructions: "",
          due_date: "",
          correctness: 40,
          code_quality: 30,
          oop_usage: 30,
        });

        setShowAssignmentForm(false);

        await loadDashboard();

        // After the form closes, move the user
        // back to the dashboard activity area.
        setTimeout(() => {
          workspaceRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 150);
      }
    } catch (error) {
      console.error(
        "Create assignment error:",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Failed to create assignment"
      );
    } finally {
      setCreatingAssignment(false);
    }
  }

  // ==========================================================
  // OPEN ASSIGNMENT CREATOR
  // ==========================================================

  function openAssignmentCreator() {
    if (!selectedCourseId) {
      setMessage("Create or select a course first.");
      return;
    }

    setMessage("");
    setWorkspace("assignments");
    setShowAssignmentForm(true);

    scrollToAssignmentForm();
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (coursesLoading || loading) {
    return (
      <div className="instructor-page">
        <div className="instructor-loading">
          Loading instructor workspace...
        </div>
      </div>
    );
  }

  // ==========================================================
  // NO COURSE YET
  // ==========================================================

  if (instructorCourses.length === 0) {
    return (
      <div className="instructor-page">
        <header className="instructor-header">
          <div className="instructor-brand">
            <div className="instructor-brand-mark">
              ✦
            </div>
            <div className="instructor-brand-text">
              <strong>VertexLearn AI</strong>
              <span>Instructor workspace</span>
            </div>
          </div>
          <button
            className="instructor-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="instructor-container">
          <section className="instructor-workspace-card" style={{ marginTop: "24px" }}>
            <div className="workspace-content" style={{ padding: "42px" }}>
              <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto" }}>
                <div style={{ fontSize: "46px", marginBottom: "14px" }}>🎓</div>
                <span className="instructor-eyebrow">WELCOME, INSTRUCTOR</span>
                <h1 style={{ margin: "12px 0 10px", fontSize: "34px" }}>
                  Build your first course
                </h1>
                <p style={{ margin: "0 auto 24px", maxWidth: "560px" }}>
                  You are successfully registered as an instructor. Create a course to start adding modules, lectures, videos, assignments, quizzes and learner activities.
                </p>

                {coursesError && (
                  <div className="workspace-note" style={{ marginBottom: "18px" }}>
                    {coursesError}
                  </div>
                )}

                <button
                  className="instructor-primary-button"
                  onClick={() => setShowCourseForm((value) => !value)}
                >
                  {showCourseForm ? "Close Course Form" : "+ Create Your First Course"}
                </button>

                {showCourseForm && (
                  <form
                    onSubmit={createCourse}
                    style={{
                      marginTop: "28px",
                      textAlign: "left",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div className="instructor-form-field full">
                      <label htmlFor="first-course-title">Course title</label>
                      <input
                        id="first-course-title"
                        name="title"
                        value={courseForm.title}
                        onChange={handleCourseFormChange}
                        placeholder="Example: Python Programming"
                        required
                      />
                    </div>

                    <div className="instructor-form-field full">
                      <label htmlFor="first-course-description">Description</label>
                      <textarea
                        id="first-course-description"
                        name="description"
                        value={courseForm.description}
                        onChange={handleCourseFormChange}
                        rows="4"
                        placeholder="Describe what students will learn..."
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div className="instructor-form-field">
                        <label htmlFor="first-course-category">Category</label>
                        <input
                          id="first-course-category"
                          name="category"
                          value={courseForm.category}
                          onChange={handleCourseFormChange}
                          placeholder="Programming"
                        />
                      </div>

                      <div className="instructor-form-field">
                        <label htmlFor="first-course-difficulty">Difficulty</label>
                        <select
                          id="first-course-difficulty"
                          name="difficulty"
                          value={courseForm.difficulty}
                          onChange={handleCourseFormChange}
                        >
                          <option value="">Select difficulty</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="instructor-submit-button"
                      disabled={creatingCourse}
                    >
                      {creatingCourse ? "Creating Course..." : "Create Course"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !overview) {
    return (
      <div className="instructor-page">
        <div className="instructor-error-screen">
          <div className="instructor-error-icon">
            !
          </div>

          <h2>
            Unable to load instructor workspace
          </h2>

          <p>
            {error ||
              "Something went wrong."}
          </p>

          <button
            className="instructor-primary-button"
            onClick={loadDashboard}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // DASHBOARD DATA
  // ==========================================================

  const course = overview.course || {};
  const analytics = overview.analytics || {};

  const activeStudents = students.filter(
    (student) => {
      const value =
        student.is_active ??
        student.active ??
        student.status === "active";

      return Boolean(value);
    }
  );

  const inactiveStudents = students.filter(
    (student) =>
      !activeStudents.includes(student)
  );

  const displayedStudents =
    workspace === "active"
      ? activeStudents
      : students;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="instructor-page">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="instructor-header">
        <div className="instructor-brand">
          <div className="instructor-brand-mark">
            ✦
          </div>

          <div className="instructor-brand-text">
            <strong>
              VertexLearn AI
            </strong>

            <span>
              Instructor workspace
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto", marginRight: "14px" }}>
          <select
            value={selectedCourseId}
            onChange={handleCourseChange}
            aria-label="Select course"
            style={{
              minWidth: "220px",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "1px solid #d6e4ec",
              background: "#ffffff",
              color: "#28485b",
              fontWeight: 700,
              outline: "none",
            }}
          >
            {instructorCourses.map((instructorCourse) => (
              <option key={instructorCourse.id} value={instructorCourse.id}>
                {instructorCourse.title}
              </option>
            ))}
          </select>

          <button
            className="instructor-view-course-button"
            onClick={() =>
             navigate(
  `/instructor/course/${selectedCourseId}/content`
)
            }
          >
            View Course
          </button>

          <button
            className="instructor-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="instructor-container">
        {/* =====================================================
            HERO
            ===================================================== */}

        <section className="instructor-hero">
          <div className="instructor-hero-content">
            <span className="instructor-eyebrow">
              INSTRUCTOR WORKSPACE
            </span>

            <h1>
              {course.title}
            </h1>

            <p>
              Manage your course, track learner
              activity, create assignments, and
              review student work from one place.
            </p>

            <div className="instructor-status">
              <span className="status-dot"></span>
              {course.status ||
                "Published"}
            </div>
          </div>
        </section>

        {/* =====================================================
            COURSE ACTIVITY
            ===================================================== */}

        <section className="instructor-section">
          <div className="instructor-section-heading">
            <div>
              <span>
                COURSE ACTIVITY
              </span>

              <h2>
                At a glance
              </h2>
            </div>

            <p>
              Select a metric to explore its details.
            </p>
          </div>

          <div className="instructor-stats-grid">
            {/* ENROLLED STUDENTS */}

            <button
              className={`instructor-stat-card ${
                workspace === "enrolled"
                  ? "active-stat"
                  : ""
              }`}
              onClick={() =>
                openWorkspace("enrolled")
              }
            >
              <div className="instructor-stat-icon">
                👥
              </div>

              <div className="instructor-stat-content">
                <span>
                  Enrolled Students
                </span>

                <strong>
                  {analytics.enrolled_students ??
                    0}
                </strong>

                <small>
                  Total learners enrolled
                </small>
              </div>

              <div className="stat-arrow">
                →
              </div>
            </button>

            {/* ACTIVE STUDENTS */}

            <button
              className={`instructor-stat-card ${
                workspace === "active"
                  ? "active-stat"
                  : ""
              }`}
              onClick={() =>
                openWorkspace("active")
              }
            >
              <div className="instructor-stat-icon">
                ⚡
              </div>

              <div className="instructor-stat-content">
                <span>
                  Active Students
                </span>

                <strong>
                  {analytics.active_students ??
                    0}
                </strong>

                <small>
                  Active in the last 7 days
                </small>
              </div>

              <div className="stat-arrow">
                →
              </div>
            </button>

            {/* QUIZ SCORE */}

            <button
              className={`instructor-stat-card ${
                workspace === "quiz-score"
                  ? "active-stat"
                  : ""
              }`}
              onClick={() =>
                openWorkspace("quiz-score")
              }
            >
              <div className="instructor-stat-icon">
                📊
              </div>

              <div className="instructor-stat-content">
                <span>
                  Average Quiz Score
                </span>

                <strong>
                  {analytics.average_quiz_score ??
                    0}
                  %
                </strong>

                <small>
                  Average across attempts
                </small>
              </div>

              <div className="stat-arrow">
                →
              </div>
            </button>

            {/* ASSIGNMENTS */}

            <button
              className={`instructor-stat-card ${
                workspace === "assignments"
                  ? "active-stat"
                  : ""
              }`}
              onClick={() =>
                openWorkspace("assignments")
              }
            >
              <div className="instructor-stat-icon">
                📝
              </div>

              <div className="instructor-stat-content">
                <span>
                  Assignments
                </span>

                <strong>
                  {analytics.assignments ?? 0}
                </strong>

                <small>
                  Manage assignment activities
                </small>
              </div>

              <div className="stat-arrow">
                →
              </div>
            </button>

            {/* SUBMISSIONS */}

            <button
              className="instructor-stat-card clickable-stat"
              onClick={() =>
                navigate(
                  "/instructor/submissions"
                )
              }
            >
              <div className="instructor-stat-icon">
                📤
              </div>

              <div className="instructor-stat-content">
                <span>
                  Submissions
                </span>

                <strong>
                  {analytics.submissions ?? 0}
                </strong>

                <small>
                  Review submitted student work
                </small>
              </div>

              <div className="stat-arrow">
                →
              </div>
            </button>

            {/* QUIZZES */}

            <button
              className="instructor-stat-card"
              onClick={() =>
                navigate(
                  "/instructor/quizzes"
                )
              }
            >
              <div className="instructor-stat-icon">
                🧠
              </div>

              <div className="instructor-stat-content">
                <span>
                  Quizzes
                </span>

                <strong>
                  {analytics.quizzes ?? 0}
                </strong>

                <small>
                  Manage course assessments
                </small>
              </div>

              <div className="stat-arrow">
                →
              </div>
            </button>

            {/* PENDING CERTIFICATES */}

<button
  className={`instructor-stat-card ${
    workspace === "certificates"
      ? "active-stat"
      : ""
  }`}
  onClick={() =>
    openWorkspace("certificates")
  }
>
  <div className="instructor-stat-icon">
    🎓
  </div>

  <div className="instructor-stat-content">
    <span>
      Pending Certificates
    </span>

    <strong>
      {certificates.length}
    </strong>

    <small>
      Student certificates awaiting approval
    </small>
  </div>

  <div className="stat-arrow">
    →
  </div>
</button>
          </div>
        </section>

        {/* =====================================================
            DYNAMIC WORKSPACE
            ===================================================== */}

        {workspace && (
          <section
            ref={workspaceRef}
            className="instructor-workspace-card"
          >
            <div className="workspace-header">
              <div>
                <span>
                  INSTRUCTOR ANALYTICS
                </span>

                <h2>
                  {workspace === "enrolled" &&
                    "Enrolled Students"}

                  {workspace === "active" &&
                    "Active Students"}

                  {workspace === "quiz-score" &&
                    "Quiz Performance"}

                  {workspace === "assignments" &&
                    "Assignments"}
                  {workspace === "certificates" && "Pending Certificates"}
                </h2>
              </div>

              <button
                className="workspace-close-button"
                onClick={closeWorkspace}
              >
                ×
              </button>
            </div>

            {/* =================================================
                ENROLLED STUDENTS
                ================================================= */}

            {workspace === "enrolled" && (
              <div className="workspace-content">
                <div className="workspace-summary-grid">
                  <div className="workspace-summary">
                    <span>
                      Total enrolled
                    </span>

                    <strong>
                      {analytics.enrolled_students ??
                        0}
                    </strong>
                  </div>
                </div>

                {studentsLoading ? (
                  <div className="workspace-loading">
                    Loading enrolled students...
                  </div>
                ) : studentsError ? (
                  <div className="workspace-empty">
                    <strong>
                      Unable to load students
                    </strong>

                    <p>
                      {studentsError}
                    </p>

                    <button
                      className="instructor-primary-button"
                      onClick={loadStudents}
                    >
                      Try Again
                    </button>
                  </div>
                ) : students.length === 0 ? (
                  <div className="workspace-empty">
                    <strong>
                      No student records found
                    </strong>

                    <p>
                      The enrolled count is currently
                      {` ${
                        analytics.enrolled_students ??
                        0
                      }`},
                      but the student list endpoint did
                      not return individual records.
                    </p>
                  </div>
                ) : (
                  <div className="student-list">
                    {students.map(
                      (student) => (
                        <div
                          className="student-row"
                          key={
                            student.id ||
                            student.student_id
                          }
                        >
                          <div className="student-avatar">
                            {(
                              student.full_name ||
                              student.name ||
                              "S"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="student-info">
                            <strong>
                              {student.full_name ||
                                student.name ||
                                "Student"}
                            </strong>

                            <span>
                              {student.email ||
                                "No email available"}
                            </span>
                          </div>

                          <span className="student-status enrolled">
                            Enrolled
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                ACTIVE STUDENTS
                ================================================= */}

            {workspace === "active" && (
              <div className="workspace-content">
                <div className="workspace-summary-grid">
                  <div className="workspace-summary">
                    <span>
                      Active students
                    </span>

                    <strong>
                      {analytics.active_students ??
                        0}
                    </strong>
                  </div>

                  <div className="workspace-summary">
                    <span>
                      Other enrolled
                    </span>

                    <strong>
                      {Math.max(
                        0,
                        Number(
                          analytics.enrolled_students ??
                            0
                        ) -
                          Number(
                            analytics.active_students ??
                              0
                          )
                      )}
                    </strong>
                  </div>
                </div>

                {studentsLoading ? (
                  <div className="workspace-loading">
                    Loading student activity...
                  </div>
                ) : studentsError ? (
                  <div className="workspace-empty">
                    <strong>
                      Unable to load student activity
                    </strong>

                    <p>
                      {studentsError}
                    </p>

                    <button
                      className="instructor-primary-button"
                      onClick={loadStudents}
                    >
                      Try Again
                    </button>
                  </div>
                ) : students.length === 0 ? (
                  <div className="workspace-empty">
                    <strong>
                      No detailed student activity
                      available
                    </strong>

                    <p>
                      The dashboard still shows the
                      active-student count from the
                      instructor overview.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="student-list">
                      {displayedStudents.map(
                        (student) => (
                          <div
                            className="student-row"
                            key={
                              student.id ||
                              student.student_id
                            }
                          >
                            <div className="student-avatar">
                              {(
                                student.full_name ||
                                student.name ||
                                "S"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="student-info">
                              <strong>
                                {student.full_name ||
                                  student.name ||
                                  "Student"}
                              </strong>

                              <span>
                                {student.email ||
                                  "No email available"}
                              </span>
                            </div>

                            <span className="student-status active">
                              Active
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {inactiveStudents.length > 0 && (
                      <div className="inactive-section">
                        <div className="inactive-title">
                          Other enrolled students
                        </div>

                        <div className="student-list">
                          {inactiveStudents.map(
                            (student) => (
                              <div
                                className="student-row"
                                key={
                                  student.id ||
                                  student.student_id
                                }
                              >
                                <div className="student-avatar muted">
                                  {(
                                    student.full_name ||
                                    student.name ||
                                    "S"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div className="student-info">
                                  <strong>
                                    {student.full_name ||
                                      student.name ||
                                      "Student"}
                                  </strong>

                                  <span>
                                    {student.email ||
                                      "No email available"}
                                  </span>
                                </div>

                                <span className="student-status inactive">
                                  Not recently active
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* =================================================
                QUIZ SCORE
                ================================================= */}

            {workspace === "quiz-score" && (
              <div className="workspace-content">
                <div className="quiz-score-layout">
                  <div className="quiz-score-main">
                    <span>
                      AVERAGE SCORE
                    </span>

                    <strong>
                      {analytics.average_quiz_score ??
                        0}
                      %
                    </strong>

                    <p>
                      Average quiz performance across
                      the recorded attempts in this
                      course.
                    </p>
                  </div>

                  <div className="quiz-score-side">
                    <div>
                      <span>
                        Total quizzes
                      </span>

                      <strong>
                        {analytics.quizzes ?? 0}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Recorded attempts
                      </span>

                      <strong>
                        {analytics.average_quiz_score !=
                        null
                          ? "Available"
                          : "0"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="workspace-note">
                  Detailed quiz-by-student and
                  quiz-by-question analytics will be
                  connected when the Quiz workspace is
                  implemented.
                </div>
              </div>
            )}

            {/* =================================================
                ASSIGNMENTS
                ================================================= */}

            {workspace === "assignments" && (
              <div className="workspace-content">
                <div className="assignment-choice-grid">
                  <button
                    className="assignment-choice-card primary"
                    onClick={openAssignmentCreator}
                  >
                    <div className="assignment-choice-icon">
                      ＋
                    </div>

                    <div>
                      <strong>
                        Create Assignment
                      </strong>

                      <span>
                        Add instructions, deadline and
                        evaluation rubric.
                      </span>
                    </div>

                    <div className="assignment-choice-arrow">
                      →
                    </div>
                  </button>

                  <button
                    className="assignment-choice-card"
                    onClick={() =>
                      navigate(
                        "/instructor/submissions"
                      )
                    }
                  >
                    <div className="assignment-choice-icon">
                      📤
                    </div>

                    <div>
                      <strong>
                        Submitted Assignments
                      </strong>

                      <span>
                        View students who submitted work
                        and review their assignments.
                      </span>
                    </div>

                    <div className="assignment-choice-arrow">
                      →
                    </div>
                  </button>
                </div>

                <div className="assignment-count-banner">
                  <span>
                    Assignments created
                  </span>

                  <strong>
                    {analytics.assignments ?? 0}
                  </strong>
                </div>
              </div>
            )}

            
        {/* =================================================
    CERTIFICATE REQUESTS
    ================================================= */}
{workspace === "certificates" && (
  <div className="workspace-content">

    {/* Pending certificate requests */}
    {certificatesLoading ? (
      <div className="workspace-loading">
        Loading certificate requests...
      </div>
    ) : certificatesError ? (
      <div className="workspace-empty">
        <strong>
          Unable to load certificate requests
        </strong>

        <p>{certificatesError}</p>

        <button
          className="instructor-primary-button"
          onClick={loadCertificates}
        >
          Try Again
        </button>
      </div>
    ) : certificates.length === 0 ? (
      <div className="workspace-empty">
        <strong>
          No pending certificate requests
        </strong>

        <p>
          Students who complete 100% of the
          course will appear here for approval.
        </p>
      </div>
    ) : (
      <div className="certificate-request-list">
        {certificates.map((certificate) => (
          <div
            className="certificate-request-row"
            key={certificate.certificate_id}
          >
            <div className="certificate-request-student">
              <div className="student-avatar">
                {(certificate.student_name || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="student-info">
                <strong>
                  {certificate.student_name || "Student"}
                </strong>

                <span>
                  {certificate.student_email ||
                    "No email available"}
                </span>
              </div>
            </div>

            <div className="certificate-request-details">
              <span>Course completion</span>

              <strong>
                {Number(
                  certificate.progress_percent || 100
                ).toFixed(0)}
                %
              </strong>

              <small>
                {certificate.completed_at
                  ? `Completed ${new Date(
                      certificate.completed_at
                    ).toLocaleDateString()}`
                  : "Course completed"}
              </small>
            </div>

            <div className="certificate-request-action">
              <span className="student-status enrolled">
                Pending
              </span>

              <button
                className="instructor-primary-button"
                onClick={() =>
                  approveCertificate(
                    certificate.certificate_id
                  )
                }
                disabled={
                  approvingCertificateId ===
                  certificate.certificate_id
                }
              >
                {approvingCertificateId ===
                certificate.certificate_id
                  ? "Approving..."
                  : "Approve Certificate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Approved certificates history */}
    <div className="approved-certificates-section">
      <div className="approved-certificates-heading">
        <div>
          <span>APPROVAL HISTORY</span>

          <h3>Approved Certificates</h3>

          <p>
            Certificates already approved by you.
          </p>
        </div>

        <strong>
          {approvedCertificates.length}
        </strong>
      </div>

      {approvedCertificatesLoading ? (
        <div className="workspace-loading">
          Loading approved certificates...
        </div>
      ) : approvedCertificatesError ? (
        <div className="workspace-empty">
          <strong>
            Unable to load approval history
          </strong>

          <p>
            {approvedCertificatesError}
          </p>

          <button
            className="instructor-primary-button"
            onClick={loadApprovedCertificates}
          >
            Try Again
          </button>
        </div>
      ) : approvedCertificates.length === 0 ? (
        <div className="workspace-empty">
          <strong>
            No approved certificates yet
          </strong>

          <p>
            Approved student certificates will
            appear here.
          </p>
        </div>
      ) : (
        <div className="certificate-request-list">
          {approvedCertificates.map(
            (certificate) => (
              <div
                className="certificate-request-row"
                key={certificate.certificate_id}
              >
                <div className="certificate-request-student">
                  <div className="student-avatar">
                    {(certificate.student_name || "S")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="student-info">
                    <strong>
                      {certificate.student_name ||
                        "Student"}
                    </strong>

                    <span>
                      {certificate.student_email ||
                        "No email available"}
                    </span>
                  </div>
                </div>

                <div className="certificate-request-details">
                  <span>Certificate No.</span>

                  <strong>
                    {certificate.certificate_number}
                  </strong>

                  <small>
                    Approved{" "}
                    {certificate.approved_at
                      ? new Date(
                          certificate.approved_at
                        ).toLocaleDateString()
                      : "—"}
                  </small>
                </div>

                <div className="certificate-request-action">
                  <span className="student-status active">
                    ✓ Approved
                  </span>

                  <small>
                    By{" "}
                    {certificate.approved_by_name ||
                      "Instructor"}
                  </small>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  </div>
)}
          </section>
        )}


        {/* =====================================================
            QUICK ACTIONS
            ===================================================== */}

        <section className="instructor-section">
          <div className="instructor-section-heading">
            <div>
              <span>
                QUICK ACTIONS
              </span>

              <h2>
                Manage your course
              </h2>
            </div>

            <p>
              Create learning activities and keep
              your students moving forward.
            </p>
          </div>

          <div className="instructor-actions-grid">
            {/* CREATE COURSE */}

            <button
              className="instructor-action-card primary"
              onClick={() => setShowCourseForm((value) => !value)}
            >
              <div className="instructor-action-icon">
                ＋
              </div>

              <div className="instructor-action-text">
                <strong>Create Course</strong>
                <span>Start another course under your account</span>
              </div>

              <div className="action-card-arrow">
                →
              </div>
            </button>

            {/* CREATE ASSIGNMENT */}

            <button
              className="instructor-action-card primary"
              onClick={openAssignmentCreator}
            >
              <div className="instructor-action-icon">
                ＋
              </div>

              <div className="instructor-action-text">
                <strong>
                  Create Assignment
                </strong>

                <span>
                  Add instructions, deadline and
                  rubric
                </span>
              </div>

              <div className="action-card-arrow">
                →
              </div>
            </button>

            {/* CREATE QUIZ */}

            <button
  className="instructor-action-card"
  onClick={() => {
    if (!selectedCourseId) {
      setMessage("Please select a course first.");
      return;
    }

    navigate(
      `/instructor/course/${selectedCourseId}/content`
    );
  }}
>
  <div className="instructor-action-icon">
    ▣
  </div>

  <div className="instructor-action-text">
    <strong>
      Manage Content
    </strong>

    <span>
      Create modules and upload lecture videos
    </span>
  </div>

  <div className="action-card-arrow">
    →
  </div>
</button>
          </div>
        </section>

        {/* =====================================================
            CREATE COURSE FORM
            ===================================================== */}

        {showCourseForm && (
          <section className="instructor-form-card">
            <div className="instructor-form-header">
              <div>
                <span>NEW COURSE</span>
                <h2>Create Course</h2>
              </div>
              <button
                className="instructor-close-button"
                onClick={() => setShowCourseForm(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={createCourse}>
              <div className="instructor-form-grid">
                <div className="instructor-form-field full">
                  <label htmlFor="course-title">Course title</label>
                  <input
                    id="course-title"
                    name="title"
                    value={courseForm.title}
                    onChange={handleCourseFormChange}
                    placeholder="Example: Python Programming"
                    required
                  />
                </div>

                <div className="instructor-form-field full">
                  <label htmlFor="course-description">Description</label>
                  <textarea
                    id="course-description"
                    name="description"
                    rows="4"
                    value={courseForm.description}
                    onChange={handleCourseFormChange}
                    placeholder="Describe what students will learn..."
                  />
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="course-category">Category</label>
                  <input
                    id="course-category"
                    name="category"
                    value={courseForm.category}
                    onChange={handleCourseFormChange}
                    placeholder="Programming"
                  />
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="course-difficulty">Difficulty</label>
                  <select
                    id="course-difficulty"
                    name="difficulty"
                    value={courseForm.difficulty}
                    onChange={handleCourseFormChange}
                  >
                    <option value="">Select difficulty</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="instructor-form-field full">
                  <label htmlFor="course-thumbnail">Thumbnail URL</label>
                  <input
                    id="course-thumbnail"
                    name="thumbnail_url"
                    value={courseForm.thumbnail_url}
                    onChange={handleCourseFormChange}
                    placeholder="Optional image URL"
                  />
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="course-price">Price</label>
                  <input
                    id="course-price"
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={courseForm.price}
                    onChange={handleCourseFormChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="instructor-submit-button"
                disabled={creatingCourse}
              >
                {creatingCourse ? "Creating Course..." : "Create Course"}
              </button>
            </form>
          </section>
        )}

        {/* =====================================================
            CREATE ASSIGNMENT FORM
            ===================================================== */}

        {showAssignmentForm && (
          <section
            ref={assignmentFormRef}
            className="instructor-form-card"
          >
            <div className="instructor-form-header">
              <div>
                <span>
                  NEW LEARNING ACTIVITY
                </span>

                <h2>
                  Create Assignment
                </h2>
              </div>

              <button
                className="instructor-close-button"
                onClick={() =>
                  setShowAssignmentForm(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={createAssignment}>
              <div className="instructor-form-grid">
                <div className="instructor-form-field full">
                  <label htmlFor="title">
                    Assignment title
                  </label>

                  <input
                    id="title"
                    name="title"
                    value={
                      assignmentForm.title
                    }
                    onChange={
                      handleAssignmentChange
                    }
                    placeholder="Example: Java Collections Assignment"
                  />
                </div>

                <div className="instructor-form-field full">
                  <label htmlFor="instructions">
                    Instructions
                  </label>

                  <textarea
                    id="instructions"
                    name="instructions"
                    rows="5"
                    value={
                      assignmentForm.instructions
                    }
                    onChange={
                      handleAssignmentChange
                    }
                    placeholder="Explain what students need to complete..."
                  />
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="due_date">
                    Deadline
                  </label>

                  <input
                    id="due_date"
                    type="datetime-local"
                    name="due_date"
                    value={
                      assignmentForm.due_date
                    }
                    onChange={
                      handleAssignmentChange
                    }
                  />
                </div>
              </div>

              <div className="rubric-section">
                <div className="rubric-header">
                  <div>
                    <span>
                      EVALUATION RUBRIC
                    </span>

                    <h3>
                      Evaluation criteria
                    </h3>
                  </div>

                  <small>
                    Total must equal 100%.
                  </small>
                </div>

                <div className="rubric-grid">
                  <div className="rubric-field">
                    <label htmlFor="correctness">
                      Correctness
                    </label>

                    <div className="rubric-input">
                      <input
                        id="correctness"
                        type="number"
                        min="0"
                        max="100"
                        name="correctness"
                        value={
                          assignmentForm.correctness
                        }
                        onChange={
                          handleAssignmentChange
                        }
                      />

                      <span>%</span>
                    </div>
                  </div>

                  <div className="rubric-field">
                    <label htmlFor="code_quality">
                      Code Quality
                    </label>

                    <div className="rubric-input">
                      <input
                        id="code_quality"
                        type="number"
                        min="0"
                        max="100"
                        name="code_quality"
                        value={
                          assignmentForm.code_quality
                        }
                        onChange={
                          handleAssignmentChange
                        }
                      />

                      <span>%</span>
                    </div>
                  </div>

                  <div className="rubric-field">
                    <label htmlFor="oop_usage">
                      OOP Usage
                    </label>

                    <div className="rubric-input">
                      <input
                        id="oop_usage"
                        type="number"
                        min="0"
                        max="100"
                        name="oop_usage"
                        value={
                          assignmentForm.oop_usage
                        }
                        onChange={
                          handleAssignmentChange
                        }
                      />

                      <span>%</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="instructor-submit-button"
                disabled={
                  creatingAssignment
                }
              >
                {creatingAssignment
                  ? "Creating Assignment..."
                  : "Create Assignment"}
              </button>
            </form>
          </section>
        )}

        {/* =====================================================
            MESSAGE
            ===================================================== */}

        {message && (
          <div className="instructor-message success">
            {message}
          </div>
        )}

        {/* =====================================================
            SMALL SUBMISSION PREVIEW
            ===================================================== */}

        <section className="submission-preview">
          <div>
            <span>
              STUDENT WORK
            </span>

            <h2>
              {analytics.submissions ?? 0} submitted
              assignments
            </h2>

            <p>
              Open the submissions workspace to see
              which students have submitted work and
              review their assignments.
            </p>
          </div>

          <button
            className="submission-preview-button"
            onClick={() =>
              navigate(
                "/instructor/submissions"
              )
            }
          >
            Review Submissions →
          </button>
        </section>
      </main>
    </div>
  );
}

export default InstructorDashboard;