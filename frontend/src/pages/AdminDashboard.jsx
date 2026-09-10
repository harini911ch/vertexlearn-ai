import {
  useEffect,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import "../pages/AdminDashboard.css";

import axios, {
  API_URL,
  getAuthHeaders
} from "../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  // ============================================================
  // USER STATE
  // ============================================================

  const [user, setUser] = useState(null);

  // ============================================================
  // STATISTICS STATE
  // ============================================================

  const [stats, setStats] = useState({
    total_users: 0,
    total_students: 0,
    total_instructors: 0,
    total_courses: 0,
    pending_courses: 0
  });

  const [statsLoading, setStatsLoading] =
    useState(true);

  const [statsError, setStatsError] =
    useState("");

  // ============================================================
  // ADMIN DETAIL DATA
  // ============================================================

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  const [detailView, setDetailView] =
    useState("users");

  // ============================================================
  // SECTION REFS
  // ============================================================

  const detailsRef = useRef(null);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadAdminStats();

    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error(
        "Failed to load admin user:",
        error
      );
    }
  }, []);

  // ============================================================
  // LOAD ADMIN STATISTICS
  // ============================================================

  async function loadAdminStats() {
    try {
      setStatsLoading(true);
      setStatsError("");

      const response = await axios.get(
        `${API_URL}/admin/stats`,
        {
          headers: getAuthHeaders()
        }
      );

      setStats(
        response.data?.stats || {
          total_users: 0,
          total_students: 0,
          total_instructors: 0,
          total_courses: 0,
          pending_courses: 0
        }
      );
    } catch (error) {
      console.error(
        "Admin statistics error:",
        error
      );

      setStatsError(
        error.response?.data?.message ||
          "Failed to load admin statistics."
      );
    } finally {
      setStatsLoading(false);
    }
  }

  // ============================================================
  // LOAD ADMIN DETAILS
  // ============================================================

  async function loadAdminDetails() {
    try {
      setDetailsLoading(true);
      setDetailsError("");

      const [usersResponse, coursesResponse] =
        await Promise.all([
          axios.get(
            `${API_URL}/admin/users`,
            {
              headers: getAuthHeaders()
            }
          ),

          axios.get(
            `${API_URL}/admin/courses`,
            {
              headers: getAuthHeaders()
            }
          )
        ]);

      setUsers(
        Array.isArray(
          usersResponse.data?.users
        )
          ? usersResponse.data.users
          : []
      );

      setCourses(
        Array.isArray(
          coursesResponse.data?.courses
        )
          ? coursesResponse.data.courses
          : []
      );
    } catch (error) {
      console.error(
        "Admin details error:",
        error
      );

      setDetailsError(
        error.response?.data?.message ||
          "Failed to load admin details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  // ============================================================
  // SHOW DETAILS
  // ============================================================

  function showDetails(view) {
    setDetailView(view);

    loadAdminDetails();

    setTimeout(() => {
      detailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  function handleDashboard() {
    navigate("/admin");
  }

  // ============================================================
  // FILTERED DETAILS
  // ============================================================

  const displayedUsers =
    detailView === "students"
      ? users.filter(
          (item) =>
            typeof item.roles === "string" &&
            item.roles
              .toLowerCase()
              .includes("student")
        )
      : detailView === "instructors"
      ? users.filter(
          (item) =>
            typeof item.roles === "string" &&
            item.roles
              .toLowerCase()
              .includes("instructor")
        )
      : users;

  const displayedCourses =
    detailView === "pending"
      ? courses.filter(
          (item) =>
            item.status === "pending"
        )
      : courses;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="admin-dashboard-page">
      {/* Background decoration */}

      <div className="admin-bg-glow admin-glow-one"></div>

      <div className="admin-bg-glow admin-glow-two"></div>

      <div className="admin-bg-grid"></div>

      {/* ======================================================
          TOPBAR
          ====================================================== */}

      <header className="admin-topbar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            VL
          </div>

          <div className="admin-brand-copy">
            <h1>
              VertexLearn AI
            </h1>

            <span>
              Administrator Panel
            </span>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            className="admin-dashboard-btn"
            onClick={handleDashboard}
          >
            Dashboard
          </button>

          <div className="admin-user-chip">
            <div className="admin-user-avatar">
              {user?.full_name
                ?.charAt(0)
                ?.toUpperCase() || "A"}
            </div>

            <div className="admin-user-info">
              <strong>
                {user?.full_name ||
                  "Administrator"}
              </strong>

              <span>
                Admin
              </span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-dashboard-container">

        {/* ====================================================
            HERO
            ==================================================== */}

        <section className="admin-hero-section">
          <div className="admin-hero-left">

            <div className="admin-hero-kicker">
              <span className="admin-kicker-dot"></span>

              ADMIN CONTROL CENTER
            </div>

            <h2>
              Welcome back,
              <br />

              <span>
                {user?.full_name ||
                  "Administrator"}
              </span>
            </h2>

            <p>
              Manage users, courses, approvals,
              and platform activities from one
              central dashboard.
            </p>

          </div>

          <div className="admin-hero-card">

            <div className="admin-hero-card-icon">
              ⚙️
            </div>

            <div>
              <span>
                Platform status
              </span>

              <strong>
                System operational
              </strong>

              <div className="admin-status-row">
                <span className="admin-status-dot"></span>

                <small>
                  All core services are active
                </small>
              </div>
            </div>

          </div>
        </section>

        {/* ====================================================
            STATISTICS
            ==================================================== */}

        <section className="admin-stats-section">

          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">
                OVERVIEW
              </p>

              <h3>
                Platform Statistics
              </h3>
            </div>

            <span className="admin-section-note">
              Click a card to explore
            </span>
          </div>

          <div className="admin-stats-grid">

            {/* TOTAL USERS */}

            <button
              type="button"
              className="admin-stat-card admin-stat-blue admin-stat-clickable"
              onClick={() =>
                showDetails("users")
              }
            >
              <div className="admin-stat-top">

                <div className="admin-stat-icon">
                  👥
                </div>

                <span className="admin-stat-label">
                  USERS
                </span>

              </div>

              <div className="admin-stat-value">
                {statsLoading
                  ? "..."
                  : stats.total_users}
              </div>

              <p>
                Total registered users
              </p>

              <span className="admin-stat-action">
                View users →
              </span>
            </button>

            {/* STUDENTS */}

            <button
              type="button"
              className="admin-stat-card admin-stat-purple admin-stat-clickable"
              onClick={() =>
                showDetails("students")
              }
            >
              <div className="admin-stat-top">

                <div className="admin-stat-icon">
                  🎓
                </div>

                <span className="admin-stat-label">
                  STUDENTS
                </span>

              </div>

              <div className="admin-stat-value">
                {statsLoading
                  ? "..."
                  : stats.total_students}
              </div>

              <p>
                Active student accounts
              </p>

              <span className="admin-stat-action">
                View students →
              </span>
            </button>

            {/* INSTRUCTORS */}

            <button
              type="button"
              className="admin-stat-card admin-stat-pink admin-stat-clickable"
              onClick={() =>
                showDetails("instructors")
              }
            >
              <div className="admin-stat-top">

                <div className="admin-stat-icon">
                  👨‍🏫
                </div>

                <span className="admin-stat-label">
                  INSTRUCTORS
                </span>

              </div>

              <div className="admin-stat-value">
                {statsLoading
                  ? "..."
                  : stats.total_instructors}
              </div>

              <p>
                Registered instructors
              </p>

              <span className="admin-stat-action">
                View instructors →
              </span>
            </button>

            {/* COURSES */}

            <button
              type="button"
              className="admin-stat-card admin-stat-green admin-stat-clickable"
              onClick={() =>
                showDetails("courses")
              }
            >
              <div className="admin-stat-top">

                <div className="admin-stat-icon">
                  📚
                </div>

                <span className="admin-stat-label">
                  COURSES
                </span>

              </div>

              <div className="admin-stat-value">
                {statsLoading
                  ? "..."
                  : stats.total_courses}
              </div>

              <p>
                Total platform courses
              </p>

              <span className="admin-stat-action">
                View courses →
              </span>
            </button>

            {/* PENDING */}

            <button
              type="button"
              className="admin-stat-card admin-stat-orange admin-stat-clickable"
              onClick={() =>
                showDetails("pending")
              }
            >
              <div className="admin-stat-top">

                <div className="admin-stat-icon">
                  ⏳
                </div>

                <span className="admin-stat-label">
                  PENDING
                </span>

              </div>

              <div className="admin-stat-value">
                {statsLoading
                  ? "..."
                  : stats.pending_courses}
              </div>

              <p>
                Courses waiting for approval
              </p>

              <span className="admin-stat-action">
                Review pending →
              </span>
            </button>

          </div>

          {statsError && (
            <div className="admin-stats-error">
              {statsError}
            </div>
          )}

        </section>

        {/* ====================================================
            QUICK ACTIONS
            ==================================================== */}
<section className="admin-quick-actions">
  <div className="admin-section-heading">
    <div>
      <p className="admin-eyebrow">ADMIN TOOLS</p>
      <h2>Quick Actions</h2>
      <p>
        Manage important parts of the platform directly.
      </p>
    </div>
  </div>

  <div className="admin-action-grid">

    <button
      className="admin-action-card"
      onClick={() => navigate("/admin/users")}
    >
      <div className="admin-action-icon">
        👥
      </div>

      <div className="admin-action-content">
        <h3>Manage Users</h3>
        <p>
          View accounts, suspend users, activate users,
          and change roles.
        </p>
      </div>

      <span className="admin-action-arrow">
        →
      </span>
    </button>

    <button
      className="admin-action-card"
      onClick={() => navigate("/admin/courses")}
    >
      <div className="admin-action-icon">
        📚
      </div>

      <div className="admin-action-content">
        <h3>Manage Courses</h3>
        <p>
          Review courses and approve or reject instructor
          submissions.
        </p>
      </div>

      <span className="admin-action-arrow">
        →
      </span>
    </button>

    <button
      className="admin-action-card"
      onClick={() => navigate("/admin/roles")}
    >
      <div className="admin-action-icon">
        🔐
      </div>

      <div className="admin-action-content">
        <h3>Manage Roles</h3>
        <p>
          Assign or revoke student, instructor, and admin
          roles.
        </p>
      </div>

      <span className="admin-action-arrow">
        →
      </span>
    </button>

  </div>
</section>

        {/* ====================================================
            DETAILS
            ==================================================== */}

        <section
          className="admin-details-section"
          ref={detailsRef}
        >

          <div className="admin-section-heading">

            <div>

              <p className="admin-eyebrow">
                PLATFORM DATA
              </p>

              <h3>
                {detailView === "users"
                  ? "All Users"
                  : detailView === "students"
                  ? "Students"
                  : detailView === "instructors"
                  ? "Instructors"
                  : detailView === "pending"
                  ? "Pending Course Approvals"
                  : "All Courses"}
              </h3>

            </div>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={loadAdminDetails}
            >
              ↻ Refresh
            </button>

          </div>

          {/* Detail tabs */}

          <div className="admin-detail-tabs">

            <button
              type="button"
              className={
                detailView === "users"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setDetailView("users");
                loadAdminDetails();
              }}
            >
              All Users
            </button>

            <button
              type="button"
              className={
                detailView === "students"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setDetailView("students");
                loadAdminDetails();
              }}
            >
              Students
            </button>

            <button
              type="button"
              className={
                detailView === "instructors"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setDetailView("instructors");
                loadAdminDetails();
              }}
            >
              Instructors
            </button>

            <button
              type="button"
              className={
                detailView === "courses"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setDetailView("courses");
                loadAdminDetails();
              }}
            >
              All Courses
            </button>

            <button
              type="button"
              className={
                detailView === "pending"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setDetailView("pending");
                loadAdminDetails();
              }}
            >
              Pending Courses
            </button>

          </div>

          {detailsError && (
            <div className="admin-details-error">
              {detailsError}
            </div>
          )}

          {detailsLoading ? (
            <div className="admin-details-loading">
              <div className="admin-details-spinner"></div>

              <p>
                Loading platform data...
              </p>
            </div>
          ) : (
            <>
              {/* =================================================
                  USERS
                  ================================================= */}

              {(detailView === "users" ||
                detailView === "students" ||
                detailView === "instructors") && (

                <div className="admin-data-card">

                  <div className="admin-data-card-header">

                    <div>
                      <span>
                        {detailView ===
                        "students"
                          ? "STUDENT ACCOUNTS"
                          : detailView ===
                            "instructors"
                          ? "INSTRUCTOR ACCOUNTS"
                          : "USER DIRECTORY"}
                      </span>

                      <h4>
                        {displayedUsers.length}{" "}
                        {displayedUsers.length ===
                        1
                          ? "user"
                          : "users"}
                      </h4>
                    </div>

                  </div>

                  {displayedUsers.length ===
                  0 ? (
                    <div className="admin-no-data">
                      <div>👥</div>

                      <strong>
                        No users found
                      </strong>

                      <p>
                        There are no accounts in
                        this category yet.
                      </p>
                    </div>
                  ) : (
                    <div className="admin-table-wrapper">

                      <table className="admin-data-table">

                        <thead>
                          <tr>
                            <th>
                              User
                            </th>

                            <th>
                              Email
                            </th>

                            <th>
                              Role
                            </th>

                            <th>
                              Status
                            </th>

                            <th>
                              Joined
                            </th>
                          </tr>
                        </thead>

                        <tbody>

                          {displayedUsers.map(
                            (item) => (
                              <tr
                                key={item.id}
                              >

                                <td>
                                  <div className="admin-table-user">

                                    <div className="admin-table-avatar">
                                      {item.full_name
                                        ?.charAt(
                                          0
                                        )
                                        ?.toUpperCase() ||
                                        "U"}
                                    </div>

                                    <strong>
                                      {item.full_name}
                                    </strong>

                                  </div>
                                </td>

                                <td>
                                  {item.email}
                                </td>

                                <td>
                                  <span className="admin-role-badge">
                                    {item.roles ||
                                      "unknown"}
                                  </span>
                                </td>

                                <td>
                                  <span
                                    className={
                                      item.is_active
                                        ? "admin-status-badge active"
                                        : "admin-status-badge inactive"
                                    }
                                  >
                                    {item.is_active
                                      ? "Active"
                                      : "Suspended"}
                                  </span>
                                </td>

                                <td>
                                  {item.created_at
                                    ? new Date(
                                        item.created_at
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>
                  )}

                </div>
              )}

              {/* =================================================
                  COURSES
                  ================================================= */}

              {(detailView ===
                "courses" ||
                detailView ===
                  "pending") && (

                <div className="admin-data-card">

                  <div className="admin-data-card-header">

                    <div>
                      <span>
                        {detailView ===
                        "pending"
                          ? "COURSE APPROVAL QUEUE"
                          : "COURSE DIRECTORY"}
                      </span>

                      <h4>
                        {displayedCourses.length}{" "}
                        {displayedCourses.length ===
                        1
                          ? "course"
                          : "courses"}
                      </h4>
                    </div>

                  </div>

                  {displayedCourses.length ===
                  0 ? (
                    <div className="admin-no-data">

                      <div>
                        📚
                      </div>

                      <strong>
                        No courses found
                      </strong>

                      <p>
                        There are no courses in
                        this category yet.
                      </p>

                    </div>
                  ) : (
                    <div className="admin-table-wrapper">

                      <table className="admin-data-table">

                        <thead>

                          <tr>
                            <th>
                              Course
                            </th>

                            <th>
                              Instructor
                            </th>

                            <th>
                              Category
                            </th>

                            <th>
                              Difficulty
                            </th>

                            <th>
                              Status
                            </th>

                            <th>
                              Created
                            </th>
                          </tr>

                        </thead>

                        <tbody>

                          {displayedCourses.map(
                            (item) => (
                              <tr
                                key={item.id}
                              >

                                <td>
                                  <div className="admin-course-cell">

                                    <strong>
                                      {item.title}
                                    </strong>

                                    <span>
                                      {item.description
                                        ?.slice(
                                          0,
                                          65
                                        ) ||
                                        "No description"}
                                      {item.description
                                        ?.length >
                                      65
                                        ? "..."
                                        : ""}
                                    </span>

                                  </div>
                                </td>

                                <td>
                                  <div className="admin-course-instructor">

                                    <strong>
                                      {item.instructor_name ||
                                        "Unknown"}
                                    </strong>

                                    <small>
                                      {item.instructor_email ||
                                        ""}
                                    </small>

                                  </div>
                                </td>

                                <td>
                                  {item.category ||
                                    "General"}
                                </td>

                                <td>
                                  {item.difficulty ||
                                    "—"}
                                </td>

                                <td>
                                  <span
                                    className={`admin-course-status ${item.status}`}
                                  >
                                    {item.status ===
                                    "published"
                                      ? "Approved"
                                      : item.status ===
                                        "pending"
                                      ? "Pending"
                                      : item.status ===
                                        "rejected"
                                      ? "Rejected"
                                      : item.status}
                                  </span>
                                </td>

                                <td>
                                  {item.created_at
                                    ? new Date(
                                        item.created_at
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>
                  )}

                </div>
              )}

            </>
          )}

        </section>

        {/* ====================================================
            RECENT ACTIVITY
            ==================================================== */}

        <section className="admin-activity-section">

          <div className="admin-section-heading">

            <div>
              <p className="admin-eyebrow">
                ACTIVITY
              </p>

              <h3>
                Recent Platform Activity
              </h3>
            </div>

          </div>

          <div className="admin-activity-card">

            <div className="admin-empty-icon">
              📊
            </div>

            <h4>
              Activity tracking
            </h4>

            <p>
              Detailed audit activity can be
              connected here after the core
              Admin P0 features are completed.
            </p>

          </div>

        </section>

        {/* ====================================================
            FOOTER
            ==================================================== */}

        <footer className="admin-dashboard-footer">

          <div>

            <strong>
              VertexLearn AI
            </strong>

            <span>
              Administrator workspace
            </span>

          </div>

          <span>
            © 2026 VertexLearn AI
          </span>

        </footer>

      </main>
    </div>
  );
}

export default AdminDashboard;