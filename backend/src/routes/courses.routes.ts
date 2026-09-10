import { Router } from "express";
import pool from "../config/database";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { uploadAssignment } from "../middleware/upload.middleware";
import { uploadVideo } from "../middleware/videoUpload.middleware";
import { uploadResource } from "../middleware/resourceUpload.middleware";

const router = Router();
 
//create courses protected and authorization is needed
router.post(
  "/",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      if (!req.user || typeof req.user === "string") {
        return res.status(401).json({
          success: false,
          message: "Invalid user information"
        });
      }

      const { title, description, category, difficulty, thumbnail_url, price } =
        req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Course title is required"
        });
      }

      const userId = (req.user as any).userId;

      const result = await pool.query(
        `INSERT INTO courses
          (instructor_id, title, description, category, difficulty, thumbnail_url, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          title,
          description || null,
          category || null,
          difficulty || null,
          thumbnail_url || null,
          price || 0
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Course created successfully",
        course: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating course:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create course"
      });
    }
  }
);

//to see the courses (public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          id,
          instructor_id,
          title,
          description,
          category,
          difficulty,
          thumbnail_url,
          price,
          status,
          created_at
       FROM courses
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      courses: result.rows
    });

  } catch (error) {
    console.error("Error fetching courses:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses"
    });
  }
});
// ============================================================
// GET MY ENROLLED COURSES
// ============================================================

router.get(
  "/my-courses",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const userId = (req.user as any).userId;

      const result = await pool.query(
        `SELECT
           e.id AS enrollment_id,
           e.status AS enrollment_status,
           e.enrolled_at,
           e.completed_at,

           c.id AS course_id,
           c.title,
           c.description,
           c.category,
           c.difficulty,
           c.thumbnail_url,
           c.price,

           COUNT(DISTINCT l.id) AS total_lectures,

           COUNT(DISTINCT l.id) FILTER (
             WHERE lp.is_completed = TRUE
           ) AS completed_lectures,

           CASE
             WHEN COUNT(DISTINCT l.id) = 0 THEN 0
             ELSE ROUND(
               (
                 COUNT(DISTINCT l.id) FILTER (
                   WHERE lp.is_completed = TRUE
                 ) * 100.0
               ) / COUNT(DISTINCT l.id),
               2
             )
           END AS progress_percent

         FROM enrollments e

         JOIN courses c
           ON e.course_id = c.id

         LEFT JOIN modules m
           ON m.course_id = c.id

         LEFT JOIN lectures l
           ON l.module_id = m.id

         LEFT JOIN lecture_progress lp
           ON lp.lecture_id = l.id
          AND lp.user_id = $1

         WHERE e.user_id = $1

         GROUP BY
           e.id,
           e.status,
           e.enrolled_at,
           e.completed_at,
           c.id,
           c.title,
           c.description,
           c.category,
           c.difficulty,
           c.thumbnail_url,
           c.price

         ORDER BY e.enrolled_at DESC`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        courses: result.rows
      });

    } catch (error) {
      console.error("Error fetching enrolled courses:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch enrolled courses"
      });
    }
  }
);

// ============================================================
// GET MY COURSES - INSTRUCTOR
// ============================================================

router.get(
  "/instructor-courses",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      let result;

      if (userRole === "admin") {
        result = await pool.query(
          `SELECT
             c.id,
             c.instructor_id,
             c.title,
             c.description,
             c.category,
             c.difficulty,
             c.thumbnail_url,
             c.price,
             c.status,
             c.created_at,
             COUNT(DISTINCT m.id) AS module_count,
             COUNT(DISTINCT l.id) AS lecture_count
           FROM courses c
           LEFT JOIN modules m
             ON m.course_id = c.id
           LEFT JOIN lectures l
             ON l.module_id = m.id
           GROUP BY c.id
           ORDER BY c.created_at DESC`
        );
      } else {
        result = await pool.query(
          `SELECT
             c.id,
             c.instructor_id,
             c.title,
             c.description,
             c.category,
             c.difficulty,
             c.thumbnail_url,
             c.price,
             c.status,
             c.created_at,
             COUNT(DISTINCT m.id) AS module_count,
             COUNT(DISTINCT l.id) AS lecture_count
           FROM courses c
           LEFT JOIN modules m
             ON m.course_id = c.id
           LEFT JOIN lectures l
             ON l.module_id = m.id
           WHERE c.instructor_id = $1
           GROUP BY c.id
           ORDER BY c.created_at DESC`,
          [userId]
        );
      }

      return res.status(200).json({
        success: true,
        courses: result.rows,
      });
    } catch (error) {
      console.error("Error fetching instructor courses:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch instructor courses",
      });
    }
  }
);

//to get one particular course
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Get course
    // --------------------------------------------------------
    const courseResult = await pool.query(
      `SELECT
         id,
         instructor_id,
         title,
         description,
         category,
         difficulty,
         thumbnail_url,
         price,
         status,
         created_at
       FROM courses
       WHERE id = $1`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const course = courseResult.rows[0];

    // --------------------------------------------------------
    // Get modules
    // --------------------------------------------------------
    const modulesResult = await pool.query(
      `SELECT
         id,
         title,
         order_index
       FROM modules
       WHERE course_id = $1
       ORDER BY order_index`,
      [id]
    );
    

    // --------------------------------------------------------
    // Get lectures
    // --------------------------------------------------------
    const lecturesResult = await pool.query(
      `SELECT
         l.id,
         l.module_id,
         l.title,
         l.video_url,
         l.duration_seconds,
         l.order_index
       FROM lectures l
       JOIN modules m
         ON l.module_id = m.id
       WHERE m.course_id = $1
       ORDER BY m.order_index, l.order_index`,
      [id]
    );

    // --------------------------------------------------------
    // Build module → lectures structure
    // --------------------------------------------------------
    const modules = modulesResult.rows.map((module) => ({
      ...module,
      lectures: lecturesResult.rows.filter(
        (lecture) => lecture.module_id === module.id
      ),
    }));

    return res.status(200).json({
      success: true,
      course: {
        ...course,
        modules,
      },
    });

  } catch (error) {
    console.error("Error fetching course details:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch course details",
    });
  }
});

// ============================================================
// GET CURRENT STUDENT PROFILE
// ============================================================

router.get(
  "/profile/me",
  authenticateToken,
  authorizeRoles("student", "instructor", "admin"),
  async (req, res) => {
    try {
      const userId = (req.user as any).userId;

      const result = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.email,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              WHERE ur.user_id = u.id
                AND r.name = 'admin'
            ) THEN 'admin'

            WHEN EXISTS (
              SELECT 1
              FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              WHERE ur.user_id = u.id
                AND r.name = 'instructor'
            ) THEN 'instructor'

            ELSE 'student'
          END AS role
        FROM users u
        WHERE u.id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User profile not found"
        });
      }

      return res.status(200).json({
        success: true,
        user: result.rows[0]
      });

    } catch (error) {
      console.error("Profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load profile"
      });
    }
  }
);

//to edit one particular course by that instructor only
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.user || typeof req.user === "string") {
        return res.status(401).json({
          success: false,
          message: "Invalid user information"
        });
      }

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      const {
        title,
        description,
        category,
        difficulty,
        thumbnail_url,
        price
      } = req.body;

      // First find the course
      const courseResult = await pool.query(
        `SELECT * FROM courses WHERE id = $1`,
        [id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      // Admin can update any course.
      // Instructor can update only their own course.
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can update only your own courses"
        });
      }

      const result = await pool.query(
        `UPDATE courses
         SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           difficulty = COALESCE($4, difficulty),
           thumbnail_url = COALESCE($5, thumbnail_url),
           price = COALESCE($6, price)
         WHERE id = $7
         RETURNING *`,
        [
          title,
          description,
          category,
          difficulty,
          thumbnail_url,
          price,
          id
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Course updated successfully",
        course: result.rows[0]
      });

    } catch (error) {
      console.error("Error updating course:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update course"
      });
    }
  }
);

//delete course
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.user || typeof req.user === "string") {
        return res.status(401).json({
          success: false,
          message: "Invalid user information"
        });
      }

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Find the course first
      const courseResult = await pool.query(
        `SELECT id, instructor_id
         FROM courses
         WHERE id = $1`,
        [id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      // Admin can delete any course.
      // Instructor can delete only their own course.
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can delete only your own courses"
        });
      }

      await pool.query(
        `DELETE FROM courses
         WHERE id = $1`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: "Course deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting course:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete course"
      });
    }
  }
); 

router.post(
  "/:courseId/modules",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, order_index } = req.body;

      if (!title || order_index === undefined) {
        return res.status(400).json({
          success: false,
          message: "Title and order_index are required"
        });
      }

      // Check whether the course exists
      const courseResult = await pool.query(
        `SELECT id, instructor_id
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only the course instructor or admin can create modules
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can add modules only to your own courses"
        });
      }

      const result = await pool.query(
        `INSERT INTO modules (course_id, title, order_index)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [courseId, title, order_index]
      );

      return res.status(201).json({
        success: true,
        message: "Module created successfully",
        module: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating module:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create module"
      });
    }
  }
);

//get all modules for this course
router.get(
  "/:courseId/modules",
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const result = await pool.query(
        `SELECT id, course_id, title, order_index
         FROM modules
         WHERE course_id = $1
         ORDER BY order_index`,
        [courseId]
      );

      return res.status(200).json({
        success: true,
        modules: result.rows
      });

    } catch (error) {
      console.error("Error fetching modules:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch modules"
      });
    }
  }
);

// ============================================================
// UPLOAD VIDEO + CREATE LECTURE
// Instructor/Admin
// ============================================================

router.post(
  "/modules/:moduleId/lectures/upload",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  uploadVideo.single("video"),
  async (req, res) => {
    try {
      const { moduleId } = req.params;

      const {
        title,
        transcript,
        duration_seconds,
        order_index,
        resource_urls,
      } = req.body;

      if (!title || order_index === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "Title and order_index are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      // --------------------------------------------------------
      // Check module
      // --------------------------------------------------------

      const moduleResult = await pool.query(
        `SELECT
           id,
           course_id
         FROM modules
         WHERE id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found",
        });
      }

      const module = moduleResult.rows[0];

      // --------------------------------------------------------
      // Check course ownership
      // --------------------------------------------------------

      const courseResult = await pool.query(
        `SELECT
           instructor_id
         FROM courses
         WHERE id = $1`,
        [module.course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can add lectures only to your own courses",
        });
      }

      // --------------------------------------------------------
      // Create URL for uploaded video
      // --------------------------------------------------------

      const videoUrl =
        `/uploads/videos/${req.file.filename}`;

      // --------------------------------------------------------
      // Create lecture
      // --------------------------------------------------------

      const result = await pool.query(
        `INSERT INTO lectures (
           module_id,
           title,
           video_url,
           transcript,
           duration_seconds,
           order_index,
           resource_urls
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          moduleId,
          title.trim(),
          videoUrl,
          transcript?.trim() || null,
          duration_seconds
            ? Number(duration_seconds)
            : null,
          Number(order_index),
          resource_urls || null,
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Lecture video uploaded successfully",
        lecture: result.rows[0],
      });
    } catch (error: any) {
      console.error(
        "Error uploading lecture video:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to upload lecture video",
      });
    }
  }
);

// ============================================================
// UPLOAD PDF / PPT / PPTX RESOURCE FOR A LECTURE
// Instructor/Admin
// ============================================================

router.post(
  "/modules/:moduleId/lectures/:lectureId/resources/upload",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  uploadResource.single("file"),
  async (req, res) => {
    try {
      const {
        moduleId,
        lectureId,
      } = req.params;

      // --------------------------------------------------------
      // Validate uploaded file
      // --------------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "PDF or slide file is required",
        });
      }

      // --------------------------------------------------------
      // Find lecture + course
      // --------------------------------------------------------

      const lectureResult = await pool.query(
        `
        SELECT
          l.id,
          l.title,
          l.module_id,
          m.course_id,
          c.instructor_id
        FROM lectures l

        JOIN modules m
          ON l.module_id = m.id

        JOIN courses c
          ON m.course_id = c.id

        WHERE l.id = $1
          AND l.module_id = $2
        `,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found",
        });
      }

      const lecture =
        lectureResult.rows[0];

      // --------------------------------------------------------
      // Check course ownership
      // --------------------------------------------------------

      const userId =
        (req.user as any).userId;

      const userRole =
        (req.user as any).role;

      if (
        userRole !== "admin" &&
        lecture.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can upload resources only to your own courses",
        });
      }

      // --------------------------------------------------------
      // Build resource URL
      // --------------------------------------------------------

      const resourceUrl =
        `/uploads/resources/${req.file.filename}`;

      // --------------------------------------------------------
      // Add resource URL to resource_urls TEXT[]
      // --------------------------------------------------------

      const result = await pool.query(
        `
        UPDATE lectures

        SET resource_urls =
          array_append(
            COALESCE(
              resource_urls,
              ARRAY[]::TEXT[]
            ),
            $1
          )

        WHERE id = $2
          AND module_id = $3

        RETURNING
          id,
          module_id,
          title,
          video_url,
          transcript,
          duration_seconds,
          order_index,
          resource_urls
        `,
        [
          resourceUrl,
          lectureId,
          moduleId,
        ]
      );

      return res.status(201).json({
        success: true,
        message:
          "Resource uploaded successfully",

        resource: {
          url: resourceUrl,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },

        lecture: result.rows[0],
      });

    } catch (error: any) {
      console.error(
        "Error uploading lecture resource:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to upload lecture resource",
      });
    }
  }
);

// ============================================================
// DELETE PDF / PPT / PPTX RESOURCE
// Instructor/Admin
// ============================================================

router.delete(
  "/modules/:moduleId/lectures/:lectureId/resources",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const {
        moduleId,
        lectureId,
      } = req.params;

      const { resource_url } = req.body;

      if (!resource_url) {
        return res.status(400).json({
          success: false,
          message: "resource_url is required",
        });
      }

      // --------------------------------------------------------
      // Find lecture + ownership
      // --------------------------------------------------------

      const lectureResult = await pool.query(
        `
        SELECT
          l.id,
          l.module_id,
          m.course_id,
          c.instructor_id
        FROM lectures l

        JOIN modules m
          ON l.module_id = m.id

        JOIN courses c
          ON m.course_id = c.id

        WHERE l.id = $1
          AND l.module_id = $2
        `,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found",
        });
      }

      const lecture =
        lectureResult.rows[0];

      const userId =
        (req.user as any).userId;

      const userRole =
        (req.user as any).role;

      if (
        userRole !== "admin" &&
        lecture.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can delete resources only from your own courses",
        });
      }

      // --------------------------------------------------------
      // Remove resource URL from TEXT[]
      // --------------------------------------------------------

      const result = await pool.query(
        `
        UPDATE lectures

        SET resource_urls =
          array_remove(
            COALESCE(
              resource_urls,
              ARRAY[]::TEXT[]
            ),
            $1
          )

        WHERE id = $2
          AND module_id = $3

        RETURNING
          id,
          resource_urls
        `,
        [
          resource_url,
          lectureId,
          moduleId,
        ]
      );

      // --------------------------------------------------------
      // Check whether resource existed
      // --------------------------------------------------------

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Resource removed successfully",
        lecture: result.rows[0],
      });

    } catch (error) {
      console.error(
        "Error deleting lecture resource:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete lecture resource",
      });
    }
  }
);

router.post(
  "/modules/:moduleId/lectures",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { moduleId } = req.params;

      const {
        title,
        video_url,
        transcript,
        duration_seconds,
        order_index,
        resource_urls
      } = req.body;

      // Validate required fields
      if (!title || order_index === undefined) {
        return res.status(400).json({
          success: false,
          message: "Title and order_index are required"
        });
      }

      // Check whether the module exists
      const moduleResult = await pool.query(
        `SELECT id, course_id
         FROM modules
         WHERE id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      const module = moduleResult.rows[0];

      // Get the course owner
      const courseResult = await pool.query(
        `SELECT instructor_id
         FROM courses
         WHERE id = $1`,
        [module.course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only course instructor or admin can create lectures
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can add lectures only to your own courses"
        });
      }

      // Insert lecture
      const result = await pool.query(
        `INSERT INTO lectures (
          module_id,
          title,
          video_url,
          transcript,
          duration_seconds,
          order_index,
          resource_urls
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          moduleId,
          title,
          video_url || null,
          transcript || null,
          duration_seconds || null,
          order_index,
          resource_urls || null
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Lecture created successfully",
        lecture: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating lecture:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create lecture"
      });
    }
  }
);

//get lectures
router.get(
  "/modules/:moduleId/lectures",
  async (req, res) => {
    try {
      const { moduleId } = req.params;

      // Check whether the module exists
      const moduleResult = await pool.query(
        `SELECT id
         FROM modules
         WHERE id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      // Fetch lectures belonging to this module
      const result = await pool.query(
        `SELECT
           id,
           module_id,
           title,
           video_url,
           transcript,
           duration_seconds,
           order_index,
           resource_urls
         FROM lectures
         WHERE module_id = $1
         ORDER BY order_index`,
        [moduleId]
      );

      return res.status(200).json({
        success: true,
        lectures: result.rows
      });

    } catch (error) {
      console.error("Error fetching lectures:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch lectures"
      });
    }
  }
);

