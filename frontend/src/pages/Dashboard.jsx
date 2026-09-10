import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./Dashboard.css";

function formatTimestamp(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function Dashboard() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [error, setError] = useState("");
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    const loadCourses = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/courses/my-courses`,
          {
            headers: getAuthHeaders(),
          }
        );

        setCourses(response.data.courses || []);
      } catch (error) {
        console.error("Dashboard courses error:", error);

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to load your courses."
        );
      } finally {
        setLoading(false);
      }
    };

    const loadNotes = async () => {
      try {
        setNotesLoading(true);
        setNotesError("");

        const response = await axios.get(
          `${API_URL}/courses/notes/me`,
          {
            headers: getAuthHeaders(),
          }
        );

        setNotes(response.data.notes || []);
      } catch (error) {
        console.error("Dashboard notes error:", error);

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }

        setNotesError(
          error.response?.data?.message ||
            "Unable to load your notes."
        );
      } finally {
        setNotesLoading(false);
      }
    };

    loadCourses();
    loadNotes();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const totalCourses = courses.length;

  const completedCourses = useMemo(() => {
    return courses.filter(
      (course) =>
        course.enrollment_status === "completed" ||
        Number(course.progress_percent || 0) >= 100
    ).length;
  }, [courses]);

  const overallProgress = useMemo(() => {
    if (courses.length === 0) {
      return 0;
    }

    const totalProgress = courses.reduce(
      (sum, course) =>
        sum + Number(course.progress_percent || 0),
      0
    );

    return Math.round(totalProgress / courses.length);
  }, [courses]);

  const continueCourse = useMemo(() => {
    if (courses.length === 0) {
      return null;
    }

    const incompleteCourses = courses.filter(
      (course) =>
        Number(course.progress_percent || 0) < 100 &&
        course.enrollment_status !== "completed"
    );

    if (incompleteCourses.length === 0) {
      return courses[0];
    }

    return incompleteCourses.reduce((current, course) => {
      if (!current) {
        return course;
      }

      return Number(course.progress_percent || 0) >
        Number(current.progress_percent || 0)
        ? course
        : current;
    }, null);
  }, [courses]);

  const groupedNotes = useMemo(() => {
    const courseMap = new Map();

    notes.forEach((note) => {
      if (!courseMap.has(note.course_id)) {
        courseMap.set(note.course_id, {
          course_id: note.course_id,
          course_title:
            note.course_title || "Untitled Course",
          modules: new Map(),
        });
      }

      const courseGroup = courseMap.get(note.course_id);

      if (!courseGroup.modules.has(note.module_id)) {
        courseGroup.modules.set(note.module_id, {
          module_id: note.module_id,
          module_title:
            note.module_title || "Untitled Module",
          lectures: new Map(),
        });
      }

      const moduleGroup = courseGroup.modules.get(
        note.module_id
      );

      if (!moduleGroup.lectures.has(note.lecture_id)) {
        moduleGroup.lectures.set(note.lecture_id, {
          lecture_id: note.lecture_id,
          lecture_title:
            note.lecture_title || "Untitled Lecture",
          notes: [],
        });
      }

      moduleGroup.lectures
        .get(note.lecture_id)
        .notes.push(note);
    });

    return Array.from(courseMap.values()).map(
      (courseGroup) => ({
        ...courseGroup,
        modules: Array.from(
          courseGroup.modules.values()
        ).map((moduleGroup) => ({
          ...moduleGroup,
          lectures: Array.from(
            moduleGroup.lectures.values()
          ),
        })),
      })
    );
  }, [notes]);

  const scrollTo = (id) => {
    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleNotesClick = () => {
    scrollTo("my-notes");
  };

  const handleCoursesClick = () => {
    scrollTo("my-courses");
  };

  const handleNoteOpen = (note) => {
    const timestamp = Math.max(
      0,
      Math.floor(Number(note.timestamp_seconds) || 0)
    );

    const query = new URLSearchParams();

    if (note.course_id) {
      query.set("courseId", note.course_id);
    }

    if (note.module_id) {
      query.set("moduleId", note.module_id);
    }

    query.set("t", timestamp);

    navigate(
      `/lecture/${note.lecture_id}?${query.toString()}`
    );
  };

  if (loading) {
    return (
      <div className="student-dashboard-page">
        <div className="student-background">
          <span className="dashboard-bubble bubble-1"></span>
          <span className="dashboard-bubble bubble-2"></span>
          <span className="dashboard-bubble bubble-3"></span>
          <span className="dashboard-bubble bubble-4"></span>
        </div>

        <header className="student-dashboard-header">
          <div className="student-brand">
            <div className="student-brand-mark">✦</div>

            <div className="student-brand-text">
              <strong>VertexLearn AI</strong>
              <span>AI-powered learning platform</span>
            </div>
          </div>
        </header>

        <main className="student-dashboard-container">
          <div className="student-dashboard-loading">
            <div className="student-dashboard-spinner"></div>
            <h3>Loading your learning space...</h3>
            <p>Please wait a moment.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="student-dashboard-page">
      <div className="student-background" aria-hidden="true">
        <span className="dashboard-bubble bubble-1"></span>
        <span className="dashboard-bubble bubble-2"></span>
        <span className="dashboard-bubble bubble-3"></span>
        <span className="dashboard-bubble bubble-4"></span>
        <span className="dashboard-bubble bubble-5"></span>
        <span className="dashboard-bubble bubble-6"></span>
        <span className="dashboard-bubble bubble-7"></span>
      </div>

      <header className="student-dashboard-header">
        <div className="student-brand">
          <div className="student-brand-mark">✦</div>

          <div className="student-brand-text">
            <strong>VertexLearn AI</strong>
            <span>AI-powered learning platform</span>
          </div>
        </div>

        <div className="student-header-actions">
          <button
            type="button"
            className="student-dashboard-button"
            onClick={() => scrollTo("dashboard-top")}
          >
            Dashboard
          </button>

          <button
            type="button"
            className="student-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main
        id="dashboard-top"
        className="student-dashboard-container"
      >
        {/* HERO */}
        <section className="student-dashboard-hero dashboard-reveal hero-delay">
          <div className="hero-glow hero-glow-one"></div>
          <div className="hero-glow hero-glow-two"></div>

          <div className="student-dashboard-hero-copy">
            <span className="student-dashboard-label">
              STUDENT DASHBOARD
            </span>

            <h1>
              Welcome back <span className="wave">👋</span>
            </h1>

            <p>
              Keep learning, keep growing, and let AI
              help you understand concepts faster.
            </p>

            {continueCourse && (
              <div className="student-current-course">
                <span>CURRENT COURSE</span>

                <strong>{continueCourse.title}</strong>
              </div>
            )}
          </div>

          <div className="student-dashboard-hero-progress">
            <div
              className="student-progress-circle"
              style={{
                "--progress": `${Math.min(
                  overallProgress,
                  100
                ) * 3.6}deg`,
              }}
            >
              <div>
                <strong>{overallProgress}%</strong>
                <span>Overall progress</span>
              </div>
            </div>

            <p>Keep moving forward.</p>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="student-dashboard-error dashboard-reveal">
            <div>
              <strong>Something went wrong</strong>
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        )}

        {/* CONTINUE LEARNING */}
        {continueCourse && (
          <section className="student-continue-card dashboard-reveal section-delay-1">
            <div className="continue-decoration"></div>

            <div className="student-continue-main">
              <span className="student-dashboard-label light">
                CONTINUE LEARNING
              </span>

              <h2>{continueCourse.title}</h2>

              <p>
                {continueCourse.description ||
                  "Continue learning from where you left off."}
              </p>

              <div className="student-continue-progress">
                <div className="student-progress-row">
                  <span>Your progress</span>

                  <strong>
                    {Math.min(
                      Number(
                        continueCourse.progress_percent || 0
                      ),
                      100
                    ).toFixed(0)}
                    %
                  </strong>
                </div>

                <div className="student-progress-track">
                  <div
                    className="student-progress-fill"
                    style={{
                      width: `${Math.min(
                        Number(
                          continueCourse.progress_percent || 0
                        ),
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <button
                type="button"
                className="student-primary-button"
                onClick={() =>
                  navigate(
                    `/course/${continueCourse.course_id}`
                  )
                }
              >
                Continue Learning
                <span>→</span>
              </button>
            </div>

            <div className="student-continue-side">
              <div className="student-continue-icon">🎓</div>

              <span>LEARNING STATUS</span>

              <strong>
                {Number(
                  continueCourse.progress_percent || 0
                ) >= 100
                  ? "Course completed"
                  : "In progress"}
              </strong>
            </div>
          </section>
        )}

        {/* OVERVIEW */}
        <section className="student-overview-section">
          <div className="student-section-heading dashboard-reveal section-delay-2">
            <span className="student-dashboard-label">
              OVERVIEW
            </span>

            <h2>Your learning at a glance</h2>
          </div>

          <div className="student-overview-grid">
            <button
              type="button"
              className="student-overview-card dashboard-card-reveal"
              onClick={handleCoursesClick}
            >
              <div className="student-overview-icon blue">
                📚
              </div>

              <div>
                <span>COURSES</span>
                <strong>{totalCourses}</strong>
                <p>Enrolled courses</p>
              </div>

              <b>→</b>
            </button>

            <div className="student-overview-card static dashboard-card-reveal card-delay-1">
              <div className="student-overview-icon green">
                ✓
              </div>

              <div>
                <span>COMPLETED</span>
                <strong>{completedCourses}</strong>
                <p>Finished courses</p>
              </div>
            </div>

            <div className="student-overview-card static dashboard-card-reveal card-delay-2">
              <div className="student-overview-icon purple">
                ◔
              </div>

              <div>
                <span>PROGRESS</span>
                <strong>{overallProgress}%</strong>
                <p>Overall completion</p>
              </div>
            </div>

            <button
              type="button"
              className="student-overview-card dashboard-card-reveal card-delay-3"
              onClick={handleNotesClick}
            >
              <div className="student-overview-icon orange">
                📝
              </div>

              <div>
                <span>NOTES</span>
                <strong>{notes.length}</strong>
                <p>Saved lecture notes</p>
              </div>

              <b>→</b>
            </button>
          </div>
        </section>

        {/* LEARNING TOOLS */}
        <section className="student-quick-section">
          <div className="student-section-heading dashboard-reveal">
            <span className="student-dashboard-label">
              LEARNING TOOLS
            </span>

            <h2>Everything you need</h2>

            <p>
              Access your learning tools quickly.
            </p>
          </div>

          <div className="student-learning-tools">
            <button
              type="button"
              className="student-tool-card featured dashboard-card-reveal"
              onClick={handleCoursesClick}
            >
              <div className="student-tool-icon">📚</div>

              <div className="student-tool-copy">
                <span>LEARNING</span>

                <h3>My Courses</h3>

                <p>
                  Continue your enrolled courses and
                  track your learning.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card quiz dashboard-card-reveal card-delay-1"
              onClick={() =>
                navigate("/student/quizzes")
              }
            >
              <div className="student-tool-icon">🧠</div>

              <div className="student-tool-copy">
                <span>ASSESSMENTS</span>

                <h3>Quizzes</h3>

                <p>
                  Take quizzes and review your previous
                  answers.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card ai dashboard-card-reveal card-delay-2"
              onClick={() => navigate("/ai-tutor")}
            >
              <div className="student-tool-icon">🤖</div>

              <div className="student-tool-copy">
                <span>AI ASSISTANCE</span>

                <h3>AI Tutor</h3>

                <p>
                  Ask questions and get help from your
                  course content.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card study dashboard-card-reveal card-delay-3"
              onClick={() => navigate("/study-plan")}
            >
              <div className="student-tool-icon">📅</div>

              <div className="student-tool-copy">
                <span>PERSONALIZED</span>

                <h3>Study Plan</h3>

                <p>
                  Follow your personalized AI learning
                  plan.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card assignment dashboard-card-reveal card-delay-4"
              onClick={() =>
                navigate("/student/assignments")
              }
            >
              <div className="student-tool-icon">📄</div>

              <div className="student-tool-copy">
                <span>WORK</span>

                <h3>Assignments</h3>

                <p>
                  View deadlines and submit your
                  assignments.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card notes dashboard-card-reveal card-delay-5"
              onClick={handleNotesClick}
            >
              <div className="student-tool-icon">📝</div>

              <div className="student-tool-copy">
                <span>PERSONAL NOTES</span>

                <h3>My Notes</h3>

                <p>
                  Review notes saved during your
                  lectures.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card certificate dashboard-card-reveal card-delay-6"
              onClick={() =>
                navigate("/student/certificates")
              }
            >
              <div className="student-tool-icon">🏆</div>

              <div className="student-tool-copy">
                <span>ACHIEVEMENTS</span>

                <h3>Certificates</h3>

                <p>
                  View your earned certificates and
                  completion status.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>

            <button
              type="button"
              className="student-tool-card progress dashboard-card-reveal card-delay-7"
              onClick={() =>
                navigate("/student/progress")
              }
            >
              <div className="student-tool-icon">📈</div>

              <div className="student-tool-copy">
                <span>ANALYTICS</span>

                <h3>Progress</h3>

                <p>
                  See detailed learning and mastery
                  progress.
                </p>
              </div>

              <span className="student-tool-arrow">→</span>
            </button>
          </div>
        </section>

        {/* MY NOTES */}
        <section
          id="my-notes"
          className="student-notes-section"
        >
          <div className="student-section-heading dashboard-reveal">
            <span className="student-dashboard-label">
              PERSONAL NOTES
            </span>

            <div className="student-notes-heading-row">
              <div>
                <h2>My Notes</h2>

                <p>
                  Your lecture notes, organized by
                  course and module.
                </p>
              </div>

              <span className="student-course-count">
                {notes.length}{" "}
                {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>
          </div>

          {notesLoading ? (
            <div className="student-empty-state dashboard-card-reveal">
              <div className="student-dashboard-spinner"></div>

              <h3>Loading your notes...</h3>

              <p>
                Fetching your saved lecture notes.
              </p>
            </div>
          ) : notesError ? (
            <div className="student-dashboard-error dashboard-reveal">
              <div>
                <strong>
                  Notes could not be loaded
                </strong>

                <span>{notesError}</span>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : notes.length === 0 ? (
            <div className="student-empty-state dashboard-card-reveal">
              <div className="student-empty-icon">📝</div>

              <h3>No notes yet</h3>

              <p>
                Add notes while watching a lecture and
                they will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="student-notes-list">
              {groupedNotes.map((courseGroup) => (
                <div
                  className="student-notes-course dashboard-card-reveal"
                  key={courseGroup.course_id}
                >
                  <div className="student-notes-course-header">
                    <div className="student-notes-icon">
                      📚
                    </div>

                    <div>
                      <span>COURSE</span>

                      <h3>
                        {courseGroup.course_title}
                      </h3>
                    </div>
                  </div>

                  <div className="student-notes-modules">
                    {courseGroup.modules.map(
                      (moduleGroup) => (
                        <div
                          className="student-notes-module"
                          key={moduleGroup.module_id}
                        >
                          <div className="student-notes-module-header">
                            <div className="student-notes-mini-icon">
                              📘
                            </div>

                            <div>
                              <span>MODULE</span>

                              <h4>
                                {moduleGroup.module_title}
                              </h4>
                            </div>
                          </div>

                          <div className="student-notes-lectures">
                            {moduleGroup.lectures.map(
                              (lectureGroup) => (
                                <div
                                  className="student-notes-lecture"
                                  key={
                                    lectureGroup.lecture_id
                                  }
                                >
                                  <div className="student-notes-lecture-header">
                                    <div>
                                      <span>LECTURE</span>

                                      <h5>
                                        {
                                          lectureGroup.lecture_title
                                        }
                                      </h5>
                                    </div>

                                    <span className="student-note-count">
                                      {
                                        lectureGroup.notes
                                          .length
                                      }{" "}
                                      {lectureGroup.notes
                                        .length === 1
                                        ? "note"
                                        : "notes"}
                                    </span>
                                  </div>

                                  <div className="student-note-items">
                                    {lectureGroup.notes.map(
                                      (note) => (
                                        <button
                                          type="button"
                                          className="student-note-item"
                                          key={note.note_id}
                                          onClick={() =>
                                            handleNoteOpen(
                                              note
                                            )
                                          }
                                        >
                                          <span className="student-note-timestamp">
                                            {formatTimestamp(
                                              note.timestamp_seconds
                                            )}
                                          </span>

                                          <span className="student-note-content">
                                            {note.content}
                                          </span>

                                          <span className="student-note-open">
                                            Open
                                            <span>→</span>
                                          </span>
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MY COURSES */}
        <section
          id="my-courses"
          className="student-courses-section"
        >
          <div className="student-section-heading dashboard-reveal">
            <span className="student-dashboard-label">
              YOUR LEARNING
            </span>

            <div className="student-courses-heading-row">
              <h2>My Courses</h2>

              <span className="student-course-count">
                {totalCourses}{" "}
                {totalCourses === 1 ? "course" : "courses"}
              </span>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="student-empty-state dashboard-card-reveal">
              <div className="student-empty-icon">📖</div>

              <h3>Your learning journey starts here</h3>

              <p>
                No enrolled courses are available yet.
              </p>
            </div>
          ) : (
            <div className="student-course-grid">
              {courses.map((course, index) => {
                const progress = Math.min(
                  Number(course.progress_percent || 0),
                  100
                );

                const isCompleted =
                  course.enrollment_status ===
                    "completed" ||
                  progress >= 100;

                return (
                  <div
                    className={`student-course-card dashboard-card-reveal ${
                      index % 4 === 1
                        ? "card-delay-1"
                        : index % 4 === 2
                        ? "card-delay-2"
                        : index % 4 === 3
                        ? "card-delay-3"
                        : ""
                    }`}
                    key={course.course_id}
                  >
                    <div className="student-course-top">
                      <span className="student-course-tag">
                        LEARNING
                      </span>

                      {isCompleted && (
                        <span className="student-completed-tag">
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    <h3>{course.title}</h3>

                    <p>
                      {course.description ||
                        "Continue learning through this course."}
                    </p>

                    <div className="student-course-progress">
                      <div className="student-progress-row">
                        <span>Progress</span>

                        <strong>
                          {progress.toFixed(0)}%
                        </strong>
                      </div>

                      <div className="student-progress-track">
                        <div
                          className="student-progress-fill"
                          style={{
                            width: `${progress}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="student-course-bottom">
                      <span>
                        {isCompleted
                          ? "Course completed"
                          : "In progress"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/course/${course.course_id}`
                          )
                        }
                      >
                        Open Course
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="student-dashboard-footer dashboard-reveal">
          <div>
            <strong>VertexLearn AI</strong>

            <span>
              Learn smarter. Learn consistently.
            </span>
          </div>

          <span>Student Learning Workspace</span>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;