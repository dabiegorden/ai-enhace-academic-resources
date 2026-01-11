import Announcement from "../models/announcement.model.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (Lecturer/Admin)
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, faculty, expiryDate } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, content, and type",
      });
    }

    // Validate faculty for faculty-type announcements
    if (type === "faculty" && !faculty) {
      return res.status(400).json({
        success: false,
        message: "Faculty is required for faculty-type announcements",
      });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "cug-announcements",
              resource_type: "auto",
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

    const announcement = await Announcement.create({
      title,
      content,
      type,
      faculty,
      author: req.user.id,
      attachments,
      expiryDate,
    });

    await announcement.populate("author", "firstName lastName email role");

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
export const getAllAnnouncements = async (req, res) => {
  try {
    const { type, faculty, page = 1, limit = 20 } = req.query;

    const query = {};

    // Filter by type
    if (type) query.type = type;

    // Filter by faculty
    if (faculty) query.faculty = faculty;

    // Only show non-expired announcements
    query.$or = [{ expiryDate: { $gte: new Date() } }, { expiryDate: null }];

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const announcements = await Announcement.find(query)
      .populate("author", "firstName lastName email role")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Announcement.countDocuments(query);

    res.status(200).json({
      success: true,
      count: announcements.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: announcements,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get announcement by ID
// @route   GET /api/announcements/:id
// @access  Private
export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "author",
      "firstName lastName email role"
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Increment views
    announcement.views += 1;
    await announcement.save();

    res.status(200).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Author/Admin)
export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Check authorization
    if (
      announcement.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this announcement",
      });
    }

    const { title, content, isPinned, expiryDate } = req.body;

    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (isPinned !== undefined) announcement.isPinned = isPinned;
    if (expiryDate) announcement.expiryDate = expiryDate;

    await announcement.save();

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Author/Admin)
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Check authorization
    if (
      announcement.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this announcement",
      });
    }

    // Delete attachments from Cloudinary
    for (const attachment of announcement.attachments) {
      if (attachment.cloudinaryId) {
        await cloudinary.uploader.destroy(attachment.cloudinaryId);
      }
    }

    await announcement.deleteOne();

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
