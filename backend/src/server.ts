import express from "express";
import healthRouter from "./routes/health.routes";
import pool from "./config/database";

const app = express();

const PORT = 5000;

app.use(express.json());
app.use("/health", healthRouter);

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