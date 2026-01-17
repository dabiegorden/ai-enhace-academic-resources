import Timetable from "../models/timetable.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadTimetableDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const timetable = await Timetable.findById(id);

    if (!timetable) {
      // Clean up uploaded file if timetable not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    // Delete old file if exists
    if (timetable.timetableDocument && timetable.timetableDocument.filename) {
      const oldFilePath = path.join(
        __dirname,
        "../public/uploads/timetables",
        timetable.timetableDocument.filename
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileType = [".xls", ".xlsx", ".ods"].includes(fileExtension)
      ? "excel"
      : "pdf";

    timetable.timetableDocument = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: fileType,
      fileSize: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
    };

    await timetable.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: timetable,
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const downloadTimetableDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const timetable = await Timetable.findById(id).populate(
      "timetableDocument.uploadedBy",
      "firstName lastName"
    );

    if (!timetable || !timetable.timetableDocument) {
      return res.status(404).json({
        success: false,
        message: "Document not found for this timetable",
      });
    }

    const filePath = path.join(
      __dirname,
      "../public/uploads/timetables",
      timetable.timetableDocument.filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    res.download(filePath, timetable.timetableDocument.originalName, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTimetableDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const timetable = await Timetable.findById(id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    if (timetable.timetableDocument && timetable.timetableDocument.filename) {
      const filePath = path.join(
        __dirname,
        "../public/uploads/timetables",
        timetable.timetableDocument.filename
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    timetable.timetableDocument = null;
    await timetable.save();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: timetable,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const createTimetable = async (req, res) => {
  try {
    const {
      programCode,
      programName,
      yearOfStudy,
      level,
      faculty,
      semester,
      academicYear,
      specialization,
    } = req.body;

    if (
      !programCode ||
      !programName ||
      !yearOfStudy ||
      !level ||
      !faculty ||
      !semester ||
      !academicYear
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Initialize time slots (7am to 6pm, 1 hour each, with break at 11-12)
    const timeSlots = [];
    const times = [
      { slot: 1, start: "07:00", end: "08:00" },
      { slot: 2, start: "08:00", end: "09:00" },
      { slot: 3, start: "09:00", end: "10:00" },
      { slot: 4, start: "10:00", end: "11:00" },
      // MASS BREAK 11:00-12:00
      { slot: 5, start: "12:00", end: "13:00" },
      { slot: 6, start: "13:00", end: "14:00" },
      { slot: 7, start: "14:00", end: "15:00" },
      { slot: 8, start: "15:00", end: "16:00" },
      { slot: 9, start: "16:00", end: "17:00" },
      { slot: 10, start: "17:00", end: "18:00" },
    ];

    times.forEach((time) => {
      timeSlots.push({
        slotNumber: time.slot,
        startTime: time.start,
        endTime: time.end,
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
      });
    });

    const timetable = await Timetable.create({
      programCode,
      programName,
      yearOfStudy: Number(yearOfStudy),
      level,
      faculty,
      semester,
      academicYear,
      specialization,
      timeSlots,
      createdBy: req.user.id,
    });

    await timetable.populate("createdBy", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Timetable created successfully",
      data: timetable,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllTimetables = async (req, res) => {
  try {
    const {
      faculty,
      programCode,
      yearOfStudy,
      semester,
      academicYear,
      level,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { isActive: true };

    if (faculty) query.faculty = faculty;
    if (programCode) query.programCode = programCode;
    if (yearOfStudy) query.yearOfStudy = Number(yearOfStudy);
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;
    if (level) query.level = level;

    const skip = (Number(page) - 1) * Number(limit);

    const timetables = await Timetable.find(query)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .sort({ programCode: 1, yearOfStudy: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Timetable.countDocuments(query);

    res.status(200).json({
      success: true,
      count: timetables.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: timetables,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyTimetable = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students",
      });
    }

    const { semester, academicYear } = req.query;

    const query = {
      faculty: req.user.faculty,
      yearOfStudy: req.user.yearOfStudy,
      isActive: true,
      isPublished: true,
    };

    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const timetable = await Timetable.findOne(query).populate(
      "createdBy",
      "firstName lastName email"
    );

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "No timetable found for your program and year",
      });
    }

    res.status(200).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    res.status(200).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    const {
      programName,
      semester,
      academicYear,
      isActive,
      isPublished,
      specialization,
      timeSlots,
      breakTime,
    } = req.body;

    if (programName) timetable.programName = programName;
    if (semester) timetable.semester = semester;
    if (academicYear) timetable.academicYear = academicYear;
    if (isActive !== undefined) timetable.isActive = isActive;
    if (isPublished !== undefined) timetable.isPublished = isPublished;
    if (specialization) timetable.specialization = specialization;
    if (timeSlots) timetable.timeSlots = timeSlots;
    if (breakTime) timetable.breakTime = breakTime;

    timetable.updatedBy = req.user.id;

    await timetable.save();

    res.status(200).json({
      success: true,
      message: "Timetable updated successfully",
      data: timetable,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const addCourseToSlot = async (req, res) => {
  try {
    const {
      slotNumber,
      day,
      courseCode,
      courseName,
      lecturer,
      location,
      lecturer_initials,
    } = req.body;

    if (!slotNumber || !day || !courseCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide slotNumber, day, and courseCode",
      });
    }

    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    if (!validDays.includes(day.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid day. Must be one of: " + validDays.join(", "),
      });
    }

    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    const timeSlot = timetable.timeSlots.find(
      (ts) => ts.slotNumber === slotNumber
    );

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Time slot not found",
      });
    }

    const dayKey = day.toLowerCase();
    timeSlot[dayKey] = {
      courseCode,
      courseName,
      lecturer,
      location,
      lecturer_initials,
    };

    await timetable.save();

    res.status(200).json({
      success: true,
      message: "Course added to time slot successfully",
      data: timetable,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    await timetable.deleteOne();

    res.status(200).json({
      success: true,
      message: "Timetable deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
