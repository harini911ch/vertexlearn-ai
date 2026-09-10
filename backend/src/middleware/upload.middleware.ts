import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, uniqueName);
  }
});

const allowedExtensions = [
  ".pdf",
  ".zip",
  ".java",
  ".py",
  ".js",
  ".ts",
  ".c",
  ".cpp",
  ".txt"
];

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error("Only PDF, ZIP, and code files are allowed")
    );
  }

  cb(null, true);
};

export const uploadAssignment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});