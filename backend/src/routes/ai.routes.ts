import { Router } from "express";
import axios from "axios";
import pool from "../config/database";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

const AI_SERVICE_URL = "http://localhost:8000";

// ============================================================
// AI TUTOR CHAT
// ============================================================

router.post(
  "/chat",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { course_id, question } = req.body;

      const userId = (req.user as any).userId;

      if (!course_id) {
        return res.status(400).json({
          success: false,
          message: "course_id is required",
        });
      }

      if (!question || !question.trim()) {
        return res.status(400).json({
          success: false,
          message: "Question is required",
        });
      }

      // --------------------------------------------------------
      // Check student enrollment
      // --------------------------------------------------------

      const enrollmentResult = await pool.query(
        `
        SELECT id
        FROM enrollments
        WHERE user_id = $1
          AND course_id = $2
          AND status IN ('active', 'completed')
        `,
        [userId, course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course",
        });
      }

      // --------------------------------------------------------
      // Forward request to FastAPI
      // --------------------------------------------------------

      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/ai/chat`,
        {
          course_id,
          question: question.trim(),
        },
        {
          timeout: 120000,
        }
      );

      return res.status(200).json({
        success: true,
        answer: aiResponse.data.answer || "",
        sources: aiResponse.data.sources || [],
      });
    } catch (error: any) {
      console.error(
        "AI chat error:",
        error.response?.data || error.message
      );

      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNRESET"
      ) {
        return res.status(503).json({
          success: false,
          message: "AI service is currently unavailable",
        });
      }

      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED"
      ) {
        return res.status(504).json({
          success: false,
          message: "AI response timed out. Please try again.",
        });
      }

      if (error.response) {
        return res.status(error.response.status || 502).json({
          success: false,
          message:
            error.response.data?.detail ||
            error.response.data?.message ||
            "AI service failed to process the request",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to process AI question",
      });
    }
  }
);

// ============================================================
// LECTURE SUMMARIZATION
// ============================================================

router.post(
  "/summarize",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { lecture_id, course_id } = req.body;

      const userId = (req.user as any).userId;

      if (!lecture_id) {
        return res.status(400).json({
          success: false,
          message: "lecture_id is required",
        });
      }

      if (!course_id) {
        return res.status(400).json({
          success: false,
          message: "course_id is required",
        });
      }

      // --------------------------------------------------------
      // Check student enrollment
      // --------------------------------------------------------

      const enrollmentResult = await pool.query(
        `
        SELECT id
        FROM enrollments
        WHERE user_id = $1
          AND course_id = $2
          AND status IN ('active', 'completed')
        `,
        [userId, course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course",
        });
      }

      // --------------------------------------------------------
      // Get lecture material
      // --------------------------------------------------------

      const lectureResult = await pool.query(
        `
        SELECT
          id,
          title,
          transcript
        FROM lectures
        WHERE id = $1
        LIMIT 1
        `,
        [lecture_id]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found",
        });
      }

      const lecture = lectureResult.rows[0];

      // --------------------------------------------------------
      // Verify lecture belongs to selected course
      // --------------------------------------------------------

      const courseLectureResult = await pool.query(
        `
        SELECT l.id
        FROM lectures l
        JOIN modules m
          ON l.module_id = m.id
        WHERE l.id = $1
          AND m.course_id = $2
        LIMIT 1
        `,
        [lecture_id, course_id]
      );

      if (courseLectureResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "This lecture does not belong to the selected course",
        });
      }

      if (
        !lecture.transcript ||
        !lecture.transcript.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This lecture does not contain transcript material",
        });
      }

      // --------------------------------------------------------
      // Forward to FastAPI
      // --------------------------------------------------------

      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/ai/summarize`,
        {
          lecture_title: lecture.title,
          transcript: lecture.transcript,
        },
        {
          timeout: 120000,
        }
      );

      return res.status(200).json({
        success: true,
        lecture_id: lecture.id,
        lecture_title: lecture.title,
        summary: aiResponse.data.summary || "",
      });
    } catch (error: any) {
      console.error(
        "Lecture summarization error:",
        error.response?.data || error.message
      );

      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNRESET"
      ) {
        return res.status(503).json({
          success: false,
          message: "AI service is currently unavailable",
        });
      }

      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED"
      ) {
        return res.status(504).json({
          success: false,
          message:
            "Lecture summary generation timed out. Please try again.",
        });
      }

      if (error.response) {
        return res.status(error.response.status || 502).json({
          success: false,
          message:
            error.response.data?.detail ||
            error.response.data?.message ||
            "AI service failed to generate the summary",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to generate lecture summary",
      });
    }
  }
);

