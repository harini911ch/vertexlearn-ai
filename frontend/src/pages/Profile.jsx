import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    full_name: "User",
    email: "",
    role: "student",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      const response = await axios.get(
       `${API_URL}/courses/profile/me`,
        {
          headers: getAuthHeaders(),
        }
      );

      const profile =
        response.data.user ||
        response.data.profile ||
        response.data;

      setUser({
        full_name:
          profile.full_name ||
          profile.name ||
          "User",

        email:
          profile.email ||
          "",

        role:
          profile.role ||
          "student",
      });
    } catch (error) {
      console.error("Failed to load profile:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to load profile information."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-avatar">
              U
            </div>

            <p className="profile-eyebrow">
              ACCOUNT PROFILE
            </p>

            <h1>Loading...</h1>

            <p className="profile-subtitle">
              Loading your VertexLearn AI profile
            </p>
          </div>
        </div>
      </div>
    );
  }
  const dashboardPath =
  user.role === "admin"
    ? "/admin"
    : user.role === "instructor"
    ? "/instructor"
    : "/dashboard";

  return (
    <div className="profile-page">
      <div className="profile-container">

        <button
          className="profile-back-button"
         onClick={() => navigate(dashboardPath)}
        >
          ← Back to Dashboard
        </button>

        {error && (
          <div className="profile-error">
            {error}
          </div>
        )}

        <div className="profile-card">

          <div className="profile-avatar">
            {user.full_name
              .charAt(0)
              .toUpperCase()}
          </div>

          <p className="profile-eyebrow">
            ACCOUNT PROFILE
          </p>

          <h1>{user.full_name}</h1>

          <p className="profile-subtitle">
            Your VertexLearn AI account information
          </p>

          <div className="profile-details">

            <div className="profile-detail">
              <span>Full Name</span>
              <strong>
                {user.full_name}
              </strong>
            </div>

            <div className="profile-detail">
              <span>Email</span>
              <strong>
                {user.email || "Not available"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>Role</span>
              <strong className="profile-role">
                {user.role
                  .charAt(0)
                  .toUpperCase() +
                  user.role.slice(1)}
              </strong>
            </div>

          </div>

          <button
            className="profile-dashboard-button"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>

        </div>
      </div>
    </div>
  );
}

export default Profile;