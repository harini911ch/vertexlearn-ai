import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios, { API_URL, getAuthHeaders } from "../services/api";
import "./StudentQuiz.css";

function StudentQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Quiz review states
  const [reviewAnswers, setReviewAnswers] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    try {
      setLoading(true);
      setError("");

      // Load quiz questions
      const response = await axios.get(
        `${API_URL}/courses/quizzes/${quizId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const loadedQuiz = response.data.quiz || null;
      setQuiz(loadedQuiz);

      // Check whether the student has already submitted this quiz
      const attemptResponse = await axios.get(
        `${API_URL}/courses/quizzes/${quizId}/my-attempt`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (
        attemptResponse.data.success &&
        attemptResponse.data.attempted &&
        attemptResponse.data.attempt
      ) {
        const attempt = attemptResponse.data.attempt;

        setResult({
          success: true,
          score: Number(attempt.score || 0),
          correct_answers: Number(attempt.correct_answers || 0),
          total_questions: loadedQuiz?.questions?.length || 0,
          attempt,
          alreadyAttempted: true,
        });
      } else {
        setResult(null);
      }
    } catch (error) {
      console.error("Student quiz loading error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load quiz."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSingleChoice(questionId, optionId) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        selected_option_ids: [optionId],
      },
    }));
  }

  function handleMultiChoice(questionId, optionId) {
    setAnswers((previous) => {
      const current =
        previous[questionId]?.selected_option_ids || [];

      const alreadySelected = current.includes(optionId);

      const updated = alreadySelected
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      return {
        ...previous,
        [questionId]: {
          selected_option_ids: updated,
        },
      };
    });
  }

  function handleShortAnswer(questionId, text) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        text_answer: text,
      },
    }));
  }

  function isQuestionAnswered(question) {
    const answer = answers[question.id];

    if (!answer) {
      return false;
    }

    if (question.question_type === "short_answer") {
      return Boolean(answer.text_answer?.trim());
    }

    return (
      Array.isArray(answer.selected_option_ids) &&
      answer.selected_option_ids.length > 0
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!quiz) {
      return;
    }

    const unanswered = quiz.questions.filter(
      (question) => !isQuestionAnswered(question)
    );

    if (unanswered.length > 0) {
      setError(
        `Please answer all questions before submitting. ${
          unanswered.length
        } question${
          unanswered.length === 1 ? "" : "s"
        } remaining.`
      );

      const firstUnanswered = document.getElementById(
        `question-${unanswered[0].id}`
      );

      if (firstUnanswered) {
        firstUnanswered.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setShowReview(false);
      setReviewAnswers([]);

      // Start a new quiz attempt
      const attemptResponse = await axios.post(
        `${API_URL}/courses/quizzes/${quizId}/attempt`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );

      const attempt = attemptResponse.data.attempt;

      if (!attempt?.id) {
        throw new Error(
          "Quiz attempt could not be started."
        );
      }

      const formattedAnswers = quiz.questions.map(
        (question) => {
          const answer = answers[question.id] || {};

          if (
            question.question_type ===
            "short_answer"
          ) {
            return {
              question_id: question.id,
              text_answer: answer.text_answer || "",
            };
          }

          return {
            question_id: question.id,
            selected_option_ids:
              answer.selected_option_ids || [],
          };
        }
      );

      const submitResponse = await axios.post(
        `${API_URL}/courses/attempts/${attempt.id}/submit`,
        {
          answers: formattedAnswers,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setResult(submitResponse.data);
    } catch (error) {
      console.error("Quiz submission error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to submit quiz."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Load submitted answers for review
  async function loadReview() {
    if (!result?.attempt?.id) {
      setError(
        "Quiz attempt information is missing."
      );
      return;
    }

    try {
      setReviewLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/courses/attempts/${result.attempt.id}/review`,
        {
          headers: getAuthHeaders(),
        }
      );

      console.log(
        "Review response:",
        response.data
      );

      setReviewAnswers(
        response.data.answers || []
      );

      setShowReview(true);
    } catch (error) {
      console.error(
        "Quiz review loading error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load quiz review."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div className="student-quiz-page">
        <header className="student-quiz-header">
          <div className="quiz-brand">
            <div className="quiz-brand-mark">
              ✦
            </div>

            <div>
              <strong>VertexLearn AI</strong>
              <span>Student Assessment</span>
            </div>
          </div>
        </header>

        <main className="student-quiz-container">
          <div className="quiz-loading-card">
            <div className="quiz-loading-spinner"></div>

            <h2>Loading Quiz...</h2>

            <p>
              Please wait while we prepare your
              assessment.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Error screen
  if (error && !quiz) {
    return (
      <div className="student-quiz-page">
        <header className="student-quiz-header">
          <div className="quiz-brand">
            <div className="quiz-brand-mark">
              ✦
            </div>

            <div>
              <strong>VertexLearn AI</strong>
              <span>Student Assessment</span>
            </div>
          </div>
        </header>

        <main className="student-quiz-container">
          <div className="student-quiz-error">
            <div className="quiz-error-icon">
              !
            </div>

            <h2>Unable to load quiz</h2>

            <p>{error}</p>

            <button
              onClick={() => navigate(-1)}
            >
              ← Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  // Result screen
  if (result) {
    const score = Number(result.score || 0);

    const correct = Number(
      result.correct_answers || 0
    );

    const total = Number(
      result.total_questions ||
        quiz.questions?.length ||
        0
    );

    const passed = score >= 50;

    return (
      <div className="student-quiz-page">
        <header className="student-quiz-header">
          <div className="quiz-brand">
            <div className="quiz-brand-mark">
              ✦
            </div>

            <div>
              <strong>VertexLearn AI</strong>
              <span>Student Assessment</span>
            </div>
          </div>

          <button
            className="quiz-header-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Dashboard
          </button>
        </header>

        <main className="student-quiz-container">
          {/* Result card */}
          <section className="quiz-result-card">
            <div
              className={`quiz-result-icon ${
                passed
                  ? "success"
                  : "needs-improvement"
              }`}
            >
              {passed ? "✓" : "↗"}
            </div>

            <p className="quiz-result-eyebrow">
              QUIZ COMPLETED
            </p>

            <h1>{quiz.title}</h1>

            <p className="quiz-result-message">
              {passed
                ? "Great work! You have successfully completed this assessment."
                : "Keep practicing and review the course material before trying again."}
            </p>

            <div className="quiz-score-circle">
              <strong>{score}%</strong>

              <span>Score</span>
            </div>

            <div className="quiz-result-stats">
              <div>
                <span>Correct answers</span>

                <strong>
                  {correct} / {total}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong
                  className={
                    passed
                      ? "result-passed"
                      : "result-review"
                  }
                >
                  {passed
                    ? "Passed"
                    : "Review needed"}
                </strong>
              </div>
            </div>

            <div className="quiz-result-actions">
              <button
                className="quiz-secondary-button"
                onClick={() =>
                  navigate(-1)
                }
              >
                Back to Course
              </button>

              <button
                className="quiz-secondary-button"
                onClick={loadReview}
                disabled={reviewLoading}
              >
                {reviewLoading
                  ? "Loading Review..."
                  : "Review Answers"}
              </button>

              <button
                className="quiz-primary-button"
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                  setError("");
                  setReviewAnswers([]);
                  setShowReview(false);
                }}
              >
                Retake Quiz
              </button>
            </div>
          </section>

          {/* Review section */}
          {showReview && (
            <section className="quiz-review-section">
              <div className="quiz-review-header">
                <p className="quiz-result-eyebrow">
                  ANSWER REVIEW
                </p>

                <h2>
                  Review Your Answers
                </h2>

                <p>
                  Check which questions you got
                  right, which ones you missed,
                  and what the correct answer was.
                </p>
              </div>

              {reviewLoading ? (
                <div className="quiz-review-empty">
                  Loading your answers...
                </div>
              ) : reviewAnswers.length === 0 ? (
                <div className="quiz-review-empty">
                  No saved answers were found for
                  this attempt.
                </div>
              ) : (
                <div className="quiz-review-list">
                  {reviewAnswers.map(
                    (item, index) => {
                      const selectedIds =
                        item.selected_option_ids ||
                        [];

                      const correctOptions =
                        (item.options || []).filter(
                          (option) =>
                            option.is_correct
                        );

                      const selectedOptions =
                        (item.options || []).filter(
                          (option) =>
                            selectedIds.includes(
                              option.id
                            )
                        );

                      return (
                        <div
                          key={item.question_id}
                          className={`quiz-review-card ${
                            item.is_correct
                              ? "review-correct"
                              : "review-wrong"
                          }`}
                        >
                          <div className="quiz-review-card-header">
                            <span>
                              Question {index + 1}
                            </span>

                            <strong>
                              {item.is_correct
                                ? "✓ Correct"
                                : "✗ Incorrect"}
                            </strong>
                          </div>

                          <h3>
                            {item.question_text}
                          </h3>

                          {item.question_type ===
                          "short_answer" ? (
                            <div className="review-answer-block">
                              <span>
                                Your answer
                              </span>

                              <p>
                                {item.text_answer ||
                                  "No answer provided"}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="review-answer-block">
                                <span>
                                  Your answer
                                </span>

                                {selectedOptions.length ===
                                0 ? (
                                  <p>
                                    No answer selected
                                  </p>
                                ) : (
                                  selectedOptions.map(
                                    (option) => (
                                      <p
                                        key={
                                          option.id
                                        }
                                        className={
                                          !item.is_correct
                                            ? "wrong-answer"
                                            : ""
                                        }
                                      >
                                        {
                                          option.option_text
                                        }
                                      </p>
                                    )
                                  )
                                )}
                              </div>

                              {!item.is_correct && (
                                <div className="review-answer-block correct-answer-block">
                                  <span>
                                    Correct answer
                                  </span>

                                  {correctOptions.map(
                                    (option) => (
                                      <p
                                        key={
                                          option.id
                                        }
                                      >
                                        ✓{" "}
                                        {
                                          option.option_text
                                        }
                                      </p>
                                    )
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          )}

          {/* Error after quiz has loaded */}
          {error && (
            <div className="quiz-inline-error">
              <span>!</span>
              {error}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Quiz-taking screen
  return (
    <div className="student-quiz-page">
      <header className="student-quiz-header">
        <div className="quiz-brand">
          <div className="quiz-brand-mark">
            ✦
          </div>

          <div>
            <strong>VertexLearn AI</strong>
            <span>Student Assessment</span>
          </div>
        </div>

        <button
          className="quiz-header-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </header>

      <main className="student-quiz-container">
        <section className="quiz-intro-card">
          <div className="quiz-intro-content">
            <p className="quiz-intro-eyebrow">
              KNOWLEDGE CHECK
            </p>

            <h1>{quiz.title}</h1>

            <p>
              Answer each question carefully.
              Your objective answers will be
              automatically graded after
              submission.
            </p>

            <div className="quiz-intro-meta">
              <span>
                📝 {quiz.questions.length}{" "}
                {quiz.questions.length === 1
                  ? "question"
                  : "questions"}
              </span>

              <span>⚡ Auto-graded</span>

              <span>
                🎯 50% passing score
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="quiz-inline-error">
            <span>!</span>
            {error}
          </div>
        )}

        <form
          className="student-quiz-form"
          onSubmit={handleSubmit}
        >
          {quiz.questions.map(
            (question, index) => {
              const answer =
                answers[question.id] || {};

              const selectedIds =
                answer.selected_option_ids || [];

              return (
                <section
                  className="quiz-question-card"
                  id={`question-${question.id}`}
                  key={question.id}
                >
                  <div className="question-header">
                    <div className="question-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div className="question-heading">
                      <div className="question-type">
                        {question.question_type ===
                        "mcq"
                          ? "SINGLE CHOICE"
                          : question.question_type ===
                            "multi_select"
                          ? "MULTIPLE CHOICE"
                          : "SHORT ANSWER"}
                      </div>

                      <h2>
                        {question.question_text}
                      </h2>
                    </div>
                  </div>

                  {(question.question_type ===
                    "mcq" ||
                    question.question_type ===
                      "multi_select") && (
                    <div className="quiz-options">
                      {question.options.map(
                        (
                          option,
                          optionIndex
                        ) => {
                          const selected =
                            selectedIds.includes(
                              option.id
                            );

                          return (
                            <label
                              className={`quiz-option ${
                                selected
                                  ? "selected"
                                  : ""
                              }`}
                              key={option.id}
                            >
                              <input
                                type={
                                  question.question_type ===
                                  "mcq"
                                    ? "radio"
                                    : "checkbox"
                                }
                                name={`question-${question.id}`}
                                checked={selected}
                                onChange={() => {
                                  if (
                                    question.question_type ===
                                    "mcq"
                                  ) {
                                    handleSingleChoice(
                                      question.id,
                                      option.id
                                    );
                                  } else {
                                    handleMultiChoice(
                                      question.id,
                                      option.id
                                    );
                                  }
                                }}
                              />

                              <span className="option-marker">
                                {question.question_type ===
                                "mcq"
                                  ? String.fromCharCode(
                                      65 +
                                        optionIndex
                                    )
                                  : selected
                                  ? "✓"
                                  : ""}
                              </span>

                              <span className="option-text">
                                {
                                  option.option_text
                                }
                              </span>
                            </label>
                          );
                        }
                      )}
                    </div>
                  )}

                  {question.question_type ===
                    "multi_select" && (
                    <p className="question-helper">
                      Select all answers that
                      apply.
                    </p>
                  )}

                  {question.question_type ===
                    "short_answer" && (
                    <div className="short-answer-wrapper">
                      <textarea
                        value={
                          answer.text_answer ||
                          ""
                        }
                        onChange={(event) =>
                          handleShortAnswer(
                            question.id,
                            event.target.value
                          )
                        }
                        placeholder="Type your answer here..."
                        rows={5}
                      />

                      <span>
                        Short answers are
                        recorded for this
                        attempt.
                      </span>
                    </div>
                  )}
                </section>
              );
            }
          )}

          <div className="quiz-submit-card">
            <div>
              <strong>
                Ready to submit?
              </strong>

              <p>
                Make sure you've answered every
                question before submitting.
              </p>
            </div>

            <button
              type="submit"
              className="quiz-submit-button"
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : "Submit Quiz →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default StudentQuiz;