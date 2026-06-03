import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import User from "../models/user.model.js";

// ─── Helper ───────────────────────────────────────────────────────────────────
const sanitize = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

// ─── GET ALL USERS (Admin / Lecturer) ─────────────────────────────────────────
// @route   GET /api/users
// @access  Private — admin, lecturer
export const getAllUsers = async (req, res) => {
  try {
    const { role, faculty, program, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (faculty) query.faculty = faculty;
    if (program) query.program = program;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── GET USER BY ID ────────────────────────────────────────────────────────────
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── UPDATE OWN PROFILE ────────────────────────────────────────────────────────
// Any logged-in user can update their own basic info.
// Students: firstName, lastName, faculty, program, yearOfStudy
// Lecturers: firstName, lastName, faculty
// Admins: firstName, lastName
// @route   PUT /api/users/profile
// @access  Private — all roles
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, faculty, program, yearOfStudy } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();

    // Faculty allowed for students & lecturers
    if (faculty && (user.role === "student" || user.role === "lecturer")) {
      user.faculty = faculty;
    }

    // Program & year only for students
    if (user.role === "student") {
      if (program) user.program = program.trim();
      if (yearOfStudy !== undefined && yearOfStudy !== null)
        user.yearOfStudy = Number(yearOfStudy);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: sanitize(user),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── CHANGE OWN PASSWORD ───────────────────────────────────────────────────────
// Validates the current password then sets the new one.
// @route   PUT /api/users/profile/password
// @access  Private — all roles
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide current password, new password, and confirmation",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match",
      });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: UPDATE ANY USER ────────────────────────────────────────────────────
// Admin can change any field, including role, studentId, and optionally reset
// password by passing newPassword (no currentPassword required for admin).
// @route   PUT /api/users/:id
// @access  Private — admin
export const updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      studentId,
      faculty,
      program,
      yearOfStudy,
      newPassword,
    } = req.body;

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role;
    if (studentId) user.studentId = studentId;
    if (faculty) user.faculty = faculty;
    if (program) user.program = program;
    if (yearOfStudy !== undefined && yearOfStudy !== null)
      user.yearOfStudy = Number(yearOfStudy);

    // Admin can reset password directly
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: sanitize(user),
    });
  } catch (error) {
    // Duplicate key (email / studentId)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} is already in use`,
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── UPLOAD PROFILE IMAGE ──────────────────────────────────────────────────────
// @route   POST /api/users/profile-image
// @access  Private — all roles
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload a file" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "cug-profiles",
          transformation: [{ width: 500, height: 500, crop: "fill" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file.buffer);
    });

    const user = await User.findById(req.user.id);
    user.profileImage = result.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: { profileImage: result.secure_url },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── DELETE USER (Admin) ───────────────────────────────────────────────────────
// @route   DELETE /api/users/:id
// @access  Private — admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await user.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── TOGGLE ACTIVE STATUS (Admin) ─────────────────────────────────────────────
// @route   PUT /api/users/:id/toggle-status
// @access  Private — admin
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: sanitize(user),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── GET STUDENTS BY PROGRAM ───────────────────────────────────────────────────
// @route   GET /api/users/students/by-program
// @access  Private
export const getStudentsByProgram = async (req, res) => {
  try {
    const { program, faculty, yearOfStudy } = req.query;
    const query = { role: "student" };
    if (program) query.program = program;
    if (faculty) query.faculty = faculty;
    if (yearOfStudy) query.yearOfStudy = yearOfStudy;

    const students = await User.find(query)
      .select("-password")
      .sort({ lastName: 1 });
    res
      .status(200)
      .json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── GET LECTURERS ─────────────────────────────────────────────────────────────
// @route   GET /api/users/lecturers
// @access  Private
export const getLecturers = async (req, res) => {
  try {
    const { faculty } = req.query;
    const query = { role: "lecturer" };
    if (faculty) query.faculty = faculty;

    const lecturers = await User.find(query)
      .select("-password")
      .sort({ lastName: 1 });
    res
      .status(200)
      .json({ success: true, count: lecturers.length, data: lecturers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
