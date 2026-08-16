import bcrypt from "bcrypt";
import { Router } from "express";
import pool from "../config/database";
import { generateToken } from "../utils/jwt";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

router.post("/login", async (req, res) => {
  // login logic will go here
  const {email,password}=req.body;
  if(!email || !password){
    return res.status(400).json({
      success:false,
      message:"email or password are required"
    });
  }
  const result= await pool.query(
    "select id , name,email,password, role from users where email=$1",
    [email]
  );
  if (result.rows.length === 0) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password"
  });
 }
 const user = result.rows[0];
 const passwordMatch = await bcrypt.compare(password, user.password);
 if (!passwordMatch) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password"
  });
}
const token = generateToken(user.id, user.role);
return res.status(200).json({
  success: true,
  message: "Login successful",
  token: token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
});

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    if (!req.user || typeof req.user === "string") {
  return res.status(401).json({
    success: false,
    message: "Invalid user information"
  });
}

const user = req.user;

    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching profile:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
});


router.get(
  "/student-only",
  authenticateToken,
  authorizeRoles("student"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome student! You have access to this route."
    });
  }
);

router.get(
  "/instructor-only",
  authenticateToken,
  authorizeRoles("instructor"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome instructor! You have access to this route."
    });
  }
);
export default router;