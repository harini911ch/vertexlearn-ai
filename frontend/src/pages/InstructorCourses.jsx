import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./InstructorCourses.css";

const API_URL = "http://localhost:5000/api";

function InstructorCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "beginner",
    thumbnail_url: "",
    price: 0,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      const response = await axios.get(
        `${API_URL}/courses/instructor-courses`,
        {
          headers: getAuthHeaders(),
        }
      );

      const courseList =
        response.data?.courses ||
        response.data?.data?.courses ||
        [];

      setCourses(
        Array.isArray(courseList)
          ? courseList
          : []
      );
    } catch (error) {
      console.error(
        "Instructor courses error:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Failed to load your courses."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function openCourse(courseId) {
    navigate(`/instructor/course/${courseId}`);
  }

  async function createCourse(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setError("Course title is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const response = await axios.post(
        `${API_URL}/courses`,
        {
          title: formData.title.trim(),
          description:
            formData.description.trim() || null,
          category:
            formData.category.trim() || null,
          difficulty: formData.difficulty,
          thumbnail_url:
            formData.thumbnail_url.trim() || null,
          price:
            Number(formData.price) || 0,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data?.success) {
        const createdCourse = response.data.course;

        setMessage(
          "Course created successfully ✅"
        );

        setFormData({
          title: "",
          description: "",
          category: "",
          difficulty: "beginner",
          thumbnail_url: "",
          price: 0,
        });

        setShowCreateForm(false);

        await loadCourses();

        if (createdCourse?.id) {
          setTimeout(() => {
            navigate(
              `/instructor/course/${createdCourse.id}`
            );
          }, 500);
        }
      }
    } catch (error) {
      console.error(
        "Create course error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to create course."
      );
    } finally {
      setCreating(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  if (loading) {
    return (
      <div className="vl-instructor-courses-page">
        <div className="vl-instructor-loading">
          Loading your instructor workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="vl-instructor-courses-page">
      <div className="vl-instructor-bg vl-instructor-bg-1"></div>
      <div className="vl-instructor-bg vl-instructor-bg-2"></div>
      <div className="vl-instructor-bg vl-instructor-bg-3"></div>

      <header className="vl-instructor-topbar">
        <div className="vl-instructor-brand">
          <div className="vl-instructor-logo">
            ✦
          </div>

          <div>
            <strong>VertexLearn AI</strong>
            <span>Instructor workspace</span>
          </div>
        </div>

        <button
          className="vl-instructor-logout"
          onClick={logout}
        >
          Logout
        </button>
      </header>

      <main className="vl-instructor-main">
        <section className="vl-instructor-hero">
          <div>
            <span className="vl-instructor-kicker">
              INSTRUCTOR PORTAL
            </span>

            <h1>Choose your course</h1>

            <p>
              Manage your courses, create learning
              content, track learners, and build
              assessments from one place.
            </p>
          </div>

          <button
            className="vl-create-course-button"
            onClick={() => {
              setShowCreateForm((previous) => !previous);
              setError("");
              setMessage("");
            }}
          >
            {showCreateForm
              ? "Close"
              : "+ Create New Course"}
          </button>
        </section>

        {error && (
          <div className="vl-instructor-error">
            {error}
          </div>
        )}

        {message && (
          <div className="vl-instructor-success">
            {message}
          </div>
        )}

        {showCreateForm && (
          <section className="vl-create-course-card">
            <div className="vl-create-course-heading">
              <div>
                <span>NEW COURSE</span>
                <h2>Create a course</h2>
                <p>
                  Add the basic course information first.
                  You can manage modules and lectures after
                  creation.
                </p>
              </div>
            </div>

            <form onSubmit={createCourse}>
              <div className="vl-course-form-grid">
                <div className="vl-course-field full">
                  <label htmlFor="course-title">
                    Course title
                  </label>

                  <input
                    id="course-title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Example: Full Stack Java Development"
                  />
                </div>

                <div className="vl-course-field full">
                  <label htmlFor="course-description">
                    Description
                  </label>

                  <textarea
                    id="course-description"
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe what students will learn..."
                  />
                </div>

                <div className="vl-course-field">
                  <label htmlFor="course-category">
                    Category
                  </label>

                  <input
                    id="course-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Programming"
                  />
                </div>

                <div className="vl-course-field">
                  <label htmlFor="course-difficulty">
                    Difficulty
                  </label>

                  <select
                    id="course-difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                  >
                    <option value="beginner">
                      Beginner
                    </option>

                    <option value="intermediate">
                      Intermediate
                    </option>

                    <option value="advanced">
                      Advanced
                    </option>
                  </select>
                </div>

                <div className="vl-course-field">
                  <label htmlFor="course-price">
                    Price
                  </label>

                  <input
                    id="course-price"
                    name="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="vl-course-field">
                  <label htmlFor="course-thumbnail">
                    Thumbnail URL
                  </label>

                  <input
                    id="course-thumbnail"
                    name="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="vl-submit-course-button"
                disabled={creating}
              >
                {creating
                  ? "Creating Course..."
                  : "Create Course →"}
              </button>
            </form>
          </section>
        )}

        <section className="vl-courses-section">
          <div className="vl-courses-section-heading">
            <div>
              <span>YOUR COURSES</span>
              <h2>Course management</h2>
            </div>

            <strong>
              {courses.length}
            </strong>
          </div>

          {courses.length === 0 ? (
            <div className="vl-no-courses">
              <div className="vl-no-courses-icon">
                +
              </div>

              <h3>No courses yet</h3>

              <p>
                Create your first course to start adding
                modules, lectures, assignments, and quizzes.
              </p>

              <button
                onClick={() => setShowCreateForm(true)}
              >
                Create your first course →
              </button>
            </div>
          ) : (
            <div className="vl-course-grid">
              {courses.map((course) => (
                <button
                  key={course.id}
                  className="vl-course-card"
                  onClick={() =>
                    openCourse(course.id)
                  }
                >
                  <div className="vl-course-card-top">
                    <div className="vl-course-course-icon">
                      📘
                    </div>

                    <span
                      className={`vl-course-status ${
                        course.status ===
                        "published"
                          ? "published"
                          : "pending"
                      }`}
                    >
                      {course.status ||
                        "pending"}
                    </span>
                  </div>

                  <h3>
                    {course.title}
                  </h3>

                  <p>
                    {course.description ||
                      "No course description added yet."}
                  </p>

                  <div className="vl-course-meta">
                    <span>
                      📚{" "}
                      {course.module_count ??
                        0}{" "}
                      modules
                    </span>

                    <span>
                      🎥{" "}
                      {course.lecture_count ??
                        0}{" "}
                      lectures
                    </span>
                  </div>

                  <div className="vl-course-open">
                    Open course →
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default InstructorCourses;