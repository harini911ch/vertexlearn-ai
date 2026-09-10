import { Router } from "express";
import pool from "../config/database";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

/*
  Every route in this file is admin-only.
*/
router.use(
  authenticateToken,
  authorizeRoles("admin")
);

// ============================================================
// ADMIN STATS
// ============================================================

router.get("/stats", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM users
        )::int AS total_users,

        (
          SELECT COUNT(DISTINCT u.id)
          FROM users u
          JOIN user_roles ur
            ON ur.user_id = u.id
          JOIN roles r
            ON r.id = ur.role_id
          WHERE r.name = 'student'
        )::int AS total_students,

        (
          SELECT COUNT(DISTINCT u.id)
          FROM users u
          JOIN user_roles ur
            ON ur.user_id = u.id
          JOIN roles r
            ON r.id = ur.role_id
          WHERE r.name = 'instructor'
        )::int AS total_instructors,

        (
          SELECT COUNT(DISTINCT u.id)
          FROM users u
          JOIN user_roles ur
            ON ur.user_id = u.id
          JOIN roles r
            ON r.id = ur.role_id
          WHERE r.name = 'admin'
        )::int AS total_admins,

        (
          SELECT COUNT(*)
          FROM courses
        )::int AS total_courses,

        (
          SELECT COUNT(*)
          FROM courses
          WHERE status = 'pending'
        )::int AS pending_courses
    `);

    return res.status(200).json({
      success: true,
      stats: result.rows[0],
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin statistics",
    });
  }
});

// ============================================================
// GET USERS
// ============================================================

router.get("/users", async (req, res) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const roleFilter =
      typeof req.query.role === "string"
        ? req.query.role.trim()
        : "";

    let query = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.is_active,
        u.created_at,

        CASE
          WHEN BOOL_OR(r.name = 'admin') THEN 'admin'
          WHEN BOOL_OR(r.name = 'instructor') THEN 'instructor'
          WHEN BOOL_OR(r.name = 'student') THEN 'student'
          ELSE 'student'
        END AS role,

        COALESCE(
          STRING_AGG(
            DISTINCT r.name,
            ', ' ORDER BY r.name
          ),
          ''
        ) AS roles

      FROM users u

      LEFT JOIN user_roles ur
        ON ur.user_id = u.id

      LEFT JOIN roles r
        ON r.id = ur.role_id

      WHERE 1 = 1
    `;

    const values: string[] = [];
    let index = 1;

    // --------------------------------------------------------
    // Search by name/email
    // --------------------------------------------------------

    if (search) {
      query += `
        AND (
          LOWER(u.full_name) LIKE LOWER($${index})
          OR LOWER(u.email) LIKE LOWER($${index})
        )
      `;

      values.push(`%${search}%`);
      index++;
    }

    // --------------------------------------------------------
    // Filter by role
    // --------------------------------------------------------

    if (roleFilter) {
      query += `
        AND EXISTS (
          SELECT 1
          FROM user_roles ur2
          JOIN roles r2
            ON r2.id = ur2.role_id
          WHERE ur2.user_id = u.id
            AND r2.name = $${index}
        )
      `;

      values.push(roleFilter);
      index++;
    }

    query += `
      GROUP BY
        u.id,
        u.full_name,
        u.email,
        u.is_active,
        u.created_at

      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("Admin users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});

// ============================================================
// ACTIVATE / SUSPEND USER
// ============================================================

router.patch("/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false",
      });
    }

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        full_name,
        email,
        is_active
      `,
      [is_active, userId]
    );

    return res.status(200).json({
      success: true,
      message: is_active
        ? "User activated successfully"
        : "User suspended successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Admin user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
});

// ============================================================
// CHANGE USER ROLE
// ============================================================

