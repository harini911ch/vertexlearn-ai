import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/AdminUsers.css";
import axios, { API_URL, getAuthHeaders } from "../services/api";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: getAuthHeaders(),
      });

      setUsers(response.data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(
        err.response?.data?.message || "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(
        `${API_URL}/admin/users/${userId}/status`,
        {
          is_active: !currentStatus,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      await loadUsers();
    } catch (err) {
      console.error("Failed to update user status:", err);
      alert(
        err.response?.data?.message ||
          "Failed to update user status."
      );
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      await axios.patch(
        `${API_URL}/admin/users/${userId}/role`,
        {
          role: newRole,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      await loadUsers();
    } catch (err) {
      console.error("Failed to update role:", err);
      alert(
        err.response?.data?.message ||
          "Failed to update user role."
      );
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">ADMIN CONTROL</p>
          <h1>User Management</h1>
          <p className="admin-page-subtitle">
            View users, manage account access, and assign roles.
          </p>
        </div>

        <button
          className="admin-secondary-btn"
          onClick={() => navigate("/admin")}
        >
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="admin-error-box">
          {error}
        </div>
      )}

      <section className="admin-management-card">
        <div className="admin-management-heading">
          <div>
            <h2>All Users</h2>
            <p>
              {users.length} account{users.length !== 1 ? "s" : ""}
              {" "}found
            </p>
          </div>

          <button
            className="admin-refresh-btn"
            onClick={loadUsers}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="admin-loading-state">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            No users found.
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                     <strong>
  {user.full_name || "Unnamed User"}
</strong>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <select
                        className="admin-role-select"
                        value={user.role}
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

                    <td>
                      <span
                        className={`admin-status ${
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
                      <button
                        className={`admin-action-btn ${
                          user.is_active
                            ? "danger"
                            : "success"
                        }`}
                        onClick={() =>
                          updateStatus(
                            user.id,
                            user.is_active
                          )
                        }
                      >
                        {user.is_active
                          ? "Suspend"
                          : "Activate"}
                      </button>
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

export default AdminUsers;