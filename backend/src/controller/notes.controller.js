import LectureNote from "../models/lecturenote.model.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { broadcastNotification } from "../controller/notification.controller.js";
import User from "../models/user.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Allowed file types (single source of truth for controller-level checks) ──
const ALLOWED_FILE_TYPES = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
]);

// ─── Helper: derive and validate file extension ───────────────────────────────
const getFileExtension = (filename) =>
  path.extname(filename).slice(1).toLowerCase();

// ─── Upload lecture note ──────────────────────────────────────────────────────
// @route  POST /api/notes
// @access Private (Lecturer / Admin)
export const uploadLectureNote = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload a file" });
    }

    const {
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy,
      tags,
    } = req.body;

    if (
      !title ||
      !course ||
      !courseCode ||
      !faculty ||
      !program ||
      !yearOfStudy
    ) {
      // Clean up orphaned file before responding
      const fp = path.join(assignmentsDir, req.file.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);

      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const fileExtension = getFileExtension(req.file.originalname);

    // Double-check extension against the allowed set (belt-and-suspenders guard
    // on top of the multer filter)
    if (!ALLOWED_FILE_TYPES.has(fileExtension)) {
      const fp = path.join(assignmentsDir, req.file.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);

      return res.status(400).json({
        success: false,
        message:
          "Invalid file type. Lecture notes only accept PDF and image files (jpg, jpeg, png, webp, gif).",
      });
    }

    const lectureNote = await LectureNote.create({
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy: parseInt(yearOfStudy),
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: fileExtension,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      tags: tags ? JSON.parse(tags) : [],
    });

    await lectureNote.populate("uploadedBy", "firstName lastName email");

    // Notify matching students
    const io = req.app.get("io");
    const uploaderName = `${req.user.firstName} ${req.user.lastName}`;

    const students = await User.find({
      role: "student",
      faculty,
      program,
      yearOfStudy: parseInt(yearOfStudy),
      isActive: true,
    }).select("_id");

    const studentIds = students.map((s) => s._id.toString());

    if (studentIds.length > 0) {
      await broadcastNotification({
        userId: studentIds,
        type: "note",
        title: `📄 New Lecture Note: ${title}`,
        message: `${uploaderName} uploaded a new note for ${course} (${courseCode})`,
        relatedId: lectureNote._id,
        relatedModel: "LectureNote",
        metadata: { course, courseCode, fileType: fileExtension },
        io,
      });
    }

    res.status(201).json({
      success: true,
      message: "Lecture note uploaded successfully",
      data: lectureNote,
    });
  } catch (error) {
    // Clean up file if Mongoose save fails
    if (req.file) {
      const fp = path.join(assignmentsDir, req.file.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Get all lecture notes with filters ──────────────────────────────────────
// @route  GET /api/notes
// @access Private
export const getAllLectureNotes = async (req, res) => {
  try {
    const {
      faculty,
      program,
      yearOfStudy,
      course,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (faculty) query.faculty = faculty;
    if (program) query.program = program;
    if (yearOfStudy) query.yearOfStudy = parseInt(yearOfStudy);
    if (course) query.course = { $regex: course, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const lectureNotes = await LectureNote.find(query)
      .populate("uploadedBy", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LectureNote.countDocuments(query);

    res.status(200).json({
      success: true,
      count: lectureNotes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: lectureNotes,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Get lecture note by ID ───────────────────────────────────────────────────
// @route  GET /api/notes/:id
// @access Private
export const getLectureNoteById = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id).populate(
      "uploadedBy",
      "firstName lastName email role",
    );

    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    if (req.user.role === "student") {
      const isEnrolled =
        lectureNote.faculty === req.user.faculty &&
        lectureNote.program === req.user.program &&
        lectureNote.yearOfStudy === req.user.yearOfStudy;

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. This lecture note is not for your enrolled program.",
        });
      }
    }

    lectureNote.views += 1;
    await lectureNote.save();

    res.status(200).json({ success: true, data: lectureNote });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Update lecture note ──────────────────────────────────────────────────────
// @route  PUT /api/notes/:id
// @access Private (Owner / Admin)
export const updateLectureNote = async (req, res) => {
  try {
    let lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    if (
      lectureNote.uploadedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this lecture note",
      });
    }

    const {
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy,
      tags,
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (course) updateData.course = course;
    if (courseCode) updateData.courseCode = courseCode;
    if (faculty) updateData.faculty = faculty;
    if (program) updateData.program = program;
    if (yearOfStudy) updateData.yearOfStudy = parseInt(yearOfStudy);
    if (tags) updateData.tags = tags;

    lectureNote = await LectureNote.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).populate("uploadedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Lecture note updated successfully",
      data: lectureNote,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Delete lecture note ──────────────────────────────────────────────────────
// @route  DELETE /api/notes/:id
// @access Private (Owner / Admin)
export const deleteLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    if (
      lectureNote.uploadedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this lecture note",
      });
    }

    if (lectureNote.filename) {
      const filePath = path.join(assignmentsDir, lectureNote.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await lectureNote.deleteOne();

    res.status(200).json({
      success: true,
      message: "Lecture note deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Download lecture note ────────────────────────────────────────────────────
// @route  GET /api/notes/:id/download
// @access Private
export const downloadLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id).populate(
      "uploadedBy",
      "firstName lastName",
    );

    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    if (req.user.role === "student") {
      const isEnrolled =
        lectureNote.faculty === req.user.faculty &&
        lectureNote.program === req.user.program &&
        lectureNote.yearOfStudy === req.user.yearOfStudy;

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. This lecture note is not for your enrolled program.",
        });
      }
    }

    if (!lectureNote.filename) {
      return res.status(404).json({
        success: false,
        message: "File not found for this lecture note",
      });
    }

    const filePath = path.join(assignmentsDir, lectureNote.filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found on server" });
    }

    lectureNote.downloads += 1;
    await lectureNote.save();

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/assignments/${lectureNote.filename}`;

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        filename: lectureNote.originalName,
        fileType: lectureNote.fileType,
        fileSize: lectureNote.fileSize,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Preview lecture note ─────────────────────────────────────────────────────
// @route  GET /api/notes/:id/preview
// @access Private
export const previewLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    if (req.user.role === "student") {
      const isEnrolled =
        lectureNote.faculty === req.user.faculty &&
        lectureNote.program === req.user.program &&
        lectureNote.yearOfStudy === req.user.yearOfStudy;

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. This lecture note is not for your enrolled program.",
        });
      }
    }

    if (!lectureNote.filename) {
      return res.status(404).json({
        success: false,
        message: "File not found for this lecture note",
      });
    }

    const filePath = path.join(assignmentsDir, lectureNote.filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found on server" });
    }

    lectureNote.views += 1;
    await lectureNote.save();

    const contentTypes = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };

    const contentType =
      contentTypes[lectureNote.fileType] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${lectureNote.originalName}"`,
    );

    fs.createReadStream(filePath).pipe(res);

    console.log("Preview ID:", req.params.id);
    console.log("Filename:", lectureNote.filename);
    console.log("Resolved path:", filePath);
    console.log("Exists:", fs.existsSync(filePath));
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Get notes for enrolled student ──────────────────────────────────────────
// @route  GET /api/notes/my-notes
// @access Private (Student)
export const getMyLectureNotes = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students",
      });
    }

    if (!req.user.faculty || !req.user.program || !req.user.yearOfStudy) {
      return res.status(400).json({
        success: false,
        message:
          "Your enrollment details (faculty, program, year of study) are incomplete. Please contact an administrator.",
      });
    }

    const { courseCode, search, page = 1, limit = 20 } = req.query;

    const query = {
      faculty: req.user.faculty,
      program: req.user.program,
      yearOfStudy: req.user.yearOfStudy,
    };

    if (courseCode) query.courseCode = { $regex: courseCode, $options: "i" };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const lectureNotes = await LectureNote.find(query)
      .populate("uploadedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LectureNote.countDocuments(query);

    res.status(200).json({
      success: true,
      count: lectureNotes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      enrollment: {
        faculty: req.user.faculty,
        program: req.user.program,
        yearOfStudy: req.user.yearOfStudy,
      },
      data: lectureNotes,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Get my uploaded notes (lecturer view) ───────────────────────────────────
// @route  GET /api/notes/uploaded-by-me
// @access Private (Lecturer)
export const getMyUploadedNotes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { uploadedBy: req.user.id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const lectureNotes = await LectureNote.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LectureNote.countDocuments(query);

    res.status(200).json({
      success: true,
      count: lectureNotes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: lectureNotes,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Stats (admin) ────────────────────────────────────────────────────────────
// @route  GET /api/notes/stats
// @access Private (Admin)
export const getLectureNoteStats = async (req, res) => {
  try {
    const totalNotes = await LectureNote.countDocuments();

    const notesByFaculty = await LectureNote.aggregate([
      { $group: { _id: "$faculty", count: { $sum: 1 } } },
    ]);

    const notesByProgram = await LectureNote.aggregate([
      {
        $group: {
          _id: { faculty: "$faculty", program: "$program" },
          count: { $sum: 1 },
        },
      },
    ]);

    const topDownloadedNotes = await LectureNote.find()
      .sort({ downloads: -1 })
      .limit(10)
      .select("title downloads");

    res.status(200).json({
      success: true,
      data: { totalNotes, notesByFaculty, notesByProgram, topDownloadedNotes },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Invalidate cached AI fields ─────────────────────────────────────────────
// @route  POST /api/notes/:id/regenerate-ai
// @access Private (Owner / Admin)
// Clears stored aiSummary, aiQuiz, and aiRecommendations so the next request
// to each AI endpoint will produce a fresh result.
export const regenerateAiContent = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture note not found" });
    }

    if (
      lectureNote.uploadedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to regenerate AI content for this note",
      });
    }

    // Selectively clear only the fields requested
    const { clearSummary, clearQuiz, clearRecommendations } = req.body;

    if (clearSummary !== false) lectureNote.aiSummary = undefined;
    if (clearQuiz !== false) lectureNote.aiQuiz = undefined;
    if (clearRecommendations !== false)
      lectureNote.aiRecommendations = undefined;

    await lectureNote.save();

    res.status(200).json({
      success: true,
      message: "AI content cleared. Re-request each AI endpoint to regenerate.",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Path constant (shared by upload / delete / preview / download) ───────────
const assignmentsDir = path.join(__dirname, "../public/uploads/assignments");
