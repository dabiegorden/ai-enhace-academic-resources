import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Configure multer for file uploads — memory storage so we can pipe to Cloudinary
const storage = multer.memoryStorage();

// Accept images AND common document types for announcements/voting
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Unsupported file type. Allowed: images (jpg, png, gif, webp) and documents (pdf, doc, docx)",
      ),
      false,
    );
  }
  cb(null, true);
};

// Default export — used by announcements and voting
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
  },
  fileFilter: fileFilter,
});

export default upload;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories if they don't exist
const assignmentsDir = path.join(__dirname, "../public/uploads/assignments");
const submissionsDir = path.join(__dirname, "../public/uploads/submissions");
[assignmentsDir, submissionsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, assignmentsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".xls",
    ".xlsx",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed types: PDF, Word, PowerPoint, Images, Excel",
      ),
      false,
    );
  }
};

export const uploadAssignments = multer({
  storage: assignmentStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});

export const uploadSubmissions = multer({
  storage: submissionStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});
