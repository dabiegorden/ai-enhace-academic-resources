import Announcement from "../models/announcement.model.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { broadcastToRoles } from "../controller/notification.controller.js";

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

    if (type === "faculty" && !faculty) {
      return res.status(400).json({
        success: false,
        message: "Faculty is required for faculty-type announcements",
      });
    }

    // Upload attachments to Cloudinary
    // resource_type "auto" lets Cloudinary handle images, PDFs, docs, etc.
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "cug-announcements",
              resource_type: "auto", // handles images AND PDFs/docs
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        attachments.push({
          url: result.secure_url,
          cloudinaryId: result.public_id,
          // Store original filename so the frontend can show a meaningful label
          originalName: file.originalname,
          mimeType: file.mimetype,
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

    // Notify ALL roles whenever anyone creates an announcement
    const io = req.app.get("io");
    const authorName =
      `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
      "Administration";

    await broadcastToRoles({
      roles: ["student", "lecturer", "admin"],
      type: "announcement",
      title: `📢 New Announcement: ${title}`,
      message: `${authorName} posted: ${content.slice(0, 100)}${content.length > 100 ? "…" : ""}`,
      relatedId: announcement._id,
      relatedModel: "Announcement",
      metadata: { announcementType: type, faculty: faculty || null },
      io,
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
export const getAllAnnouncements = async (req, res) => {
  try {
    const { type, faculty, page = 1, limit = 20 } = req.query;

    const andConditions = [];
    if (type) andConditions.push({ type });
    if (faculty) andConditions.push({ faculty });

    // Only show non-expired announcements
    andConditions.push({
      $or: [{ expiryDate: { $gte: new Date() } }, { expiryDate: null }],
    });

    // Faculty scoping: students and lecturers only see faculty-type
    // announcements for their OWN faculty. General/academic/event/urgent
    // announcements remain visible to everyone. Admins see everything.
    if (req.user.role !== "admin") {
      andConditions.push({
        $or: [
          { type: { $ne: "faculty" } },
          { type: "faculty", faculty: req.user.faculty },
        ],
      });
    }

    const query = { $and: andConditions };

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
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get announcement by ID
// @route   GET /api/announcements/:id
// @access  Private
export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "author",
      "firstName lastName email role",
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Faculty-type announcements are only viewable by members of that faculty
    if (
      req.user.role !== "admin" &&
      announcement.type === "faculty" &&
      announcement.faculty !== req.user.faculty
    ) {
      return res.status(403).json({
        success: false,
        message: "This announcement is restricted to its faculty.",
      });
    }

    announcement.views += 1;
    await announcement.save();

    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    res.status(400).json({ success: false, message: error.message });
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

    if (
      announcement.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this announcement",
      });
    }

    // Delete all attachments from Cloudinary
    for (const attachment of announcement.attachments) {
      if (attachment.cloudinaryId) {
        await cloudinary.uploader.destroy(attachment.cloudinaryId, {
          resource_type: "auto",
        });
      }
    }

    await announcement.deleteOne();

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
