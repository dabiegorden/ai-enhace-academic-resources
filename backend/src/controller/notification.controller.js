import cron from "node-cron";
import Notification from "../models/notification.model.js";
import User from "../models/User.model.js";

// ─── Core broadcast helper ────────────────────────────────────────────────────
/**
 * Creates a notification in DB and emits it via Socket.IO.
 * @param {object} opts
 * @param {string|string[]} opts.userId  - one user id OR array of ids
 * @param {string}  opts.type
 * @param {string}  opts.title
 * @param {string}  opts.message
 * @param {string}  [opts.relatedId]
 * @param {string}  [opts.relatedModel]
 * @param {object}  [opts.metadata]
 * @param {object}  [opts.io]            - Socket.IO server instance
 */
export const broadcastNotification = async ({
  userId,
  type,
  title,
  message,
  relatedId,
  relatedModel,
  metadata,
  io,
}) => {
  const userIds = Array.isArray(userId) ? userId : [userId];

  const notifications = [];
  for (const uid of userIds) {
    try {
      const notif = await Notification.create({
        user: uid,
        type,
        title,
        message,
        relatedId,
        relatedModel,
        metadata,
      });
      notifications.push(notif);

      if (io) {
        io.to(`user-${uid}`).emit("notification:new", {
          id: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          metadata: notif.metadata,
          createdAt: notif.createdAt,
        });
      }
    } catch (err) {
      console.error(`[notification] Failed for user ${uid}:`, err.message);
    }
  }
  return notifications;
};

/**
 * Broadcasts to ALL active users of given role(s).
 */
export const broadcastToRoles = async ({
  roles,
  type,
  title,
  message,
  relatedId,
  relatedModel,
  metadata,
  io,
}) => {
  const users = await User.find({
    role: { $in: roles },
    isActive: true,
  }).select("_id");
  const userIds = users.map((u) => u._id.toString());
  return broadcastNotification({
    userId: userIds,
    type,
    title,
    message,
    relatedId,
    relatedModel,
    metadata,
    io,
  });
};

// ─── REST Handlers ────────────────────────────────────────────────────────────

// @route  GET /api/notifications
export const getMyNotifications = async (req, res) => {
  try {
    const { isRead, page = 1, limit = 50 } = req.query;
    const query = { user: req.user.id };
    if (isRead !== undefined) query.isRead = isRead === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: notifications,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route  GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });
    res.status(200).json({ success: true, data: { unreadCount } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route  PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    if (notification.user.toString() !== req.user.id)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    notification.isRead = true;
    await notification.save();
    res
      .status(200)
      .json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route  PUT /api/notifications/mark-all-read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true },
    );
    res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route  DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    if (notification.user.toString() !== req.user.id)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    await notification.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Legacy helpers (kept for backward compat) ───────────────────────────────
export const createNotification = async (
  userId,
  type,
  title,
  message,
  relatedId,
  relatedModel,
  scheduledFor,
) => {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
      scheduledFor,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const notifyUpload = async (
  userId,
  uploadType,
  fileName,
  documentType,
  relatedId,
  relatedModel,
  io,
) => {
  return broadcastNotification({
    userId,
    type: "upload",
    title: `New ${uploadType} Uploaded`,
    message: `${uploadType}: ${fileName}`,
    relatedId,
    relatedModel,
    metadata: { fileName, uploadType, documentType },
    io,
  });
};

export const notifyRoomMembers = async (
  roomMembers,
  uploadType,
  fileName,
  uploaderName,
  relatedId,
  relatedModel,
  io,
) => {
  return broadcastNotification({
    userId: roomMembers,
    type: "room_upload",
    title: `New ${uploadType} in Course`,
    message: `${uploaderName} uploaded: ${fileName}`,
    relatedId,
    relatedModel,
    metadata: { fileName, uploadType, uploaderName },
    io,
  });
};

// Cron (kept)
export const scheduleLectureReminders = () => {
  cron.schedule("* * * * *", async () => {
    try {
      // Placeholder for future lecture reminder logic
    } catch (error) {
      console.error("Error in lecture reminder scheduler:", error);
    }
  });
};