router.put(
  "/modules/:moduleId/lectures/:lectureId",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;

      const {
        title,
        video_url,
        transcript,
        duration_seconds,
        order_index,
        resource_urls
      } = req.body;

      // Check whether lecture exists in this module
      const lectureResult = await pool.query(
        `SELECT l.id, m.course_id
         FROM lectures l
         JOIN modules m ON l.module_id = m.id
         WHERE l.id = $1 AND l.module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      const lecture = lectureResult.rows[0];

      // Get course instructor
      const courseResult = await pool.query(
        `SELECT instructor_id
         FROM courses
         WHERE id = $1`,
        [lecture.course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only owner or admin can update lecture
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can update lectures only in your own courses"
        });
      }

      const result = await pool.query(
        `UPDATE lectures
         SET
           title = COALESCE($1, title),
           video_url = COALESCE($2, video_url),
           transcript = COALESCE($3, transcript),
           duration_seconds = COALESCE($4, duration_seconds),
           order_index = COALESCE($5, order_index),
           resource_urls = COALESCE($6, resource_urls)
         WHERE id = $7
         RETURNING *`,
        [
          title,
          video_url,
          transcript,
          duration_seconds,
          order_index,
          resource_urls,
          lectureId
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Lecture updated successfully",
        lecture: result.rows[0]
      });

    } catch (error) {
      console.error("Error updating lecture:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update lecture"
      });
    }
  }
);

router.delete(
  "/modules/:moduleId/lectures/:lectureId",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;

      // Check lecture and get its course
      const lectureResult = await pool.query(
        `SELECT l.id, m.course_id
         FROM lectures l
         JOIN modules m ON l.module_id = m.id
         WHERE l.id = $1 AND l.module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      const lecture = lectureResult.rows[0];

      // Get course instructor
      const courseResult = await pool.query(
        `SELECT instructor_id
         FROM courses
         WHERE id = $1`,
        [lecture.course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only course instructor or admin can delete
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can delete lectures only from your own courses"
        });
      }

      await pool.query(
        `DELETE FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      return res.status(200).json({
        success: true,
        message: "Lecture deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting lecture:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete lecture"
      });
    }
  }
);

router.put(
  "/:courseId/modules/:moduleId",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId, moduleId } = req.params;
      const { title, order_index } = req.body;

      // Check module
      const moduleResult = await pool.query(
        `SELECT id
         FROM modules
         WHERE id = $1 AND course_id = $2`,
        [moduleId, courseId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      // Check course ownership
      const courseResult = await pool.query(
        `SELECT instructor_id
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can update modules only in your own courses"
        });
      }

      const result = await pool.query(
        `UPDATE modules
         SET
           title = COALESCE($1, title),
           order_index = COALESCE($2, order_index)
         WHERE id = $3 AND course_id = $4
         RETURNING *`,
        [title, order_index, moduleId, courseId]
      );

      return res.status(200).json({
        success: true,
        message: "Module updated successfully",
        module: result.rows[0]
      });

    } catch (error) {
      console.error("Error updating module:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update module"
      });
    }
  }
);

