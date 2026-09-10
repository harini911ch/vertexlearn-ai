import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";



const API_URL = "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!formData.email.trim() || !formData.password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email.trim(),
        password: formData.password,
      });

      const token = response.data?.token;
      const user = response.data?.user;

      if (!token) {
        throw new Error("Login token was not received.");
      }

      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      const role = user?.role?.toLowerCase();

      if (role === "instructor") {
        navigate("/instructor");
      } else if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Invalid email or password. Please try again.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vl-login-page">
      {/* Background bubbles */}
      <div className="vl-bubble vl-bubble-1"></div>
      <div className="vl-bubble vl-bubble-2"></div>
      <div className="vl-bubble vl-bubble-3"></div>
      <div className="vl-bubble vl-bubble-4"></div>
      <div className="vl-bubble vl-bubble-5"></div>

      <div className="vl-login-shell">
        {/* ================= LEFT PANEL ================= */}
        <section className="vl-login-left">
          {/* Decorative circles */}
          <div className="vl-left-glow vl-left-glow-1"></div>
          <div className="vl-left-glow vl-left-glow-2"></div>
          <div className="vl-left-circle vl-left-circle-1"></div>
          <div className="vl-left-circle vl-left-circle-2"></div>

          <div className="vl-left-content">
            <div className="vl-ai-badge">
              <span className="vl-badge-dot"></span>
              AI-POWERED LEARNING
            </div>

            <h1>VertexLearn AI</h1>

            <h2>Learn smarter with AI.</h2>

            <p className="vl-left-description">
              A smarter learning platform that combines courses,
              AI assistance, assessments, personalized study plans,
              and progress tracking in one place.
            </p>

            <div className="vl-feature-list">
              <div className="vl-feature">
                <div className="vl-feature-icon">✦</div>
                <span>Course-based AI tutor</span>
              </div>

              <div className="vl-feature">
                <div className="vl-feature-icon">◆</div>
                <span>Personalized study plans</span>
              </div>

              <div className="vl-feature">
                <div className="vl-feature-icon">✓</div>
                <span>Smart quizzes and answer review</span>
              </div>

              <div className="vl-feature">
                <div className="vl-feature-icon">↗</div>
                <span>Progress tracking and mastery</span>
              </div>

              <div className="vl-feature">
                <div className="vl-feature-icon">★</div>
                <span>Certificates and instructor tools</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= RIGHT PANEL ================= */}
        <section className="vl-login-right">
          <div className="vl-right-decoration"></div>

          <div className="vl-login-form-container">
            <div className="vl-form-heading">
              <div className="vl-form-kicker">WELCOME BACK</div>

              <h3>Sign in</h3>

              <p>
                Continue your learning journey with VertexLearn AI.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="vl-login-form">
              {message && (
                <div className="vl-login-message">
                  {message}
                </div>
              )}

              <div className="vl-input-group">
                <label htmlFor="email">Email address</label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>

              <div className="vl-input-group">
                <label htmlFor="password">Password</label>

                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="vl-login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="vl-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>Sign In →</>
                )}
              </button>
            </form>

            <div className="vl-create-account">
              <span>New to VertexLearn?</span>

              <Link to="/register" state={{ from: location }}>
                Create an account →
              </Link>
            </div>

            <div className="vl-security-text">
              <span>🔒</span>
              Secure role-based access
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;