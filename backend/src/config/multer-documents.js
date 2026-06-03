import multer from "multer";
import path from "path";
import fs from "fs";

// ─── Vercel + Local Upload Directory ────────────────────────────────────────

// Vercel filesystem is read-only except /tmp
const isVercel = process.env.VERCEL === "1";

const baseUploadDir = isVercel
  ? "/tmp/uploads"
  : path.join(process.cwd(), "src/public/uploads");

const uploadsDir = path.join(baseUploadDir, "timetables");

// Create upload directory safely
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {
    recursive: true,
  });
}

// ─── Configure Multer Storage ───────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const ext = path.extname(file.originalname);

    const name = path.basename(file.originalname, ext);

    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// ─── File Filter ────────────────────────────────────────────────────────────
// Allows PDF, Excel, ODS

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.oasis.opendocument.spreadsheet",
  ];

  const allowedExtensions = [".pdf", ".xls", ".xlsx", ".ods"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF and Excel files are allowed (pdf, xls, xlsx, ods)",
      ),

      false,
    );
  }
};

// ─── Export Middleware ──────────────────────────────────────────────────────

const uploadDocuments = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter,
});

export default uploadDocuments;
