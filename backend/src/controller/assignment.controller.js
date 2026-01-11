import Assignment from "../models/assignment.model.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private (Lecturer/Admin)
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

    // Handle file attachments if provided
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "cug-assignments",
              resource_type: "raw",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        attachments.push({
          url: result.secure_url,
          cloudinaryId: result.public_id,
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
      totalMarks: totalMarks || 100,
      attachments,
    });

    await assignment.populate("lecturer", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: assignment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
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

    // Filter by status (active/expired)
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

// @desc    Get my assignments (for students)
// @route   GET /api/assignments/my-assignments
// @access  Private (Student)
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

    // Add submission status for each assignment
    const assignmentsWithStatus = assignments.map((assignment) => {
      const submission = assignment.submissions.find(
        (sub) => sub.student.toString() === req.user.id
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

// @desc    Get assignment by ID
// @route   GET /api/assignments/:id
// @access  Private
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

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
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
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      (sub) => sub.student.toString() === req.user.id
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this assignment",
      });
    }

    // Upload file to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "cug-submissions",
          resource_type: "raw",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Determine if submission is late
    const isLate = new Date() > new Date(assignment.dueDate);

    // Add submission
    assignment.submissions.push({
      student: req.user.id,
      fileUrl: result.secure_url,
      cloudinaryId: result.public_id,
      submittedAt: new Date(),
      status: isLate ? "late" : "submitted",
    });

    await assignment.save();

    res.status(201).json({
      success: true,
      message: `Assignment ${
        isLate ? "submitted late" : "submitted successfully"
      }`,
      data: {
        submittedAt: new Date(),
        isLate,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Grade assignment submission
// @route   PUT /api/assignments/:id/submissions/:submissionId/grade
// @access  Private (Lecturer/Admin)
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

    // Check authorization
    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to grade this assignment",
      });
    }

    // Find submission
    const submission = assignment.submissions.id(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Validate grade
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

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Lecturer/Admin)
export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check authorization
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
    if (totalMarks) assignment.totalMarks = totalMarks;
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

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Lecturer/Admin)
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check authorization
    if (
      assignment.lecturer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assignment",
      });
    }

    // Delete attachments from Cloudinary
    for (const attachment of assignment.attachments) {
      if (attachment.cloudinaryId) {
        await cloudinary.uploader.destroy(attachment.cloudinaryId, {
          resource_type: "raw",
        });
      }
    }

    // Delete submissions from Cloudinary
    for (const submission of assignment.submissions) {
      if (submission.cloudinaryId) {
        await cloudinary.uploader.destroy(submission.cloudinaryId, {
          resource_type: "raw",
        });
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

// @desc    Get assignment statistics
// @route   GET /api/assignments/:id/stats
// @access  Private (Lecturer/Admin)
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
      (sub) => sub.status === "graded"
    ).length;
    const lateSubmissions = assignment.submissions.filter(
      (sub) => sub.status === "late"
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
