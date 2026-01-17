import Assignment from "../models/assignment.model.js";
import fs from "fs";

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

    console.log("[v0] Create assignment request:", req.body);

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

    // Handle optional file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      console.log("[v0] Processing", req.files.length, "attachments");
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
      yearOfStudy: Number.parseInt(yearOfStudy),
      lecturer: req.user.id,
      dueDate,
      totalMarks: totalMarks ? Number.parseInt(totalMarks) : 100,
      attachments,
    });

    await assignment.populate("lecturer", "firstName lastName email");

    console.log("[v0] Assignment created:", assignment._id);

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("[v0] Error creating assignment:", error);
    // Clean up uploaded files if error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
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

    if (faculty) query.faculty = faculty;
    if (program) query.program = program;
    if (yearOfStudy) query.yearOfStudy = Number.parseInt(yearOfStudy);
    if (course) query.course = { $regex: course, $options: "i" };

    if (status === "active") {
      query.dueDate = { $gte: new Date() };
      query.isActive = true;
    } else if (status === "expired") {
      query.dueDate = { $lt: new Date() };
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const assignments = await Assignment.find(query)
      .populate("lecturer", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Assignment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: assignments.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: assignments,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get my assignments (for students)
export const getMyAssignments = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students",
      });
    }

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

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const assignments = await Assignment.find(query)
      .populate("lecturer", "firstName lastName email")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const assignmentsWithStatus = assignments.map((assignment) => {
      const submission = assignment.submissions.find(
        (sub) => sub.student.toString() === req.user.id,
      );
      return {
        ...assignment.toObject(),
        mySubmission: submission || null,
        hasSubmitted: !!submission,
      };
    });

    const total = await Assignment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: assignmentsWithStatus.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: assignmentsWithStatus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("lecturer", "firstName lastName email")
      .populate("submissions.student", "firstName lastName email studentId");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Submit assignment
export const submitAssignment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const existingSubmission = assignment.submissions.find(
      (sub) => sub.student.toString() === req.user.id,
    );

    if (existingSubmission) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "You have already submitted this assignment",
      });
    }

    if (!assignment.isActive) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
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
      data: {
        submittedAt: new Date(),
        isLate,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Grade submission
export const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const { id, submissionId } = req.params;

    if (grade === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide a grade",
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to grade this assignment",
      });
    }

    const submission = assignment.submissions.id(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    if (grade < 0 || grade > assignment.totalMarks) {
      return res.status(400).json({
        success: false,
        message: `Grade must be between 0 and ${assignment.totalMarks}`,
      });
    }

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
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assignment",
      });
    }

    const { title, description, dueDate, totalMarks, isActive } = req.body;

    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;
    if (totalMarks) assignment.totalMarks = Number.parseInt(totalMarks);
    if (isActive !== undefined) assignment.isActive = isActive;

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assignment",
      });
    }

    // Delete attachment files
    for (const attachment of assignment.attachments) {
      if (attachment.filePath && fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
    }

    // Delete submission files
    for (const submission of assignment.submissions) {
      if (submission.filePath && fs.existsSync(submission.filePath)) {
        fs.unlinkSync(submission.filePath);
      }
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get assignment statistics
export const getAssignmentStats = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const totalSubmissions = assignment.submissions.length;
    const gradedSubmissions = assignment.submissions.filter(
      (sub) => sub.status === "graded",
    ).length;
    const lateSubmissions = assignment.submissions.filter(
      (sub) => sub.status === "late",
    ).length;

    const grades = assignment.submissions
      .filter((sub) => sub.grade !== undefined)
      .map((sub) => sub.grade);

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
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
