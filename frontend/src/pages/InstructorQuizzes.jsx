import { useEffect, useState } from "react";

import {
  API_URL,
  MODULE_ID,
  getAuthHeaders,
} from "../services/api";

import "./InstructorQuizzes.css";

const createEmptyQuestion = () => ({
  question_text: "",
  question_type: "mcq",
  options: [
    {
      option_text: "",
      is_correct: false,
    },
    {
      option_text: "",
      is_correct: false,
    },
    {
      option_text: "",
      is_correct: false,
    },
    {
      option_text: "",
      is_correct: false,
    },
  ],
});

function InstructorQuizzes() {
  // ==========================================================
  // QUIZ BUILDER
  // ==========================================================

  const [showCreateQuiz, setShowCreateQuiz] =
    useState(false);

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
  });

  const [questions, setQuestions] = useState([
    createEmptyQuestion(),
  ]);

  const [createdQuizzes, setCreatedQuizzes] =
    useState([]);

  // ==========================================================
  // GENERAL STATE
  // ==========================================================

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ==========================================================
  // AI QUIZ GENERATOR
  // ==========================================================

  const [lectures, setLectures] =
    useState([]);

  const [lecturesLoading, setLecturesLoading] =
    useState(false);

  const [selectedLectureId, setSelectedLectureId] =
    useState("");

  const [questionCount, setQuestionCount] =
    useState(5);

  const [generatingQuiz, setGeneratingQuiz] =
    useState(false);

  const [aiGenerated, setAiGenerated] =
    useState(false);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadExistingQuizzes();
    loadLectures();
  }, []);

  // ==========================================================
  // LOAD EXISTING QUIZZES
  // ==========================================================

  async function loadExistingQuizzes() {
    try {
      const response = await fetch(
  `${API_URL}/courses/modules/${MODULE_ID}/instructor-quizzes`,
  {
    method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load quizzes."
        );
      }

      setCreatedQuizzes(
        (data.quizzes || []).map(
          (quiz) => ({
            id: quiz.id,
            title: quiz.title,
            questionCount: Number(
              quiz.question_count || 0
            ),
          })
        )
      );
    } catch (err) {
      console.error(
        "Error loading existing quizzes:",
        err
      );

      setError(
        err.message ||
          "Failed to load existing quizzes."
      );
    }
  }

  // ==========================================================
  // LOAD LECTURES
  // ==========================================================

  async function loadLectures() {
    try {
      setLecturesLoading(true);

      const response = await fetch(
        `${API_URL}/courses/modules/${MODULE_ID}/lectures`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load lectures."
        );
      }

      const loadedLectures =
        data.lectures || [];

      setLectures(
        loadedLectures
      );

      if (
        loadedLectures.length > 0
      ) {
        setSelectedLectureId(
          loadedLectures[0].id
        );
      }
    } catch (err) {
      console.error(
        "Error loading lectures:",
        err
      );

      setError(
        err.message ||
          "Failed to load lectures."
      );
    } finally {
      setLecturesLoading(false);
    }
  }

  // ==========================================================
  // QUIZ FORM
  // ==========================================================

  function handleQuizChange(event) {
    const {
      name,
      value,
    } = event.target;

    setQuizForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  // ==========================================================
  // QUESTION FORM
  // ==========================================================

  function handleQuestionChange(
    questionIndex,
    value
  ) {
    setQuestions(
      (previous) =>
        previous.map(
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,
                  question_text:
                    value,
                }
              : question
        )
    );
  }

  function handleQuestionTypeChange(
    questionIndex,
    value
  ) {
    setQuestions(
      (previous) =>
        previous.map(
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,
                  question_type:
                    value,
                  options:
                    value ===
                    "short_answer"
                      ? []
                      : question
                          .options
                          .length >=
                        2
                      ? question.options
                      : [
                          {
                            option_text:
                              "",
                            is_correct:
                              false,
                          },
                          {
                            option_text:
                              "",
                            is_correct:
                              false,
                          },
                        ],
                }
              : question
        )
    );
  }

  function handleOptionTextChange(
    questionIndex,
    optionIndex,
    value
  ) {
    setQuestions(
      (previous) =>
        previous.map(
          (
            question,
            qIndex
          ) => {
            if (
              qIndex !==
              questionIndex
            ) {
              return question;
            }

            return {
              ...question,
              options:
                question.options.map(
                  (
                    option,
                    oIndex
                  ) =>
                    oIndex ===
                    optionIndex
                      ? {
                          ...option,
                          option_text:
                            value,
                        }
                      : option
                ),
            };
          }
        )
    );
  }

  function handleCorrectOptionChange(
    questionIndex,
    optionIndex
  ) {
    setQuestions(
      (previous) =>
        previous.map(
          (
            question,
            qIndex
          ) => {
            if (
              qIndex !==
              questionIndex
            ) {
              return question;
            }

            if (
              question.question_type ===
              "mcq"
            ) {
              return {
                ...question,
                options:
                  question.options.map(
                    (
                      option,
                      oIndex
                    ) => ({
                      ...option,
                      is_correct:
                        oIndex ===
                        optionIndex,
                    })
                  ),
              };
            }

            return {
              ...question,
              options:
                question.options.map(
                  (
                    option,
                    oIndex
                  ) =>
                    oIndex ===
                    optionIndex
                      ? {
                          ...option,
                          is_correct:
                            !option.is_correct,
                        }
                      : option
                ),
            };
          }
        )
    );
  }

  function addQuestion() {
    setQuestions(
      (previous) => [
        ...previous,
        createEmptyQuestion(),
      ]
    );
  }

  function removeQuestion(
    questionIndex
  ) {
    setQuestions(
      (previous) => {
        if (
          previous.length ===
          1
        ) {
          return previous;
        }

        return previous.filter(
          (
            _,
            index
          ) =>
            index !==
            questionIndex
        );
      }
    );
  }

  function addOption(
    questionIndex
  ) {
    setQuestions(
      (previous) =>
        previous.map(
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,
                  options: [
                    ...question.options,
                    {
                      option_text:
                        "",
                      is_correct:
                        false,
                    },
                  ],
                }
              : question
        )
    );
  }

  function removeOption(
    questionIndex,
    optionIndex
  ) {
    setQuestions(
      (previous) =>
        previous.map(
          (
            question,
            index
          ) => {
            if (
              index !==
              questionIndex
            ) {
              return question;
            }

            if (
              question.options
                .length <=
              2
            ) {
              return question;
            }

            return {
              ...question,
              options:
                question.options.filter(
                  (
                    _,
                    oIndex
                  ) =>
                    oIndex !==
                    optionIndex
                ),
            };
          }
        )
    );
  }

  // ==========================================================
  // RESET BUILDER
  // ==========================================================

  function resetForm() {
    setQuizForm({
      title: "",
      description: "",
    });

    setQuestions([
      createEmptyQuestion(),
    ]);

    setShowCreateQuiz(false);

    setAiGenerated(false);
  }

  // ==========================================================
  // FORM VALIDATION
  // ==========================================================

  function validateForm() {
    if (
      !quizForm.title.trim()
    ) {
      return "Quiz title is required.";
    }

    if (
      questions.length ===
      0
    ) {
      return "Add at least one question.";
    }

    for (
      let i = 0;
      i < questions.length;
      i += 1
    ) {
      const question =
        questions[i];

      if (
        !question.question_text.trim()
      ) {
        return `Question ${
          i + 1
        } cannot be empty.`;
      }

      if (
        question.question_type ===
          "mcq" ||
        question.question_type ===
          "multi_select"
      ) {
        if (
          question.options.length <
          2
        ) {
          return `Question ${
            i + 1
          } needs at least two options.`;
        }

        const emptyOption =
          question.options.some(
            (option) =>
              !option.option_text.trim()
          );

        if (emptyOption) {
          return `Every option in Question ${
            i + 1
          } must contain text.`;
        }

        const hasCorrectAnswer =
          question.options.some(
            (option) =>
              option.is_correct
          );

        if (
          !hasCorrectAnswer
        ) {
          return `Select at least one correct answer for Question ${
            i + 1
          }.`;
        }

        if (
          question.question_type ===
            "mcq" &&
          question.options.filter(
            (option) =>
              option.is_correct
          ).length !== 1
        ) {
          return `Question ${
            i + 1
          } must have exactly one correct answer.`;
        }
      }
    }

    return null;
  }

  // ==========================================================
  // AI QUIZ GENERATION
  // ==========================================================

  async function generateAIQuiz() {
    setMessage("");
    setError("");
    setAiGenerated(false);

    if (!selectedLectureId) {
      setError(
        "Please select a lecture first."
      );
      return;
    }

    try {
      setGeneratingQuiz(true);

      const response = await fetch(
        `${API_URL}/ai/generate-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            module_id:
              MODULE_ID,
            lecture_id:
              selectedLectureId,
            question_count:
              Number(questionCount),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to generate AI quiz."
        );
      }

      const generatedQuestions =
        Array.isArray(
          data.questions
        )
          ? data.questions
          : [];

      if (
        generatedQuestions.length <
        5
      ) {
        throw new Error(
          "AI did not generate enough valid questions. Please try again."
        );
      }

      const normalizedQuestions =
        generatedQuestions.map(
          (
            question,
            index
          ) => ({
            question_text:
              question.question_text ||
              "",
            question_type:
              question.question_type ||
              "mcq",
            options:
              Array.isArray(
                question.options
              )
                ? question.options.map(
                    (
                      option
                    ) => ({
                      option_text:
                        option.option_text ||
                        "",
                      is_correct:
                        option.is_correct ===
                        true,
                    })
                  )
                : [],
            order_index:
              index + 1,
          })
        );

      const selectedLecture =
        lectures.find(
          (lecture) =>
            lecture.id ===
            selectedLectureId
        );

      const lectureTitle =
        selectedLecture?.title ||
        data.lecture_title ||
        "Lecture";

      setQuestions(
        normalizedQuestions
      );

      setQuizForm({
        title: `AI Quiz - ${lectureTitle}`,
        description:
          `AI-generated assessment based on the lecture "${lectureTitle}". Review and edit the questions before creating the quiz.`,
      });

      setShowCreateQuiz(true);
      setAiGenerated(true);

      setMessage(
        "AI quiz generated successfully. Review the questions before creating the quiz."
      );
    } catch (err) {
      console.error(
        "AI quiz generation error:",
        err
      );

      setError(
        err.message ||
          "Failed to generate AI quiz."
      );
    } finally {
      setGeneratingQuiz(false);
    }
  }

  // ==========================================================
  // CREATE QUIZ
  // ==========================================================

  async function handleCreateQuiz(
    event
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    setLoading(true);

    try {
      // ------------------------------------------------------
      // STEP 1: CREATE QUIZ
      // ------------------------------------------------------

      const quizResponse =
        await fetch(
          `${API_URL}/courses/modules/${MODULE_ID}/quizzes`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              title:
                quizForm.title.trim(),
            }),
          }
        );

      const quizData =
        await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(
          quizData.message ||
            "Failed to create quiz."
        );
      }

      const quizId =
        quizData.quiz?.id;

      if (!quizId) {
        throw new Error(
          "Quiz was created, but the server did not return a quiz ID."
        );
      }

      // ------------------------------------------------------
      // STEP 2: CREATE QUESTIONS
      // ------------------------------------------------------

      for (
        let index = 0;
        index < questions.length;
        index += 1
      ) {
        const question =
          questions[index];

        const questionPayload = {
          question_text:
            question.question_text.trim(),

          question_type:
            question.question_type,

          order_index:
            index + 1,

          options:
            question.question_type ===
            "short_answer"
              ? []
              : question.options.map(
                  (
                    option
                  ) => ({
                    option_text:
                      option.option_text.trim(),

                    is_correct:
                      option.is_correct ===
                      true,
                  })
                ),
        };

        const questionResponse =
          await fetch(
            `${API_URL}/courses/quizzes/${quizId}/questions`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...getAuthHeaders(),
              },
              body: JSON.stringify(
                questionPayload
              ),
            }
          );

        const questionData =
          await questionResponse.json();

        if (
          !questionResponse.ok
        ) {
          throw new Error(
            questionData.message ||
              `Failed to create Question ${
                index + 1
              }.`
          );
        }
      }

      // ------------------------------------------------------
      // STEP 3: UPDATE UI
      // ------------------------------------------------------

      const newQuiz = {
        id: quizId,
        title:
          quizData.quiz.title,
        questionCount:
          questions.length,
      };

      setCreatedQuizzes(
        (previous) => [
          newQuiz,
          ...previous,
        ]
      );

      setMessage(
        aiGenerated
          ? "AI-generated quiz was reviewed and created successfully."
          : "Quiz and all questions were created successfully."
      );

      await loadExistingQuizzes();

      resetForm();
    } catch (err) {
      console.error(
        "Quiz creation error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while creating the quiz."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="instructor-quizzes-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="instructor-quizzes-header">
        <div>
          <span className="instructor-quizzes-eyebrow">
            ASSESSMENTS
          </span>

          <h1>
            Quiz Management
          </h1>

          <p>
            Create structured
            assessments for your
            Java Full Stack
            learners.
          </p>
        </div>

        <button
          type="button"
          className="instructor-quizzes-create-button"
          onClick={() => {
            setShowCreateQuiz(
              true
            );
            setMessage("");
            setError("");
            setAiGenerated(false);
          }}
        >
          + Create New Quiz
        </button>
      </header>

      {/* =====================================================
          MESSAGES
          ===================================================== */}

      {message && (
        <div className="instructor-quizzes-message success">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="instructor-quizzes-message error">
          ⚠ {error}
        </div>
      )}

      {/* =====================================================
          AI QUIZ GENERATOR
          ===================================================== */}

      <section className="ai-quiz-generator-card">

        <div className="ai-quiz-generator-header">

          <div className="ai-quiz-generator-icon">
            ✦
          </div>

          <div>
            <span className="ai-quiz-generator-eyebrow">
              AI-POWERED ASSESSMENT
            </span>

            <h2>
              Generate Quiz with AI
            </h2>

            <p>
              Select a lecture and let
              VertexLearn AI create a
              draft quiz from its
              transcript. You can review
              and edit every question
              before publishing.
            </p>
          </div>

        </div>

        <div className="ai-quiz-generator-form">

          <div className="ai-quiz-field">

            <label htmlFor="aiLecture">
              Source Lecture
            </label>

            <select
              id="aiLecture"
              value={
                selectedLectureId
              }
              onChange={(event) =>
                setSelectedLectureId(
                  event.target.value
                )
              }
              disabled={
                lecturesLoading ||
                generatingQuiz
              }
            >
              {lecturesLoading ? (
                <option value="">
                  Loading lectures...
                </option>
              ) : lectures.length === 0 ? (
                <option value="">
                  No lectures available
                </option>
              ) : (
                lectures.map(
                  (lecture) => (
                    <option
                      key={lecture.id}
                      value={lecture.id}
                    >
                      {lecture.title}
                    </option>
                  )
                )
              )}
            </select>

          </div>

          <div className="ai-quiz-field ai-quiz-count-field">

            <label htmlFor="aiQuestionCount">
              Number of Questions
            </label>

            <select
              id="aiQuestionCount"
              value={questionCount}
              onChange={(event) =>
                setQuestionCount(
                  Number(
                    event.target.value
                  )
                )
              }
              disabled={
                generatingQuiz
              }
            >
              <option value={5}>
                5 Questions
              </option>

              <option value={6}>
                6 Questions
              </option>

              <option value={7}>
                7 Questions
              </option>

              <option value={8}>
                8 Questions
              </option>

              <option value={9}>
                9 Questions
              </option>

              <option value={10}>
                10 Questions
              </option>
            </select>

          </div>

          <button
            type="button"
            className="ai-quiz-generate-button"
            onClick={
              generateAIQuiz
            }
            disabled={
              generatingQuiz ||
              lecturesLoading ||
              lectures.length === 0
            }
          >
            {generatingQuiz ? (
              <>
                <span className="ai-button-spinner"></span>
                Generating...
              </>
            ) : (
              <>
                ✦ Generate with AI →
              </>
            )}
          </button>

        </div>

        <div className="ai-quiz-generator-note">
          <span>✓</span>

          <p>
            AI-generated questions
            remain a draft until you
            review and create the quiz.
          </p>
        </div>

      </section>

      {/* =====================================================
          EXISTING QUIZZES
          ===================================================== */}

      <section className="instructor-quizzes-overview">

        <div>
          <span>
            COURSE ASSESSMENTS
          </span>

          <h2>
            Existing Quizzes
          </h2>

          <p>
            Quizzes created during
            this instructor session
            are shown here.
          </p>
        </div>

        <div className="instructor-quizzes-count">
          <strong>
            {createdQuizzes.length}
          </strong>

          <span>
            Created
          </span>
        </div>

      </section>

      {createdQuizzes.length >
      0 ? (
        <section className="instructor-quiz-list">

          {createdQuizzes.map(
            (quiz) => (
              <article
                className="instructor-quiz-card"
                key={quiz.id}
              >
                <div className="instructor-quiz-card-icon">
                  ✓
                </div>

                <div className="instructor-quiz-card-content">
                  <span>
                    QUIZ
                  </span>

                  <h3>
                    {quiz.title}
                  </h3>

                  <p>
                    {quiz.questionCount}{" "}
                    {quiz.questionCount ===
                    1
                      ? "question"
                      : "questions"}{" "}
                    added successfully.
                  </p>
                </div>

                <div className="instructor-quiz-card-status">
                  Published
                </div>
              </article>
            )
          )}

        </section>
      ) : (
        <section className="instructor-quizzes-empty">

          <div className="instructor-quizzes-empty-icon">
            ?
          </div>

          <h3>
            No quizzes created yet
          </h3>

          <p>
            Create your first quiz
            manually or generate
            one with AI from a
            lecture transcript.
          </p>

          <button
            type="button"
            onClick={() => {
              setShowCreateQuiz(
                true
              );
              setMessage("");
              setError("");
              setAiGenerated(false);
            }}
          >
            Create Your First Quiz
          </button>

        </section>
      )}

      {/* =====================================================
          QUIZ BUILDER
          ===================================================== */}

      {showCreateQuiz && (
        <section className="instructor-quiz-builder">

          <div className="instructor-quiz-builder-header">

            <div>
              <span>
                {aiGenerated
                  ? "AI DRAFT REVIEW"
                  : "QUIZ BUILDER"}
              </span>

              <h2>
                {aiGenerated
                  ? "Review AI-Generated Quiz"
                  : "Create a New Quiz"}
              </h2>

              <p>
                {aiGenerated
                  ? "Review, edit, or remove the generated questions before creating the quiz."
                  : "Build your assessment question by question."}
              </p>
            </div>

            <button
              type="button"
              className="instructor-quiz-close"
              onClick={
                resetForm
              }
            >
              ×
            </button>

          </div>

          {/* AI DRAFT NOTICE */}

          {aiGenerated && (
            <div className="ai-draft-review-banner">

              <div className="ai-draft-review-icon">
                ✦
              </div>

              <div>
                <strong>
                  AI draft ready for review
                </strong>

                <span>
                  The questions were
                  generated from the
                  selected lecture
                  transcript. Check the
                  wording and correct
                  answers before creating
                  the quiz.
                </span>
              </div>

            </div>
          )}

          <form
            onSubmit={
              handleCreateQuiz
            }
          >

            {/* =================================================
                BASIC QUIZ DETAILS
                ================================================= */}

            <div className="instructor-quiz-basic-grid">

              <div className="instructor-quiz-field full">

                <label htmlFor="title">
                  Quiz Title
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={
                    quizForm.title
                  }
                  onChange={
                    handleQuizChange
                  }
                  placeholder="Example: Java OOP Basics Test"
                />

              </div>

              <div className="instructor-quiz-field full">

                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={
                    quizForm.description
                  }
                  onChange={
                    handleQuizChange
                  }
                  placeholder="Briefly describe what this quiz assesses..."
                  rows={4}
                />

              </div>

            </div>

            {/* =================================================
                QUESTIONS
                ================================================= */}

            <div className="instructor-quiz-questions-section">

              <div className="instructor-quiz-section-title">

                <div>
                  <span>
                    QUESTIONS
                  </span>

                  <h3>
                    {questions.length}{" "}
                    {questions.length ===
                    1
                      ? "Question"
                      : "Questions"}
                  </h3>
                </div>

                <button
                  type="button"
                  className="instructor-quiz-add-question"
                  onClick={
                    addQuestion
                  }
                >
                  + Add Question
                </button>

              </div>

              {questions.map(
                (
                  question,
                  questionIndex
                ) => (
                  <div
                    className="instructor-question-card"
                    key={
                      questionIndex
                    }
                  >

                    <div className="instructor-question-card-header">

                      <div>
                        <span>
                          QUESTION{" "}
                          {questionIndex +
                            1}
                        </span>

                        <h4>
                          {aiGenerated
                            ? "AI-generated assessment item"
                            : "Assessment Item"}
                        </h4>
                      </div>

                      {questions.length >
                        1 && (
                        <button
                          type="button"
                          className="instructor-remove-question"
                          onClick={() =>
                            removeQuestion(
                              questionIndex
                            )
                          }
                        >
                          Remove
                        </button>
                      )}

                    </div>

                    <div className="instructor-question-grid">

                      <div className="instructor-quiz-field full">

                        <label>
                          Question
                        </label>

                        <textarea
                          value={
                            question.question_text
                          }
                          onChange={(
                            event
                          ) =>
                            handleQuestionChange(
                              questionIndex,
                              event.target.value
                            )
                          }
                          placeholder="Enter your question..."
                          rows={3}
                        />

                      </div>

                      <div className="instructor-quiz-field">

                        <label>
                          Question Type
                        </label>

                        <select
                          value={
                            question.question_type
                          }
                          onChange={(
                            event
                          ) =>
                            handleQuestionTypeChange(
                              questionIndex,
                              event.target.value
                            )
                          }
                        >

                          <option value="mcq">
                            Multiple Choice
                          </option>

                          <option value="multi_select">
                            Multi Select
                          </option>

                          <option value="short_answer">
                            Short Answer
                          </option>

                        </select>

                      </div>

                    </div>

                    {question.question_type !==
                      "short_answer" && (

                      <div className="instructor-options-section">

                        <div className="instructor-options-header">

                          <div>
                            <span>
                              OPTIONS
                            </span>

                            <h4>
                              Answer Choices
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              addOption(
                                questionIndex
                              )
                            }
                          >
                            + Add Option
                          </button>

                        </div>

                        <div className="instructor-options-list">

                          {question.options.map(
                            (
                              option,
                              optionIndex
                            ) => (

                              <div
                                className="instructor-option-row"
                                key={
                                  optionIndex
                                }
                              >

                                <input
                                  type={
                                    question.question_type ===
                                    "mcq"
                                      ? "radio"
                                      : "checkbox"
                                  }
                                  name={`correct-${questionIndex}`}
                                  checked={
                                    option.is_correct
                                  }
                                  onChange={() =>
                                    handleCorrectOptionChange(
                                      questionIndex,
                                      optionIndex
                                    )
                                  }
                                />

                                <input
                                  type="text"
                                  value={
                                    option.option_text
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleOptionTextChange(
                                      questionIndex,
                                      optionIndex,
                                      event.target.value
                                    )
                                  }
                                  placeholder={`Option ${
                                    optionIndex +
                                    1
                                  }`}
                                />

                                {question.options.length >
                                  2 && (
                                  <button
                                    type="button"
                                    className="instructor-remove-option"
                                    onClick={() =>
                                      removeOption(
                                        questionIndex,
                                        optionIndex
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                )}

                              </div>

                            )
                          )}

                        </div>

                        <p className="instructor-option-help">
                          Select the correct answer
                          using the control beside
                          each option.
                        </p>

                      </div>

                    )}

                    {question.question_type ===
                      "short_answer" && (

                      <div className="instructor-short-answer-note">

                        <strong>
                          Short-answer question
                        </strong>

                        <span>
                          Students will provide
                          a text response. The
                          current backend does
                          not auto-grade
                          short-answer responses.
                        </span>

                      </div>

                    )}

                  </div>
                )
              )}

            </div>

            {/* =================================================
                SUBMIT
                ================================================= */}

            <div className="instructor-quiz-submit-row">

              <button
                type="button"
                className="instructor-quiz-cancel"
                onClick={
                  resetForm
                }
                disabled={
                  loading
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="instructor-quiz-submit"
                disabled={
                  loading
                }
              >
                {loading
                  ? "Creating Quiz..."
                  : aiGenerated
                  ? "Approve & Create Quiz"
                  : "Create Quiz"}
              </button>

            </div>

          </form>

        </section>
      )}

    </div>
  );
}

export default InstructorQuizzes;