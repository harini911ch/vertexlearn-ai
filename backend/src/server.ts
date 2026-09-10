import express from "express";
import cors from "cors";

import healthRouter from "./routes/health.routes";
import usersRouter from "./routes/users.routes";
import authRouter from "./routes/auth.routes";
import coursesRouter from "./routes/courses.routes";
import path from "path";
import aiRouter from "./routes/ai.routes";
import adminRoutes from "./routes/admin.routes";

import pool from "./config/database";

const app = express();

const PORT = 5000; 

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);
app.use("/health", healthRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRoutes);


app.get("/", (req, res) => {
  res.send("Welcome to VertexLearn AI Backend!");
});

app.post("/test", (req, res) => {
  console.log(req.body);
 
  res.json({
    message: "Data received successfully",
    data: req.body
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  pool.query("SELECT NOW()")
    .then((result) => {
      console.log("PostgreSQL connected successfully!");
      console.log("Database time:", result.rows[0]);
    })
    .catch((error) => {
      console.error("PostgreSQL connection failed:", error);
    });
});