router.delete(
  "/:courseId/modules/:moduleId",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId, moduleId } = req.params;

      // Check whether the module belongs to this course
      const moduleResult = await pool.query(
        `SELECT id
         FROM modules
         WHERE id = $1 AND course_id = $2`,
        [moduleId, courseId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      // Check course ownership
      const courseResult = await pool.query(
        `SELECT instructor_id
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only the course instructor or admin can delete
      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can delete modules only from your own courses"
        });
      }

      await pool.query(
        `DELETE FROM modules
         WHERE id = $1 AND course_id = $2`,
        [moduleId, courseId]
      );

      return res.status(200).json({
        success: true,
        message: "Module deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting module:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete module"
      });
    }
  }
);

// ============================================================
// LECTURE PROGRESS
// ============================================================

router.put(
  "/modules/:moduleId/lectures/:lectureId/progress",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;
      const { progress_seconds, is_completed } = req.body;

      if (progress_seconds === undefined) {
        return res.status(400).json({
          success: false,
          message: "progress_seconds is required"
        });
      }

      if (progress_seconds < 0) {
        return res.status(400).json({
          success: false,
          message: "progress_seconds cannot be negative"
        });
      }

      const userId = (req.user as any).userId;

      // Check whether lecture belongs to the given module
      const lectureResult = await pool.query(
        `SELECT id
         FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      const result = await pool.query(
        `INSERT INTO lecture_progress
          (user_id, lecture_id, progress_seconds, is_completed, completed_at)
         VALUES ($1, $2, $3, $4,
                 CASE
                   WHEN $4 = TRUE THEN now()
                   ELSE NULL
                 END)
         ON CONFLICT (user_id, lecture_id)
         DO UPDATE SET
           progress_seconds = EXCLUDED.progress_seconds,
           is_completed = EXCLUDED.is_completed,
           completed_at =
             CASE
               WHEN EXCLUDED.is_completed = TRUE
                 THEN COALESCE(lecture_progress.completed_at, now())
               ELSE NULL
             END,
           updated_at = now()
         RETURNING *`,
        [
          userId,
          lectureId,
          progress_seconds,
          is_completed === true
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Lecture progress updated successfully",
        progress: result.rows[0]
      });

    } catch (error) {
      console.error("Error updating lecture progress:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update lecture progress"
      });
    }
  }
);


router.get(
  "/modules/:moduleId/lectures/:lectureId/progress",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;
      const userId = (req.user as any).userId;

      // Check whether lecture belongs to the given module
      const lectureResult = await pool.query(
        `SELECT id
         FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      const result = await pool.query(
        `SELECT *
         FROM lecture_progress
         WHERE user_id = $1 AND lecture_id = $2`,
        [userId, lectureId]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          success: true,
          progress: {
            progress_seconds: 0,
            is_completed: false,
            completed_at: null
          }
        });
      }

      return res.status(200).json({
        success: true,
        progress: result.rows[0]
      });

    } catch (error) {
      console.error("Error fetching lecture progress:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch lecture progress"
      });
    }
  }
);

// ============================================================
// LECTURE NOTES
// ============================================================

router.post(
  "/modules/:moduleId/lectures/:lectureId/notes",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;
      const { content, timestamp_seconds } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Note content is required"
        });
      }

      if (
        timestamp_seconds !== undefined &&
        (timestamp_seconds < 0 || !Number.isInteger(timestamp_seconds))
      ) {
        return res.status(400).json({
          success: false,
          message: "timestamp_seconds must be a non-negative integer"
        });
      }

      const userId = (req.user as any).userId;

      // Check that the lecture belongs to the given module
      const lectureResult = await pool.query(
        `SELECT id
         FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      const result = await pool.query(
        `INSERT INTO notes (
          user_id,
          lecture_id,
          content,
          timestamp_seconds
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          userId,
          lectureId,
          content.trim(),
          timestamp_seconds ?? null
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Note created successfully",
        note: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating note:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create note"
      });
    }
  }
);

router.get(
  "/modules/:moduleId/lectures/:lectureId/notes",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;
      const userId = (req.user as any).userId;

      // Check that the lecture belongs to the module
      const lectureResult = await pool.query(
        `SELECT id
         FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      // Get only this student's notes
      const result = await pool.query(
        `SELECT
           id,
           user_id,
           lecture_id,
           content,
           timestamp_seconds,
           created_at,
           updated_at
         FROM notes
         WHERE user_id = $1
           AND lecture_id = $2
         ORDER BY timestamp_seconds ASC NULLS LAST, created_at ASC`,
        [userId, lectureId]
      );

      return res.status(200).json({
        success: true,
        notes: result.rows
      });

    } catch (error) {
      console.error("Error fetching notes:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch notes"
      });
    }
  }
);

router.put(
  "/modules/:moduleId/lectures/:lectureId/notes/:noteId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId, noteId } = req.params;
      const { content, timestamp_seconds } = req.body;

      const userId = (req.user as any).userId;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Note content is required"
        });
      }

      if (
        timestamp_seconds !== undefined &&
        (timestamp_seconds < 0 || !Number.isInteger(timestamp_seconds))
      ) {
        return res.status(400).json({
          success: false,
          message: "timestamp_seconds must be a non-negative integer"
        });
      }

      // Make sure the note belongs to this lecture and this student
      const noteResult = await pool.query(
        `SELECT n.id
         FROM notes n
         JOIN lectures l ON n.lecture_id = l.id
         WHERE n.id = $1
           AND n.user_id = $2
           AND n.lecture_id = $3
           AND l.module_id = $4`,
        [noteId, userId, lectureId, moduleId]
      );

      if (noteResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Note not found"
        });
      }

      const result = await pool.query(
        `UPDATE notes
         SET
           content = $1,
           timestamp_seconds = $2,
           updated_at = now()
         WHERE id = $3
           AND user_id = $4
         RETURNING *`,
        [
          content.trim(),
          timestamp_seconds ?? null,
          noteId,
          userId
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Note updated successfully",
        note: result.rows[0]
      });

    } catch (error) {
      console.error("Error updating note:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update note"
      });
    }
  }
);

// ============================================================
// DELETE LECTURE NOTE
// ============================================================

router.delete(
  "/modules/:moduleId/lectures/:lectureId/notes/:noteId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId, noteId } = req.params;
      const userId = (req.user as any).userId;

      // Verify that this note belongs to this student,
      // this lecture, and this module
      const noteResult = await pool.query(
        `SELECT n.id
         FROM notes n
         JOIN lectures l ON n.lecture_id = l.id
         WHERE n.id = $1
           AND n.user_id = $2
           AND n.lecture_id = $3
           AND l.module_id = $4`,
        [noteId, userId, lectureId, moduleId]
      );

      if (noteResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Note not found"
        });
      }

      await pool.query(
        `DELETE FROM notes
         WHERE id = $1
           AND user_id = $2`,
        [noteId, userId]
      );

      return res.status(200).json({
        success: true,
        message: "Note deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting note:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete note"
      });
    }
  }
);

// ============================================================
// LECTURE BOOKMARKS
// ============================================================

router.post(
  "/modules/:moduleId/lectures/:lectureId/bookmarks",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;
      const { timestamp_seconds } = req.body;

      if (
        timestamp_seconds === undefined ||
        !Number.isInteger(timestamp_seconds) ||
        timestamp_seconds < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "timestamp_seconds must be a non-negative integer"
        });
      }

      const userId = (req.user as any).userId;

      // Make sure the lecture belongs to this module
      const lectureResult = await pool.query(
        `SELECT id
         FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      const result = await pool.query(
        `INSERT INTO bookmarks (
          user_id,
          lecture_id,
          timestamp_seconds
        )
        VALUES ($1, $2, $3)
        RETURNING *`,
        [userId, lectureId, timestamp_seconds]
      );

      return res.status(201).json({
        success: true,
        message: "Bookmark created successfully",
        bookmark: result.rows[0]
      });

    } catch (error: any) {
      console.error("Error creating bookmark:", error);

      // Duplicate bookmark
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Bookmark already exists at this timestamp"
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create bookmark"
      });
    }
  }
);

// ============================================================
// GET LECTURE BOOKMARKS
// ============================================================

router.get(
  "/modules/:moduleId/lectures/:lectureId/bookmarks",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId } = req.params;
      const userId = (req.user as any).userId;

      // Check that the lecture belongs to this module
      const lectureResult = await pool.query(
        `SELECT id
         FROM lectures
         WHERE id = $1 AND module_id = $2`,
        [lectureId, moduleId]
      );

      if (lectureResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lecture not found"
        });
      }

      // Get only this student's bookmarks
      const result = await pool.query(
        `SELECT
           id,
           user_id,
           lecture_id,
           timestamp_seconds,
           created_at
         FROM bookmarks
         WHERE user_id = $1
           AND lecture_id = $2
         ORDER BY timestamp_seconds ASC`,
        [userId, lectureId]
      );

      return res.status(200).json({
        success: true,
        bookmarks: result.rows
      });

    } catch (error) {
      console.error("Error fetching bookmarks:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch bookmarks"
      });
    }
  }
);


// ============================================================
// DELETE LECTURE BOOKMARK
// ============================================================

router.delete(
  "/modules/:moduleId/lectures/:lectureId/bookmarks/:bookmarkId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId, lectureId, bookmarkId } = req.params;
      const userId = (req.user as any).userId;

      // Make sure this bookmark belongs to this student,
      // lecture, and module
      const bookmarkResult = await pool.query(
        `SELECT b.id
         FROM bookmarks b
         JOIN lectures l ON b.lecture_id = l.id
         WHERE b.id = $1
           AND b.user_id = $2
           AND b.lecture_id = $3
           AND l.module_id = $4`,
        [bookmarkId, userId, lectureId, moduleId]
      );

      if (bookmarkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Bookmark not found"
        });
      }

      await pool.query(
        `DELETE FROM bookmarks
         WHERE id = $1
           AND user_id = $2`,
        [bookmarkId, userId]
      );

      return res.status(200).json({
        success: true,
        message: "Bookmark deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting bookmark:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete bookmark"
      });
    }
  }
);

// ============================================================
// COURSE ENROLLMENT
// ============================================================

router.post(
  "/:courseId/enroll",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = (req.user as any).userId;

      // Check whether the course exists
      const courseResult = await pool.query(
        `SELECT id, title, status
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      // Only published courses can be enrolled in
      if (course.status !== "published") {
        return res.status(400).json({
          success: false,
          message: "Course is not available for enrollment"
        });
      }

      // Create enrollment
      const result = await pool.query(
        `INSERT INTO enrollments (
          user_id,
          course_id
        )
        VALUES ($1, $2)
        RETURNING *`,
        [userId, courseId]
      );

      return res.status(201).json({
        success: true,
        message: "Enrolled successfully",
        enrollment: result.rows[0]
      });

    } catch (error: any) {
      console.error("Error enrolling in course:", error);

      // Student is already enrolled
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "You are already enrolled in this course"
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to enroll in course"
      });
    }
  }
);


