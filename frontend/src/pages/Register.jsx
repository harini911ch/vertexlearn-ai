import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Register.css";

const API_URL = "http://localhost:5000/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "student",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setMessage("");
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const fullName = formData.full_name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirm_password;

    if (!fullName || !email || !password || !confirmPassword) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API_URL}/auth/register`, {
        full_name: fullName,
        email,
        password,
        role: formData.role,
      });

      setSuccess(true);

      setFormData({
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
        role: "student",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Registration failed. Please try again.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vl-register-page">
      {/* Background bubbles */}
      <div className="vl-register-bubble vl-register-bubble-1"></div>
      <div className="vl-register-bubble vl-register-bubble-2"></div>
      <div className="vl-register-bubble vl-register-bubble-3"></div>
      <div className="vl-register-bubble vl-register-bubble-4"></div>
      <div className="vl-register-bubble vl-register-bubble-5"></div>

      <div className="vl-register-shell">
        {/* ================= LEFT PANEL ================= */}
        <section className="vl-register-left">
          <div className="vl-register-glow vl-register-glow-1"></div>
          <div className="vl-register-glow vl-register-glow-2"></div>

          <div className="vl-register-circle vl-register-circle-1"></div>
          <div className="vl-register-circle vl-register-circle-2"></div>

          <div className="vl-register-left-content">
            <div className="vl-register-badge">
              <span></span>
              JOIN VERTEXLEARN AI
            </div>

            <h1>Start learning smarter.</h1>

            <h2>Your AI-powered learning journey begins here.</h2>

            <p>
              Create your account and get access to courses, AI tutoring,
              smart assessments, personalized study plans, and progress
              tracking in one learning platform.
            </p>

            <div className="vl-register-features">
              <div className="vl-register-feature">
                <div className="vl-register-feature-icon">✦</div>
                <span>Learn with an AI-powered tutor</span>
              </div>

              <div className="vl-register-feature">
                <div className="vl-register-feature-icon">◆</div>
                <span>Follow personalized study plans</span>
              </div>

              <div className="vl-register-feature">
                <div className="vl-register-feature-icon">✓</div>
                <span>Practice with smart quizzes</span>
              </div>

              <div className="vl-register-feature">
                <div className="vl-register-feature-icon">↗</div>
                <span>Track your learning progress</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= RIGHT PANEL ================= */}
        <section className="vl-register-right">
          <div className="vl-register-right-decoration"></div>

          <div className="vl-register-form-container">
            <div className="vl-register-heading">
              <div className="vl-register-kicker">
                CREATE ACCOUNT
              </div>

              <h3>Get started</h3>

              <p>
                Create your VertexLearn AI account to continue.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="vl-register-form"
            >
              {message && (
                <div className="vl-register-message">
                  {message}
                </div>
              )}

              {success && (
                <div className="vl-register-success">
                  Account created successfully. Redirecting to login...
                </div>
              )}

              <div className="vl-register-input-group">
                <label htmlFor="full_name">Full name</label>

                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>

              <div className="vl-register-input-group">
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

              <div className="vl-register-input-row">
                <div className="vl-register-input-group">
                  <label htmlFor="password">Password</label>

                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="vl-register-input-group">
                  <label htmlFor="confirm_password">
                    Confirm password
                  </label>

                  <input
                    id="confirm_password"
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="vl-register-input-group">
                <label htmlFor="role">Account type</label>

                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="student">
                    Student
                  </option>

                  <option value="instructor">
                    Instructor
                  </option>
                </select>
              </div>

              <button
                type="submit"
                className="vl-register-button"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <span className="vl-register-spinner"></span>
                    Creating account...
                  </>
                ) : (
                  <>Create Account →</>
                )}
              </button>
            </form>

           <div className="vl-register-login">
  <span>Already have an account?</span>

  <button
    type="button"
    onClick={() => navigate("/")}
    className="vl-register-signin-button"
  >
    Sign in →
  </button>
</div>

<div className="vl-register-security">
  <span>🔒</span>
  Secure role-based access
</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Register;