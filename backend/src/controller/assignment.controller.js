import Assignment from "../models/assignment.model.js";
import fs from "fs";
import path from "path";
import { broadcastToRoles } from "../controller/notification.controller.js";

// Base directory where submission files live on disk (mirrors the multer
// upload middleware). Used to resolve a submission's file when the stored
// absolute filePath is unavailable (e.g. across machines/deploys).
const isVercel = process.env.VERCEL === "1";
const submissionsDir = isVercel
  ? "/tmp/uploads/submissions"
  : path.join(process.cwd(), "src/public/uploads/submissions");

// Resolves an existing file path for a submission, or null if none exists.
const resolveSubmissionFilePath = (submission) => {
  if (submission.filePath && fs.existsSync(submission.filePath)) {
    return submission.filePath;
  }
  // Fall back to the submissions directory + the stored filename.
  const name = submission.fileUrl
    ? path.basename(submission.fileUrl)
    : submission.fileName;
  if (name) {
    const candidate = path.join(submissionsDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

// Create assignment
export const createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy,
      dueDate,
      totalMarks,
    } = req.body;

    if (
      !title ||
      !description ||
      !course ||
      !courseCode ||
      !faculty ||
      !program ||
      !yearOfStudy ||
      !dueDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const attachments = [];
    if (req.files?.length > 0) {
      for (const file of req.files) {
        attachments.push({
          url: `/uploads/assignments/${file.filename}`,
          filePath: file.path,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
        });
      }
    }

    const assignment = await Assignment.create({
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy: parseInt(yearOfStudy),
      lecturer: req.user.id,
      dueDate,
      totalMarks: totalMarks ? parseInt(totalMarks) : 100,
      attachments,
    });
    await assignment.populate("lecturer", "firstName lastName email");

    // ── Notify students matching faculty+program+year ───────────────────────────
    const io = req.app.get("io");
    const lecturerName =
      `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
      "Lecturer";
    const due = new Date(dueDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    // Import User here to find matching students
    const User = (await import("../models/user.model.js")).default;
    const students = await User.find({
      role: "student",
      faculty,
      program,
      yearOfStudy: parseInt(yearOfStudy),
      isActive: true,
    }).select("_id");
    const studentIds = students.map((s) => s._id.toString());

    if (studentIds.length > 0) {
      const { broadcastNotification } =
        await import("./notification.controller.js");
      await broadcastNotification({
        userId: studentIds,
        type: "assignment",
        title: `📝 New Assignment: ${title}`,
        message: `${lecturerName} posted a new assignment for ${course}. Due: ${due}`,
        relatedId: assignment._id,
        relatedModel: "Assignment",
        metadata: {
          course,
          courseCode,
          dueDate,
          faculty,
          program,
          yearOfStudy: parseInt(yearOfStudy),
        },
        io,
      });
    }

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: assignment,
    });
  } catch (error) {
    if (req.files?.length > 0) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all assignments
export const getAllAssignments = async (req, res) => {
  try {
    const {
      faculty,
      program,
      yearOfStudy,
      course,
      status,
      page = 1,
      limit = 20,
    } = req.query;
    const query = {};
    // Lecturers only see assignments they created (not other lecturers').
    if (req.user.role === "lecturer") {
      query.lecturer = req.user.id;
    }
    if (faculty) query.faculty = faculty;
    if (program) query.program = program;
    if (yearOfStudy) query.yearOfStudy = parseInt(yearOfStudy);
    if (course) query.course = { $regex: course, $options: "i" };
    if (status === "active") {
      query.dueDate = { $gte: new Date() };
      query.isActive = true;
    } else if (status === "expired") {
      query.dueDate = { $lt: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const assignments = await Assignment.find(query)
      .populate("lecturer", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Assignment.countDocuments(query);
    res.status(200).json({
      success: true,
      count: assignments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: assignments,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get my assignments (for students)
export const getMyAssignments = async (req, res) => {
  try {
    if (req.user.role !== "student")
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students",
      });
    const { status, page = 1, limit = 20 } = req.query;
    const query = {
      faculty: req.user.faculty,
      program: req.user.program,
      yearOfStudy: req.user.yearOfStudy,
      isActive: true,
    };
    if (status === "pending") {
      query.dueDate = { $gte: new Date() };
      query["submissions.student"] = { $ne: req.user.id };
    } else if (status === "submitted") {
      query["submissions.student"] = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const assignments = await Assignment.find(query)
      .populate("lecturer", "firstName lastName email")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    const assignmentsWithStatus = assignments.map((a) => {
      const sub = a.submissions.find(
        (s) => s.student.toString() === req.user.id,
      );
      return {
        ...a.toObject(),
        mySubmission: sub || null,
        hasSubmitted: !!sub,
      };
    });
    const total = await Assignment.countDocuments(query);
    res.status(200).json({
      success: true,
      count: assignmentsWithStatus.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: assignmentsWithStatus,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("lecturer", "firstName lastName email")
      .populate("submissions.student", "firstName lastName email studentId");
    if (!assignment)
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Submit assignment
export const submitAssignment = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Please upload a file" });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }
    if (
      assignment.submissions.find((s) => s.student.toString() === req.user.id)
    ) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "You have already submitted this assignment",
      });
    }
    if (!assignment.isActive) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "This assignment is no longer active",
      });
    }
    const isLate = new Date() > new Date(assignment.dueDate);
    assignment.submissions.push({
      student: req.user.id,
      fileUrl: `/uploads/submissions/${req.file.filename}`,
      fileName: req.file.originalname,
      filePath: req.file.path,
      submittedAt: new Date(),
      status: isLate ? "late" : "submitted",
    });
    await assignment.save();
    res.status(201).json({
      success: true,
      message: `Assignment ${isLate ? "submitted late" : "submitted successfully"}`,
      data: { submittedAt: new Date(), isLate },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Grade submission
export const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const { id, submissionId } = req.params;
    if (grade === undefined)
      return res
        .status(400)
        .json({ success: false, message: "Please provide a grade" });
    const assignment = await Assignment.findById(id);
    if (!assignment)
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    )
      return res.status(403).json({
        success: false,
        message: "Not authorized to grade this assignment",
      });
    const submission = assignment.submissions.id(submissionId);
    if (!submission)
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    if (grade < 0 || grade > assignment.totalMarks)
      return res.status(400).json({
        success: false,
        message: `Grade must be between 0 and ${assignment.totalMarks}`,
      });
    submission.grade = grade;
    submission.feedback = feedback || "";
    submission.status = "graded";
    await assignment.save();
    res.status(200).json({
      success: true,
      message: "Submission graded successfully",
      data: submission,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Download / preview a student's submission file
// @route  GET /api/assignments/:id/submissions/:submissionId/file
// @access Private (lecturer who owns the assignment, admin, or the owning student)
export const downloadSubmissionFile = async (req, res) => {
  try {
    const { id, submissionId } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    const submission = assignment.submissions.id(submissionId);
    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    }

    // Authorize: owning lecturer, admin, or the student who submitted.
    const isOwnerLecturer = assignment.lecturer.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    const isOwningStudent = submission.student.toString() === req.user.id;
    if (!isOwnerLecturer && !isAdmin && !isOwningStudent) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this submission",
      });
    }

    const filePath = resolveSubmissionFilePath(submission);
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message:
          "The submitted file is no longer available on the server. The student may need to re-submit.",
      });
    }

    // ?download=1 forces a download; otherwise serve inline for previewing.
    if (req.query.download === "1") {
      return res.download(filePath, submission.fileName || path.basename(filePath));
    }
    res.setHeader("Content-Disposition", "inline");
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    const { title, description, dueDate, totalMarks, isActive } = req.body;
    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;
    if (totalMarks) assignment.totalMarks = parseInt(totalMarks);
    if (isActive !== undefined) assignment.isActive = isActive;
    await assignment.save();
    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    for (const a of assignment.attachments) {
      if (a.filePath && fs.existsSync(a.filePath)) fs.unlinkSync(a.filePath);
    }
    for (const s of assignment.submissions) {
      if (s.filePath && fs.existsSync(s.filePath)) fs.unlinkSync(s.filePath);
    }
    await assignment.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get assignment statistics
export const getAssignmentStats = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    const totalSubmissions = assignment.submissions.length;
    const gradedSubmissions = assignment.submissions.filter(
      (s) => s.status === "graded",
    ).length;
    const lateSubmissions = assignment.submissions.filter(
      (s) => s.status === "late",
    ).length;
    const grades = assignment.submissions
      .filter((s) => s.grade !== undefined)
      .map((s) => s.grade);
    const averageGrade =
      grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
    res.status(200).json({
      success: true,
      data: {
        totalSubmissions,
        gradedSubmissions,
        lateSubmissions,
        averageGrade: averageGrade.toFixed(2),
        highestGrade: grades.length > 0 ? Math.max(...grades) : 0,
        lowestGrade: grades.length > 0 ? Math.min(...grades) : 0,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
