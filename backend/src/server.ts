import express from "express";

const app = express();

const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Welcome to VertexLearn AI Backend!");
});
app.get("/health",(req,res)=>{
    res.json({
        status:"OK",
        message:"Vertexlearn-AI backend is learning"
    });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});