// ============================================================
// ADMIN COURSE APPROVAL
// ============================================================

router.patch(
  "/:courseId/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["published", "rejected"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be published or rejected"
        });
      }

      const result = await pool.query(
        `UPDATE courses
         SET status = $1
         WHERE id = $2
         RETURNING id, title, status`,
        [status, courseId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      return res.status(200).json({
        success: true,
        message: `Course ${status} successfully`,
        course: result.rows[0]
      });

    } catch (error) {
      console.error("Error updating course status:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update course status"
      });
    }
  }
);


// ============================================================
// GET MY COURSE PROGRESS
// ============================================================

router.get(
  "/:courseId/progress",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = (req.user as any).userId;

      // Make sure the student is enrolled
      const enrollmentResult = await pool.query(
        `SELECT id, progress_percent, status, completed_at
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2`,
        [userId, courseId]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course"
        });
      }

      // Count total lectures in the course
      const totalResult = await pool.query(
        `SELECT COUNT(*) AS total_lectures
         FROM lectures l
         JOIN modules m ON l.module_id = m.id
         WHERE m.course_id = $1`,
        [courseId]
      );

      // Count completed lectures for this student
      const completedResult = await pool.query(
        `SELECT COUNT(*) AS completed_lectures
         FROM lecture_progress lp
         JOIN lectures l ON lp.lecture_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE lp.user_id = $1
           AND m.course_id = $2
           AND lp.is_completed = TRUE`,
        [userId, courseId]
      );

      const totalLectures = Number(totalResult.rows[0].total_lectures);
      const completedLectures = Number(
        completedResult.rows[0].completed_lectures
      );

      const progressPercent =
        totalLectures === 0
          ? 0
          : Number(((completedLectures / totalLectures) * 100).toFixed(2));

      // Keep enrollment progress in sync
      const completedAt =
        totalLectures > 0 && completedLectures === totalLectures
          ? new Date()
          : null;

      await pool.query(
        `UPDATE enrollments
         SET
           progress_percent = $1,
           completed_at = $2,
           status = CASE
             WHEN $3 = TRUE THEN 'completed'
             ELSE status
           END
         WHERE user_id = $4
           AND course_id = $5`,
        [
          progressPercent,
          completedAt,
          totalLectures > 0 && completedLectures === totalLectures,
          userId,
          courseId
        ]
      );

      return res.status(200).json({
        success: true,
        course_id: courseId,
        total_lectures: totalLectures,
        completed_lectures: completedLectures,
        progress_percent: progressPercent
      });

    } catch (error) {
      console.error("Error calculating course progress:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to calculate course progress"
      });
    }
  }
);


// ============================================================
// GET / CHECK COURSE CERTIFICATE
// ============================================================

router.get(
  "/:courseId/certificate",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = (req.user as any).userId;

      // --------------------------------------------------------
      // Check enrollment
      // --------------------------------------------------------

      const enrollmentResult = await pool.query(
        `SELECT
           id,
           progress_percent,
           status,
           completed_at
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2
         LIMIT 1`,
        [userId, courseId]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course"
        });
      }

      // --------------------------------------------------------
      // Recalculate course completion
      // --------------------------------------------------------

      const totalResult = await pool.query(
        `SELECT COUNT(*) AS total_lectures
         FROM lectures l
         JOIN modules m
           ON l.module_id = m.id
         WHERE m.course_id = $1`,
        [courseId]
      );

      const completedResult = await pool.query(
        `SELECT COUNT(*) AS completed_lectures
         FROM lecture_progress lp
         JOIN lectures l
           ON lp.lecture_id = l.id
         JOIN modules m
           ON l.module_id = m.id
         WHERE lp.user_id = $1
           AND m.course_id = $2
           AND lp.is_completed = TRUE`,
        [userId, courseId]
      );

      const totalLectures = Number(
        totalResult.rows[0].total_lectures
      );

      const completedLectures = Number(
        completedResult.rows[0].completed_lectures
      );

      const progressPercent =
        totalLectures === 0
          ? 0
          : Number(
              (
                (completedLectures / totalLectures) *
                100
              ).toFixed(2)
            );

      // --------------------------------------------------------
      // Course must be 100% complete before requesting
      // certificate approval
      // --------------------------------------------------------

      if (
        totalLectures === 0 ||
        completedLectures !== totalLectures
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Complete 100% of the course to request your certificate",
          progress_percent: progressPercent
        });
      }

      // --------------------------------------------------------
      // Get course information
      // --------------------------------------------------------

      const courseResult = await pool.query(
        `SELECT
           id,
           title,
           instructor_id
         FROM courses
         WHERE id = $1
         LIMIT 1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      // --------------------------------------------------------
      // Get student information
      // --------------------------------------------------------

      const studentResult = await pool.query(
        `SELECT
           id,
           full_name,
           email
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      const student = studentResult.rows[0];

      // --------------------------------------------------------
      // Check existing certificate
      // --------------------------------------------------------

      const existingCertificateResult = await pool.query(
        `SELECT
           id,
           user_id,
           course_id,
           certificate_number,
           issued_at,
           certificate_url,
           status,
           approved_by,
           approved_at
         FROM certificates
         WHERE user_id = $1
           AND course_id = $2
         LIMIT 1`,
        [userId, courseId]
      );

      // --------------------------------------------------------
      // Existing certificate
      // --------------------------------------------------------

      if (existingCertificateResult.rows.length > 0) {
        const certificate =
          existingCertificateResult.rows[0];

        if (certificate.status === "approved") {
          return res.status(200).json({
            success: true,
            status: "approved",
            message:
              "Your certificate has been approved.",
            certificate,
            student: {
              id: student.id,
              full_name: student.full_name,
              email: student.email
            },
            course: {
              id: course.id,
              title: course.title
            }
          });
        }

        return res.status(200).json({
          success: true,
          status: "pending",
          message:
            "Your certificate is awaiting instructor approval.",
          certificate,
          student: {
            id: student.id,
            full_name: student.full_name,
            email: student.email
          },
          course: {
            id: course.id,
            title: course.title
          }
        });
      }

      // --------------------------------------------------------
      // Create a pending certificate
      // --------------------------------------------------------

      const certificateNumber =
        `VL-${new Date().getFullYear()}-${Date.now()}`;

      const certificateResult = await pool.query(
        `INSERT INTO certificates (
           user_id,
           course_id,
           certificate_number,
           issued_at,
           certificate_url,
           status,
           approved_by,
           approved_at
         )
         VALUES (
           $1,
           $2,
           $3,
           NULL,
           NULL,
           'pending',
           NULL,
           NULL
         )
         RETURNING
           id,
           user_id,
           course_id,
           certificate_number,
           issued_at,
           certificate_url,
           status,
           approved_by,
           approved_at`,
        [
          userId,
          courseId,
          certificateNumber
        ]
      );

      // --------------------------------------------------------
      // Keep enrollment marked as completed
      // --------------------------------------------------------

      await pool.query(
        `UPDATE enrollments
         SET
           progress_percent = 100,
           status = 'completed',
           completed_at = COALESCE(
             completed_at,
             now()
           )
         WHERE user_id = $1
           AND course_id = $2`,
        [userId, courseId]
      );

      return res.status(201).json({
        success: true,
        status: "pending",
        message:
          "Course completed successfully. Your certificate is awaiting instructor approval.",
        certificate: certificateResult.rows[0],
        student: {
          id: student.id,
          full_name: student.full_name,
          email: student.email
        },
        course: {
          id: course.id,
          title: course.title
        }
      });

    } catch (error) {
      console.error(
        "Error checking course certificate:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to check certificate"
      });
    }
  }
);

// ============================================================
// GET PENDING CERTIFICATE REQUESTS
// Instructor/Admin
// ============================================================

