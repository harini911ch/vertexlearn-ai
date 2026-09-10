import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import "./RoleNavbar.css";

function getUserFromToken() {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));

    return payload;
  } catch (error) {
    console.error("Failed to read user token:", error);
    return null;
  }
}

function RoleNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const user = useMemo(() => getUserFromToken(), [location.pathname]);

  if (!user) {
    return null;
  }

  const role = user.role;

  const studentLinks = [
    { label: "Dashboard", path: "/dashboard", icon: "⌂" },
    { label: "My Courses", path: "/dashboard", icon: "▣" },
    { label: "Quizzes", path: "/student/quizzes", icon: "✓" },
    { label: "Assignments", path: "/student/assignments", icon: "▤" },
    { label: "AI Tutor", path: "/ai-tutor", icon: "✦" },
    { label: "Study Plan", path: "/study-plan", icon: "◷" },
    { label: "Progress", path: "/student/progress", icon: "↗" },
    { label: "Certificates", path: "/student/certificates", icon: "🎓" },
  ];

  const instructorLinks = [
    { label: "My Courses", path: "/instructor", icon: "▣" },
    { label: "Submissions", path: "/instructor/submissions", icon: "▤" },
    { label: "Quizzes", path: "/instructor/quizzes", icon: "✓" },
  ];

  const adminLinks = [
    { label: "Dashboard", path: "/admin", icon: "⌂" },
    { label: "Users", path: "/admin/users", icon: "♙" },
    { label: "Courses", path: "/admin/courses", icon: "▣" },
    { label: "Roles", path: "/admin/roles", icon: "⚙" },
  ];

  let links = [];
  let roleLabel = "";

  if (role === "student") {
    links = studentLinks;
    roleLabel = "Student Workspace";
  } else if (role === "instructor") {
    links = instructorLinks;
    roleLabel = "Instructor Workspace";
  } else if (role === "admin") {
    links = adminLinks;
    roleLabel = "Admin Workspace";
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }

    return location.pathname === path ||
      location.pathname.startsWith(`${path}/`);
  };

  return (
    <aside className="role-navbar">
      <div className="role-navbar-brand">
        <div className="role-brand-icon">✦</div>

        <div>
          <strong>VertexLearn AI</strong>
          <span>{roleLabel}</span>
        </div>
      </div>

      <nav className="role-navbar-links">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.path}
            className={`role-navbar-link ${
              isActive(link.path) ? "active" : ""
            }`}
          >
            <span className="role-navbar-icon">
              {link.icon}
            </span>

            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="role-navbar-bottom">
        <button
  className="role-user-card"
  onClick={() => navigate("/profile")}
  type="button"
>
  <div className="role-user-avatar">
    {(user.full_name || user.name || user.email || "U")
      .charAt(0)
      .toUpperCase()}
  </div>

  <div className="role-user-info">
    <strong>
      {user.full_name || user.name || "User"}
    </strong>

    <span>
      {user.email || role}
    </span>
  </div>
</button>

        <button
          className="role-logout-button"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default RoleNavbar;