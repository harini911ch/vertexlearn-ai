import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./Certificates.css";

function Certificates() {
  const navigate = useNavigate();
  const resultRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [checkingCertificate, setCheckingCertificate] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (certificate || message || error) {
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [certificate, message, error]);

  async function loadCourses() {
    try {
      setLoadingCourses(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/my-courses`,
        {
          headers: getAuthHeaders(),
        }
      );

      const loadedCourses = response.data.courses || [];

      setCourses(loadedCourses);

      if (loadedCourses.length > 0) {
        setSelectedCourseId(loadedCourses[0].course_id);
      }
    } catch (error) {
      console.error("Failed to load courses:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load your courses."
      );
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedCourse(null);
      setCertificate(null);
      setMessage("");
      setError("");
      return;
    }

    const course = courses.find(
      (item) => item.course_id === selectedCourseId
    );

    setSelectedCourse(course || null);
    setCertificate(null);
    setMessage("");
    setError("");
  }, [selectedCourseId, courses]);

  async function checkCertificate() {
    if (!selectedCourseId) {
      setError("Please select a course.");
      return;
    }

    try {
      setCheckingCertificate(true);
      setError("");
      setMessage("");
      setCertificate(null);

      const response = await axios.get(
        `${API_URL}/courses/${selectedCourseId}/certificate`,
        {
          headers: getAuthHeaders(),
        }
      );

      console.log("Certificate response:", response.data);

      if (
        response.data.success &&
        response.data.certificate
      ) {
        const returnedCertificate = {
  ...response.data.certificate,

  student_name:
    response.data.student?.full_name ||
    response.data.certificate?.student_name ||
    response.data.certificate?.full_name ||
    "Student",

  student_email:
    response.data.student?.email ||
    response.data.certificate?.student_email ||
    "",
};

setCertificate(returnedCertificate);

        if (returnedCertificate.status === "approved") {
          setMessage(
            "Your certificate has been approved by your instructor and is now official."
          );
        } else {
          setMessage(
            "Your certificate request has been created and is awaiting instructor approval."
          );
        }
      } else {
        setMessage(
          "Your course progress is being checked."
        );
      }
    } catch (error) {
      console.error(
        "Certificate check error:",
        error
      );

      if (error.response?.status === 400) {
        setMessage(
          error.response.data?.message ||
            "Complete the course to receive your certificate."
        );
      } else {
        setError(
          error.response?.data?.message ||
            "Unable to check certificate status."
        );
      }
    } finally {
      setCheckingCertificate(false);
    }
  }

  const courseProgress = Number(
    selectedCourse?.progress_percent || 0
  );

  const isCourseCompleted =
    selectedCourse?.enrollment_status === "completed" ||
    courseProgress >= 100;

  const isApproved =
    certificate?.status === "approved";

  const isPending =
    certificate?.status === "pending";

  return (
    <div className="certificates-page">
      <header className="certificates-topbar">
        <button
          className="certificates-back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="certificates-brand">
          <div className="certificates-brand-mark">
            🎓
          </div>

          <div>
            <strong>VertexLearn AI</strong>
            <span>Student Certificates</span>
          </div>
        </div>
      </header>

      <main className="certificates-container">
        <section className="certificates-hero">
          <div className="certificates-hero-icon">
            🎓
          </div>

          <p className="certificates-eyebrow">
            LEARNING ACHIEVEMENTS
          </p>

          <h1>Your Certificates</h1>

          <p>
            Complete your course and earn a
            certificate that recognizes your
            learning achievement.
          </p>
        </section>

        {error && (
          <div className="certificates-error">
            <strong>Something went wrong</strong>
            <span>{error}</span>
          </div>
        )}

        {message && !certificate && (
          <div className="certificates-message">
            <span>ℹ</span>
            <p>{message}</p>
          </div>
        )}

        <section className="certificate-selection-card">
          <div className="certificate-selection-heading">
            <div>
              <p className="certificates-eyebrow">
                YOUR COURSES
              </p>

              <h2>Select a course</h2>

              <p>
                Check whether your certificate is
                available for this course.
              </p>
            </div>
          </div>

          <div className="certificate-selection-row">
            <select
              value={selectedCourseId}
              onChange={(event) =>
                setSelectedCourseId(
                  event.target.value
                )
              }
              disabled={
                loadingCourses ||
                checkingCertificate
              }
            >
              <option value="">
                {loadingCourses
                  ? "Loading courses..."
                  : courses.length === 0
                  ? "No courses available"
                  : "Select a course"}
              </option>

              {courses.map((course) => (
                <option
                  key={course.course_id}
                  value={course.course_id}
                >
                  {course.title}
                </option>
              ))}
            </select>

            <button
              onClick={checkCertificate}
              disabled={
                checkingCertificate ||
                loadingCourses ||
                !selectedCourseId
              }
            >
              {checkingCertificate
                ? "Checking..."
                : "Check Certificate →"}
            </button>
          </div>

          {selectedCourse && (
            <div className="certificate-progress-preview">
              <div>
                <span>Course progress</span>

                <strong>
                  {courseProgress.toFixed(0)}%
                </strong>
              </div>

              <div className="certificate-progress-track">
                <div
                  style={{
                    width: `${Math.min(
                      courseProgress,
                      100
                    )}%`,
                  }}
                />
              </div>

              <p>
                {isCourseCompleted
                  ? "✓ Course completed"
                  : "Complete all lectures to unlock your certificate."}
              </p>
            </div>
          )}
        </section>

        {!certificate &&
          !checkingCertificate && (
            <section
              ref={resultRef}
              className="certificate-status-card"
            >
              <div className="certificate-status-icon">
                {isCourseCompleted
                  ? "🎓"
                  : "📚"}
              </div>

              <div>
                <p className="certificates-eyebrow">
                  CERTIFICATE STATUS
                </p>

                <h3>
                  {isCourseCompleted
                    ? "Your course is complete!"
                    : "Keep learning to unlock your certificate"}
                </h3>

                <p>
                  {isCourseCompleted
                    ? "You have successfully completed all the available course content."
                    : "Complete all lectures in the selected course. Once you reach 100%, you will become eligible to request your certificate."}
                </p>

                {isCourseCompleted && (
                  <div className="certificate-pending-message">
                    <strong>
                      ⏳ Awaiting instructor approval
                    </strong>

                    <span>
                      Your certificate must be
                      approved by your instructor
                      before it can be downloaded.
                    </span>
                  </div>
                )}

                <div className="certificate-demo-note">
                  <strong>
                    🎓 Certificate Preview
                  </strong>

                  <span>
                    The certificate shown after
                    requesting is a demo preview
                    until your instructor approves
                    it. Once approved, it becomes
                    your official certificate.
                  </span>
                </div>
              </div>
            </section>
          )}

        {certificate && (
          <section
            ref={resultRef}
            className={`certificate-result-card ${
              isApproved
                ? "certificate-approved-card"
                : "certificate-pending-card"
            }`}
          >
            <div className="certificate-result-top">
              <div className="certificate-result-icon">
                {isApproved ? "✓" : "⏳"}
              </div>

              <div>
                <p className="certificates-eyebrow">
                  {isApproved
                    ? "CERTIFICATE APPROVED"
                    : "CERTIFICATE REQUEST"}
                </p>

                <h2>
                  {isApproved
                    ? "Your certificate is official!"
                    : "Your certificate is awaiting approval"}
                </h2>

                <p>
                  {isApproved
                    ? "Your instructor has approved your course completion."
                    : "Your course completion has been recorded, but the certificate is not official until your instructor approves it."}
                </p>
              </div>
            </div>

            <div className="certificate-preview">
              <div className="certificate-preview-inner">
              {isApproved ? (
  <div className="certificate-demo-label certificate-official-label">
    OFFICIAL CERTIFICATE
  </div>
) : (
  <div className="certificate-demo-label">
    DEMO CERTIFICATE · PREVIEW ONLY
  </div>
)}

                <div className="certificate-preview-symbol">
                  ✦
                </div>

                <p className="certificate-preview-label">
                  VERTEXLEARN AI
                </p>

                <h3>
                  Certificate of Completion
                </h3>

                <p className="certificate-presented">
                  This certificate is proudly
                  presented to
                </p>

                <strong>
                  {certificate.student_name ||
                    certificate.full_name ||
                    "Student"}
                </strong>

                <p className="certificate-course-name">
                  for successfully completing
                </p>

                <h4>
                  {selectedCourse?.title ||
                    "Course"}
                </h4>

                <div className="certificate-preview-footer">
                  <span>
                    Certificate No.
                    <strong>
                      {certificate.certificate_number}
                    </strong>
                  </span>

                  <span>
                    {isApproved
                      ? "Issued"
                      : "Requested"}

                    <strong>
                      {certificate.issued_at
                        ? new Date(
                            certificate.issued_at
                          ).toLocaleDateString()
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="certificate-result-actions">
  <div>
    {isApproved ? (
      <>
        <strong className="certificate-approved-text">
          ✓ Certificate Approved
        </strong>

        <p>
          Your instructor has approved this certificate.
          It is eligible for official PDF download.
        </p>
      </>
    ) : (
      <>
        <strong>
          ⏳ Approval pending
        </strong>

        <p>
          Your instructor still needs to approve this
          certificate before it becomes official.
        </p>
      </>
    )}
  </div>

  <button
    disabled={!isApproved}
    title={
      isApproved
        ? "Download your official certificate"
        : "Your instructor must approve the certificate first"
    }
  >
    {isApproved
      ? "Download PDF"
      : "Awaiting Approval"}
  </button>
</div>
          </section>
        )}

        {isPending && certificate && (
          <div className="certificate-pending-message">
            <strong>
              ⏳ Awaiting instructor approval
            </strong>

            <span>
              Your instructor has received your
              certificate request. Once approved,
              this preview will become your official
              certificate.
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

export default Certificates;