router.get(
  "/:courseId/certificate-requests",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // --------------------------------------------------------
      // Check course ownership
      // --------------------------------------------------------

      const courseResult = await pool.query(
        `SELECT id, title, instructor_id
         FROM courses
         WHERE id = $1
         LIMIT 1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can manage certificates only for your own course"
        });
      }

      // --------------------------------------------------------
      // Get pending certificates
      // --------------------------------------------------------

      const result = await pool.query(
        `SELECT
           c.id AS certificate_id,
           c.user_id,
           c.course_id,
           c.certificate_number,
           c.status,
           c.issued_at,
           c.approved_by,
           c.approved_at,

           u.full_name AS student_name,
           u.email AS student_email,

           e.progress_percent,
           e.completed_at

         FROM certificates c

         JOIN users u
           ON c.user_id = u.id

         LEFT JOIN enrollments e
           ON e.user_id = c.user_id
           AND e.course_id = c.course_id

         WHERE c.course_id = $1
           AND c.status = 'pending'

         ORDER BY
           c.approved_at ASC NULLS FIRST,
           e.completed_at DESC NULLS LAST`,
        [courseId]
      );

      return res.status(200).json({
        success: true,
        course: {
          id: course.id,
          title: course.title
        },
        certificates: result.rows
      });

    } catch (error) {
      console.error(
        "Error fetching certificate requests:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch certificate requests"
      });
    }
  }
);

// ============================================================
// APPROVE CERTIFICATE
// Instructor/Admin
// ============================================================

router.patch(
  "/:courseId/certificates/:certificateId/approve",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const {
        courseId,
        certificateId
      } = req.params;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // --------------------------------------------------------
      // Check course ownership
      // --------------------------------------------------------

      const courseResult = await pool.query(
        `SELECT
           id,
           title,
           instructor_id
         FROM courses
         WHERE id = $1
         LIMIT 1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can approve certificates only for your own course"
        });
      }

      // --------------------------------------------------------
      // Find pending certificate
      // --------------------------------------------------------

      const certificateResult = await pool.query(
        `SELECT
           id,
           user_id,
           course_id,
           status
         FROM certificates
         WHERE id = $1
           AND course_id = $2
         LIMIT 1`,
        [certificateId, courseId]
      );

      if (certificateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Certificate request not found"
        });
      }

      const certificate =
        certificateResult.rows[0];

      if (certificate.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Certificate is already approved"
        });
      }

      // --------------------------------------------------------
      // Verify student actually completed the course
      // --------------------------------------------------------

      const completionResult = await pool.query(
        `SELECT
           COUNT(*) AS total_lectures,
           COUNT(
             CASE
               WHEN lp.is_completed = TRUE
               THEN 1
             END
           ) AS completed_lectures

         FROM lectures l

         JOIN modules m
           ON l.module_id = m.id

         LEFT JOIN lecture_progress lp
           ON lp.lecture_id = l.id
           AND lp.user_id = $1

         WHERE m.course_id = $2`,
        [
          certificate.user_id,
          courseId
        ]
      );

      const totalLectures = Number(
        completionResult.rows[0].total_lectures
      );

      const completedLectures = Number(
        completionResult.rows[0].completed_lectures
      );

      if (
        totalLectures === 0 ||
        completedLectures !== totalLectures
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student has not completed 100% of the course"
        });
      }

      // --------------------------------------------------------
      // Approve certificate
      // --------------------------------------------------------

      const updateResult = await pool.query(
        `UPDATE certificates
         SET
           status = 'approved',
           approved_by = $1,
           approved_at = now(),
           issued_at = COALESCE(
             issued_at,
             now()
           )
         WHERE id = $2
           AND course_id = $3
         RETURNING
           id,
           user_id,
           course_id,
           certificate_number,
           status,
           issued_at,
           approved_by,
           approved_at,
           certificate_url`,
        [
          userId,
          certificateId,
          courseId
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          "Certificate approved successfully",
        certificate:
          updateResult.rows[0]
      });

    } catch (error) {
      console.error(
        "Error approving certificate:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to approve certificate"
      });
    }
  }
);

// ============================================================
// GET APPROVED CERTIFICATE HISTORY
// ============================================================

router.get(
  "/:courseId/approved-certificates",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Check course and instructor ownership
      const courseResult = await pool.query(
        `
        SELECT
          id,
          title,
          instructor_id
        FROM courses
        WHERE id = $1
        `,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can view certificate history only for your own course"
        });
      }

      // Get all approved certificates
      const result = await pool.query(
        `
        SELECT
          c.id AS certificate_id,
          c.user_id AS student_id,
          c.course_id,
          c.certificate_number,
          c.status,
          c.issued_at,
          c.approved_at,

          u.full_name AS student_name,
          u.email AS student_email,

          approver.full_name AS approved_by_name

        FROM certificates c

        JOIN users u
          ON c.user_id = u.id

        LEFT JOIN users approver
          ON c.approved_by = approver.id

        WHERE c.course_id = $1
          AND c.status = 'approved'

        ORDER BY c.approved_at DESC
        `,
        [courseId]
      );

      return res.status(200).json({
        success: true,
        certificates: result.rows
      });

    } catch (error) {
      console.error(
        "Error fetching approved certificate history:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch approved certificate history"
      });
    }
  }
);
// ============================================================
// GET STUDENT PERFORMANCE + TOPIC MASTERY
// ============================================================

router.get(
  "/:courseId/my-progress",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = (req.user as any).userId;

      // --------------------------------------------------------
      // Check enrollment
      // --------------------------------------------------------

      const enrollmentResult = await pool.query(
        `SELECT
           id,
           progress_percent,
           status,
           completed_at
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2
           AND status IN ('active', 'completed')
         LIMIT 1`,
        [userId, courseId]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course"
        });
      }

      // --------------------------------------------------------
      // Course information
      // --------------------------------------------------------

      const courseResult = await pool.query(
        `SELECT
           id,
           title,
           description
         FROM courses
         WHERE id = $1
         LIMIT 1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      // --------------------------------------------------------
      // Overall quiz performance
      // --------------------------------------------------------

      const overallQuizResult = await pool.query(
        `SELECT
           COUNT(*)::int AS total_attempts,
           COALESCE(
             ROUND(AVG(qa.score)::numeric, 2),
             0
           ) AS average_score,
           COALESCE(
             MAX(qa.score),
             0
           ) AS best_score
         FROM quiz_attempts qa
         JOIN quizzes q
           ON qa.quiz_id = q.id
         JOIN modules m
           ON q.module_id = m.id
         WHERE qa.user_id = $1
           AND m.course_id = $2
           AND qa.submitted_at IS NOT NULL
           AND qa.score IS NOT NULL`,
        [userId, courseId]
      );

      const overallQuiz = overallQuizResult.rows[0];

      // --------------------------------------------------------
      // Module-wise mastery
      //
      // We use module average quiz score as the mastery score.
      // --------------------------------------------------------

      const masteryResult = await pool.query(
        `SELECT
           m.id AS module_id,
           m.title AS module_title,

           COUNT(DISTINCT q.id)::int AS quiz_count,

           COUNT(qa.id)::int AS attempts,

           COALESCE(
             ROUND(AVG(qa.score)::numeric, 2),
             0
           ) AS mastery_score

         FROM modules m

         LEFT JOIN quizzes q
           ON q.module_id = m.id

         LEFT JOIN quiz_attempts qa
           ON qa.quiz_id = q.id
           AND qa.user_id = $1
           AND qa.submitted_at IS NOT NULL
           AND qa.score IS NOT NULL

         WHERE m.course_id = $2

         GROUP BY
           m.id,
           m.title,
           m.order_index

         ORDER BY m.order_index`,
        [userId, courseId]
      );

      const mastery = masteryResult.rows.map((row) => {
        const score = Number(row.mastery_score || 0);

        let level = "Needs Practice";

        if (Number(row.attempts) === 0) {
          level = "Not Attempted";
        } else if (score >= 80) {
          level = "Strong";
        } else if (score >= 60) {
          level = "Developing";
        }

        return {
          module_id: row.module_id,
          module_title: row.module_title,
          quiz_count: Number(row.quiz_count),
          attempts: Number(row.attempts),
          mastery_score: score,
          mastery_level: level
        };
      });

      // --------------------------------------------------------
      // Generate recommendations from performance
      // --------------------------------------------------------

      const recommendations = [];

      const attemptedModules = mastery.filter(
        (item) => item.attempts > 0
      );

      const weakModules = attemptedModules
        .filter((item) => item.mastery_score < 60)
        .sort(
          (a, b) =>
            a.mastery_score - b.mastery_score
        );

      const developingModules = attemptedModules
        .filter(
          (item) =>
            item.mastery_score >= 60 &&
            item.mastery_score < 80
        )
        .sort(
          (a, b) =>
            a.mastery_score - b.mastery_score
        );

      if (weakModules.length > 0) {
        recommendations.push({
          type: "priority",
          title: "Focus on your weakest area",
          message:
            `Spend more time revising ${weakModules[0].module_title} and practice additional questions.`,
          module_id: weakModules[0].module_id
        });
      }

      if (developingModules.length > 0) {
        recommendations.push({
          type: "practice",
          title: "Strengthen developing skills",
          message:
            `Practice more quizzes and exercises in ${developingModules[0].module_title} to improve your mastery.`,
          module_id: developingModules[0].module_id
        });
      }

      if (attemptedModules.length === 0) {
        recommendations.push({
          type: "start",
          title: "Start your first quiz",
          message:
            "Complete a quiz to measure your current understanding and unlock personalized progress insights."
        });
      }

      if (
        attemptedModules.length > 0 &&
        Number(overallQuiz.average_score) >= 80
      ) {
        recommendations.push({
          type: "advanced",
          title: "Keep challenging yourself",
          message:
            "Your quiz performance is strong. Continue practicing and move towards more advanced learning material."
        });
      }

      if (recommendations.length === 0) {
        recommendations.push({
          type: "general",
          title: "Keep learning consistently",
          message:
            "Continue completing lectures, quizzes, and practice activities to improve your mastery."
        });
      }

      return res.status(200).json({
        success: true,

        course: {
          id: course.id,
          title: course.title,
          description: course.description
        },

        course_progress: Number(
          enrollmentResult.rows[0].progress_percent || 0
        ),

        quiz_performance: {
          total_attempts: Number(
            overallQuiz.total_attempts || 0
          ),
          average_score: Number(
            overallQuiz.average_score || 0
          ),
          best_score: Number(
            overallQuiz.best_score || 0
          )
        },

        topic_mastery: mastery,

        recommendations
      });

    } catch (error) {
      console.error(
        "Error loading student progress:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load student progress"
      });
    }
  }
);

// ============================================================
// GET COURSE ASSIGNMENTS
// ============================================================

router.get(
  "/:courseId/assignments",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = (req.user as any).userId;

      // Check whether the student is enrolled
      const enrollmentResult = await pool.query(
        `SELECT id
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2
           AND status IN ('active', 'completed')`,
        [userId, courseId]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course"
        });
      }

      const result = await pool.query(
        `SELECT
           a.id,
           a.course_id,
           a.title,
           a.instructions,
           a.rubric,
           a.due_date,
           a.created_at
         FROM assignments a
         WHERE a.course_id = $1
         ORDER BY a.created_at DESC`,
        [courseId]
      );

      return res.status(200).json({
        success: true,
        assignments: result.rows
      });

    } catch (error) {
      console.error("Error fetching assignments:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assignments"
      });
    }
  }
);


// ============================================================
// GET COURSE ASSIGNMENT SUBMISSIONS
// ============================================================

router.get(
  "/:courseId/assignment-submissions",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Check course ownership
      const courseResult = await pool.query(
        `SELECT id, instructor_id
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can view submissions only for your own courses"
        });
      }

      const result = await pool.query(
        `SELECT
           s.id,
           s.assignment_id,
           s.user_id,
           s.file_url,
           s.submitted_at,
           s.grade,
           s.feedback,
           a.title AS assignment_title,
           u.full_name AS student_name,
           u.email AS student_email
         FROM assignment_submissions s
         JOIN assignments a
           ON s.assignment_id = a.id
         JOIN users u
           ON s.user_id = u.id
         WHERE a.course_id = $1
         ORDER BY s.submitted_at DESC`,
        [courseId]
      );

      return res.status(200).json({
        success: true,
        submissions: result.rows
      });

    } catch (error) {
      console.error(
        "Error fetching assignment submissions:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assignment submissions"
      });
    }
  }
);

