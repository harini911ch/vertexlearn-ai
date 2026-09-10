import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "resources"
);

// Create folder automatically if it does not exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    cb(
      null,
      `${Date.now()}-${baseName}${extension.toLowerCase()}`
    );
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",

  // PPT
  "application/vnd.ms-powerpoint",

  // PPTX
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new Error(
        "Only PDF, PPT and PPTX files are allowed"
      )
    );
  }

  cb(null, true);
};

export const uploadResource = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});