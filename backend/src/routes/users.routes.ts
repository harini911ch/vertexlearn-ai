import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../config/database";

const router = Router();


// GET ALL USERS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          u.id,
          u.full_name,
          u.email,
          r.name AS role,
          u.is_active,
          u.created_at
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error("Error fetching users:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
});


// CREATE USER
router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Create user
      const userResult = await client.query(
        `INSERT INTO users
          (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, full_name, email, is_active, created_at`,
        [name, email, hashedPassword]
      );

      const user = userResult.rows[0];

      // Give newly created user the student role
      const roleResult = await client.query(
        `SELECT id
         FROM roles
         WHERE name = 'student'`
      );

      if (roleResult.rows.length === 0) {
        throw new Error("Student role not found");
      }

      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)`,
        [user.id, roleResult.rows[0].id]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: "student",
          is_active: user.is_active,
          created_at: user.created_at
        }
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error("Error creating user:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create user"
    });
  }
});


export default router;