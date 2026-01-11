import cloudinary from "../config/cloudinary.js";
import LectureNote from "../models/lecturenote.model.js";
import streamifier from "streamifier";

// @desc    Upload lecture note
// @route   POST /api/notes
// @access  Private (Lecturer/Admin)
export const uploadLectureNote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
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

    // Validate required fields
    if (
      !title ||
      !course ||
      !courseCode ||
      !faculty ||
      !program ||
      !yearOfStudy
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Determine file type
    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
    const resourceType = "raw";

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "cug-lecture-notes",
          resource_type: resourceType,
          format: fileExtension,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    // Create lecture note document
    const lectureNote = await LectureNote.create({
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy: Number.parseInt(yearOfStudy),
      fileUrl: result.secure_url,
      fileType: fileExtension,
      fileSize: req.file.size,
      cloudinaryId: result.public_id,
      uploadedBy: req.user.id,
      tags: tags ? JSON.parse(tags) : [],
    });

    // Populate uploader info
    await lectureNote.populate("uploadedBy", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Lecture note uploaded successfully",
      data: lectureNote,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all lecture notes with filters
// @route   GET /api/notes
// @access  Private
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
    if (yearOfStudy) query.yearOfStudy = Number.parseInt(yearOfStudy);
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

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const lectureNotes = await LectureNote.find(query)
      .populate("uploadedBy", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await LectureNote.countDocuments(query);

    res.status(200).json({
      success: true,
      count: lectureNotes.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: lectureNotes,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get lecture note by ID
// @route   GET /api/notes/:id
// @access  Private
export const getLectureNoteById = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id).populate(
      "uploadedBy",
      "firstName lastName email role"
    );

    if (!lectureNote) {
      return res.status(404).json({
        success: false,
        message: "Lecture note not found",
      });
    }

    // Increment views
    lectureNote.views += 1;
    await lectureNote.save();

    res.status(200).json({
      success: true,
      data: lectureNote,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update lecture note
// @route   PUT /api/notes/:id
// @access  Private (Owner/Admin)
export const updateLectureNote = async (req, res) => {
  try {
    let lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res.status(404).json({
        success: false,
        message: "Lecture note not found",
      });
    }

    // Check if user is owner or admin
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
    if (description) updateData.description = description;
    if (course) updateData.course = course;
    if (courseCode) updateData.courseCode = courseCode;
    if (faculty) updateData.faculty = faculty;
    if (program) updateData.program = program;
    if (yearOfStudy) updateData.yearOfStudy = Number.parseInt(yearOfStudy);
    if (tags) updateData.tags = tags;

    lectureNote = await LectureNote.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("uploadedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: "Lecture note updated successfully",
      data: lectureNote,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete lecture note
// @route   DELETE /api/notes/:id
// @access  Private (Owner/Admin)
export const deleteLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res.status(404).json({
        success: false,
        message: "Lecture note not found",
      });
    }

    // Check if user is owner or admin
    if (
      lectureNote.uploadedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this lecture note",
      });
    }

    // Delete from Cloudinary
    if (lectureNote.cloudinaryId) {
      await cloudinary.uploader.destroy(lectureNote.cloudinaryId, {
        resource_type: "raw",
      });
    }

    await lectureNote.deleteOne();

    res.status(200).json({
      success: true,
      message: "Lecture note deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Download lecture note
// @route   GET /api/notes/:id/download
// @access  Private
export const downloadLectureNote = async (req, res) => {
  try {
    const lectureNote = await LectureNote.findById(req.params.id);

    if (!lectureNote) {
      return res.status(404).json({
        success: false,
        message: "Lecture note not found",
      });
    }

    // Increment downloads
    lectureNote.downloads += 1;
    await lectureNote.save();

    res.status(200).json({
      success: true,
      data: {
        fileUrl: lectureNote.fileUrl,
        fileName: `${lectureNote.title}.${lectureNote.fileType}`,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get lecture notes by program (for students)
// @route   GET /api/notes/my-notes
// @access  Private (Student)
export const getMyLectureNotes = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students",
      });
    }

    const { course, search, page = 1, limit = 20 } = req.query;

    const query = {
      faculty: req.user.faculty,
      program: req.user.program,
      yearOfStudy: req.user.yearOfStudy,
    };

    if (course) query.course = { $regex: course, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const lectureNotes = await LectureNote.find(query)
      .populate("uploadedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await LectureNote.countDocuments(query);

    res.status(200).json({
      success: true,
      count: lectureNotes.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: lectureNotes,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get my uploaded notes (for lecturers)
// @route   GET /api/notes/uploaded-by-me
// @access  Private (Lecturer)
export const getMyUploadedNotes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const lectureNotes = await LectureNote.find({ uploadedBy: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await LectureNote.countDocuments({ uploadedBy: req.user.id });

    res.status(200).json({
      success: true,
      count: lectureNotes.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: lectureNotes,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get lecture note statistics
// @route   GET /api/notes/stats
// @access  Private (Admin)
export const getLectureNoteStats = async (req, res) => {
  try {
    const totalNotes = await LectureNote.countDocuments();

    const notesByFaculty = await LectureNote.aggregate([
      {
        $group: {
          _id: "$faculty",
          count: { $sum: 1 },
        },
      },
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
      data: {
        totalNotes,
        notesByFaculty,
        notesByProgram,
        topDownloadedNotes,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