// ============================================================
// INSTRUCTOR COURSE OVERVIEW / ANALYTICS
// ============================================================

router.get(
  "/:courseId/instructor-overview",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Check course and ownership
      const courseResult = await pool.query(
        `SELECT
           id,
           title,
           description,
           instructor_id,
           status
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can view analytics only for your own course"
        });
      }

      // Total enrolled students
      const studentsResult = await pool.query(
        `SELECT COUNT(DISTINCT user_id) AS count
         FROM enrollments
         WHERE course_id = $1`,
        [courseId]
      );

      // Active learners in the last 7 days
      const activeStudentsResult = await pool.query(
        `SELECT COUNT(DISTINCT user_id) AS count
         FROM lecture_progress lp
         JOIN lectures l
           ON lp.lecture_id = l.id
         JOIN modules m
           ON l.module_id = m.id
         WHERE m.course_id = $1
           AND lp.updated_at >= NOW() - INTERVAL '7 days'`,
        [courseId]
      );

      // Assignments
      const assignmentsResult = await pool.query(
        `SELECT COUNT(*) AS count
         FROM assignments
         WHERE course_id = $1`,
        [courseId]
      );

      // Submissions
      const submissionsResult = await pool.query(
        `SELECT COUNT(*) AS count
         FROM assignment_submissions s
         JOIN assignments a
           ON s.assignment_id = a.id
         WHERE a.course_id = $1`,
        [courseId]
      );

      // Quiz count
      const quizzesResult = await pool.query(
        `SELECT COUNT(*) AS count
         FROM quizzes q
         JOIN modules m
           ON q.module_id = m.id
         WHERE m.course_id = $1`,
        [courseId]
      );

      // Average quiz score
      const quizScoreResult = await pool.query(
        `SELECT
           COALESCE(
             ROUND(AVG(qa.score)::numeric, 2),
             0
           ) AS average_score
         FROM quiz_attempts qa
         JOIN quizzes q
           ON qa.quiz_id = q.id
         JOIN modules m
           ON q.module_id = m.id
         WHERE m.course_id = $1`,
        [courseId]
      );

      return res.status(200).json({
        success: true,

        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          status: course.status
        },

        analytics: {
          enrolled_students:
            Number(
              studentsResult.rows[0].count
            ),

          active_students:
            Number(
              activeStudentsResult.rows[0].count
            ),

          assignments:
            Number(
              assignmentsResult.rows[0].count
            ),

          submissions:
            Number(
              submissionsResult.rows[0].count
            ),

          quizzes:
            Number(
              quizzesResult.rows[0].count
            ),

          average_quiz_score:
            Number( 
              quizScoreResult.rows[0]
                .average_score
            )
        }
      });

    } catch (error) {
      console.error(
        "Instructor overview error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load instructor overview"
      });
    }
  }
);

// GET ALL SUBMISSIONS FOR ONE STUDENT IN A COURSE
router.get(
  "/:courseId/instructor-students/:studentId/submissions",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId, studentId } = req.params;

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Check course ownership
      const courseResult = await pool.query(
        `
        SELECT id, title, instructor_id
        FROM courses
        WHERE id = $1
        `,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this course"
        });
      }

      // Get student information
      const studentResult = await pool.query(
        `
        SELECT
          id,
          full_name,
          email
        FROM users
        WHERE id = $1
        `,
        [studentId]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get this student's submissions for this course
      const submissionsResult = await pool.query(
        `
        SELECT
          s.id,
          s.assignment_id,
          s.user_id AS student_id,
          s.file_url,
          s.submitted_at,
          s.grade,
          s.feedback,
          a.title AS assignment_title,
          a.instructions,
          a.due_date,
          a.rubric
        FROM assignment_submissions s
        JOIN assignments a
          ON s.assignment_id = a.id
        WHERE
          s.user_id = $1
          AND a.course_id = $2
        ORDER BY s.submitted_at DESC
        `,
        [studentId, courseId]
      );

      return res.status(200).json({
        success: true,
        course: {
          id: course.id,
          title: course.title
        },
        student: {
          id: studentResult.rows[0].id,
          full_name: studentResult.rows[0].full_name,
          email: studentResult.rows[0].email
        },
        submissions: submissionsResult.rows
      });
    } catch (error) {
      console.error(
        "Error fetching student submissions:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch student submissions"
      });
    }
  }
);

// ============================================================
// CREATE ASSIGNMENT
// ============================================================

router.post(
  "/:courseId/assignments",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, instructions, rubric, due_date } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Assignment title is required"
        });
      }

      const courseResult = await pool.query(
        `SELECT id, instructor_id
         FROM courses
         WHERE id = $1`,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      const course = courseResult.rows[0];
      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      if (
        userRole !== "admin" &&
        course.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can create assignments only in your own courses"
        });
      }

      if (due_date && isNaN(Date.parse(due_date))) {
        return res.status(400).json({
          success: false,
          message: "Invalid due_date"
        });
      }

      const result = await pool.query(
        `INSERT INTO assignments (
          course_id,
          title,
          instructions,
          rubric,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          courseId,
          title.trim(),
          instructions || null,
          rubric || null,
          due_date || null
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Assignment created successfully",
        assignment: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating assignment:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create assignment"
      });
    }
  }
);

// ============================================================
// GET MY ASSIGNMENT SUBMISSION
// ============================================================

router.get(
  "/assignments/:assignmentId/submission",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = (req.user as any).userId;

      const result = await pool.query(
        `SELECT
           id,
           assignment_id,
           user_id,
           file_url,
           submitted_at,
           grade,
           feedback
         FROM assignment_submissions
         WHERE assignment_id = $1
           AND user_id = $2
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [assignmentId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          success: true,
          submission: null
        });
      }

      return res.status(200).json({
        success: true,
        submission: result.rows[0]
      });

    } catch (error) {
      console.error(
        "Error fetching assignment submission:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assignment submission"
      });
    }
  }
);


// ============================================================
// SUBMIT ASSIGNMENT
// ============================================================

router.post(
  "/assignments/:assignmentId/submit",
  authenticateToken,
  authorizeRoles("student"),
  uploadAssignment.single("file"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = (req.user as any).userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Assignment file is required"
        });
      }

      // Find assignment
      const assignmentResult = await pool.query(
        `SELECT
           id,
           course_id,
           title,
           due_date
         FROM assignments
         WHERE id = $1`,
        [assignmentId]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found"
        });
      }

      const assignment = assignmentResult.rows[0];

      // Check enrollment
      const enrollmentResult = await pool.query(
        `SELECT id
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2
           AND status IN ('active', 'completed')`,
        [userId, assignment.course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course"
        });
      }

      // Check deadline
      if (
        assignment.due_date &&
        new Date() > new Date(assignment.due_date)
      ) {
        return res.status(400).json({
          success: false,
          message: "Assignment deadline has passed"
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const result = await pool.query(
        `INSERT INTO assignment_submissions (
          assignment_id,
          user_id,
          file_url
        )
        VALUES ($1, $2, $3)
        RETURNING *`,
        [assignmentId, userId, fileUrl]
      );

      return res.status(201).json({
        success: true,
        message: "Assignment submitted successfully",
        submission: result.rows[0]
      });

    } catch (error) {
      console.error("Error submitting assignment:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to submit assignment"
      });
    }
  }
);

router.put(
  "/submissions/:submissionId/grade",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, feedback } = req.body;

      if (
        grade === undefined ||
        typeof grade !== "number" ||
        grade < 0 ||
        grade > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Grade must be a number between 0 and 100"
        });
      }

      // Find submission + course owner
      const submissionResult = await pool.query(
        `SELECT
           s.id,
           a.course_id,
           c.instructor_id
         FROM assignment_submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.id = $1`,
        [submissionId]
      );

      if (submissionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Submission not found"
        });
      }

      const submission = submissionResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only course instructor or admin can grade
      if (
        userRole !== "admin" &&
        submission.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can grade submissions only for your own courses"
        });
      }

      const result = await pool.query(
        `UPDATE assignment_submissions
         SET
           grade = $1,
           feedback = $2
         WHERE id = $3
         RETURNING *`,
        [
          grade,
          feedback || null,
          submissionId
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Assignment graded successfully",
        submission: result.rows[0]
      });

    } catch (error) {
      console.error("Error grading assignment:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to grade assignment"
      });
    }
  }
);

// ============================================================
// GET QUIZZES FOR A MODULE
// ============================================================

router.get(
  "/modules/:moduleId/instructor-quizzes",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { moduleId } = req.params;

      // Find module and its course
      const moduleResult = await pool.query(
        `
        SELECT
          m.id,
          m.course_id,
          c.instructor_id
        FROM modules m
        JOIN courses c
          ON m.course_id = c.id
        WHERE m.id = $1
        `,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      const module = moduleResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only course instructor or admin can view quizzes
      if (
        userRole !== "admin" &&
        module.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can view quizzes only from your own courses"
        });
      }

      const result = await pool.query(
        `
        SELECT
          q.id,
          q.module_id,
          q.title,
          q.created_at,
          COUNT(qq.id)::int AS question_count
        FROM quizzes q
        LEFT JOIN quiz_questions qq
          ON qq.quiz_id = q.id
        WHERE q.module_id = $1
        GROUP BY
          q.id,
          q.module_id,
          q.title,
          q.created_at
        ORDER BY q.created_at DESC
        `,
        [moduleId]
      );

      return res.status(200).json({
        success: true,
        quizzes: result.rows
      });

    } catch (error) {
      console.error("Error fetching quizzes:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch quizzes"
      });
    }
  }
);

// ============================================================
// GET STUDENT QUIZZES FOR A MODULE
// ============================================================

router.get(
  "/modules/:moduleId/quizzes",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const userId = (req.user as any).userId;

      // Make sure the module exists and get its course
      const moduleResult = await pool.query(
        `SELECT
           m.id,
           m.course_id
         FROM modules m
         WHERE m.id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      const module = moduleResult.rows[0];

      // Student must be enrolled in the course
      const enrollmentResult = await pool.query(
        `SELECT id
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2
           AND status IN ('active', 'completed')`,
        [userId, module.course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course"
        });
      }

      // Get quizzes belonging to this module
      const result = await pool.query(
        `SELECT
           q.id,
           q.module_id,
           q.title,
           q.is_ai_generated,
           q.generated_from_lecture_id,
           COUNT(qq.id)::int AS question_count
         FROM quizzes q
         LEFT JOIN quiz_questions qq
           ON qq.quiz_id = q.id
         WHERE q.module_id = $1
         GROUP BY
           q.id,
           q.module_id,
           q.title,
           q.is_ai_generated,
           q.generated_from_lecture_id
         ORDER BY q.title`,
        [moduleId]
      );

      return res.status(200).json({
        success: true,
        quizzes: result.rows
      });

    } catch (error) {
      console.error(
        "Error fetching student quizzes:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch quizzes"
      });
    }
  }
);