router.patch("/users/:userId/role", async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "student",
      "instructor",
      "admin",
    ];

    // --------------------------------------------------------
    // Validate requested role
    // --------------------------------------------------------

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // --------------------------------------------------------
    // Check user exists
    // --------------------------------------------------------

    const userResult = await client.query(
      `
      SELECT
        id,
        full_name,
        email
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------------
    // Find role ID first
    // --------------------------------------------------------

    const roleResult = await client.query(
      `
      SELECT id, name
      FROM roles
      WHERE name = $1
      LIMIT 1
      `,
      [role]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Role not found",
      });
    }

    const roleId = roleResult.rows[0].id;

    // --------------------------------------------------------
    // Start transaction
    // --------------------------------------------------------

    await client.query("BEGIN");

    // Remove existing roles
    await client.query(
      `
      DELETE FROM user_roles
      WHERE user_id = $1
      `,
      [userId]
    );

    // Assign new role
    await client.query(
      `
      INSERT INTO user_roles (
        user_id,
        role_id
      )
      VALUES ($1, $2)
      `,
      [userId, roleId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `User role changed to ${role}`,
      user: {
        ...userResult.rows[0],
        role,
        roles: role,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Role rollback error:",
        rollbackError
      );
    }

    console.error("Admin role update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  } finally {
    client.release();
  }
});

// ============================================================
// GET ALL COURSES
// ============================================================

router.get("/courses", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.difficulty,
        c.price,
        c.status,
        c.created_at,

        u.id AS instructor_id,
        u.full_name AS instructor_name,
        u.email AS instructor_email

      FROM courses c

      LEFT JOIN users u
        ON u.id = c.instructor_id

      ORDER BY
        CASE
          WHEN c.status = 'pending' THEN 0
          WHEN c.status = 'published' THEN 1
          WHEN c.status = 'rejected' THEN 2
          ELSE 3
        END,
        c.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      courses: result.rows,
    });
  } catch (error) {
    console.error("Admin courses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load courses",
    });
  }
});

// ============================================================
// APPROVE / REJECT COURSE
// ============================================================

router.patch(
  "/courses/:courseId/status",
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { courseId } = req.params;
      const { status, comment } = req.body;

      const allowedStatuses = [
        "published",
        "rejected",
      ];

      // --------------------------------------------------------
      // Validate status
      // --------------------------------------------------------

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be published or rejected",
        });
      }

      const adminId = (req.user as any).userId;

      // --------------------------------------------------------
      // Start transaction
      // --------------------------------------------------------

      await client.query("BEGIN");

      // --------------------------------------------------------
      // Find course
      // --------------------------------------------------------

      const courseResult = await client.query(
        `
        SELECT
          id,
          title,
          instructor_id,
          status
        FROM courses
        WHERE id = $1
        FOR UPDATE
        `,
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      const course = courseResult.rows[0];

      // --------------------------------------------------------
      // Update course status
      // --------------------------------------------------------

      const updateResult = await client.query(
        `
        UPDATE courses
        SET
          status = $1
        WHERE id = $2
        RETURNING
          id,
          title,
          status
        `,
        [status, courseId]
      );

      // --------------------------------------------------------
      // Commit the actual course approval
      // --------------------------------------------------------

      await client.query("COMMIT");

      // --------------------------------------------------------
      // Optional approval history
      //
      // This MUST NOT make the approval fail.
      // --------------------------------------------------------

      try {
        await pool.query(
          `
          INSERT INTO course_approvals (
            course_id,
            reviewed_by,
            decision,
            comment,
            reviewed_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            NOW()
          )
          `,
          [
            courseId,
            adminId,
            status === "published"
              ? "approved"
              : "rejected",
            comment || null,
          ]
        );
      } catch (approvalLogError) {
        console.warn(
          "Course approval history could not be recorded:",
          approvalLogError
        );
      }

      return res.status(200).json({
        success: true,
        message:
          status === "published"
            ? "Course approved successfully"
            : "Course rejected successfully",
        course: updateResult.rows[0],
        previousStatus: course.status,
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Course status rollback error:",
          rollbackError
        );
      }

      console.error(
        "Admin course status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update course status",
      });
    } finally {
      client.release();
    }
  }
);

export default router;