import multer from "multer";
import path from "path";
import fs from "fs";

// ─── Default upload (announcements / voting) — memory storage ────────────────

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
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

export default upload;

// ─── Vercel + Local Directory Setup ──────────────────────────────────────────

// Vercel only allows writing inside /tmp
const isVercel = process.env.VERCEL === "1";

const baseUploadDir = isVercel
  ? "/tmp/uploads"
  : path.join(process.cwd(), "src/public/uploads");

const assignmentsDir = path.join(baseUploadDir, "assignments");

const submissionsDir = path.join(baseUploadDir, "submissions");

// create folders safely
[assignmentsDir, submissionsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
});

// ─── Disk storage factory ────────────────────────────────────────────────────

const makeDiskStorage = (dest) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, dest);
    },

    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

      const ext = path.extname(file.originalname);

      const name = path.basename(file.originalname, ext);

      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });

// ─── Assignment + Submission Filter ──────────────────────────────────────────

const documentFileFilter = (req, file, cb) => {
  // Only PDF and images are allowed anywhere in the system. PowerPoint, Word,
  // and Excel uploads have been removed.
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  const allowedExtensions = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Allowed: PDF and images only."),
      false,
    );
  }
};

// ─── Lecture Note Filter ─────────────────────────────────────────────────────

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
      new Error("Invalid lecture note type. Only PDF and images are allowed."),
      false,
    );
  }
};

// ─── Export Upload Handlers ──────────────────────────────────────────────────

// Assignments
export const uploadAssignments = multer({
  storage: makeDiskStorage(assignmentsDir),

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: documentFileFilter,
});

// Student submissions
export const uploadSubmissions = multer({
  storage: makeDiskStorage(submissionsDir),

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: documentFileFilter,
});

// Lecture notes (AI parser friendly)
export const uploadLectureNoteFile = multer({
  storage: makeDiskStorage(assignmentsDir),

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: lectureNoteFileFilter,
});

// Lecture notes — MEMORY storage so the buffer can be streamed to Cloudinary.
export const uploadLectureNoteMemory = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: lectureNoteFileFilter,
});