// ============================================================
// CREATE QUIZ
// ============================================================

router.post(
  "/modules/:moduleId/quizzes",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { title } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Quiz title is required"
        });
      }

      // Find module and its course
      const moduleResult = await pool.query(
        `SELECT
           m.id,
           m.course_id,
           c.instructor_id
         FROM modules m
         JOIN courses c ON m.course_id = c.id
         WHERE m.id = $1`,
        [moduleId]
      );

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      const module = moduleResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      // Only course owner or admin can create quizzes
      if (
        userRole !== "admin" &&
        module.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can create quizzes only in your own courses"
        });
      }

      const result = await pool.query(
        `INSERT INTO quizzes (
          module_id,
          title
        )
        VALUES ($1, $2)
        RETURNING *`,
        [moduleId, title.trim()]
      );

      return res.status(201).json({
        success: true,
        message: "Quiz created successfully",
        quiz: result.rows[0]
      });

    } catch (error) {
      console.error("Error creating quiz:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create quiz"
      });
    }
  }
);

// ============================================================
// CREATE QUIZ QUESTION
// ============================================================

router.post(
  "/quizzes/:quizId/questions",
  authenticateToken,
  authorizeRoles("instructor", "admin"),
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const { question_text, question_type, order_index, options } = req.body;

      const allowedTypes = ["mcq", "multi_select", "short_answer"];

      if (!question_text || !question_text.trim()) {
        return res.status(400).json({
          success: false,
          message: "Question text is required"
        });
      }

      if (!allowedTypes.includes(question_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid question type"
        });
      }

      if (order_index === undefined) {
        return res.status(400).json({
          success: false,
          message: "order_index is required"
        });
      }

      // Find quiz -> module -> course -> instructor
      const quizResult = await pool.query(
        `SELECT
           q.id,
           m.course_id,
           c.instructor_id
         FROM quizzes q
         JOIN modules m ON q.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         WHERE q.id = $1`,
        [quizId]
      );

      if (quizResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }

      const quiz = quizResult.rows[0];

      const userId = (req.user as any).userId;
      const userRole = (req.user as any).role;

      if (
        userRole !== "admin" &&
        quiz.instructor_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "You can add questions only to your own quizzes"
        });
      }

      // MCQ and multi-select require options
      if (
        (question_type === "mcq" || question_type === "multi_select") &&
        (!Array.isArray(options) || options.length < 2)
      ) {
        return res.status(400).json({
          success: false,
          message: "At least two options are required"
        });
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const questionResult = await client.query(
          `INSERT INTO quiz_questions (
            quiz_id,
            question_text,
            question_type,
            order_index
          )
          VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [
            quizId,
            question_text.trim(),
            question_type,
            order_index
          ]
        );

        const question = questionResult.rows[0];

        const createdOptions = [];

        if (
          (question_type === "mcq" || question_type === "multi_select") &&
          Array.isArray(options)
        ) {
          for (const option of options) {
            if (!option.option_text || !option.option_text.trim()) {
              throw new Error("Option text is required");
            }

            const optionResult = await client.query(
              `INSERT INTO quiz_options (
                question_id,
                option_text,
                is_correct
              )
              VALUES ($1, $2, $3)
              RETURNING *`,
              [
                question.id,
                option.option_text.trim(),
                option.is_correct === true
              ]
            );

            createdOptions.push(optionResult.rows[0]);
          }
        }

        await client.query("COMMIT");

        return res.status(201).json({
          success: true,
          message: "Quiz question created successfully",
          question,
          options: createdOptions
        });

      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error("Error creating quiz question:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create quiz question"
      });
    }
  }
);

// ============================================================
// GET QUIZ WITH QUESTIONS FOR STUDENT
// ============================================================

router.get(
  "/quizzes/:quizId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const userId = (req.user as any).userId;

      // Get quiz and course
      const quizResult = await pool.query(
        `
        SELECT
          q.id,
          q.module_id,
          q.title,
          m.course_id,
          c.title AS course_title
        FROM quizzes q
        JOIN modules m
          ON q.module_id = m.id
        JOIN courses c
          ON m.course_id = c.id
        WHERE q.id = $1
        `,
        [quizId]
      );

      if (quizResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }

      const quiz = quizResult.rows[0];

      // Student must be enrolled in the course
      const enrollmentResult = await pool.query(
        `
        SELECT id
        FROM enrollments
        WHERE user_id = $1
          AND course_id = $2
          AND status IN ('active', 'completed')
        `,
        [userId, quiz.course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course"
        });
      }

      // Get questions
      const questionsResult = await pool.query(
        `
        SELECT
          id,
          question_text,
          question_type,
          order_index
        FROM quiz_questions
        WHERE quiz_id = $1
        ORDER BY order_index
        `,
        [quizId]
      );

      // Get options
      const optionsResult = await pool.query(
        `
        SELECT
          id,
          question_id,
          option_text
        FROM quiz_options
        WHERE question_id = ANY($1::uuid[])
        ORDER BY question_id, id
        `,
        [questionsResult.rows.map(
          (question) => question.id
        )]
      );

      const questions = questionsResult.rows.map(
        (question) => ({
          ...question,
          options: optionsResult.rows.filter(
            (option) =>
              option.question_id === question.id
          )
        })
      );

      return res.status(200).json({
        success: true,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          module_id: quiz.module_id,
          course_id: quiz.course_id,
          course_title: quiz.course_title,
          questions
        }
      });

    } catch (error) {
      console.error(
        "Error fetching student quiz:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch quiz"
      });
    }
  }
);

// ============================================================
// GET MY LATEST QUIZ ATTEMPT
// ============================================================
router.get(
  "/quizzes/:quizId/my-attempt",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const userId = (req.user as any).userId;

      // Make sure quiz exists
      const quizResult = await pool.query(
        `
        SELECT
          q.id,
          q.module_id,
          m.course_id
        FROM quizzes q
        JOIN modules m
          ON q.module_id = m.id
        WHERE q.id = $1
        `,
        [quizId]
      );

      if (quizResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }

      const quiz = quizResult.rows[0];

      // Make sure student is enrolled
      const enrollmentResult = await pool.query(
        `
        SELECT id
        FROM enrollments
        WHERE user_id = $1
          AND course_id = $2
          AND status IN ('active', 'completed')
        `,
        [userId, quiz.course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course"
        });
      }

      // Get latest submitted attempt
     const attemptResult = await pool.query(
  `
  SELECT
    qa.id,
    qa.quiz_id,
    qa.user_id,
    qa.score,
    qa.started_at,
    qa.submitted_at,

    COUNT(
      CASE
        WHEN ans.is_correct = TRUE THEN 1
      END
    ) AS correct_answers

  FROM quiz_attempts qa

  LEFT JOIN quiz_answers ans
    ON ans.attempt_id = qa.id

  WHERE qa.quiz_id = $1
    AND qa.user_id = $2
    AND qa.submitted_at IS NOT NULL

  GROUP BY
    qa.id,
    qa.quiz_id,
    qa.user_id,
    qa.score,
    qa.started_at,
    qa.submitted_at

  ORDER BY qa.submitted_at DESC

  LIMIT 1
  `,
  [quizId, userId]
);

      return res.status(200).json({
        success: true,
        attempted: attemptResult.rows.length > 0,
        attempt: attemptResult.rows[0] || null
      });

    } catch (error) {
      console.error("Error loading student quiz attempt:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load quiz attempt"
      });
    }
  }
);

// ============================================================
// LIST STUDENT QUIZZES FOR A MODULE
// ============================================================

router.get(
  "/modules/:moduleId/quizzes",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const userId = (req.user as any).userId;

      const result = await pool.query(
        `SELECT
           q.id,
           q.module_id,
           q.title,
           q.is_ai_generated,
           q.generated_from_lecture_id,
           COUNT(qq.id)::int AS question_count
         FROM quizzes q
         JOIN modules m
           ON q.module_id = m.id
         JOIN enrollments e
           ON e.course_id = m.course_id
          AND e.user_id = $1
          AND e.status IN ('active', 'completed')
         LEFT JOIN quiz_questions qq
           ON qq.quiz_id = q.id
         WHERE q.module_id = $2
         GROUP BY
           q.id,
           q.module_id,
           q.title,
           q.is_ai_generated,
           q.generated_from_lecture_id
         ORDER BY q.title`,
        [userId, moduleId]
      );

      return res.status(200).json({
        success: true,
        quizzes: result.rows
      });
    } catch (error) {
      console.error("Error fetching student quizzes:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch quizzes"
      });
    }
  }
);


// ============================================================
// START QUIZ ATTEMPT
// ============================================================

router.post(
  "/quizzes/:quizId/attempt",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const userId = (req.user as any).userId;

      // Check quiz exists and get its course
      const quizResult = await pool.query(
        `SELECT
           q.id,
           q.module_id,
           m.course_id
         FROM quizzes q
         JOIN modules m ON q.module_id = m.id
         WHERE q.id = $1`,
        [quizId]
      );

      if (quizResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found"
        });
      }

      const quiz = quizResult.rows[0];

      // Student must be enrolled in the course
      const enrollmentResult = await pool.query(
        `SELECT id
         FROM enrollments
         WHERE user_id = $1
           AND course_id = $2
           AND status IN ('active', 'completed')`,
        [userId, quiz.course_id]
      );

      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course"
        });
      }

      const result = await pool.query(
        `INSERT INTO quiz_attempts (
          quiz_id,
          user_id
        )
        VALUES ($1, $2)
        RETURNING *`,
        [quizId, userId]
      );

      return res.status(201).json({
        success: true,
        message: "Quiz attempt started successfully",
        attempt: result.rows[0]
      });

    } catch (error) {
      console.error("Error starting quiz attempt:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to start quiz attempt"
      });
    }
  }
);

// ============================================================
// SUBMIT QUIZ ATTEMPT
// ============================================================

router.post(
  "/attempts/:attemptId/submit",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { attemptId } = req.params;
      const { answers } = req.body;
      const userId = (req.user as any).userId;

      if (!Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: "answers must be an array"
        });
      }

      // Make sure the attempt belongs to this student
      const attemptResult = await client.query(
        `SELECT
           qa.id,
           qa.quiz_id,
           qa.user_id
         FROM quiz_attempts qa
         WHERE qa.id = $1
           AND qa.user_id = $2
           AND qa.submitted_at IS NULL`,
        [attemptId, userId]
      );

      if (attemptResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active quiz attempt not found"
        });
      }

      const attempt = attemptResult.rows[0];

      await client.query("BEGIN");

      let correctCount = 0;

      // Get all questions for this quiz
      const questionsResult = await client.query(
        `SELECT id, question_type
         FROM quiz_questions
         WHERE quiz_id = $1
         ORDER BY order_index`,
        [attempt.quiz_id]
      );

      for (const question of questionsResult.rows) {
        const submittedAnswer = answers.find(
          (answer: any) => answer.question_id === question.id
        );

        let isCorrect = false;
        let selectedOptionIds: string[] = [];
        let textAnswer: string | null = null;

        if (question.question_type === "mcq") {
          selectedOptionIds =
            Array.isArray(submittedAnswer?.selected_option_ids)
              ? submittedAnswer.selected_option_ids
              : [];

          const correctResult = await client.query(
            `SELECT id
             FROM quiz_options
             WHERE question_id = $1
               AND is_correct = TRUE`,
            [question.id]
          );

          const correctIds = correctResult.rows
            .map((row) => row.id)
            .sort();

          const selectedIds = [...selectedOptionIds].sort();

          isCorrect =
            correctIds.length === selectedIds.length &&
            correctIds.every((id, index) => id === selectedIds[index]);

        } else if (question.question_type === "multi_select") {
          selectedOptionIds =
            Array.isArray(submittedAnswer?.selected_option_ids)
              ? submittedAnswer.selected_option_ids
              : [];

          const correctResult = await client.query(
            `SELECT id
             FROM quiz_options
             WHERE question_id = $1
               AND is_correct = TRUE`,
            [question.id]
          );

          const correctIds = correctResult.rows
            .map((row) => row.id)
            .sort();

          const selectedIds = [...selectedOptionIds].sort();

          isCorrect =
            correctIds.length === selectedIds.length &&
            correctIds.every((id, index) => id === selectedIds[index]);

        } else if (question.question_type === "short_answer") {
          textAnswer =
            typeof submittedAnswer?.text_answer === "string"
              ? submittedAnswer.text_answer.trim()
              : null;

          // Short answers are not auto-graded in this first version.
          isCorrect = false;
        }

        if (isCorrect) {
          correctCount++;
        }

        await client.query(
          `INSERT INTO quiz_answers (
            attempt_id,
            question_id,
            selected_option_ids,
            text_answer,
            is_correct
          )
          VALUES ($1, $2, $3, $4, $5)`,
          [
            attemptId,
            question.id,
            selectedOptionIds,
            textAnswer,
            isCorrect
          ]
        );
      }

      const totalQuestions = questionsResult.rows.length;

      const score =
        totalQuestions === 0
          ? 0
          : Number(((correctCount / totalQuestions) * 100).toFixed(2));

      const result = await client.query(
        `UPDATE quiz_attempts
         SET
           score = $1,
           submitted_at = now()
         WHERE id = $2
         RETURNING *`,
        [score, attemptId]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Quiz submitted successfully",
        score,
        correct_answers: correctCount,
        total_questions: totalQuestions,
        attempt: result.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Error submitting quiz:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to submit quiz"
      });

    } finally {
      client.release();
    }
  }
);
// ============================================================
// REVIEW QUIZ ATTEMPT
// ============================================================

router.get(
  "/attempts/:attemptId/review",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { attemptId } = req.params;
      const userId = (req.user as any).userId;

      // --------------------------------------------------------
      // 1. Verify that this attempt belongs to the student
      // --------------------------------------------------------
      const attemptResult = await pool.query(
        `
        SELECT
          qa.id AS attempt_id,
          qa.quiz_id,
          qa.user_id,
          qa.score,
          qa.started_at,
          qa.submitted_at,
          q.title AS quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q
          ON qa.quiz_id = q.id
        WHERE qa.id = $1
          AND qa.user_id = $2
          AND qa.submitted_at IS NOT NULL
        `,
        [attemptId, userId]
      );

      if (attemptResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quiz attempt not found"
        });
      }

      const attempt = attemptResult.rows[0];

      // --------------------------------------------------------
      // 2. Get every question and the student's answer
      // --------------------------------------------------------
      const reviewResult = await pool.query(
        `
        SELECT
          qq.id AS question_id,
          qq.question_text,
          qq.question_type,
          qq.order_index,

          qa.selected_option_ids,
          qa.text_answer,
          qa.is_correct,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', qo.id,
                  'option_text', qo.option_text,
                  'is_correct', qo.is_correct
                )
                ORDER BY qo.id
              )
              FROM quiz_options qo
              WHERE qo.question_id = qq.id
            ),
            '[]'::json
          ) AS options

        FROM quiz_questions qq

        LEFT JOIN quiz_answers qa
          ON qa.question_id = qq.id
         AND qa.attempt_id = $1

        WHERE qq.quiz_id = $2

        ORDER BY qq.order_index
        `,
        [attemptId, attempt.quiz_id]
      );

      // --------------------------------------------------------
      // 3. Return review data
      // --------------------------------------------------------
      return res.status(200).json({
        success: true,

        attempt: {
          id: attempt.attempt_id,
          quiz_id: attempt.quiz_id,
          quiz_title: attempt.quiz_title,
          score: Number(attempt.score || 0),
          started_at: attempt.started_at,
          submitted_at: attempt.submitted_at
        },

        answers: reviewResult.rows
      });

    } catch (error) {
      console.error(
        "Error reviewing quiz attempt:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load quiz review"
      });
    }
  }
);


// ============================================================
// GET ALL NOTES FOR CURRENT STUDENT
// ============================================================

router.get(
  "/notes/me",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const userId = (req.user as any).userId;

      const result = await pool.query(
        `
        SELECT
          n.id AS note_id,
          n.content,
          n.timestamp_seconds,
          n.created_at,
          n.updated_at,

          c.id AS course_id,
          c.title AS course_title,

          m.id AS module_id,
          m.title AS module_title,
          m.order_index AS module_order_index,

          l.id AS lecture_id,
          l.title AS lecture_title,
          l.order_index AS lecture_order_index

        FROM notes n

        JOIN lectures l
          ON n.lecture_id = l.id

        JOIN modules m
          ON l.module_id = m.id

        JOIN courses c
          ON m.course_id = c.id

        WHERE n.user_id = $1

        ORDER BY
          c.title ASC,
          m.order_index ASC,
          l.order_index ASC,
          n.timestamp_seconds ASC NULLS LAST,
          n.created_at ASC
        `,
        [userId]
      );

      return res.status(200).json({
        success: true,
        notes: result.rows,
      });
    } catch (error) {
      console.error(
        "Error fetching all student notes:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch student notes",
      });
    }
  }
);


export default router;
//e6e9c62e-66d6-4b50-876b-a0bc921f46f7 moduel id
//7b128e46-59d8-409c-a349-47959cbdfb58 