import { useEffect, useRef, useState } from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import axios, {
  API_URL,
  getAuthHeaders,
  COURSE_ID,
  MODULE_ID,
} from "../services/api";

function LecturePage() {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const videoRef = useRef(null);

  const searchParams = new URLSearchParams(
    location.search
  );

  const courseId =
    searchParams.get("courseId") || COURSE_ID;

  const moduleId =
    searchParams.get("moduleId") || MODULE_ID;

  const timestampFromUrl = Number(
    searchParams.get("t")
  );

  // ----------------------------------------------------------
  // Lecture state
  // ----------------------------------------------------------

  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // Progress
  // ----------------------------------------------------------

  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  // ----------------------------------------------------------
  // Video time
  // ----------------------------------------------------------

  const [currentTime, setCurrentTime] = useState(0);

  // ----------------------------------------------------------
  // Notes
  // ----------------------------------------------------------

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  // ----------------------------------------------------------
  // Bookmarks
  // ----------------------------------------------------------

  const [bookmarks, setBookmarks] = useState([]);

  // ----------------------------------------------------------
  // AI Tutor
  // ----------------------------------------------------------

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);

  // ----------------------------------------------------------
  // AI Lecture Summary
  // ----------------------------------------------------------

  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] =
    useState(false);
  const [summaryError, setSummaryError] = useState("");

  // ----------------------------------------------------------
  // Load lecture
  // ----------------------------------------------------------

  useEffect(() => {
    loadLecture();
  }, [lectureId, moduleId]);

  useEffect(() => {
    if (lecture) {
      loadProgress();
      loadNotes();
      loadBookmarks();
    }
  }, [lecture]);

  // ----------------------------------------------------------
  // Seek to timestamp from dashboard
  // ----------------------------------------------------------

  useEffect(() => {
    if (
      lecture &&
      videoRef.current &&
      Number.isFinite(timestampFromUrl) &&
      timestampFromUrl >= 0
    ) {
      const video = videoRef.current;

      const seekToTimestamp = () => {
        if (
          timestampFromUrl <=
          (video.duration || Infinity)
        ) {
          video.currentTime = timestampFromUrl;
          setCurrentTime(timestampFromUrl);
        }
      };

      if (video.readyState >= 1) {
        seekToTimestamp();
      } else {
        video.addEventListener(
          "loadedmetadata",
          seekToTimestamp,
          { once: true }
        );
      }

      return () => {
        video.removeEventListener(
          "loadedmetadata",
          seekToTimestamp
        );
      };
    }
  }, [lecture, timestampFromUrl]);

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  function formatTimestamp(seconds) {
    const totalSeconds = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    const minutes = Math.floor(
      totalSeconds / 60
    );

    const remainingSeconds =
      totalSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  }
  function getResourceUrl(url) {
  if (!url) return "";

  return url.startsWith("http")
    ? url
    : `http://localhost:5000${url}`;
}

  function seekVideo(seconds) {
    if (!videoRef.current) {
      return;
    }

    const time = Math.max(
      0,
      Number(seconds) || 0
    );

    videoRef.current.currentTime = time;
    setCurrentTime(time);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ----------------------------------------------------------
  // Lecture loading
  // ----------------------------------------------------------

  async function loadLecture() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/modules/${moduleId}/lectures`
      );

      const foundLecture =
        response.data.lectures?.find(
          (item) => item.id === lectureId
        );

      if (!foundLecture) {
        setError("Lecture not found");
        return;
      }

      setLecture(foundLecture);
    } catch (error) {
      console.error(
        "Lecture error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load lecture"
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // Progress
  // ----------------------------------------------------------

  async function loadProgress() {
    try {
      const response = await axios.get(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/progress`,
        {
          headers: getAuthHeaders(),
        }
      );

      const savedProgress =
        response.data.progress;

      if (!savedProgress) {
        setProgress(0);
        setCompleted(false);
        return;
      }

      setCompleted(
        Boolean(
          savedProgress.is_completed
        )
      );

      if (savedProgress.is_completed) {
        setProgress(100);
        return;
      }

      if (
        lecture.duration_seconds > 0
      ) {
        const percentage =
          (savedProgress.progress_seconds /
            lecture.duration_seconds) *
          100;

        setProgress(
          Math.min(
            100,
            Math.round(percentage)
          )
        );
      }
    } catch (error) {
      console.error(
        "Failed to load lecture progress:",
        error
      );
    }
  }

  async function markLectureCompleted() {
    try {
      const response = await axios.put(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/progress`,
        {
          progress_seconds:
            lecture.duration_seconds,
          is_completed: true,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        setProgress(100);
        setCompleted(true);
      }
    } catch (error) {
      console.error(
        "Failed to update lecture progress:",
        error
      );

      alert(
        "Failed to update lecture progress"
      );
    }
  }

  // ----------------------------------------------------------
  // Notes
  // ----------------------------------------------------------

  async function loadNotes() {
    try {
      const response = await axios.get(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/notes`,
        {
          headers: getAuthHeaders(),
        }
      );

      setNotes(
        response.data.notes || []
      );
    } catch (error) {
      console.error(
        "Failed to load notes:",
        error
      );
    }
  }

  async function addNote() {
    const trimmedNote = newNote.trim();

    if (!trimmedNote) {
      return;
    }

    const timestampSeconds = Math.max(
      0,
      Math.floor(currentTime)
    );

    try {
      const response = await axios.post(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/notes`,
        {
          content: trimmedNote,
          timestamp_seconds:
            timestampSeconds,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        setNewNote("");
        await loadNotes();
      }
    } catch (error) {
      console.error(
        "Failed to add note:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to add note"
      );
    }
  }

  async function deleteNote(noteId) {
    try {
      await axios.delete(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/notes/${noteId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      await loadNotes();
    } catch (error) {
      console.error(
        "Failed to delete note:",
        error
      );

      alert(
        "Failed to delete note"
      );
    }
  }

  // ----------------------------------------------------------
  // Bookmarks
  // ----------------------------------------------------------

  async function loadBookmarks() {
    try {
      const response = await axios.get(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/bookmarks`,
        {
          headers: getAuthHeaders(),
        }
      );

      setBookmarks(
        response.data.bookmarks || []
      );
    } catch (error) {
      console.error(
        "Failed to load bookmarks:",
        error
      );
    }
  }

  async function addBookmark() {
    const seconds = Math.max(
      0,
      Math.floor(currentTime)
    );

    try {
      const response = await axios.post(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/bookmarks`,
        {
          timestamp_seconds: seconds,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        await loadBookmarks();
      }
    } catch (error) {
      console.error(
        "Failed to add bookmark:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to add bookmark"
      );
    }
  }

  async function deleteBookmark(bookmarkId) {
    try {
      await axios.delete(
        `${API_URL}/courses/modules/${moduleId}/lectures/${lectureId}/bookmarks/${bookmarkId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      await loadBookmarks();
    } catch (error) {
      console.error(
        "Failed to delete bookmark:",
        error
      );

      alert(
        "Failed to delete bookmark"
      );
    }
  }

  // ----------------------------------------------------------
  // AI Tutor
  // ----------------------------------------------------------

  async function askAI() {
    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion) {
      return;
    }

    try {
      setAsking(true);
      setAnswer("");
      setSources([]);

      const response = await axios.post(
        `${API_URL}/ai/chat`,
        {
          course_id: courseId,
          question: trimmedQuestion,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setAnswer(
        response.data.answer ||
          "No answer received."
      );

      setSources(
        response.data.sources || []
      );
    } catch (error) {
      console.error(
        "AI Tutor error:",
        error
      );

      setAnswer(
        error.response?.data?.message ||
          "Unable to contact AI Tutor."
      );

      setSources([]);
    } finally {
      setAsking(false);
    }
  }

  // ----------------------------------------------------------
  // AI Summary
  // ----------------------------------------------------------

  async function generateSummary() {
    try {
      setSummaryLoading(true);
      setSummaryError("");
      setSummary("");

      const response =
        await axios.post(
          `${API_URL}/ai/summarize`,
          {
            lecture_id: lectureId,
            course_id: courseId,
          },
          {
            headers: getAuthHeaders(),
          }
        );

      if (
        response.data.success &&
        response.data.summary
      ) {
        setSummary(
          response.data.summary
        );
      } else {
        setSummaryError(
          "No summary was generated."
        );
      }
    } catch (error) {
      console.error(
        "Lecture summary error:",
        error
      );

      setSummaryError(
        error.response?.data?.message ||
          "Unable to generate lecture summary."
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="lecture-page">
        <div className="lecture-loading">
          <div className="loading-spinner"></div>
          <p>Loading lecture...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Error
  // ----------------------------------------------------------

  if (error || !lecture) {
    return (
      <div className="lecture-page">
        <div className="lecture-error-card">
          <div className="lecture-error-icon">
            !
          </div>

          <h2>
            {error ||
              "Lecture not found"}
          </h2>

          <button
            onClick={() =>
              navigate(
                `/course/${courseId}`
              )
            }
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Main page
  // ----------------------------------------------------------

  return (
    <div className="lecture-page">

      <div className="lecture-topbar">
        <button
          className="lecture-back-button"
          onClick={() =>
            navigate(
              `/course/${courseId}`
            )
          }
        >
          ← Back to Course
        </button>

        <span className="lecture-course-label">
          Java Full Stack Development
        </span>
      </div>

      <section className="lecture-title-section">
        <p className="eyebrow">
          CURRENT LESSON
        </p>

        <h1>{lecture.title}</h1>

        <p>
          Learn at your own pace and use
          the AI Tutor and lecture summary
          whenever you need help.
        </p>
      </section>

      {/* Video */}

      <section className="lecture-video-card">
        <div className="video-container">
     <video
  ref={videoRef}
  controls
  controlsList="nodownload"
  width="100%"
  src={
    lecture.video_url?.startsWith("http")
      ? lecture.video_url
      : `http://localhost:5000${lecture.video_url}`
  }
  onTimeUpdate={(event) =>
    setCurrentTime(event.currentTarget.currentTime)
  }
>
  Your browser does not support video playback.
</video>
          <div className="video-meta">
            <span>
              ▶ Lecture
            </span>

            <span>
              {formatTimestamp(
                currentTime
              )}{" "}
              /{" "}
              {formatTimestamp(
                lecture.duration_seconds
              )}
            </span>
          </div>
        </div>
           </section>

      {/* Lecture Resources */}

      {Array.isArray(lecture.resource_urls) &&
        lecture.resource_urls.length > 0 && (
          <section className="lecture-resources-card">
            <div className="lecture-resources-header">
              <div className="lecture-resources-icon">
                📚
              </div>

              <div>
                <p className="eyebrow">
                  LECTURE MATERIAL
                </p>

                <h2>Lecture Resources</h2>

                <p>
                  Open the PDFs and presentation slides
                  uploaded for this lecture.
                </p>
              </div>

              <span className="lecture-resource-count">
                {lecture.resource_urls.length}{" "}
                {lecture.resource_urls.length === 1
                  ? "file"
                  : "files"}
              </span>
            </div>

            <div className="lecture-resource-list">
              {lecture.resource_urls.map(
                (url, index) => {
                  const resourceUrl =
                    getResourceUrl(url);

                  const filename =
                    decodeURIComponent(
                      url.split("/").pop() ||
                        `Resource ${index + 1}`
                    );

                  return (
                    <a
                      key={`${url}-${index}`}
                      href={resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="lecture-resource-link"
                    >
                      <div className="lecture-resource-link-left">
                        <div className="lecture-resource-file-icon">
                          📄
                        </div>

                        <div>
                          <strong>
                            {filename}
                          </strong>

                          <span>
                            Lecture resource
                          </span>
                        </div>
                      </div>

                      <span className="lecture-resource-open">
                        Open ↗
                      </span>
                    </a>
                  );
                }
              )}
            </div>
          </section>
        )}

      {/* Progress */}

      <section className="lecture-progress-card">
        <div className="lecture-progress-heading">
          <div>
            <p className="eyebrow">
              YOUR PROGRESS
            </p>

            <h2>
              {completed
                ? "Lecture completed"
                : "Keep going"}
            </h2>
          </div>

          <div className="lecture-progress-percent">
            {progress}%
          </div>
        </div>

        <div className="lecture-progress-track">
          <div
            className="lecture-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          ></div>
        </div>

        <div className="lecture-progress-footer">
          <span>
            {completed
              ? "You've completed this lesson."
              : "Complete the lecture when you're done."}
          </span>

          <button
            className={
              completed
                ? "completed-button"
                : ""
            }
            onClick={
              markLectureCompleted
            }
            disabled={completed}
          >
            {completed
              ? "✓ Completed"
              : "Mark as Completed"}
          </button>
        </div>
      </section>

      {/* Notes and bookmarks */}

      <div className="lecture-tools-grid">

        {/* Notes */}

        <section className="lecture-tool-card">
          <div className="tool-card-header">
            <div className="tool-icon notes-icon">
              📝
            </div>

            <div>
              <h2>My Notes</h2>

              <p>
                Save important points from
                this lesson.
              </p>
            </div>
          </div>

          <textarea
            value={newNote}
            onChange={(event) =>
              setNewNote(
                event.target.value
              )
            }
            placeholder="Write your note here..."
            rows="5"
          />

          <button
            onClick={addNote}
            type="button"
          >
            Add Note at{" "}
            {formatTimestamp(
              currentTime
            )}
          </button>

          <div className="notes-list">
            {notes.length === 0 ? (
              <div className="empty-tool-state">
                No notes yet.
              </div>
            ) : (
              notes.map((note) => (
                <div
                  className="note-item"
                  key={note.id}
                >
                  <div>
                    <button
                      type="button"
                      className="note-timestamp-button"
                      onClick={() =>
                        seekVideo(
                          note.timestamp_seconds
                        )
                      }
                    >
                      {formatTimestamp(
                        note.timestamp_seconds
                      )}
                    </button>

                    <p>
                      {note.content}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      deleteNote(
                        note.id
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bookmarks */}

        <section className="lecture-tool-card">
          <div className="tool-card-header">
            <div className="tool-icon bookmark-icon">
              🔖
            </div>

            <div>
              <h2>Bookmarks</h2>

              <p>
                Save important moments in
                the lecture.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="bookmark-current-button"
            onClick={addBookmark}
          >
            🔖 Bookmark{" "}
            {formatTimestamp(
              currentTime
            )}
          </button>

          <div className="bookmarks-list">
            {bookmarks.length === 0 ? (
              <div className="empty-tool-state">
                No bookmarks yet.
              </div>
            ) : (
              bookmarks.map(
                (bookmark) => (
                  <div
                    className="bookmark-item"
                    key={bookmark.id}
                  >
                    <button
                      type="button"
                      className="bookmark-timestamp-button"
                      onClick={() =>
                        seekVideo(
                          bookmark.timestamp_seconds
                        )
                      }
                    >
                      🔖{" "}
                      {formatTimestamp(
                        bookmark.timestamp_seconds
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteBookmark(
                          bookmark.id
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>

      {/* AI Lecture Summary */}

      <section className="lecture-summary-card">
        <div className="lecture-summary-header">
          <div className="lecture-summary-icon">
            ✨
          </div>

          <div>
            <p className="eyebrow">
              AI-POWERED STUDY SUPPORT
            </p>

            <h2>
              Lecture Summary
            </h2>

            <p>
              Get a clear, student-friendly
              summary of this lecture with
              the most important points.
            </p>
          </div>
        </div>

        <div className="lecture-summary-action">
          <div>
            <strong>
              Save time while revising
            </strong>

            <span>
              The summary is generated
              directly from this lecture's
              transcript.
            </span>
          </div>

          <button
            onClick={
              generateSummary
            }
            disabled={summaryLoading}
          >
            {summaryLoading
              ? "Generating..."
              : summary
              ? "Regenerate Summary"
              : "Generate Summary →"}
          </button>
        </div>

        {summaryError && (
          <div className="lecture-summary-error">
            {summaryError}
          </div>
        )}

        {summary && (
          <div className="lecture-summary-result">
            <div className="lecture-summary-result-header">
              <span>
                ✦ AI Summary
              </span>

              <span>
                Transcript grounded
              </span>
            </div>

            <div className="lecture-summary-content">
              <div className="summary-mark">
                ✓
              </div>

              <div>
                <p>{summary}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Transcript */}

      <section className="lecture-transcript-card">
        <div className="transcript-header">
          <div className="tool-icon transcript-icon">
            📖
          </div>

          <div>
            <p className="eyebrow">
              LECTURE MATERIAL
            </p>

            <h2>
              Lecture Transcript
            </h2>
          </div>
        </div>

        <div className="transcript-content">
          <p>
            {lecture.transcript}
          </p>
        </div>
      </section>

      {/* AI Tutor */}

      <section className="ai-tutor-card">
        <div className="ai-tutor-header">
          <div className="ai-tutor-icon">
            ✦
          </div>

          <div>
            <p className="eyebrow">
              AI-POWERED LEARNING
            </p>

            <h2>
              Meet your AI Tutor
            </h2>

            <p>
              Ask questions about this
              course and get answers based
              only on your learning material.
            </p>
          </div>
        </div>

        <div className="ai-question-box">
          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value
              )
            }
            placeholder="Ask something like: What does the JVM do?"
            rows="4"
          />

          <div className="ai-action-row">
            <span>
              Answers are grounded in your
              course material.
            </span>

            <button
              onClick={askAI}
              disabled={asking}
            >
              {asking
                ? "Thinking..."
                : "Ask AI Tutor →"}
            </button>
          </div>
        </div>

        {answer && (
          <div className="ai-response">
            <div className="ai-response-heading">
              <span>
                ✦ AI Tutor
              </span>

              <span>
                Course grounded
              </span>
            </div>

            <div className="ai-response-content">
              <p>{answer}</p>
            </div>

            {sources.length > 0 && (
              <div className="ai-sources">
                <h3>Sources</h3>

                {sources.map(
                  (
                    source,
                    index
                  ) => (
                    <div
                      className="ai-source-item"
                      key={`${source.lecture_id}-${index}`}
                    >
                      <span>
                        📚
                      </span>

                      <div>
                        <strong>
                          {
                            source.lecture_title
                          }
                        </strong>

                        <small>
                          Relevance:{" "}
                          {Number(
                            source.similarity
                          ).toFixed(2)}
                        </small>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default LecturePage;