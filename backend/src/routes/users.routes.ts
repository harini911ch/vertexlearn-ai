import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../config/database";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id"
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error("Error fetching users:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
});

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

    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error("Error creating user:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create user"
    });
  }
});


export default router;