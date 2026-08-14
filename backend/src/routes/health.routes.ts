import { Router } from "express";
const router= Router();
router.get("/",(req,res)=>{
    res.json({
        status:"ok",
        message:" Vertexlearn-ai Backend is running"
    });
});
export default router;