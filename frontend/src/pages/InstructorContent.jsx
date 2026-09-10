import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios, {
  API_URL,
  getAuthHeaders,
} from "../services/api";

import "./InstructorContent.css";

function InstructorContent() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const resourceFormRef = useRef(null);
  const videoFormRef = useRef(null);
  const moduleFormRef = useRef(null);

  // ==========================================================
  // COURSE
  // ==========================================================

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================================
  // MODULE
  // ==========================================================

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);

  // ==========================================================
  // VIDEO
  // ==========================================================

  const [videoModuleId, setVideoModuleId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoOrder, setVideoOrder] = useState(1);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // ==========================================================
  // RESOURCE
  // ==========================================================

  const [resourceModuleId, setResourceModuleId] = useState("");
  const [resourceLectureId, setResourceLectureId] = useState("");
  const [resourceFile, setResourceFile] = useState(null);
  const [uploadingResource, setUploadingResource] =
    useState(false);

  // ==========================================================
  // DELETE RESOURCE
  // ==========================================================

  const [deletingResource, setDeletingResource] = useState("");

  // ==========================================================
  // LOAD COURSE
  // ==========================================================

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

async function loadCourse() {
  try {
    setLoading(true);
    setError("");

    // 1. Load course information
    const courseResponse = await axios.get(
      `${API_URL}/courses/${courseId}`,
      {
        headers: getAuthHeaders(),
      }
    );

    const courseData = courseResponse.data || {};

    const loadedCourse =
      courseData.course ||
      courseData.data?.course ||
      courseData;

    setCourse(loadedCourse || null);

    // 2. Load modules separately
    const modulesResponse = await axios.get(
      `${API_URL}/courses/${courseId}/modules`,
      {
        headers: getAuthHeaders(),
      }
    );

    const loadedModules =
      modulesResponse.data?.modules ||
      modulesResponse.data?.data?.modules ||
      [];

    // 3. Load lectures for every module
    const modulesWithLectures = await Promise.all(
      (Array.isArray(loadedModules)
        ? loadedModules
        : []
      ).map(async (module) => {
        try {
          const lecturesResponse =
            await axios.get(
              `${API_URL}/courses/modules/${module.id}/lectures`,
              {
                headers: getAuthHeaders(),
              }
            );

          return {
            ...module,
            lectures:
              lecturesResponse.data?.lectures ||
              lecturesResponse.data?.data?.lectures ||
              [],
          };
        } catch (lectureError) {
          console.error(
            `Failed to load lectures for module ${module.id}:`,
            lectureError
          );

          return {
            ...module,
            lectures: [],
          };
        }
      })
    );

    // 4. Save complete module → lecture → resource structure
    setModules(
      modulesWithLectures.map((module) => ({
        ...module,
        lectures: Array.isArray(module.lectures)
          ? [...module.lectures].sort(
              (a, b) =>
                (Number(a.order_index) || 0) -
                (Number(b.order_index) || 0)
            )
          : [],
      }))
    );
  } catch (err) {
    console.error(
      "Instructor content load error:",
      err
    );

    setError(
      err.response?.data?.message ||
        "Failed to load course content."
    );
  } finally {
    setLoading(false);
  }
}

  // ==========================================================
  // SCROLL HELPERS
  // ==========================================================

  function scrollToElement(ref) {
    setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }

  // ==========================================================
  // MODULE FORM
  // ==========================================================

  function openModuleForm() {
    setMessage("");
    setError("");
    setShowModuleForm(true);
    scrollToElement(moduleFormRef);
  }

  function closeModuleForm() {
    setShowModuleForm(false);
    setModuleTitle("");
  }

  async function createModule(event) {
    event.preventDefault();

    if (!moduleTitle.trim()) {
      setMessage("Module title is required.");
      return;
    }

    try {
      setCreatingModule(true);
      setMessage("");
      setError("");

      const nextOrder =
        modules.length > 0
          ? Math.max(
              ...modules.map(
                (module) =>
                  Number(module.order_index) || 0
              )
            ) + 1
          : 1;

      const response = await axios.post(
        `${API_URL}/courses/${courseId}/modules`,
        {
          title: moduleTitle.trim(),
          order_index: nextOrder,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data?.success) {
        setMessage(
          "Module created successfully ✅"
        );

        closeModuleForm();

        await loadCourse();
      } else {
        setMessage(
          response.data?.message ||
            "Failed to create module."
        );
      }
    } catch (err) {
      console.error(
        "Create module error:",
        err
      );

      setMessage(
        err.response?.data?.message ||
          "Failed to create module."
      );
    } finally {
      setCreatingModule(false);
    }
  }

  // ==========================================================
  // VIDEO FORM
  // ==========================================================

  function openVideoUpload(moduleId) {
    setMessage("");
    setError("");

    setVideoModuleId(moduleId);
    setVideoTitle("");
    setVideoOrder(1);
    setVideoFile(null);

    scrollToElement(videoFormRef);
  }

  function closeVideoForm() {
    setVideoModuleId("");
    setVideoTitle("");
    setVideoOrder(1);
    setVideoFile(null);
  }

  async function uploadVideo(event) {
    event.preventDefault();

    if (!videoModuleId) {
      setMessage("Please select a module.");
      return;
    }

    if (!videoTitle.trim()) {
      setMessage("Lecture title is required.");
      return;
    }

    if (!videoFile) {
      setMessage("Please select a video file.");
      return;
    }

    try {
      setUploadingVideo(true);
      setMessage("");
      setError("");

      const formData = new FormData();

      formData.append(
        "title",
        videoTitle.trim()
      );

      formData.append(
        "order_index",
        String(Number(videoOrder) || 1)
      );

      formData.append(
        "video",
        videoFile
      );

      const response = await axios.post(
        `${API_URL}/courses/modules/${videoModuleId}/lectures/upload`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          "Video lecture uploaded successfully ✅"
        );

        closeVideoForm();

        await loadCourse();
      } else {
        setMessage(
          response.data?.message ||
            "Failed to upload video."
        );
      }
    } catch (err) {
      console.error(
        "Video upload error:",
        err
      );

      setMessage(
        err.response?.data?.message ||
          "Failed to upload video."
      );
    } finally {
      setUploadingVideo(false);
    }
  }

  // ==========================================================
  // RESOURCE FORM
  // ==========================================================

  function openResourceUpload(
    moduleId,
    lectureId
  ) {
    setMessage("");
    setError("");

    setResourceModuleId(moduleId);
    setResourceLectureId(lectureId);
    setResourceFile(null);

    scrollToElement(resourceFormRef);
  }

  function closeResourceForm() {
    setResourceModuleId("");
    setResourceLectureId("");
    setResourceFile(null);
  }

  async function uploadResource(event) {
    event.preventDefault();

    if (!resourceModuleId || !resourceLectureId) {
      setMessage(
        "Please select a lecture first."
      );
      return;
    }

    if (!resourceFile) {
      setMessage(
        "Please select a PDF, PPT or PPTX file."
      );
      return;
    }

    const fileName =
      resourceFile.name.toLowerCase();

    const allowed =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".ppt") ||
      fileName.endsWith(".pptx");

    if (!allowed) {
      setMessage(
        "Only PDF, PPT and PPTX files are allowed."
      );
      return;
    }

    try {
      setUploadingResource(true);
      setMessage("");
      setError("");

      const formData = new FormData();

      formData.append(
        "file",
        resourceFile
      );

      const response = await axios.post(
        `${API_URL}/courses/modules/${resourceModuleId}/lectures/${resourceLectureId}/resources/upload`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          "Lecture resource uploaded successfully ✅"
        );

        closeResourceForm();

        await loadCourse();
      } else {
        setMessage(
          response.data?.message ||
            "Failed to upload resource."
        );
      }
    } catch (err) {
      console.error(
        "Resource upload error:",
        err
      );

      setMessage(
        err.response?.data?.message ||
          "Failed to upload resource."
      );
    } finally {
      setUploadingResource(false);
    }
  }

  // ==========================================================
  // DELETE RESOURCE
  // ==========================================================

  async function deleteResource(
    moduleId,
    lectureId,
    resourceUrl
  ) {
    const confirmed =
      window.confirm(
        "Remove this resource from the lecture?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingResource(resourceUrl);
      setMessage("");
      setError("");

      const response = await axios.delete(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/resources`,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type":
              "application/json",
          },
          data: {
            resource_url:
              resourceUrl,
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          "Resource removed successfully ✅"
        );

        await loadCourse();
      } else {
        setMessage(
          response.data?.message ||
            "Failed to remove resource."
        );
      }
    } catch (err) {
      console.error(
        "Delete resource error:",
        err
      );

      setMessage(
        err.response?.data?.message ||
          "Failed to remove resource."
      );
    } finally {
      setDeletingResource("");
    }
  }

  // ==========================================================
  // URL HELPERS
  // ==========================================================

  function getResourceUrl(url) {
    if (!url) return "";

    return url.startsWith("http")
      ? url
      : `http://localhost:5000${url}`;
  }

  function getResourceName(
    url,
    index
  ) {
    try {
      const name =
        url?.split("/")?.pop();

      return name
        ? decodeURIComponent(name)
        : `Resource ${index + 1}`;
    } catch {
      return `Resource ${index + 1}`;
    }
  }

  function getResourceIcon(url) {
    const lower =
      String(url || "").toLowerCase();

    if (lower.endsWith(".pdf")) {
      return "📕";
    }

    if (
      lower.endsWith(".ppt") ||
      lower.endsWith(".pptx")
    ) {
      return "📊";
    }

    return "📄";
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="content-manager-page">
        <div className="content-loading-card">
          <div className="loading-orb">✦</div>
          <h2>Loading course content...</h2>
          <p>
            Preparing your modules and lectures.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (!course) {
    return (
      <div className="content-manager-page">
        <header className="content-topbar">
          <div className="content-brand">
            <div className="content-brand-icon">
              ✦
            </div>

            <div>
              <strong>
                VertexLearn AI
              </strong>

              <span>
                Instructor Studio
              </span>
            </div>
          </div>

          <button
            className="content-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="content-container">
          <div className="empty-content-card">
            <div className="empty-content-icon">
              ⚠️
            </div>

            <h2>
              Course could not be loaded
            </h2>

            <p>
              {error ||
                "Something went wrong while loading the course."}
            </p>

            <button
              className="content-primary-btn"
              onClick={loadCourse}
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="content-manager-page">
      {/* ======================================================
          BACKGROUND DECOR
          ====================================================== */}

      <div className="content-bg-glow glow-one" />
      <div className="content-bg-glow glow-two" />
      <div className="content-bg-grid" />

      {/* ======================================================
          TOP BAR
          ====================================================== */}

      <header className="content-topbar">
        <div className="content-brand">
          <div className="content-brand-icon">
            ✦
          </div>

          <div className="content-brand-copy">
            <strong>
              VertexLearn AI
            </strong>

            <span>
              Instructor Studio
            </span>
          </div>
        </div>

        <div className="content-topbar-actions">
          <button
            className="content-dashboard-btn"
            onClick={() =>
              navigate("/instructor")
            }
          >
            ← Dashboard
          </button>

          <button
            className="content-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="content-container">
        {/* ====================================================
            HERO
            ==================================================== */}

        <section className="content-hero">
          <div className="hero-left">
            <span className="hero-kicker">
              COURSE CONTENT
            </span>

            <h1>
              {course.title ||
                "Course Content"}
            </h1>

            <p>
              Build your course one module at a
              time. Add video lessons and attach
              PDF or slide resources directly to
              each lecture.
            </p>

            <div className="hero-stats">
              <div className="hero-stat">
                <strong>
                  {modules.length}
                </strong>

                <span>Modules</span>
              </div>

              <div className="hero-stat">
                <strong>
                  {modules.reduce(
                    (total, module) =>
                      total +
                      (Array.isArray(
                        module.lectures
                      )
                        ? module.lectures.length
                        : 0),
                    0
                  )}
                </strong>

                <span>Lectures</span>
              </div>

              <div className="hero-stat">
                <strong>
                  {modules.reduce(
                    (total, module) =>
                      total +
                      (module.lectures || []).reduce(
                        (
                          count,
                          lecture
                        ) =>
                          count +
                          (Array.isArray(
                            lecture.resource_urls
                          )
                            ? lecture.resource_urls
                                .length
                            : 0),
                        0
                      ),
                    0
                  )}
                </strong>

                <span>Resources</span>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-visual-card">
              <div className="hero-visual-icon">
                📚
              </div>

              <strong>
                Learning materials
              </strong>

              <span>
                Videos · PDFs · Slides
              </span>
            </div>
          </div>
        </section>

        {/* ====================================================
            GLOBAL MESSAGE
            ==================================================== */}

        {(message || error) && (
          <div
            className={`content-message ${
              error && !message
                ? "error"
                : "success"
            }`}
          >
            <span>
              {error && !message
                ? "⚠️"
                : "✓"}
            </span>

            <div>
              {message || error}
            </div>
          </div>
        )}

        {/* ====================================================
            ADD MODULE BUTTON
            ==================================================== */}

        <div className="curriculum-toolbar">
          <div>
            <span>
              CURRICULUM
            </span>

            <h2>
              Course Modules
            </h2>

            <p>
              Everything students will see
              inside this course.
            </p>
          </div>

          <button
            className="content-primary-btn"
            onClick={openModuleForm}
          >
            + Add Module
          </button>
        </div>

        {/* ====================================================
            MODULE FORM
            ==================================================== */}

        {showModuleForm && (
          <section
            ref={moduleFormRef}
            className="floating-form-card"
          >
            <div className="floating-form-head">
              <div>
                <span>
                  NEW MODULE
                </span>

                <h3>
                  Create a course module
                </h3>
              </div>

              <button
                type="button"
                onClick={
                  closeModuleForm
                }
                className="form-close-btn"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={createModule}
              className="floating-form-body"
            >
              <label>
                Module title
              </label>

              <input
                value={moduleTitle}
                onChange={(event) =>
                  setModuleTitle(
                    event.target.value
                  )
                }
                placeholder="Example: Java Fundamentals"
                required
              />

              <div className="form-actions">
                <button
                  type="button"
                  className="content-secondary-btn"
                  onClick={
                    closeModuleForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="content-primary-btn"
                  disabled={
                    creatingModule
                  }
                >
                  {creatingModule
                    ? "Creating..."
                    : "Create Module"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ====================================================
            VIDEO FORM
            ==================================================== */}

        {videoModuleId && (
          <section
            ref={videoFormRef}
            className="floating-form-card video-upload-card"
          >
            <div className="floating-form-head">
              <div>
                <span>
                  NEW LECTURE
                </span>

                <h3>
                  Upload a video lesson
                </h3>

                <p>
                  Add a video lecture to the
                  selected module.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeVideoForm
                }
                className="form-close-btn"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={uploadVideo}
              className="floating-form-body"
            >
              <div className="form-two-column">
                <div>
                  <label>
                    Lecture title
                  </label>

                  <input
                    value={videoTitle}
                    onChange={(event) =>
                      setVideoTitle(
                        event.target.value
                      )
                    }
                    placeholder="Example: Introduction to OOP"
                    required
                  />
                </div>

                <div>
                  <label>
                    Lecture order
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={videoOrder}
                    onChange={(event) =>
                      setVideoOrder(
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <label>
                Video file
              </label>

              <div className="file-drop-zone">
                <div className="file-drop-icon">
                  🎥
                </div>

                <div>
                  <strong>
                    {videoFile
                      ? videoFile.name
                      : "Choose video file"}
                  </strong>

                  <span>
                    Select your lecture video
                  </span>
                </div>

                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) =>
                    setVideoFile(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="content-secondary-btn"
                  onClick={
                    closeVideoForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="content-primary-btn"
                  disabled={
                    uploadingVideo
                  }
                >
                  {uploadingVideo
                    ? "Uploading..."
                    : "Upload Video"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ====================================================
            RESOURCE FORM
            ==================================================== */}

        {resourceLectureId && (
          <section
            ref={resourceFormRef}
            className="floating-form-card resource-upload-card"
          >
            <div className="resource-form-accent" />

            <div className="floating-form-head">
              <div>
                <div className="resource-form-kicker">
                  <span className="resource-form-icon">
                    📎
                  </span>

                  LECTURE MATERIAL
                </div>

                <h3>
                  Add PDF or slide resources
                </h3>

                <p>
                  This material will appear directly
                  under the lecture you selected.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeResourceForm
                }
                className="form-close-btn"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={uploadResource}
              className="floating-form-body"
            >
              <label>
                Resource file
              </label>

              <div className="resource-drop-zone">
                <div className="resource-type-icons">
                  <span>📕</span>
                  <span>📊</span>
                  <span>📄</span>
                </div>

                <strong>
                  {resourceFile
                    ? resourceFile.name
                    : "Choose your learning material"}
                </strong>

                <span>
                  PDF, PPT or PPTX · Maximum 25 MB
                </span>

                <label className="choose-file-btn">
                  {resourceFile
                    ? "Change File"
                    : "Choose File"}

                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(event) =>
                      setResourceFile(
                        event.target.files?.[0] ||
                          null
                      )
                    }
                    required
                  />
                </label>
              </div>

              {resourceFile && (
                <div className="selected-resource">
                  <div className="selected-resource-icon">
                    {getResourceIcon(
                      resourceFile.name
                    )}
                  </div>

                  <div>
                    <strong>
                      {resourceFile.name}
                    </strong>

                    <span>
                      Ready to upload
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setResourceFile(
                        null
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="content-secondary-btn"
                  onClick={
                    closeResourceForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="content-resource-btn"
                  disabled={
                    uploadingResource
                  }
                >
                  {uploadingResource
                    ? "Uploading..."
                    : "Upload Resource"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ====================================================
            MODULE LIST
            ==================================================== */}

        {modules.length === 0 ? (
          <section className="empty-content-card">
            <div className="empty-content-icon">
              📚
            </div>

            <h2>
              Your course is empty
            </h2>

            <p>
              Create your first module and start
              adding lecture videos and supporting
              materials.
            </p>

            <button
              className="content-primary-btn"
              onClick={openModuleForm}
            >
              + Create First Module
            </button>
          </section>
        ) : (
          <div className="module-list">
            {modules.map(
              (module, moduleIndex) => {
                const lectures =
                  Array.isArray(
                    module.lectures
                  )
                    ? module.lectures
                    : [];

                return (
                  <section
                    key={
                      module.id ||
                      moduleIndex
                    }
                    className="module-card"
                  >
                    {/* MODULE HEADER */}

                    <div className="module-header">
                      <div className="module-number">
                        {String(
                          module.order_index ||
                            moduleIndex + 1
                        ).padStart(2, "0")}
                      </div>

                      <div className="module-heading">
                        <span>
                          MODULE{" "}
                          {module.order_index ||
                            moduleIndex + 1}
                        </span>

                        <h3>
                          {module.title}
                        </h3>

                        <p>
                          {lectures.length}{" "}
                          lecture
                          {lectures.length ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <button
                        className="module-add-btn"
                        onClick={() =>
                          openVideoUpload(
                            module.id
                          )
                        }
                      >
                        <span>
                          +
                        </span>

                        Add Lecture
                      </button>
                    </div>

                    {/* LECTURES */}

                    {lectures.length === 0 ? (
                      <div className="module-empty">
                        <div>
                          🎥
                        </div>

                        <div>
                          <strong>
                            No lectures yet
                          </strong>

                          <span>
                            Add a video lesson to
                            get started.
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            openVideoUpload(
                              module.id
                            )
                          }
                        >
                          Add Lecture →
                        </button>
                      </div>
                    ) : (
                      <div className="lecture-list">
                        {lectures.map(
                          (
                            lecture,
                            lectureIndex
                          ) => {
                            const resources =
                              Array.isArray(
                                lecture.resource_urls
                              )
                                ? lecture.resource_urls
                                : [];

                            const videoUrl =
                              lecture.video_url
                                ? lecture.video_url.startsWith(
                                    "http"
                                  )
                                  ? lecture.video_url
                                  : `http://localhost:5000${lecture.video_url}`
                                : "";

                            return (
                              <article
                                key={
                                  lecture.id ||
                                  lectureIndex
                                }
                                className="lecture-card"
                              >
                                <div className="lecture-main">
                                  <div className="lecture-icon">
                                    ▶
                                  </div>

                                  <div className="lecture-info">
                                    <div className="lecture-meta">
                                      <span>
                                        LESSON{" "}
                                        {lecture.order_index ||
                                          lectureIndex +
                                            1}
                                      </span>

                                      {lecture.duration_seconds ? (
                                        <>
                                          <i />
                                          <span>
                                            {Math.floor(
                                              Number(
                                                lecture.duration_seconds
                                              ) /
                                                60
                                            )}
                                            :
                                            {String(
                                              Number(
                                                lecture.duration_seconds
                                              ) %
                                                60
                                            ).padStart(
                                              2,
                                              "0"
                                            )}
                                          </span>
                                        </>
                                      ) : null}
                                    </div>

                                    <h4>
                                      {lecture.title}
                                    </h4>

                                    {videoUrl && (
                                      <a
                                        href={
                                          videoUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="watch-video-link"
                                      >
                                        Watch video
                                        ↗
                                      </a>
                                    )}
                                  </div>

                                  <button
                                    className="lecture-resource-button"
                                    onClick={() =>
                                      openResourceUpload(
                                        module.id,
                                        lecture.id
                                      )
                                    }
                                  >
                                    📎
                                    <span>
                                      Add PDF / Slides
                                    </span>
                                  </button>
                                </div>

                                {/* RESOURCE AREA */}

                                <div className="lecture-resources">
                                  <div className="resources-heading">
                                    <div>
                                      <span className="resources-heading-icon">
                                        📚
                                      </span>

                                      <div>
                                        <strong>
                                          Learning Resources
                                        </strong>

                                        <span>
                                          Supporting material
                                          for this lecture
                                        </span>
                                      </div>
                                    </div>

                                    <span className="resource-count">
                                      {resources.length}{" "}
                                      {resources.length ===
                                      1
                                        ? "file"
                                        : "files"}
                                    </span>
                                  </div>

                                  {resources.length ===
                                  0 ? (
                                    <div className="no-resources">
                                      <span>
                                        No PDFs or slides
                                        attached yet.
                                      </span>

                                      <button
                                        onClick={() =>
                                          openResourceUpload(
                                            module.id,
                                            lecture.id
                                          )
                                        }
                                      >
                                        Add one →
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="resource-list">
                                      {resources.map(
                                        (
                                          resourceUrl,
                                          index
                                        ) => {
                                          const url =
                                            getResourceUrl(
                                              resourceUrl
                                            );

                                          const fileName =
                                            getResourceName(
                                              resourceUrl,
                                              index
                                            );

                                          return (
                                            <div
                                              key={
                                                resourceUrl
                                              }
                                              className="resource-item"
                                            >
                                              <div className="resource-item-left">
                                                <div className="resource-file-icon">
                                                  {getResourceIcon(
                                                    fileName
                                                  )}
                                                </div>

                                                <div className="resource-file-info">
                                                  <strong>
                                                    {
                                                      fileName
                                                    }
                                                  </strong>

                                                  <span>
                                                    Lecture
                                                    resource
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="resource-item-actions">
                                                <a
                                                  href={
                                                    url
                                                  }
                                                  target="_blank"
                                                  rel="noreferrer"
                                                >
                                                  Open ↗
                                                </a>

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    deleteResource(
                                                      module.id,
                                                      lecture.id,
                                                      resourceUrl
                                                    )
                                                  }
                                                  disabled={
                                                    deletingResource ===
                                                    resourceUrl
                                                  }
                                                >
                                                  {deletingResource ===
                                                  resourceUrl
                                                    ? "Removing..."
                                                    : "Remove"}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              </article>
                            );
                          }
                        )}
                      </div>
                    )}
                  </section>
                );
              }
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default InstructorContent;