import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./AdminRoles.css";

function AdminRoles() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/admin/users`,
        {
          headers: getAuthHeaders(),
        }
      );

      setUsers(response.data?.users || []);
    } catch (err) {
      console.error(
        "Failed to load roles:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load users and roles."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function updateRole(userId, role) {
    try {
      setProcessingId(userId);
      setError("");

      await axios.patch(
        `${API_URL}/admin/users/${userId}/role`,
        {
          role,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      await loadUsers();
    } catch (err) {
      console.error(
        "Failed to update user role:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to update role."
      );
    } finally {
      setProcessingId("");
    }
  }

  const filteredUsers = users.filter((user) => {
    if (filter === "all") {
      return true;
    }

    return user.role === filter;
  });

  const studentCount = users.filter(
    (user) => user.role === "student"
  ).length;

  const instructorCount = users.filter(
    (user) => user.role === "instructor"
  ).length;

  const adminCount = users.filter(
    (user) => user.role === "admin"
  ).length;

  return (
    <div className="admin-roles-page">
      {/* Header */}
      <header className="admin-roles-header">
        <div>
          <p className="admin-roles-eyebrow">
            ACCESS CONTROL
          </p>

          <h1>Role Management</h1>

          <p className="admin-roles-subtitle">
            Assign and manage platform access levels for users.
          </p>
        </div>

        <button
          type="button"
          className="admin-roles-back-btn"
          onClick={() => navigate("/admin")}
        >
          ← Back to Dashboard
        </button>
      </header>

      {error && (
        <div className="admin-roles-error">
          {error}
        </div>
      )}

      {/* Role summary */}
      <section className="admin-role-summary-grid">
        <div className="admin-role-summary-card student">
          <div className="admin-role-summary-icon">
            🎓
          </div>

          <div>
            <span>Students</span>
            <strong>{studentCount}</strong>
            <small>Learner accounts</small>
          </div>
        </div>

        <div className="admin-role-summary-card instructor">
          <div className="admin-role-summary-icon">
            👨‍🏫
          </div>

          <div>
            <span>Instructors</span>
            <strong>{instructorCount}</strong>
            <small>Teaching accounts</small>
          </div>
        </div>

        <div className="admin-role-summary-card admin">
          <div className="admin-role-summary-icon">
            🛡️
          </div>

          <div>
            <span>Admins</span>
            <strong>{adminCount}</strong>
            <small>Administrative accounts</small>
          </div>
        </div>
      </section>

      {/* Role information */}
      <section className="admin-role-info-grid">
        <div className="admin-role-info-card student">
          <span className="admin-role-info-icon">
            🎓
          </span>

          <div>
            <h3>Student</h3>
            <p>
              Can enroll in published courses, attend lectures,
              submit assignments, take quizzes, and use learning
              features.
            </p>
          </div>
        </div>

        <div className="admin-role-info-card instructor">
          <span className="admin-role-info-icon">
            👨‍🏫
          </span>

          <div>
            <h3>Instructor</h3>
            <p>
              Can create and manage courses, lectures,
              assignments, quizzes, resources, and students.
            </p>
          </div>
        </div>

        <div className="admin-role-info-card admin">
          <span className="admin-role-info-icon">
            🛡️
          </span>

          <div>
            <h3>Admin</h3>
            <p>
              Can manage users, roles, course approvals,
              and platform-level administration.
            </p>
          </div>
        </div>
      </section>

      {/* User role table */}
      <section className="admin-role-management-card">
        <div className="admin-role-card-header">
          <div>
            <h2>User Roles</h2>
            <p>
              Change the access level assigned to each account.
            </p>
          </div>

          <button
            type="button"
            className="admin-role-refresh-btn"
            onClick={loadUsers}
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="admin-role-filter-bar">
          <button
            type="button"
            className={
              filter === "all"
                ? "admin-role-filter active"
                : "admin-role-filter"
            }
            onClick={() => setFilter("all")}
          >
            All Users
          </button>

          <button
            type="button"
            className={
              filter === "student"
                ? "admin-role-filter active"
                : "admin-role-filter"
            }
            onClick={() => setFilter("student")}
          >
            Students
          </button>

          <button
            type="button"
            className={
              filter === "instructor"
                ? "admin-role-filter active"
                : "admin-role-filter"
            }
            onClick={() => setFilter("instructor")}
          >
            Instructors
          </button>

          <button
            type="button"
            className={
              filter === "admin"
                ? "admin-role-filter active"
                : "admin-role-filter"
            }
            onClick={() => setFilter("admin")}
          >
            Admins
          </button>
        </div>

        {loading ? (
          <div className="admin-role-state">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-role-empty">
            No users found for this role.
          </div>
        ) : (
          <div className="admin-role-table-wrapper">
            <table className="admin-role-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Account Status</th>
                  <th>Joined</th>
                  <th>Change Role</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {user.full_name ||
                          "Unnamed User"}
                      </strong>
                    </td>

                    <td>
                      <span className="admin-role-email">
                        {user.email}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`admin-role-badge ${
                          user.role || "student"
                        }`}
                      >
                        {user.role || "student"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`admin-role-status ${
                          user.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {user.is_active
                          ? "Active"
                          : "Suspended"}
                      </span>
                    </td>

                    <td>
                      {user.created_at
                        ? new Date(
                            user.created_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>
                      <select
                        className="admin-role-change-select"
                        value={user.role || "student"}
                        disabled={
                          processingId === user.id
                        }
                        onChange={(e) =>
                          updateRole(
                            user.id,
                            e.target.value
                          )
                        }
                      >
                        <option value="student">
                          Student
                        </option>

                        <option value="instructor">
                          Instructor
                        </option>

                        <option value="admin">
                          Admin
                        </option>
                      </select>
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

export default AdminRoles;