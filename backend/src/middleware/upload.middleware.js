import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ─── Default upload (announcements / voting) — memory storage ─────────────────
const storage = multer.memoryStorage();

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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

export default upload;

// ─── Directory setup ──────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assignmentsDir = path.join(__dirname, "../public/uploads/assignments");
const submissionsDir = path.join(__dirname, "../public/uploads/submissions");

[assignmentsDir, submissionsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Disk storage factories ───────────────────────────────────────────────────
const makeDiskStorage = (dest) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });

// ─── General document filter (assignments / submissions) ─────────────────────
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

// ─── Lecture-note specific filter — PDF and images ONLY ──────────────────────
/**
 * Lecture notes only accept PDF files and common image formats.
 * Word, PowerPoint, Excel and other document types are intentionally
 * excluded so that the AI pipeline (summary, quiz, recommendations)
 * can reliably parse every uploaded file.
 */
const lectureNoteFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type for lecture notes. Only PDF and image files (jpg, jpeg, png, webp, gif) are allowed.",
      ),
      false,
    );
  }
};

// ─── Exported multer instances ────────────────────────────────────────────────

/** Used by assignment creation routes (broad document types) */
export const uploadAssignments = multer({
  storage: makeDiskStorage(assignmentsDir),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});

/** Used by submission routes (broad document types) */
export const uploadSubmissions = multer({
  storage: makeDiskStorage(submissionsDir),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});

/**
 * Used exclusively by lecture-note upload routes.
 * Accepts PDF and images only — enforces the AI-parsable requirement.
 */
export const uploadLectureNoteFile = multer({
  storage: makeDiskStorage(assignmentsDir),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: lectureNoteFileFilter,
});
