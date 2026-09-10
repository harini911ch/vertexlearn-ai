import bcrypt from "bcrypt";
import { Router } from "express";

import pool from "../config/database";
import { generateToken } from "../utils/jwt";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

/* =========================================================
   REGISTER
   ========================================================= */

router.post("/register", async (req, res) => {
  const client = await pool.connect();

  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, password and role are required",
      });
    }

    const normalizedName = String(full_name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toLowerCase();

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (normalizedPasswordTooShort(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (!["student", "instructor"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Choose student or instructor",
      });
    }

    await client.query("BEGIN");

    const existingUser = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (
        full_name,
        email,
        password_hash,
        is_active
      )
      VALUES ($1, $2, $3, TRUE)
      RETURNING id, full_name, email`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    const roleResult = await client.query(
      `SELECT id, name
       FROM roles
       WHERE LOWER(name) = LOWER($1)`,
      [normalizedRole]
    );

    if (roleResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(500).json({
        success: false,
        message: "Selected role is not configured in the system",
      });
    }

    const roleRecord = roleResult.rows[0];

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)`,
      [user.id, roleRecord.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: roleRecord.name,
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    console.error("Registration error:", error);

    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   LOGIN
   ========================================================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        u.password_hash,
        r.name AS role
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
        AND u.is_active = TRUE`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user.id, user.role);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/* =========================================================
   PROFILE
   ========================================================= */

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    if (!req.user || typeof req.user === "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid user information",
      });
    }

    const user = req.user;

    const result = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        r.name AS role,
        u.created_at
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching profile:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

/* =========================================================
   STUDENT TEST ROUTE
   ========================================================= */

router.get(
  "/student-only",
  authenticateToken,
  authorizeRoles("student"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome student! You have access to this route.",
    });
  }
);

/* =========================================================
   INSTRUCTOR TEST ROUTE
   ========================================================= */

router.get(
  "/instructor-only",
  authenticateToken,
  authorizeRoles("instructor"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome instructor! You have access to this route.",
    });
  }
);

/* =========================================================
   PASSWORD VALIDATION HELPER
   ========================================================= */

function normalizedPasswordTooShort(password: unknown): boolean {
  return String(password).length < 8;
}

export default router;