// ============================================================
// AI QUIZ GENERATION
// Instructor/Admin only
// ============================================================

router.post(
  "/generate-quiz",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const {
        module_id,
        lecture_id,
        question_count,
      } = req.body;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // --------------------------------------------------------
      // Validate request
      // --------------------------------------------------------

      if (!module_id) {
        return res.status(400).json({
          success: false,
          message: "module_id is required",
        });
      }

      if (!lecture_id) {
        return res.status(400).json({
          success: false,
          message: "lecture_id is required",
        });
      }

      let count = Number(question_count || 5);

      if (!Number.isFinite(count)) {
        count = 5;
      }

      count = Math.round(count);

      if (count < 5) {
        count = 5;
      }

      if (count > 10) {
        count = 10;
      }

      // --------------------------------------------------------
      // Verify module and course ownership
      // --------------------------------------------------------

      const moduleResult = await pool.query(
        `
        SELECT
          m.id AS module_id,
          m.course_id,
          c.instructor_id
        FROM modules m
        JOIN courses c
          ON m.course_id = c.id
        WHERE m.id = $1
        LIMIT 1
        `,
        [module_id]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found",
        });
      }

      const module = moduleResult.rows[0];

      if (
        userRole !== "admin" &&
        module.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can generate quizzes only for your own courses",
        });
      }

      // --------------------------------------------------------
      // Verify lecture belongs to module
      // --------------------------------------------------------

      const lectureResult = await pool.query(
        `
        SELECT
          l.id,
          l.title,
          l.transcript
        FROM lectures l
        WHERE l.id = $1
          AND l.module_id = $2
        LIMIT 1
        `,
        [lecture_id, module_id]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Lecture not found in the selected module",
        });
      }

      const lecture = lectureResult.rows[0];

      // --------------------------------------------------------
      // Transcript is required
      // --------------------------------------------------------

      if (
        !lecture.transcript ||
        !lecture.transcript.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This lecture does not contain transcript material",
        });
      }

      // --------------------------------------------------------
      // Forward request to FastAPI
      //
      // IMPORTANT:
      // Local Llama 3.2 is CPU-only and currently takes around
      // 165 seconds to generate a quiz.
      //
      // 300000 ms = 5 minutes
      // --------------------------------------------------------

      console.log(
        `[AI Quiz] Generating ${count} questions for lecture: ${lecture.title}`
      );

      const aiStart = Date.now();

      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/ai/generate-quiz`,
        {
          lecture_title: lecture.title,
          transcript: lecture.transcript,
          question_count: count,
        },
        {
          timeout: 300000,
        }
      );

      const aiElapsed =
        (Date.now() - aiStart) / 1000;

      console.log(
        `[AI Quiz] FastAPI response received in ${aiElapsed.toFixed(
          2
        )}s`
      );

      return res.status(200).json({
        success: true,
        module_id,
        lecture_id,
        lecture_title: lecture.title,
        questions:
          aiResponse.data.questions || [],
      });
    } catch (error: any) {
      console.error(
        "AI quiz generation error:",
        error.response?.data || error.message
      );

      // --------------------------------------------------------
      // AI service unavailable
      // --------------------------------------------------------

      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNRESET"
      ) {
        return res.status(503).json({
          success: false,
          message:
            "AI service is currently unavailable",
        });
      }

      // --------------------------------------------------------
      // Node -> FastAPI timeout
      // --------------------------------------------------------

      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED"
      ) {
        return res.status(504).json({
          success: false,
          message:
            "AI quiz generation timed out. Please try again.",
        });
      }

      // --------------------------------------------------------
      // FastAPI returned an error
      // --------------------------------------------------------

      if (error.response) {
        return res.status(
          error.response.status || 502
        ).json({
          success: false,
          message:
            error.response.data?.detail ||
            error.response.data?.message ||
            "AI service failed to generate the quiz",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate AI quiz",
      });
    }
  }
);


// ============================================================
// AI PERSONALIZED STUDY PLAN
// Student only
// ============================================================

router.post(
  "/study-plan",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const userId = (req.user as any).userId;

      // --------------------------------------------------------
      // Get course ID
      // --------------------------------------------------------

      const { course_id } = req.body;

      if (!course_id) {
        return res.status(400).json({
          success: false,
          message: "course_id is required",
        });
      }

      // --------------------------------------------------------
      // Verify student enrollment
      // --------------------------------------------------------

      const enrollmentResult = await pool.query(
        `
        SELECT id
        FROM enrollments
        WHERE user_id = $1
          AND course_id = $2
          AND status IN ('active', 'completed')
        LIMIT 1
        `,
        [userId, course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course",
        });
      }

      // --------------------------------------------------------
      // Get completed quiz history
      // --------------------------------------------------------

      const quizHistoryResult = await pool.query(
        `
        SELECT
          qa.id AS attempt_id,
          qa.score,
          qa.started_at,
          qa.submitted_at,
          q.id AS quiz_id,
          q.title AS quiz_title,
          m.id AS module_id,
          m.title AS module_title
        FROM quiz_attempts qa
        JOIN quizzes q
          ON qa.quiz_id = q.id
        JOIN modules m
          ON q.module_id = m.id
        WHERE qa.user_id = $1
          AND m.course_id = $2
          AND qa.submitted_at IS NOT NULL
          AND qa.score IS NOT NULL
        ORDER BY qa.submitted_at DESC
        `,
        [userId, course_id]
      );

      const quizHistory =
        quizHistoryResult.rows.map((row) => ({
          attempt_id: row.attempt_id,
          quiz_id: row.quiz_id,
          quiz_title: row.quiz_title,
          module_id: row.module_id,
          module_title: row.module_title,
          score: Number(row.score),
          submitted_at: row.submitted_at,
        }));

      // --------------------------------------------------------
      // Need quiz history to personalize the plan
      // --------------------------------------------------------

      if (quizHistory.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Complete at least one quiz before generating a personalized study plan.",
        });
      }

      // --------------------------------------------------------
      // Forward performance data to FastAPI
      // --------------------------------------------------------

      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/ai/study-plan`,
        {
          course_id,
          quiz_history: quizHistory,
        },
        {
          timeout: 300000,
        }
      );

      const generatedPlan =
        aiResponse.data?.plan;

      if (!generatedPlan) {
        return res.status(502).json({
          success: false,
          message:
            "AI did not return a study plan",
        });
      }

      // --------------------------------------------------------
      // Save latest plan
      // --------------------------------------------------------

      const savedPlanResult = await pool.query(
        `
        INSERT INTO study_plans (
          user_id,
          course_id,
          plan_json
        )
        VALUES ($1, $2, $3::jsonb)
        RETURNING id, user_id, course_id, plan_json, generated_at
        `,
        [
          userId,
          course_id,
          JSON.stringify(generatedPlan),
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          "Personalized study plan generated successfully",
        plan: savedPlanResult.rows[0],
      });
    } catch (error: any) {
      console.error(
        "AI study plan generation error:",
        error.response?.data ||
          error.message
      );

      // --------------------------------------------------------
      // AI service unavailable
      // --------------------------------------------------------

      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNRESET"
      ) {
        return res.status(503).json({
          success: false,
          message:
            "AI service is currently unavailable",
        });
      }

      // --------------------------------------------------------
      // AI service timed out
      // --------------------------------------------------------

      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED"
      ) {
        return res.status(504).json({
          success: false,
          message:
            "Study plan generation timed out. Please try again.",
        });
      }

      // --------------------------------------------------------
      // FastAPI returned an error
      // --------------------------------------------------------

      if (error.response) {
        return res.status(
          error.response.status || 502
        ).json({
          success: false,
          message:
            error.response.data?.detail ||
            error.response.data?.message ||
            "AI service failed to generate the study plan",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate personalized study plan",
      });
    }
  }
);


export default router;