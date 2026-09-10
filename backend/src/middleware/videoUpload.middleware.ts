import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "videos"
);

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
      .replace(/[^a-zA-Z0-9-_]/g, "_");

    const uniqueName = `${Date.now()}-${baseName}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
];

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only MP4, WebM, OGG, MOV, and AVI video files are allowed."
      )
    );
  }
};

export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});